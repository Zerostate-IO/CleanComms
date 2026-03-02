package fldigi

import (
	"encoding/xml"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type testMethodCall struct {
	XMLName    xml.Name `xml:"methodCall"`
	MethodName string   `xml:"methodName"`
}

type testMethodResponse struct {
	XMLName xml.Name        `xml:"methodResponse"`
	Params  *testParamsWrap `xml:"params,omitempty"`
	Fault   *testFaultWrap  `xml:"fault,omitempty"`
}

type testParamsWrap struct {
	Param []testParamItem `xml:"param"`
}

type testParamItem struct {
	Value testValueItem `xml:"value"`
}

type testValueItem struct {
	String *string `xml:"string,omitempty"`
	Int    *int    `xml:"int,omitempty"`
}

type testFaultWrap struct {
	Value testFaultStruct `xml:"value"`
}

type testFaultStruct struct {
	Struct testFaultMembers `xml:"struct"`
}

type testFaultMembers struct {
	Member []testFaultMember `xml:"member"`
}

type testFaultMember struct {
	Name  string        `xml:"name"`
	Value testValueItem `xml:"value"`
}

func newMockServer(t *testing.T, handler func(method string) (interface{}, error)) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}

		var call testMethodCall
		if err := xml.Unmarshal(body, &call); err != nil {
			http.Error(w, err.Error(), 500)
			return
		}

		result, err := handler(call.MethodName)
		w.Header().Set("Content-Type", "text/xml")

		if err != nil {
			code := 1
			msg := err.Error()
			faultResp := testMethodResponse{
				Fault: &testFaultWrap{
					Value: testFaultStruct{
						Struct: testFaultMembers{
							Member: []testFaultMember{
								{Name: "faultCode", Value: testValueItem{Int: &code}},
								{Name: "faultString", Value: testValueItem{String: &msg}},
							},
						},
					},
				},
			}
			out, _ := xml.Marshal(faultResp)
			w.Write([]byte(xml.Header + string(out)))
			return
		}

		resp := testMethodResponse{}
		switch v := result.(type) {
		case string:
			resp.Params = &testParamsWrap{Param: []testParamItem{{Value: testValueItem{String: &v}}}}
		case int:
			resp.Params = &testParamsWrap{Param: []testParamItem{{Value: testValueItem{Int: &v}}}}
		}

		out, _ := xml.Marshal(resp)
		w.Write([]byte(xml.Header + string(out)))
	}))
}

func TestNewClient(t *testing.T) {
	tests := []struct {
		name string
		url  string
	}{
		{"empty URL uses default", ""},
		{"valid URL", "http://127.0.0.1:7362"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := NewClient(tt.url)
			if client == nil {
				t.Error("NewClient() returned nil")
			}
		})
	}
}

func TestNewClientWithTimeout(t *testing.T) {
	client := NewClient("http://127.0.0.1:7362")
	client.SetTimeout(5 * time.Second)
	if client.timeout != 5*time.Second {
		t.Errorf("timeout = %v, want 5s", client.timeout)
	}
}

func TestGetVersion(t *testing.T) {
	server := newMockServer(t, func(method string) (interface{}, error) {
		if method == "fldigi.version" {
			return "4.2.05", nil
		}
		return nil, nil
	})
	defer server.Close()

	client := NewClient(server.URL)
	version, err := client.GetVersion()
	if err != nil {
		t.Fatalf("GetVersion() error = %v", err)
	}
	if version != "4.2.05" {
		t.Errorf("GetVersion() = %v, want 4.2.05", version)
	}
}

func TestPing(t *testing.T) {
	server := newMockServer(t, func(method string) (interface{}, error) {
		if method == "fldigi.version" {
			return "4.2.05", nil
		}
		return nil, nil
	})
	defer server.Close()

	client := NewClient(server.URL)
	if err := client.Ping(); err != nil {
		t.Errorf("Ping() error = %v", err)
	}
}

func TestGetMode(t *testing.T) {
	server := newMockServer(t, func(method string) (interface{}, error) {
		if method == "modem.get_name" {
			return "PSK31", nil
		}
		return nil, nil
	})
	defer server.Close()

	client := NewClient(server.URL)
	mode, err := client.GetMode()
	if err != nil {
		t.Fatalf("GetMode() error = %v", err)
	}
	if mode != "PSK31" {
		t.Errorf("GetMode() = %v, want PSK31", mode)
	}
}

func TestSetMode(t *testing.T) {
	server := newMockServer(t, func(method string) (interface{}, error) {
		if method == "modem.set_by_name" {
			return 0, nil
		}
		if method == "modem.get_name" {
			return "PSK63", nil
		}
		return nil, nil
	})
	defer server.Close()

	client := NewClient(server.URL)
	if err := client.SetMode("PSK63"); err != nil {
		t.Errorf("SetMode() error = %v", err)
	}
}

func TestSetModeIdempotent(t *testing.T) {
	server := newMockServer(t, func(method string) (interface{}, error) {
		if method == "modem.get_name" {
			return "PSK31", nil
		}
		return nil, nil
	})
	defer server.Close()

	client := NewClient(server.URL)
	if err := client.SetMode("PSK31"); err != nil {
		t.Errorf("SetMode() idempotent error = %v", err)
	}
}

