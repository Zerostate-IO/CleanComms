package http

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestHealthContract verifies the health endpoint response structure.
func TestHealthContract(t *testing.T) {
	server := newTestServer(&StubRigClient{}, &StubModemClient{}, &StubCoordinatorClient{}, defaultFeatures())

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	server.handleHealth(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	// Verify Content-Type
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", ct)
	}

	// Parse response as raw map to verify field presence
	var resp map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Verify required fields exist
	requiredFields := []string{"status", "rigctld", "fldigi", "features", "coordinator"}
	for _, field := range requiredFields {
		if _, exists := resp[field]; !exists {
			t.Errorf("missing required field %q in health response", field)
		}
	}

	// Verify field types for string fields
	stringFields := []string{"status", "rigctld", "fldigi", "coordinator"}
	for _, field := range stringFields {
		if _, ok := resp[field].(string); !ok {
			t.Errorf("field %q should be string, got %T", field, resp[field])
		}
	}

	// Verify features is a map
	if _, ok := resp["features"].(map[string]any); !ok {
		t.Errorf("field 'features' should be map, got %T", resp["features"])
	}

	t.Logf("Health response structure verified: %v", resp)
}

// TestRigStatusContract verifies the rig status endpoint response structure.
func TestRigStatusContract(t *testing.T) {
	server := newTestServer(&StubRigClient{}, nil, &StubCoordinatorClient{}, defaultFeatures())

	req := httptest.NewRequest(http.MethodGet, "/api/v1/rig/status", nil)
	rec := httptest.NewRecorder()

	server.handleRigStatus(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	// Verify Content-Type
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", ct)
	}

	// Parse response as raw map to verify field presence
	var resp map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Verify required fields exist with correct types
	fieldChecks := map[string]string{
		"frequency": "float64", // JSON numbers decode as float64
		"mode":      "string",
		"ptt":       "bool",
		"connected": "bool",
	}

	for field, expectedType := range fieldChecks {
		val, exists := resp[field]
		if !exists {
			t.Errorf("missing required field %q in rig status response", field)
			continue
		}

		// Type check
		switch expectedType {
		case "string":
			if _, ok := val.(string); !ok {
				t.Errorf("field %q should be string, got %T", field, val)
			}
		case "bool":
			if _, ok := val.(bool); !ok {
				t.Errorf("field %q should be bool, got %T", field, val)
			}
		case "float64":
			if _, ok := val.(float64); !ok {
				t.Errorf("field %q should be numeric, got %T", field, val)
			}
		}
	}

	t.Logf("Rig status response structure verified: %v", resp)
}

// TestModemStatusContract verifies the modem status endpoint response structure.
func TestModemStatusContract(t *testing.T) {
	server := newTestServer(nil, &StubModemClient{}, &StubCoordinatorClient{}, defaultFeatures())

	req := httptest.NewRequest(http.MethodGet, "/api/v1/modem/status", nil)
	rec := httptest.NewRecorder()

	server.handleModemStatus(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	// Verify Content-Type
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", ct)
	}

	// Parse response as raw map to verify field presence
	var resp map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Verify required fields exist with correct types
	fieldChecks := map[string]string{
		"mode":      "string",
		"tx":        "bool",
		"connected": "bool",
	}

	for field, expectedType := range fieldChecks {
		val, exists := resp[field]
		if !exists {
			t.Errorf("missing required field %q in modem status response", field)
			continue
		}

		// Type check
		switch expectedType {
		case "string":
			if _, ok := val.(string); !ok {
				t.Errorf("field %q should be string, got %T", field, val)
			}
		case "bool":
			if _, ok := val.(bool); !ok {
				t.Errorf("field %q should be bool, got %T", field, val)
			}
		}
	}

	t.Logf("Modem status response structure verified: %v", resp)
}

// TestPTTContract verifies PTT endpoint accepts valid states and rejects invalid ones.
func TestPTTContract(t *testing.T) {
	t.Run("accepts tx", func(t *testing.T) {
		server := newTestServer(nil, nil, &StubCoordinatorClient{
			SetPTTFunc: func(tx bool) error { return nil },
			GetPTTFunc: func() bool { return true },
		}, defaultFeatures())

		body := bytes.NewBufferString(`{"state":"tx"}`)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/rig/ptt", body)
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		server.handlePTT(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected status %d for tx, got %d: %s", http.StatusOK, rec.Code, rec.Body.String())
		}

		var resp PTTResponse
		if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if resp.State != "tx" {
			t.Errorf("expected state 'tx', got %q", resp.State)
		}
	})

	t.Run("accepts rx", func(t *testing.T) {
		server := newTestServer(nil, nil, &StubCoordinatorClient{
			SetPTTFunc: func(tx bool) error { return nil },
			GetPTTFunc: func() bool { return false },
		}, defaultFeatures())

		body := bytes.NewBufferString(`{"state":"rx"}`)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/rig/ptt", body)
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		server.handlePTT(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected status %d for rx, got %d: %s", http.StatusOK, rec.Code, rec.Body.String())
		}

		var resp PTTResponse
		if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if resp.State != "rx" {
			t.Errorf("expected state 'rx', got %q", resp.State)
		}
	})

	t.Run("rejects invalid state with 400", func(t *testing.T) {
		server := newTestServer(nil, nil, &StubCoordinatorClient{}, defaultFeatures())

		invalidStates := []string{"TX", "RX", "transmit", "receive", "1", "0", "true", "false", ""}
		for _, state := range invalidStates {
			t.Run(state, func(t *testing.T) {
				body := bytes.NewBufferString(`{"state":"` + state + `"}`)
				req := httptest.NewRequest(http.MethodPost, "/api/v1/rig/ptt", body)
				req.Header.Set("Content-Type", "application/json")
				rec := httptest.NewRecorder()

				server.handlePTT(rec, req)

				if rec.Code != http.StatusBadRequest {
					t.Errorf("expected status %d for invalid state %q, got %d", http.StatusBadRequest, state, rec.Code)
				}

				var resp ErrorResponse
				if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
					t.Fatalf("failed to decode error response: %v", err)
				}

				// Verify error code
				if resp.Error != "invalid_state" {
					t.Errorf("expected error code 'invalid_state', got %q", resp.Error)
				}

				// Verify helpful message mentions allowed values
				if resp.Message == "" {
					t.Error("expected error message to include allowed values, got empty message")
				}

				t.Logf("Invalid state %q correctly rejected: error=%q message=%q", state, resp.Error, resp.Message)
			})
		}
	})

	t.Run("rejects malformed JSON with 400", func(t *testing.T) {
		server := newTestServer(nil, nil, &StubCoordinatorClient{}, defaultFeatures())

		body := bytes.NewBufferString(`not json`)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/rig/ptt", body)
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		server.handlePTT(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected status %d for malformed JSON, got %d", http.StatusBadRequest, rec.Code)
		}

		var resp ErrorResponse
		if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode error response: %v", err)
		}

		if resp.Error != "invalid_request" {
			t.Errorf("expected error code 'invalid_request', got %q", resp.Error)
		}
	})
}
