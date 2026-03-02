package http

import (
	"encoding/json"
	"net/http"

	"github.com/Zerostate-IO/CleanComms/internal/ai"
)

// AIClient defines the interface for AI service operations.
// This is used for V2 signal classification features.
type AIClient interface {
	// ClassifySignal performs signal classification.
	ClassifySignal(req *ai.ClassifySignalRequest) (*ai.ClassifySignalResponse, error)

	// IsHealthy returns true if the AI service is operational.
	IsHealthy() bool

	// IsEnabled returns true if the AI service is configured and enabled.
	IsEnabled() bool

	// GetQueueStats returns statistics about the inference queue.
	GetQueueStats() ai.QueueStats

	// ActivateKillSwitch activates the emergency kill switch.
	ActivateKillSwitch()

	// DeactivateKillSwitch deactivates the kill switch.
	DeactivateKillSwitch()

	// IsKillSwitchActive returns true if kill switch is active.
	IsKillSwitchActive() bool
}

// ClassifySignalRequestWrapper wraps the AI classify request for HTTP.
type ClassifySignalRequestWrapper struct {
	Frequency  int64             `json:"frequency"`
	Mode       string            `json:"mode"`
	Bandwidth  int               `json:"bandwidth"`
	SampleRate int               `json:"sample_rate"`
	AudioData  []byte            `json:"audio_data,omitempty"`
	Metadata   map[string]string `json:"metadata,omitempty"`
}

// ClassifySignalResponseWrapper wraps the AI classify response for HTTP.
type ClassifySignalResponseWrapper struct {
	RequestID       string                 `json:"request_id"`
	SignalType      string                 `json:"signal_type"`
	Confidence      float64                `json:"confidence"`
	ConfidenceLevel string                 `json:"confidence_level"`
	DetectedMode    string                 `json:"detected_mode,omitempty"`
	ProcessingMs    int64                  `json:"processing_time_ms"`
	ModelVersion    string                 `json:"model_version"`
	AdditionalInfo  map[string]interface{} `json:"additional_info,omitempty"`
}

// KillSwitchRequest represents a kill switch control request.
type KillSwitchRequest struct {
	Action string `json:"action"` // "activate" or "deactivate"
}

// KillSwitchResponse represents the kill switch status response.
type KillSwitchResponse struct {
	Active  bool   `json:"active"`
	Message string `json:"message,omitempty"`
}

// QueueStatsResponse represents queue statistics response.
type QueueStatsResponse struct {
	Stats ai.QueueStats `json:"stats"`
}

// handleClassifySignal handles POST /api/v2/signal/classify requests.
// Returns 404 if the V2 feature is disabled.
func (s *Server) handleClassifySignal(w http.ResponseWriter, r *http.Request) {
	// Check if V2 signal classification is enabled
	if !s.isFeatureEnabled("signal_id_v2_enabled") {
		s.writeJSON(w, http.StatusNotFound, ErrorResponse{
			Error:   "not_found",
			Message: "V2 signal classification is not enabled",
		})
		return
	}

	// Check if AI client is configured
	if s.aiClient == nil || !s.aiClient.IsEnabled() {
		s.writeJSON(w, http.StatusServiceUnavailable, ErrorResponse{
			Error:   "service_unavailable",
			Message: "AI service not configured",
		})
		return
	}

	// Check kill switch
	if s.aiClient.IsKillSwitchActive() {
		s.writeJSON(w, http.StatusServiceUnavailable, ErrorResponse{
			Error:   "kill_switch_active",
			Message: "AI service is in emergency stop mode",
		})
		return
	}

	// Parse request
	var reqWrapper ClassifySignalRequestWrapper
	if err := json.NewDecoder(r.Body).Decode(&reqWrapper); err != nil {
		s.writeJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "failed to parse request body",
		})
		return
	}

	// Convert to internal request
	req := &ai.ClassifySignalRequest{
		Version:    ai.ContractVersion,
		Frequency:  reqWrapper.Frequency,
		Mode:       reqWrapper.Mode,
		Bandwidth:  reqWrapper.Bandwidth,
		SampleRate: reqWrapper.SampleRate,
		AudioData:  reqWrapper.AudioData,
		Metadata:   reqWrapper.Metadata,
	}

	// Perform classification
	resp, err := s.aiClient.ClassifySignal(req)
	if err != nil {
		s.writeJSON(w, http.StatusInternalServerError, ErrorResponse{
			Error:   "classification_failed",
			Message: err.Error(),
		})
		return
	}

	// Convert to HTTP response
	respWrapper := ClassifySignalResponseWrapper{
		RequestID:       resp.RequestID,
		SignalType:      string(resp.SignalType),
		Confidence:      resp.Confidence,
		ConfidenceLevel: string(resp.ConfidenceLevel),
		DetectedMode:    resp.DetectedMode,
		ProcessingMs:    resp.ProcessingTimeMs,
		ModelVersion:    resp.ModelVersion,
		AdditionalInfo:  resp.AdditionalInfo,
	}

	s.writeJSON(w, http.StatusOK, respWrapper)
}

