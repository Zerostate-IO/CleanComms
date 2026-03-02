package rigctld

import (
	"bufio"
	"errors"
	"net"
	"strings"
	"testing"
	"time"
)

// mockServer simulates a rigctld server for testing.
type mockServer struct {
	listener  net.Listener
	responses map[string]string
	requests  []string
}

func newMockServer(t *testing.T, responses map[string]string) *mockServer {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to create mock server: %v", err)
	}

	s := &mockServer{
		listener:  listener,
		responses: responses,
		requests:  make([]string, 0),
	}

	go s.serve()

	return s
}

func (s *mockServer) port() int {
	return s.listener.Addr().(*net.TCPAddr).Port
}

func (s *mockServer) serve() {
	for {
		conn, err := s.listener.Accept()
		if err != nil {
			return
		}
		go s.handleConn(conn)
	}
}

func (s *mockServer) handleConn(conn net.Conn) {
	defer conn.Close()

	reader := bufio.NewReader(conn)
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			return
		}

		cmd := strings.TrimSpace(line)
		s.requests = append(s.requests, cmd)

		// Find matching response
		var response string
		for pattern, resp := range s.responses {
			if strings.Contains(cmd, pattern) {
				response = resp
				break
			}
		}

		// Default to RPRT 0 if no match
		if response == "" {
			response = "RPRT 0\n"
		}

		conn.Write([]byte(response))
	}
}

func (s *mockServer) close() {
	s.listener.Close()
}

// Test command builders
func TestBuildSetFreq(t *testing.T) {
	cmd := BuildSetFreq(14070000)
	expected := "\\set_freq 14070000\n"
	if cmd != expected {
		t.Errorf("BuildSetFreq() = %q, want %q", cmd, expected)
	}
}

func TestBuildGetFreq(t *testing.T) {
	cmd := BuildGetFreq()
	expected := "\\get_freq\n"
	if cmd != expected {
		t.Errorf("BuildGetFreq() = %q, want %q", cmd, expected)
	}
}

func TestBuildSetMode(t *testing.T) {
	cmd := BuildSetMode("USB", 2400)
	expected := "\\set_mode USB 2400\n"
	if cmd != expected {
		t.Errorf("BuildSetMode() = %q, want %q", cmd, expected)
	}
}

func TestBuildSetPTT(t *testing.T) {
	tests := []struct {
		tx       bool
		expected string
	}{
		{false, "\\set_ptt 0\n"},
		{true, "\\set_ptt 1\n"},
	}

	for _, tt := range tests {
		cmd := BuildSetPTT(tt.tx)
		if cmd != tt.expected {
			t.Errorf("BuildSetPTT(%v) = %q, want %q", tt.tx, cmd, tt.expected)
		}
	}
}

// Test response parsers
func TestParseFreqResponse(t *testing.T) {
	tests := []struct {
		response  string
		expected  int
		expectErr bool
	}{
		{"14070000", 14070000, false},
		{"7070000", 7070000, false},
		{"Frequency: 14070000\n", 14070000, false},
		{"RPRT 0\n", 0, true},
		{"RPRT -1\n", 0, true},
		{"invalid", 0, true},
	}

	for _, tt := range tests {
		freq, err := ParseFreqResponse(tt.response)
		if tt.expectErr {
			if err == nil {
				t.Errorf("ParseFreqResponse(%q) expected error, got none", tt.response)
			}
		} else {
			if err != nil {
				t.Errorf("ParseFreqResponse(%q) unexpected error: %v", tt.response, err)
			}
			if freq != tt.expected {
				t.Errorf("ParseFreqResponse(%q) = %d, want %d", tt.response, freq, tt.expected)
			}
		}
	}
}

