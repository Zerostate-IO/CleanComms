package http

import (
	"encoding/json"
	"errors"
	"net/http"
)

// HealthResponse represents the health check response.
type HealthResponse struct {
	Status      string          `json:"status"`
	Rigctld     string          `json:"rigctld"`
	Fldigi      string          `json:"fldigi"`
	Features    map[string]bool `json:"features"`
	Coordinator string          `json:"coordinator"`
}

// PTTRequest represents the PTT control request.
type PTTRequest struct {
	State string `json:"state"`
}

// PTTResponse represents the PTT control response.
type PTTResponse struct {
	State string `json:"state"`
}

// ErrorResponse represents an error response.
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

// handleHealth handles GET /health requests.
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	rigHealth := "ok"
	modemHealth := "ok"
	coordinatorHealth := "ok"
	overallStatus := "ok"

	// Check rigctld health if client is configured
	if s.rigClient != nil {
		if !s.rigClient.Health().OK {
			rigHealth = "degraded"
			overallStatus = "degraded"
		}
	} else {
		rigHealth = "degraded"
		overallStatus = "degraded"
	}

	// Check fldigi health if client is configured
	if s.modemClient != nil {
		if !s.modemClient.Health().OK {
			modemHealth = "degraded"
			overallStatus = "degraded"
		}
	} else {
		modemHealth = "degraded"
		overallStatus = "degraded"
	}

	// Check coordinator health if configured
	if s.coordinator != nil {
		if !s.coordinator.IsHealthy() {
			coordinatorHealth = "degraded"
			overallStatus = "degraded"
		}
	} else {
		coordinatorHealth = "degraded"
		overallStatus = "degraded"
	}

	resp := HealthResponse{
		Status:      overallStatus,
		Rigctld:     rigHealth,
		Fldigi:      modemHealth,
		Features:    s.featureFlags,
		Coordinator: coordinatorHealth,
	}

	s.writeJSON(w, http.StatusOK, resp)
}

// handleRigStatus handles GET /api/v1/rig/status requests.
func (s *Server) handleRigStatus(w http.ResponseWriter, r *http.Request) {
	if s.rigClient == nil {
		s.writeJSON(w, http.StatusServiceUnavailable, ErrorResponse{
			Error:   "service_unavailable",
			Message: "rig client not configured",
		})
		return
	}

	status := s.rigClient.Status()
	s.writeJSON(w, http.StatusOK, status)
}

// handlePTT handles POST /api/v1/rig/ptt requests.
func (s *Server) handlePTT(w http.ResponseWriter, r *http.Request) {
	if s.coordinator == nil {
		s.writeJSON(w, http.StatusServiceUnavailable, ErrorResponse{
			Error:   "service_unavailable",
			Message: "coordinator not configured",
		})
		return
	}

	var req PTTRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "failed to parse request body",
		})
		return
	}

	// Validate state value
	var pttState bool
	switch req.State {
	case "tx":
		pttState = true
	case "rx":
		pttState = false
	default:
		s.writeJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_state",
			Message: "state must be 'tx' or 'rx'",
		})
		return
	}

	// Route PTT through coordinator (not direct rig access)
	if err := s.coordinator.SetPTT(pttState); err != nil {
		// Check for degraded state
		s.writeJSON(w, http.StatusServiceUnavailable, ErrorResponse{
			Error:   "ptt_blocked",
			Message: err.Error(),
		})
		return
	}

	resp := PTTResponse{
		State: "rx",
	}
	if s.coordinator.GetPTT() {
		resp.State = "tx"
	}

	s.writeJSON(w, http.StatusOK, resp)
}

// handleModemStatus handles GET /api/v1/modem/status requests.
func (s *Server) handleModemStatus(w http.ResponseWriter, r *http.Request) {
	if s.modemClient == nil {
		s.writeJSON(w, http.StatusServiceUnavailable, ErrorResponse{
			Error:   "service_unavailable",
			Message: "modem client not configured",
		})
		return
	}

	status := s.modemClient.Status()
	s.writeJSON(w, http.StatusOK, status)
}

// writeJSON writes a JSON response with the given status code.
func (s *Server) writeJSON(w http.ResponseWriter, statusCode int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	if err := json.NewEncoder(w).Encode(data); err != nil {
		s.logger.Error("failed to encode JSON response", "error", err)
	}
}

// Stub implementations for testing and development.
// These will be replaced by actual client implementations in Tasks 5 and 6.

// StubRigClient is a stub implementation of RigClient for testing.
type StubRigClient struct {
	StatusFunc func() RigStatus
	SetPTTFunc func(bool) (bool, error)
	HealthFunc func() HealthStatus
}

func (c *StubRigClient) Status() RigStatus {
	if c.StatusFunc != nil {
		return c.StatusFunc()
	}
	return RigStatus{
		Frequency: 14070000,
		Mode:      "USB",
		PTT:       false,
		Connected: true,
	}
}

func (c *StubRigClient) SetPTT(state bool) (bool, error) {
	if c.SetPTTFunc != nil {
		return c.SetPTTFunc(state)
	}
	return state, nil
}

func (c *StubRigClient) Health() HealthStatus {
	if c.HealthFunc != nil {
		return c.HealthFunc()
	}
	return HealthStatus{OK: true}
}

// StubModemClient is a stub implementation of ModemClient for testing.
type StubModemClient struct {
	StatusFunc func() ModemStatus
	HealthFunc func() HealthStatus
}

func (c *StubModemClient) Status() ModemStatus {
	if c.StatusFunc != nil {
		return c.StatusFunc()
	}
	return ModemStatus{
		Mode:      "PSK31",
		TX:        false,
		Connected: true,
	}
}

func (c *StubModemClient) Health() HealthStatus {
	if c.HealthFunc != nil {
		return c.HealthFunc()
	}
	return HealthStatus{OK: true}
}

// Ensure stubs implement interfaces.
var (
	_ RigClient       = (*StubRigClient)(nil)
	_ ModemClient     = (*StubModemClient)(nil)
	_ CoordinatorClient = (*StubCoordinatorClient)(nil)
)

// StubCoordinatorClient is a stub implementation of CoordinatorClient for testing.
type StubCoordinatorClient struct {
	SetPTTFunc    func(bool) error
	GetPTTFunc    func() bool
	IsHealthyFunc func() bool
}

func (c *StubCoordinatorClient) SetPTT(tx bool) error {
	if c.SetPTTFunc != nil {
		return c.SetPTTFunc(tx)
	}
	return nil
}

func (c *StubCoordinatorClient) GetPTT() bool {
	if c.GetPTTFunc != nil {
		return c.GetPTTFunc()
	}
	return false
}

func (c *StubCoordinatorClient) IsHealthy() bool {
	if c.IsHealthyFunc != nil {
		return c.IsHealthyFunc()
	}
	return true
}

// ErrNotImplemented is returned when a stub method is not implemented.
var ErrNotImplemented = errors.New("not implemented")
