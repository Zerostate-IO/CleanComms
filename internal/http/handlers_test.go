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

func newTestServer(rigClient RigClient, modemClient ModemClient, coordinator CoordinatorClient, features map[string]bool) *Server {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}))
	return NewServer(":0", logger, rigClient, modemClient, coordinator, features)
}

func defaultFeatures() map[string]bool {
	return map[string]bool{
		"logging_enabled":      true,
		"lookup_enabled":       true,
		"map_enabled":          true,
		"solar_enabled":        true,
		"signal_id_v2_enabled": false,
	}
}

func TestHandleHealth(t *testing.T) {
	tests := []struct {
		name                string
		rigClient           RigClient
		modemClient         ModemClient
		coordinator         CoordinatorClient
		expectedStatus      string
		expectedRig         string
		expectedModem       string
		expectedCoordinator string
	}{
		{
			name:                "all healthy",
			rigClient:           &StubRigClient{},
			modemClient:         &StubModemClient{},
			coordinator:         &StubCoordinatorClient{},
			expectedStatus:      "ok",
			expectedRig:         "ok",
			expectedModem:       "ok",
			expectedCoordinator: "ok",
		},
		{
			name: "rig degraded",
			rigClient: &StubRigClient{
				HealthFunc: func() HealthStatus {
					return HealthStatus{OK: false, Message: "connection lost"}
				},
			},
			modemClient:         &StubModemClient{},
			coordinator:         &StubCoordinatorClient{},
			expectedStatus:      "degraded",
			expectedRig:         "degraded",
			expectedModem:       "ok",
			expectedCoordinator: "ok",
		},
		{
			name:        "coordinator degraded",
			rigClient:   &StubRigClient{},
			modemClient: &StubModemClient{},
			coordinator: &StubCoordinatorClient{
				IsHealthyFunc: func() bool { return false },
			},
			expectedStatus:      "degraded",
			expectedRig:         "ok",
			expectedModem:       "ok",
			expectedCoordinator: "degraded",
		},
		{
			name:                "nil clients",
			rigClient:           nil,
			modemClient:         nil,
			coordinator:         nil,
			expectedStatus:      "degraded",
			expectedRig:         "degraded",
			expectedModem:       "degraded",
			expectedCoordinator: "degraded",
		},
		{
			name:                "nil rig client only",
			rigClient:           nil,
			modemClient:         &StubModemClient{},
			coordinator:         &StubCoordinatorClient{},
			expectedStatus:      "degraded",
			expectedRig:         "degraded",
			expectedModem:       "ok",
			expectedCoordinator: "ok",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := newTestServer(tt.rigClient, tt.modemClient, tt.coordinator, defaultFeatures())

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
			if resp.Coordinator != tt.expectedCoordinator {
				t.Errorf("expected coordinator %q, got %q", tt.expectedCoordinator, resp.Coordinator)
			}

			// Verify features are included
			if resp.Features == nil {
				t.Error("expected features map to be non-nil")
			}

			// Verify content type
			if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
				t.Errorf("expected Content-Type application/json, got %q", ct)
			}
		})
	}
}

func TestHandleHealthFeatures(t *testing.T) {
	features := map[string]bool{
		"logging_enabled":      true,
		"lookup_enabled":       false,
		"map_enabled":          true,
		"solar_enabled":        false,
		"signal_id_v2_enabled": false,
	}

	server := newTestServer(&StubRigClient{}, &StubModemClient{}, &StubCoordinatorClient{}, features)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	server.handleHealth(rec, req)

	var resp HealthResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Verify feature flags are correctly included
	if resp.Features["logging_enabled"] != true {
		t.Error("expected logging_enabled to be true")
	}
	if resp.Features["lookup_enabled"] != false {
		t.Error("expected lookup_enabled to be false")
	}
	if resp.Features["signal_id_v2_enabled"] != false {
		t.Error("expected signal_id_v2_enabled to be false")
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
			server := newTestServer(tt.rigClient, nil, &StubCoordinatorClient{}, defaultFeatures())

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
		coordinator   CoordinatorClient
		requestBody   any
		expectedCode  int
		expectedState string
		expectedError string
	}{
		{
			name: "set tx",
			coordinator: &StubCoordinatorClient{
				SetPTTFunc: func(tx bool) error { return nil },
				GetPTTFunc: func() bool { return true },
			},
			requestBody:   PTTRequest{State: "tx"},
			expectedCode:  http.StatusOK,
			expectedState: "tx",
		},
		{
			name: "set rx",
			coordinator: &StubCoordinatorClient{
				SetPTTFunc: func(tx bool) error { return nil },
				GetPTTFunc: func() bool { return false },
			},
			requestBody:   PTTRequest{State: "rx"},
			expectedCode:  http.StatusOK,
			expectedState: "rx",
		},
		{
			name: "invalid state",
			coordinator: &StubCoordinatorClient{
				SetPTTFunc: func(tx bool) error { return nil },
			},
			requestBody:   PTTRequest{State: "invalid"},
			expectedCode:  http.StatusBadRequest,
			expectedError: "invalid_state",
		},
		{
			name:          "malformed JSON",
			coordinator:   &StubCoordinatorClient{},
			requestBody:   "not json",
			expectedCode:  http.StatusBadRequest,
			expectedError: "invalid_request",
		},
		{
			name:          "nil coordinator returns 503",
			coordinator:   nil,
			requestBody:   PTTRequest{State: "tx"},
			expectedCode:  http.StatusServiceUnavailable,
			expectedError: "service_unavailable",
		},
		{
			name: "ptt blocked due to degraded",
			coordinator: &StubCoordinatorClient{
				SetPTTFunc: func(tx bool) error {
					return errors.New("system degraded: cannot enter TX mode")
				},
			},
			requestBody:   PTTRequest{State: "tx"},
			expectedCode:  http.StatusServiceUnavailable,
			expectedError: "ptt_blocked",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := newTestServer(nil, nil, tt.coordinator, defaultFeatures())

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
			server := newTestServer(nil, tt.modemClient, &StubCoordinatorClient{}, defaultFeatures())

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
	server := newTestServer(nil, nil, &StubCoordinatorClient{}, defaultFeatures())

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
	server := newTestServer(&StubRigClient{}, &StubModemClient{}, &StubCoordinatorClient{}, defaultFeatures())

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