func TestParseModeResponse(t *testing.T) {
	tests := []struct {
		response  string
		expected  ModePassband
		expectErr bool
	}{
		{"USB\n2400", ModePassband{Mode: "USB", Passband: 2400}, false},
		{"LSB\n0", ModePassband{Mode: "LSB", Passband: 0}, false},
		{"CW", ModePassband{Mode: "CW", Passband: 0}, false},
		{"RPRT -1\n", ModePassband{}, true},
		{"", ModePassband{}, true},
	}

	for _, tt := range tests {
		result, err := ParseModeResponse(tt.response)
		if tt.expectErr {
			if err == nil {
				t.Errorf("ParseModeResponse(%q) expected error, got none", tt.response)
			}
		} else {
			if err != nil {
				t.Errorf("ParseModeResponse(%q) unexpected error: %v", tt.response, err)
			}
			if result != tt.expected {
				t.Errorf("ParseModeResponse(%q) = %v, want %v", tt.response, result, tt.expected)
			}
		}
	}
}

func TestParsePTTResponse(t *testing.T) {
	tests := []struct {
		response  string
		expected  bool
		expectErr bool
	}{
		{"0", false, false},
		{"1", true, false},
		{"RPRT 0\n", false, true},
		{"RPRT -1\n", false, true},
		{"invalid", false, true},
	}

	for _, tt := range tests {
		result, err := ParsePTTResponse(tt.response)
		if tt.expectErr {
			if err == nil {
				t.Errorf("ParsePTTResponse(%q) expected error, got none", tt.response)
			}
		} else {
			if err != nil {
				t.Errorf("ParsePTTResponse(%q) unexpected error: %v", tt.response, err)
			}
			if result != tt.expected {
				t.Errorf("ParsePTTResponse(%q) = %v, want %v", tt.response, result, tt.expected)
			}
		}
	}
}

func TestParseErrorCode(t *testing.T) {
	tests := []struct {
		response  string
		expected  ErrorCode
		expectErr bool
	}{
		{"RPRT 0", ErrCodeOK, false},
		{"RPRT -1", ErrCodeInvalid, false},
		{"RPRT -2", ErrCodeNotImpl, false},
		{"RPRT -25", ErrCodeTrxOpenFail, false},
		{"invalid", ErrCodeInvalid, true},
		{"RPRT invalid", ErrCodeInvalid, true},
	}

	for _, tt := range tests {
		code, _, err := ParseErrorCode(tt.response)
		if tt.expectErr {
			if err == nil {
				t.Errorf("ParseErrorCode(%q) expected error, got none", tt.response)
			}
		} else {
			if err != nil {
				t.Errorf("ParseErrorCode(%q) unexpected error: %v", tt.response, err)
			}
			if code != tt.expected {
				t.Errorf("ParseErrorCode(%q) = %d, want %d", tt.response, code, tt.expected)
			}
		}
	}
}

// Test client operations with mock server
func TestClientConnect(t *testing.T) {
	server := newMockServer(t, nil)
	defer server.close()

	client := NewClient("127.0.0.1", server.port())
	defer client.Disconnect()

	if err := client.Connect(); err != nil {
		t.Errorf("Connect() failed: %v", err)
	}

	if !client.IsConnected() {
		t.Error("IsConnected() = false, want true")
	}

	// Double connect should be no-op
	if err := client.Connect(); err != nil {
		t.Errorf("Second Connect() failed: %v", err)
	}
}

func TestClientConnectRefused(t *testing.T) {
	client := NewClient("127.0.0.1", 1) // Invalid port
	client.SetTimeout(1 * time.Second)

	err := client.Connect()
	if !errors.Is(err, ErrConnectionRefused) {
		t.Errorf("Connect() error = %v, want ErrConnectionRefused", err)
	}
}

func TestClientDisconnect(t *testing.T) {
	server := newMockServer(t, nil)
	defer server.close()

	client := NewClient("127.0.0.1", server.port())

	if err := client.Connect(); err != nil {
		t.Fatalf("Connect() failed: %v", err)
	}

	if err := client.Disconnect(); err != nil {
		t.Errorf("Disconnect() failed: %v", err)
	}

	if client.IsConnected() {
		t.Error("IsConnected() = true after Disconnect()")
	}

	// Double disconnect should be no-op
	if err := client.Disconnect(); err != nil {
		t.Errorf("Second Disconnect() failed: %v", err)
	}
}

