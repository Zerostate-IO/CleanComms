// Package fldigi provides an XML-RPC client for communicating with fldigi.
package fldigi

import (
	"bytes"
	"context"
	"encoding/xml"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

// DefaultTimeout is the default request timeout.
const DefaultTimeout = 5 * time.Second

// DefaultAddr is the default fldigi XML-RPC address.
const DefaultAddr = "http://127.0.0.1:7362/RPC2"

// Client is an XML-RPC client for fldigi.
type Client struct {
	addr    string
	timeout time.Duration
	client  *http.Client

	mu sync.Mutex
}

// NewClient creates a new fldigi XML-RPC client.
func NewClient(xmlrpcURL string) *Client {
	if xmlrpcURL == "" {
		xmlrpcURL = DefaultAddr
	}
	return &Client{
		addr:    xmlrpcURL,
		timeout: DefaultTimeout,
		client: &http.Client{
			Timeout: DefaultTimeout,
		},
	}
}

// SetTimeout configures the request timeout.
func (c *Client) SetTimeout(timeout time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.timeout = timeout
	c.client.Timeout = timeout
}

// Ping checks if fldigi is running by calling fldigi.version().
func (c *Client) Ping() error {
	_, err := c.GetVersion()
	return err
}

// GetVersion returns the fldigi version string.
func (c *Client) GetVersion() (string, error) {
	var result string
	err := c.call("fldigi.version", nil, &result)
	if err != nil {
		return "", err
	}
	return result, nil
}

// GetMode returns the current modem mode name (e.g., "PSK31").
func (c *Client) GetMode() (string, error) {
	var result string
	err := c.call("modem.get_name", nil, &result)
	if err != nil {
		return "", err
	}
	return result, nil
}

// SetMode sets the modem mode by name idempotently.
// Returns nil if the mode is already set to the requested value.
func (c *Client) SetMode(mode string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	// First check current mode for idempotency
	var currentMode string
	err := c.callLocked("modem.get_name", nil, &currentMode)
	if err != nil {
		// If we can't get current mode, try to set anyway
		var result int
		return c.callLocked("modem.set_by_name", []any{mode}, &result)
	}

	// Already in requested mode
	if strings.EqualFold(currentMode, mode) {
		return nil
	}

	// Set new mode
	var result int
	return c.callLocked("modem.set_by_name", []any{mode}, &result)
}

// GetTX returns the current transmit state (true = TX, false = RX).
func (c *Client) GetTX() (bool, error) {
	var result int
	err := c.call("main.get_tx", nil, &result)
	if err != nil {
		return false, err
	}
	return result != 0, nil
}

// SetTX starts or stops transmit.
func (c *Client) SetTX(tx bool) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	state := 0
	if tx {
		state = 1
	}

	var result int
	err := c.callLocked("main.set_tx", []any{state}, &result)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrTransmitFailed, err)
	}
	return nil
}

// GetFrequency returns the carrier frequency in Hz.
func (c *Client) GetFrequency() (int, error) {
	var result int
	err := c.call("frequency.get", nil, &result)
	if err != nil {
		return 0, err
	}
	return result, nil
}

// SetFrequency sets the carrier frequency in Hz.
func (c *Client) SetFrequency(hz int) error {
	var result int
	err := c.call("frequency.set", []any{hz}, &result)
	if err != nil {
		return err
	}
	return nil
}

// XML-RPC types for encoding/decoding
type methodCall struct {
	XMLName    xml.Name `xml:"methodCall"`
	MethodName string   `xml:"methodName"`
	Params     *params  `xml:"params,omitempty"`
}

type params struct {
	Param []param `xml:"param"`
}

type param struct {
	Value value `xml:"value"`
}

type value struct {
	String *string `xml:"string,omitempty"`
	Int    *int    `xml:"int,omitempty"`
	IntAlt *int    `xml:"i4,omitempty"`
}

type methodResponse struct {
	XMLName xml.Name `xml:"methodResponse"`
	Params  *struct {
		Param []struct {
			Value struct {
				String *string `xml:"string,omitempty"`
				Int    *int    `xml:"int,omitempty"`
				IntAlt *int    `xml:"i4,omitempty"`
			} `xml:"value"`
		} `xml:"param"`
	} `xml:"params,omitempty"`
	Fault *struct {
		Value struct {
			Struct struct {
				Member []struct {
					Name  string `xml:"name"`
					Value struct {
						Int    *int    `xml:"int,omitempty"`
						String *string `xml:"string,omitempty"`
					} `xml:"value"`
				} `xml:"member"`
			} `xml:"struct"`
		} `xml:"value"`
	} `xml:"fault,omitempty"`
}

// call makes an XML-RPC method call with the current timeout.
func (c *Client) call(methodName string, args []any, result any) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.callLocked(methodName, args, result)
}

// callLocked makes an XML-RPC method call. Must be called with lock held.
func (c *Client) callLocked(methodName string, args []any, result any) error {
	// Build request
	call := methodCall{
		MethodName: methodName,
	}

	if len(args) > 0 {
		call.Params = &params{}
		for _, arg := range args {
			p := param{Value: value{}}
			switch v := arg.(type) {
			case string:
				p.Value.String = &v
			case int:
				p.Value.Int = &v
			}
			call.Params.Param = append(call.Params.Param, p)
		}
	}

	// Encode to XML
	xmlData, err := xml.Marshal(call)
	if err != nil {
		return fmt.Errorf("xml encode failed: %w", err)
	}

	// Add XML header
	xmlData = []byte(`<?xml version="1.0"?>` + "\n" + string(xmlData))

	// Create HTTP request with timeout context
	ctx, cancel := context.WithTimeout(context.Background(), c.timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "POST", c.addr, bytes.NewReader(xmlData))
	if err != nil {
		return &ConnectionError{Addr: c.addr, Err: err}
	}
	req.Header.Set("Content-Type", "text/xml")

	// Send request
	resp, err := c.client.Do(req)
	if err != nil {
		if netErr, ok := err.(net.Error); ok {
			if netErr.Timeout() {
				return ErrTimeout
			}
		}
		if strings.Contains(err.Error(), "connection refused") {
			return &ConnectionError{Addr: c.addr, Err: ErrNotConnected}
		}
		return &ConnectionError{Addr: c.addr, Err: err}
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read response failed: %w", err)
	}

	// Parse XML response
	var respData methodResponse
	if err := xml.Unmarshal(body, &respData); err != nil {
		return fmt.Errorf("%w: %v", ErrInvalidResponse, err)
	}

	// Check for fault
	if respData.Fault != nil {
		fault := &FaultError{}
		for _, member := range respData.Fault.Value.Struct.Member {
			switch member.Name {
			case "faultCode":
				if member.Value.Int != nil {
					fault.Code = *member.Value.Int
				}
			case "faultString":
				if member.Value.String != nil {
					fault.String = *member.Value.String
				}
			}
		}
		return fault
	}

	// Extract result
	if respData.Params != nil && len(respData.Params.Param) > 0 {
		val := respData.Params.Param[0].Value
		switch r := result.(type) {
		case *string:
			if val.String != nil {
				*r = *val.String
			}
		case *int:
			if val.Int != nil {
				*r = *val.Int
			} else if val.IntAlt != nil {
				*r = *val.IntAlt
			}
		}
	}

	return nil
}
