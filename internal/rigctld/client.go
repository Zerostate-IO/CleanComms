package rigctld

import (
	"bufio"
	"fmt"
	"net"
	"sync"
	"time"
)

// DefaultTimeout is the default connection and operation timeout.
const DefaultTimeout = 5 * time.Second

// Client is a TCP client for communicating with rigctld.
type Client struct {
	host    string
	port    int
	timeout time.Duration

	mu        sync.Mutex
	conn      net.Conn
	reader    *bufio.Reader
	connected bool
}

// NewClient creates a new rigctld client.
// The client is not connected until Connect() is called.
func NewClient(host string, port int) *Client {
	return &Client{
		host:    host,
		port:    port,
		timeout: DefaultTimeout,
	}
}

// SetTimeout configures the connection and operation timeout.
// Must be called before Connect().
func (c *Client) SetTimeout(timeout time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.timeout = timeout
}

// Connect establishes a TCP connection to rigctld.
func (c *Client) Connect() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.connected {
		return nil
	}

	addr := fmt.Sprintf("%s:%d", c.host, c.port)

	conn, err := net.DialTimeout("tcp", addr, c.timeout)
	if err != nil {
		if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
			return ErrTimeout
		}
		if _, ok := err.(*net.OpError); ok {
			return ErrConnectionRefused
		}
		return fmt.Errorf("rigctld: connection failed: %w", err)
	}

	c.conn = conn
	c.reader = bufio.NewReader(conn)
	c.connected = true

	return nil
}

// Disconnect closes the TCP connection to rigctld.
func (c *Client) Disconnect() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if !c.connected {
		return nil
	}

	err := c.conn.Close()
	c.connected = false
	c.conn = nil
	c.reader = nil

	if err != nil {
		return fmt.Errorf("rigctld: disconnect failed: %w", err)
	}
	return nil
}

// IsConnected returns true if the client is connected.
func (c *Client) IsConnected() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.connected
}

// sendCommand sends a command and reads the response.
// Must be called with the lock held.
func (c *Client) sendCommand(cmd string) (string, error) {
	if !c.connected || c.conn == nil || c.reader == nil {
		return "", ErrNotConnected
	}

	// Set deadline for the operation
	if err := c.conn.SetDeadline(time.Now().Add(c.timeout)); err != nil {
		return "", fmt.Errorf("rigctld: failed to set deadline: %w", err)
	}

	// Send command
	_, err := c.conn.Write([]byte(cmd))
	if err != nil {
		if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
			return "", ErrTimeout
		}
		c.connected = false
		return "", fmt.Errorf("rigctld: write failed: %w", err)
	}

	// Read response - may be multi-line for some commands
	var response string
	for {
		line, err := c.reader.ReadString('\n')
		if err != nil {
			if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
				return "", ErrTimeout
			}
			c.connected = false
			return "", fmt.Errorf("rigctld: read failed: %w", err)
		}
		response += line

		// Check if this is a complete response
		// For get_mode, we need two lines
		// For others, one line is enough
		if !stringsHasMoreLines(cmd, response) {
			break
		}
	}

	return response, nil
}

// stringsHasMoreLines determines if more lines are expected based on the command.
func stringsHasMoreLines(cmd, response string) bool {
	// get_mode returns two lines: mode and passband
	if cmd == "\\get_mode\n" {
		return !containsNewline(response, 2)
	}
	return false
}

// containsNewline checks if s contains at least n newlines.
func containsNewline(s string, n int) bool {
	count := 0
	for _, r := range s {
		if r == '\n' {
			count++
			if count >= n {
				return true
			}
		}
	}
	return false
}

// Ping sends a health check command to rigctld.
func (c *Client) Ping() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	response, err := c.sendCommand(BuildPing())
	if err != nil {
		return err
	}

	return ParseChkVFOResponse(response)
}

// GetFrequency returns the current VFO frequency in Hz.
func (c *Client) GetFrequency() (int, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	response, err := c.sendCommand(BuildGetFreq())
	if err != nil {
		return 0, err
	}

	return ParseFreqResponse(response)
}

// SetFrequency sets the VFO frequency in Hz.
func (c *Client) SetFrequency(hz int) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	response, err := c.sendCommand(BuildSetFreq(hz))
	if err != nil {
		return err
	}

	return ParseSimpleResponse("set_freq", response)
}

// GetMode returns the current mode (USB, LSB, etc.) and passband.
func (c *Client) GetMode() (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	response, err := c.sendCommand(BuildGetMode())
	if err != nil {
		return "", err
	}

	result, err := ParseModeResponse(response)
	if err != nil {
		return "", err
	}

	return result.Mode, nil
}

// SetMode sets the radio mode (USB, LSB, etc.).
// Uses default passband (0).
func (c *Client) SetMode(mode string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	response, err := c.sendCommand(BuildSetMode(mode, 0))
	if err != nil {
		return err
	}

	return ParseSimpleResponse("set_mode", response)
}

// GetPTT returns the current PTT state (true = TX, false = RX).
func (c *Client) GetPTT() (bool, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	response, err := c.sendCommand(BuildGetPTT())
	if err != nil {
		return false, err
	}

	return ParsePTTResponse(response)
}

// SetPTT sets the PTT state (true = TX, false = RX).
func (c *Client) SetPTT(tx bool) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	response, err := c.sendCommand(BuildSetPTT(tx))
	if err != nil {
		return err
	}

	return ParseSimpleResponse("set_ptt", response)
}