func TestClientGetFrequency(t *testing.T) {
	responses := map[string]string{
		"get_freq": "14070000\n",
	}
	server := newMockServer(t, responses)
	defer server.close()

	client := NewClient("127.0.0.1", server.port())
	defer client.Disconnect()

	if err := client.Connect(); err != nil {
		t.Fatalf("Connect() failed: %v", err)
	}

	freq, err := client.GetFrequency()
	if err != nil {
		t.Errorf("GetFrequency() failed: %v", err)
	}
	if freq != 14070000 {
		t.Errorf("GetFrequency() = %d, want 14070000", freq)
	}
}

func TestClientSetFrequency(t *testing.T) {
	responses := map[string]string{
		"set_freq": "RPRT 0\n",
	}
	server := newMockServer(t, responses)
	defer server.close()

	client := NewClient("127.0.0.1", server.port())
	defer client.Disconnect()

	if err := client.Connect(); err != nil {
		t.Fatalf("Connect() failed: %v", err)
	}

	if err := client.SetFrequency(14070000); err != nil {
		t.Errorf("SetFrequency() failed: %v", err)
	}
}

func TestClientGetMode(t *testing.T) {
	responses := map[string]string{
		"get_mode": "USB\n2400\n",
	}
	server := newMockServer(t, responses)
	defer server.close()

	client := NewClient("127.0.0.1", server.port())
	defer client.Disconnect()

	if err := client.Connect(); err != nil {
		t.Fatalf("Connect() failed: %v", err)
	}

	mode, err := client.GetMode()
	if err != nil {
		t.Errorf("GetMode() failed: %v", err)
	}
	if mode != "USB" {
		t.Errorf("GetMode() = %q, want %q", mode, "USB")
	}
}

func TestClientSetMode(t *testing.T) {
	responses := map[string]string{
		"set_mode": "RPRT 0\n",
	}
	server := newMockServer(t, responses)
	defer server.close()

	client := NewClient("127.0.0.1", server.port())
	defer client.Disconnect()

	if err := client.Connect(); err != nil {
		t.Fatalf("Connect() failed: %v", err)
	}

	if err := client.SetMode("USB"); err != nil {
		t.Errorf("SetMode() failed: %v", err)
	}
}

func TestClientGetPTT(t *testing.T) {
	tests := []struct {
		name     string
		response string
		expected bool
	}{
		{"RX", "0\n", false},
		{"TX", "1\n", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			responses := map[string]string{
				"get_ptt": tt.response,
			}
			server := newMockServer(t, responses)
			defer server.close()

			client := NewClient("127.0.0.1", server.port())
			defer client.Disconnect()

			if err := client.Connect(); err != nil {
				t.Fatalf("Connect() failed: %v", err)
			}

			ptt, err := client.GetPTT()
			if err != nil {
				t.Errorf("GetPTT() failed: %v", err)
			}
			if ptt != tt.expected {
				t.Errorf("GetPTT() = %v, want %v", ptt, tt.expected)
			}
		})
	}
}

func TestClientSetPTT(t *testing.T) {
	responses := map[string]string{
		"set_ptt": "RPRT 0\n",
	}
	server := newMockServer(t, responses)
	defer server.close()

	client := NewClient("127.0.0.1", server.port())
	defer client.Disconnect()

	if err := client.Connect(); err != nil {
		t.Fatalf("Connect() failed: %v", err)
	}

	if err := client.SetPTT(true); err != nil {
		t.Errorf("SetPTT(true) failed: %v", err)
	}

	if err := client.SetPTT(false); err != nil {
		t.Errorf("SetPTT(false) failed: %v", err)
	}
}

func TestClientPing(t *testing.T) {
	responses := map[string]string{
		"chk_vfo": "CHKVFO 1\n",
	}
	server := newMockServer(t, responses)
	defer server.close()

	client := NewClient("127.0.0.1", server.port())
	defer client.Disconnect()

	if err := client.Connect(); err != nil {
		t.Fatalf("Connect() failed: %v", err)
	}

	if err := client.Ping(); err != nil {
		t.Errorf("Ping() failed: %v", err)
	}
}

