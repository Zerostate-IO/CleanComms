package http

import (
	"bytes"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func newTestServer(rigClient RigClient, modemClient ModemClient) *Server {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}))
	return NewServer(":0", logger, rigClient, modemClient)
}

func TestHandleHealth(t *testing.T) {
	tests := []struct {
		name           string
		rigClient      RigClient
		modemClient    ModemClient
		expectedStatus string
		expectedRig    string
		expectedModem  string
	}{
		{
			name:           "all healthy",
			rigClient:      &StubRigClient{},
			modemClient:    &StubModemClient{},
			expectedStatus: "ok",
			expectedRig:    "ok",
			expectedModem:  "ok",
		},
		{
			name: "rig degraded",
			rigClient: &StubRigClient{
				HealthFunc: func() HealthStatus {
					return HealthStatus{OK: false, Message: "connection lost"}
				},
			},
			modemClient:    &StubModemClient{},
			expectedStatus: "degraded",
			expectedRig:    "degraded",
			expectedModem:  "ok",
		},
		{
			name:           "nil clients",
			rigClient:      nil,
			modemClient:    nil,
			expectedStatus: "degraded",
			expectedRig:    "degraded",
			expectedModem:  "degraded",
		},
		{
			name:           "nil rig client only",
			rigClient:      nil,
			modemClient:    &StubModemClient{},
			expectedStatus: "degraded",
			expectedRig:    "degraded",
			expectedModem:  "ok",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := newTestServer(tt.rigClient, tt.modemClient)

			req := httptest.NewRequest(http.MethodGet, "/health", nil)
			rec := httptest.NewRecorder()

			server.handleHealth(rec, req)

			if rec.Code != http.StatusOK {
				t.Errorf("expected status %d, got %d", http.StatusOK, rec.Code)
			}

			var resp HealthResponse
			if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
				t.Fatalf("failed to decode response: %v", err)
			}

			if resp.Status != tt.expectedStatus {
				t.Errorf("expected status %q, got %q", tt.expectedStatus, resp.Status)
			}
			if resp.Rigctld != tt.expectedRig {
				t.Errorf("expected rigctld %q, got %q", tt.expectedRig, resp.Rigctld)
			}
			if resp.Fldigi != tt.expectedModem {
				t.Errorf("expected fldigi %q, got %q", tt.expectedModem, resp.Fldigi)
			}

			// Verify content type
			if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
				t.Errorf("expected Content-Type application/json, got %q", ct)
			}
		})
	}
}

func TestHandleRigStatus(t *testing.T) {
	tests := []struct {
		name          string
		rigClient     RigClient
		expectedCode  int
		expectedFreq  int64
		expectedMode  string
		expectedPTT   bool
		expectedError string
	}{
		{
			name: "success",
			rigClient: &StubRigClient{
				StatusFunc: func() RigStatus {
					return RigStatus{
						Frequency: 7100000,
						Mode:      "LSB",
						PTT:       true,
						Connected: true,
					}
				},
			},
			expectedCode: http.StatusOK,
			expectedFreq: 7100000,
			expectedMode: "LSB",
			expectedPTT:  true,
		},
		{
			name:          "nil client returns 503",
			rigClient:     nil,
			expectedCode:  http.StatusServiceUnavailable,
			expectedError: "service_unavailable",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := newTestServer(tt.rigClient, nil)

			req := httptest.NewRequest(http.MethodGet, "/api/v1/rig/status", nil)
			rec := httptest.NewRecorder()

			server.handleRigStatus(rec, req)

			if rec.Code != tt.expectedCode {
				t.Errorf("expected status %d, got %d", tt.expectedCode, rec.Code)
			}

			if tt.expectedError != "" {
				var resp ErrorResponse
				if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
					t.Fatalf("failed to decode error response: %v", err)
				}
				if resp.Error != tt.expectedError {
					t.Errorf("expected error %q, got %q", tt.expectedError, resp.Error)
				}
			} else {
				var resp RigStatus
				if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
					t.Fatalf("failed to decode response: %v", err)
				}
				if resp.Frequency != tt.expectedFreq {
					t.Errorf("expected frequency %d, got %d", tt.expectedFreq, resp.Frequency)
				}
				if resp.Mode != tt.expectedMode {
					t.Errorf("expected mode %q, got %q", tt.expectedMode, resp.Mode)
				}
				if resp.PTT != tt.expectedPTT {
					t.Errorf("expected PTT %v, got %v", tt.expectedPTT, resp.PTT)
				}
			}
		})
	}
}