func TestGetTX(t *testing.T) {
	tests := []struct {
		name     string
		txState  int
		expected bool
	}{
		{"receiving", 0, false},
		{"transmitting", 1, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := newMockServer(t, func(method string) (interface{}, error) {
				if method == "main.get_tx" {
					return tt.txState, nil
				}
				return nil, nil
			})
			defer server.Close()

			client := NewClient(server.URL)
			tx, err := client.GetTX()
			if err != nil {
				t.Fatalf("GetTX() error = %v", err)
			}
			if tx != tt.expected {
				t.Errorf("GetTX() = %v, want %v", tx, tt.expected)
			}
		})
	}
}

func TestSetTX(t *testing.T) {
	server := newMockServer(t, func(method string) (interface{}, error) {
		if method == "main.set_tx" {
			return 0, nil
		}
		return nil, nil
	})
	defer server.Close()

	client := NewClient(server.URL)
	if err := client.SetTX(true); err != nil {
		t.Errorf("SetTX(true) error = %v", err)
	}
	if err := client.SetTX(false); err != nil {
		t.Errorf("SetTX(false) error = %v", err)
	}
}

func TestGetFrequency(t *testing.T) {
	server := newMockServer(t, func(method string) (interface{}, error) {
		if method == "frequency.get" {
			return 14070000, nil
		}
		return nil, nil
	})
	defer server.Close()

	client := NewClient(server.URL)
	freq, err := client.GetFrequency()
	if err != nil {
		t.Fatalf("GetFrequency() error = %v", err)
	}
	if freq != 14070000 {
		t.Errorf("GetFrequency() = %v, want 14070000", freq)
	}
}

func TestSetFrequency(t *testing.T) {
	server := newMockServer(t, func(method string) (interface{}, error) {
		if method == "frequency.set" {
			return 0, nil
		}
		return nil, nil
	})
	defer server.Close()

	client := NewClient(server.URL)
	if err := client.SetFrequency(14070000); err != nil {
		t.Errorf("SetFrequency() error = %v", err)
	}
}

func TestConnectionRefused(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Skipf("cannot get free port: %v", err)
	}
	addr := ln.Addr().String()
	ln.Close()

	client := NewClient("http://" + addr)
	client.SetTimeout(1 * time.Second)

	_, err = client.GetVersion()
	if err == nil {
		t.Error("GetVersion() expected error for connection refused")
	}

	if !isConnectionError(err) {
		t.Errorf("expected ConnectionError, got %T: %v", err, err)
	}
}

func isConnectionError(err error) bool {
	for {
		if _, ok := err.(*ConnectionError); ok {
			return true
		}
		if unwrapper, ok := err.(interface{ Unwrap() error }); ok {
			err = unwrapper.Unwrap()
		} else {
			return false
		}
	}
}

func TestXMLRPCFault(t *testing.T) {
	server := newMockServer(t, func(method string) (interface{}, error) {
		if method == "fldigi.version" {
			return nil, io.ErrUnexpectedEOF
		}
		return nil, nil
	})
	defer server.Close()

	client := NewClient(server.URL)
	_, err := client.GetVersion()
	if err == nil {
		t.Error("GetVersion() expected error for fault")
	}
}

func TestTXToggle(t *testing.T) {
	txState := 0
	server := newMockServer(t, func(method string) (interface{}, error) {
		switch method {
		case "main.get_tx":
			return txState, nil
		case "main.set_tx":
			if txState == 0 {
				txState = 1
			} else {
				txState = 0
			}
			return 0, nil
		}
		return nil, nil
	})
	defer server.Close()

	client := NewClient(server.URL)

	tx, err := client.GetTX()
	if err != nil {
		t.Fatalf("GetTX() error = %v", err)
	}
	if tx {
		t.Error("expected TX to be false initially")
	}

	if err := client.SetTX(true); err != nil {
		t.Fatalf("SetTX(true) error = %v", err)
	}

	tx, err = client.GetTX()
	if err != nil {
		t.Fatalf("GetTX() error = %v", err)
	}
	if !tx {
		t.Error("expected TX to be true after SetTX(true)")
	}

	if err := client.SetTX(false); err != nil {
		t.Fatalf("SetTX(false) error = %v", err)
	}

	tx, err = client.GetTX()
	if err != nil {
		t.Fatalf("GetTX() error = %v", err)
	}
	if tx {
		t.Error("expected TX to be false after SetTX(false)")
	}
}

func TestErrorTypes(t *testing.T) {
	t.Run("FaultError", func(t *testing.T) {
		fe := &FaultError{Code: 1, String: "test fault"}
		if !strings.Contains(fe.Error(), "xmlrpc fault 1") {
			t.Errorf("FaultError.Error() = %v, want to contain 'xmlrpc fault 1'", fe.Error())
		}
		if !fe.Is(ErrNotConnected) {
			t.Error("FaultError.Is(ErrNotConnected) should be true")
		}
	})

	t.Run("ConnectionError", func(t *testing.T) {
		ce := &ConnectionError{Addr: "http://localhost:7362", Err: io.EOF}
		if !strings.Contains(ce.Error(), "localhost:7362") {
			t.Errorf("ConnectionError.Error() = %v, want to contain address", ce.Error())
		}
		if ce.Unwrap() != io.EOF {
			t.Errorf("ConnectionError.Unwrap() = %v, want io.EOF", ce.Unwrap())
		}
	})
}