func TestClientNotConnected(t *testing.T) {
	client := NewClient("127.0.0.1", 4532)

	_, err := client.GetFrequency()
	if !errors.Is(err, ErrNotConnected) {
		t.Errorf("GetFrequency() error = %v, want ErrNotConnected", err)
	}

	err = client.SetFrequency(14070000)
	if !errors.Is(err, ErrNotConnected) {
		t.Errorf("SetFrequency() error = %v, want ErrNotConnected", err)
	}

	_, err = client.GetMode()
	if !errors.Is(err, ErrNotConnected) {
		t.Errorf("GetMode() error = %v, want ErrNotConnected", err)
	}

	err = client.SetMode("USB")
	if !errors.Is(err, ErrNotConnected) {
		t.Errorf("SetMode() error = %v, want ErrNotConnected", err)
	}

	_, err = client.GetPTT()
	if !errors.Is(err, ErrNotConnected) {
		t.Errorf("GetPTT() error = %v, want ErrNotConnected", err)
	}

	err = client.SetPTT(true)
	if !errors.Is(err, ErrNotConnected) {
		t.Errorf("SetPTT() error = %v, want ErrNotConnected", err)
	}

	err = client.Ping()
	if !errors.Is(err, ErrNotConnected) {
		t.Errorf("Ping() error = %v, want ErrNotConnected", err)
	}
}

func TestClientCommandError(t *testing.T) {
	responses := map[string]string{
		"set_freq": "RPRT -1\n",
	}
	server := newMockServer(t, responses)
	defer server.close()

	client := NewClient("127.0.0.1", server.port())
	defer client.Disconnect()

	if err := client.Connect(); err != nil {
		t.Fatalf("Connect() failed: %v", err)
	}

	err := client.SetFrequency(14070000)
	if err == nil {
		t.Error("SetFrequency() expected error, got none")
	}

	var cmdErr *CommandError
	if !errors.As(err, &cmdErr) {
		t.Errorf("SetFrequency() error type = %T, want *CommandError", err)
	}
}

func TestErrorDescriptions(t *testing.T) {
	tests := []struct {
		code     ErrorCode
		expected string
	}{
		{ErrCodeOK, "success"},
		{ErrCodeInvalid, "invalid parameter"},
		{ErrCodeNotImpl, "not implemented"},
		{ErrCodeTrxOpenFail, "failed to open transceiver"},
		{ErrCodeTrxBusy, "transceiver busy"},
	}

	for _, tt := range tests {
		desc := tt.code.ErrorDescription()
		if desc != tt.expected {
			t.Errorf("ErrorCode(%d).ErrorDescription() = %q, want %q", tt.code, desc, tt.expected)
		}
	}
}

func TestIsConnectionError(t *testing.T) {
	if !IsConnectionError(ErrNotConnected) {
		t.Error("IsConnectionError(ErrNotConnected) = false, want true")
	}
	if !IsConnectionError(ErrConnectionRefused) {
		t.Error("IsConnectionError(ErrConnectionRefused) = false, want true")
	}
	if !IsConnectionError(ErrTimeout) {
		t.Error("IsConnectionError(ErrTimeout) = false, want true")
	}
	if IsConnectionError(ErrMalformedResponse) {
		t.Error("IsConnectionError(ErrMalformedResponse) = true, want false")
	}
}

func TestIsProtocolError(t *testing.T) {
	if !IsProtocolError(ErrMalformedResponse) {
		t.Error("IsProtocolError(ErrMalformedResponse) = false, want true")
	}
	if !IsProtocolError(ErrCommandFailed) {
		t.Error("IsProtocolError(ErrCommandFailed) = false, want true")
	}
	if IsProtocolError(ErrNotConnected) {
		t.Error("IsProtocolError(ErrNotConnected) = true, want false")
	}
}