func TestHandlePTT(t *testing.T) {
	tests := []struct {
		name          string
		rigClient     RigClient
		requestBody   any
		expectedCode  int
		expectedState string
		expectedError string
	}{
		{
			name: "set tx",
			rigClient: &StubRigClient{
				SetPTTFunc: func(state bool) (bool, error) {
					return state, nil
				},
			},
			requestBody:   PTTRequest{State: "tx"},
			expectedCode:  http.StatusOK,
			expectedState: "tx",
		},
		{
			name: "set rx",
			rigClient: &StubRigClient{
				SetPTTFunc: func(state bool) (bool, error) {
					return state, nil
				},
			},
			requestBody:   PTTRequest{State: "rx"},
			expectedCode:  http.StatusOK,
			expectedState: "rx",
		},
		{
			name: "invalid state",
			rigClient: &StubRigClient{
				SetPTTFunc: func(state bool) (bool, error) {
					return state, nil
				},
			},
			requestBody:   PTTRequest{State: "invalid"},
			expectedCode:  http.StatusBadRequest,
			expectedError: "invalid_state",
		},
		{
			name:          "malformed JSON",
			rigClient:     &StubRigClient{},
			requestBody:   "not json",
			expectedCode:  http.StatusBadRequest,
			expectedError: "invalid_request",
		},
		{
			name:          "nil client returns 503",
			rigClient:     nil,
			requestBody:   PTTRequest{State: "tx"},
			expectedCode:  http.StatusServiceUnavailable,
			expectedError: "service_unavailable",
		},
		{
			name: "ptt error",
			rigClient: &StubRigClient{
				SetPTTFunc: func(state bool) (bool, error) {
					return false, errors.New("rig not connected")
				},
			},
			requestBody:   PTTRequest{State: "tx"},
			expectedCode:  http.StatusServiceUnavailable,
			expectedError: "ptt_failed",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := newTestServer(tt.rigClient, nil)

			var body bytes.Buffer
			if str, ok := tt.requestBody.(string); ok {
				body.WriteString(str)
			} else {
				if err := json.NewEncoder(&body).Encode(tt.requestBody); err != nil {
					t.Fatalf("failed to encode request: %v", err)
				}
			}

			req := httptest.NewRequest(http.MethodPost, "/api/v1/rig/ptt", &body)
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()

			server.handlePTT(rec, req)

			if rec.Code != tt.expectedCode {
				t.Errorf("expected status %d, got %d: %s", tt.expectedCode, rec.Code, rec.Body.String())
			}

			if tt.expectedError != "" {
				var resp ErrorResponse
				if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
					t.Fatalf("failed to decode error response: %v", err)
				}
				if resp.Error != tt.expectedError {
					t.Errorf("expected error %q, got %q", tt.expectedError, resp.Error)
				}
			} else if tt.expectedState != "" {
				var resp PTTResponse
				if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
					t.Fatalf("failed to decode response: %v", err)
				}
				if resp.State != tt.expectedState {
					t.Errorf("expected state %q, got %q", tt.expectedState, resp.State)
				}
			}
		})
	}
}

func TestHandleModemStatus(t *testing.T) {
	tests := []struct {
		name          string
		modemClient   ModemClient
		expectedCode  int
		expectedMode  string
		expectedTX    bool
		expectedError string
	}{
		{
			name: "success",
			modemClient: &StubModemClient{
				StatusFunc: func() ModemStatus {
					return ModemStatus{
						Mode:      "RTTY",
						TX:        true,
						Connected: true,
					}
				},
			},
			expectedCode: http.StatusOK,
			expectedMode: "RTTY",
			expectedTX:   true,
		},
		{
			name:          "nil client returns 503",
			modemClient:   nil,
			expectedCode:  http.StatusServiceUnavailable,
			expectedError: "service_unavailable",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := newTestServer(nil, tt.modemClient)

			req := httptest.NewRequest(http.MethodGet, "/api/v1/modem/status", nil)
			rec := httptest.NewRecorder()

			server.handleModemStatus(rec, req)

			if rec.Code != tt.expectedCode {
				t.Errorf("expected status %d, got %d", tt.expectedCode, rec.Code)
			}

			if tt.expectedError != "" {
				var resp ErrorResponse
				if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
					t.Fatalf("failed to decode error response: %v", err)
				}
				if resp.Error != tt.expectedError {
					t.Errorf("expected error %q, got %q", tt.expectedError, resp.Error)
				}
			} else {
				var resp ModemStatus
				if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
					t.Fatalf("failed to decode response: %v", err)
				}
				if resp.Mode != tt.expectedMode {
					t.Errorf("expected mode %q, got %q", tt.expectedMode, resp.Mode)
				}
				if resp.TX != tt.expectedTX {
					t.Errorf("expected TX %v, got %v", tt.expectedTX, resp.TX)
				}
			}
		})
	}
}

func TestPTTInvalidPayloadMessage(t *testing.T) {
	// Test that invalid PTT payload includes allowed values message
	server := newTestServer(&StubRigClient{}, nil)

	body := bytes.NewBufferString(`{"state":"bogus"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/rig/ptt", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	server.handlePTT(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
	}

	var resp ErrorResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Error != "invalid_state" {
		t.Errorf("expected error 'invalid_state', got %q", resp.Error)
	}

	if resp.Message != "state must be 'tx' or 'rx'" {
		t.Errorf("expected message about allowed values, got %q", resp.Message)
	}
}

func TestRouting(t *testing.T) {
	// Test that routes are properly registered
	server := newTestServer(&StubRigClient{}, &StubModemClient{})

	tests := []struct {
		method string
		path   string
		code   int
	}{
		{http.MethodGet, "/health", http.StatusOK},
		{http.MethodGet, "/api/v1/rig/status", http.StatusOK},
		{http.MethodPost, "/api/v1/rig/ptt", http.StatusOK},
		{http.MethodGet, "/api/v1/modem/status", http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			var body *bytes.Buffer
			if tt.method == http.MethodPost {
				body = bytes.NewBufferString(`{"state":"tx"}`)
			} else {
				body = bytes.NewBuffer(nil)
			}

			req := httptest.NewRequest(tt.method, tt.path, body)
			if tt.method == http.MethodPost {
				req.Header.Set("Content-Type", "application/json")
			}
			rec := httptest.NewRecorder()

			server.server.Handler.ServeHTTP(rec, req)

			if rec.Code != tt.code {
				t.Errorf("expected status %d, got %d for %s %s", tt.code, rec.Code, tt.method, tt.path)
			}
		})
	}
}