// handleKillSwitch handles POST /api/v2/signal/killswitch requests.
// Returns 404 if the V2 feature is disabled.
func (s *Server) handleKillSwitch(w http.ResponseWriter, r *http.Request) {
	// Check if V2 signal classification is enabled
	if !s.isFeatureEnabled("signal_id_v2_enabled") {
		s.writeJSON(w, http.StatusNotFound, ErrorResponse{
			Error:   "not_found",
			Message: "V2 signal classification is not enabled",
		})
		return
	}

	// Check if AI client is configured
	if s.aiClient == nil {
		s.writeJSON(w, http.StatusServiceUnavailable, ErrorResponse{
			Error:   "service_unavailable",
			Message: "AI service not configured",
		})
		return
	}

	var req KillSwitchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "failed to parse request body",
		})
		return
	}

	switch req.Action {
	case "activate":
		s.aiClient.ActivateKillSwitch()
		s.writeJSON(w, http.StatusOK, KillSwitchResponse{
			Active:  true,
			Message: "Kill switch activated - all AI operations stopped",
		})
	case "deactivate":
		s.aiClient.DeactivateKillSwitch()
		s.writeJSON(w, http.StatusOK, KillSwitchResponse{
			Active:  false,
			Message: "Kill switch deactivated - AI operations resumed",
		})
	default:
		s.writeJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_action",
			Message: "action must be 'activate' or 'deactivate'",
		})
	}
}

// handleGetKillSwitch handles GET /api/v2/signal/killswitch requests.
// Returns 404 if the V2 feature is disabled.
func (s *Server) handleGetKillSwitch(w http.ResponseWriter, r *http.Request) {
	// Check if V2 signal classification is enabled
	if !s.isFeatureEnabled("signal_id_v2_enabled") {
		s.writeJSON(w, http.StatusNotFound, ErrorResponse{
			Error:   "not_found",
			Message: "V2 signal classification is not enabled",
		})
		return
	}

	// Check if AI client is configured
	if s.aiClient == nil {
		s.writeJSON(w, http.StatusOK, KillSwitchResponse{
			Active:  false,
			Message: "AI service not configured",
		})
		return
	}

	s.writeJSON(w, http.StatusOK, KillSwitchResponse{
		Active: s.aiClient.IsKillSwitchActive(),
	})
}

// handleQueueStats handles GET /api/v2/signal/queue requests.
// Returns 404 if the V2 feature is disabled.
func (s *Server) handleQueueStats(w http.ResponseWriter, r *http.Request) {
	// Check if V2 signal classification is enabled
	if !s.isFeatureEnabled("signal_id_v2_enabled") {
		s.writeJSON(w, http.StatusNotFound, ErrorResponse{
			Error:   "not_found",
			Message: "V2 signal classification is not enabled",
		})
		return
	}

	// Check if AI client is configured
	if s.aiClient == nil {
		s.writeJSON(w, http.StatusServiceUnavailable, ErrorResponse{
			Error:   "service_unavailable",
			Message: "AI service not configured",
		})
		return
	}

	stats := s.aiClient.GetQueueStats()
	s.writeJSON(w, http.StatusOK, QueueStatsResponse{Stats: stats})
}

// isFeatureEnabled checks if a feature flag is enabled.
func (s *Server) isFeatureEnabled(name string) bool {
	if s.featureFlags == nil {
		return false
	}
	return s.featureFlags[name]
}

// StubAIClient is a stub implementation of AIClient for testing.
type StubAIClient struct {
	ClassifySignalFunc func(req *ai.ClassifySignalRequest) (*ai.ClassifySignalResponse, error)
	Healthy            bool
	Enabled            bool
	KillSwitchActive   bool
	QueueStats         ai.QueueStats
}

func (c *StubAIClient) ClassifySignal(req *ai.ClassifySignalRequest) (*ai.ClassifySignalResponse, error) {
	if c.ClassifySignalFunc != nil {
		return c.ClassifySignalFunc(req)
	}
	return &ai.ClassifySignalResponse{
		Version:          ai.ContractVersion,
		RequestID:        req.RequestID,
		SignalType:       ai.SignalTypeDigital,
		Confidence:       0.85,
		ConfidenceLevel:  ai.ConfidenceHigh,
		DetectedMode:     "FT8",
		ProcessingTimeMs: 150,
		ModelVersion:     "stub-v1",
	}, nil
}

func (c *StubAIClient) IsHealthy() bool {
	return c.Healthy
}

func (c *StubAIClient) IsEnabled() bool {
	return c.Enabled
}

func (c *StubAIClient) GetQueueStats() ai.QueueStats {
	return c.QueueStats
}

func (c *StubAIClient) ActivateKillSwitch() {
	c.KillSwitchActive = true
}

func (c *StubAIClient) DeactivateKillSwitch() {
	c.KillSwitchActive = false
}

func (c *StubAIClient) IsKillSwitchActive() bool {
	return c.KillSwitchActive
}

// Ensure stub implements interface.
var _ AIClient = (*StubAIClient)(nil)
