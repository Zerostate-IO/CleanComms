package http

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/Zerostate-IO/CleanComms/internal/storage"
)

// QSOEntryRequest represents a QSO log entry request.
type QSOEntryRequest struct {
	Callsign    string `json:"callsign"`
	FrequencyHz int64  `json:"frequency_hz"`
	Mode        string `json:"mode"`
	PowerWatts  int    `json:"power_watts,omitempty"`
	Notes       string `json:"notes,omitempty"`
	Source      string `json:"source,omitempty"`
}

// QSOEntryResponse represents a QSO log entry in responses.
type QSOEntryResponse struct {
	ID          int64  `json:"id"`
	Timestamp   string `json:"timestamp"`
	Callsign    string `json:"callsign"`
	FrequencyHz int64  `json:"frequency_hz"`
	Mode        string `json:"mode"`
	PowerWatts  int    `json:"power_watts,omitempty"`
	Notes       string `json:"notes,omitempty"`
	Source      string `json:"source"`
}

// LogEntriesResponse represents a paginated list of log entries.
type LogEntriesResponse struct {
	Entries []QSOEntryResponse `json:"entries"`
	Total   int                `json:"total"`
	Limit   int                `json:"limit"`
	Offset  int                `json:"offset"`
}

// LogEntryCreatedResponse represents the response after creating a log entry.
type LogEntryCreatedResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}

// LoggingClient defines the interface for logging operations.
type LoggingClient interface {
	LogQSO(entry *storage.QSOEntry) error
	GetQSOEntries(limit, offset int) ([]storage.QSOEntry, int, error)
	Health() storage.LoggingHealth
}

// handleLogCreate handles POST /api/v1/log requests.
func (s *Server) handleLogCreate(w http.ResponseWriter, r *http.Request) {
	if s.loggingClient == nil {
		s.writeJSON(w, http.StatusServiceUnavailable, ErrorResponse{
			Error:   "service_unavailable",
			Message: "logging service not configured",
		})
		return
	}

	var req QSOEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "failed to parse request body",
		})
		return
	}

	// Validate required fields
	if req.Callsign == "" {
		s.writeJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "callsign is required",
		})
		return
	}

	if req.FrequencyHz <= 0 {
		s.writeJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "frequency_hz must be positive",
		})
		return
	}

	if req.Mode == "" {
		s.writeJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "mode is required",
		})
		return
	}

	// Set default source if not provided
	if req.Source == "" {
		req.Source = "api"
	}

	// Create entry
	entry := &storage.QSOEntry{
		Callsign:    req.Callsign,
		FrequencyHz: req.FrequencyHz,
		Mode:        req.Mode,
		PowerWatts:  req.PowerWatts,
		Notes:       req.Notes,
		Source:      req.Source,
	}

	if err := s.loggingClient.LogQSO(entry); err != nil {
		s.writeJSON(w, http.StatusInternalServerError, ErrorResponse{
			Error:   "log_failed",
			Message: err.Error(),
		})
		return
	}

	s.writeJSON(w, http.StatusCreated, LogEntryCreatedResponse{
		Success: true,
		Message: "QSO entry queued for logging",
	})
}

// handleLogList handles GET /api/v1/log requests.
func (s *Server) handleLogList(w http.ResponseWriter, r *http.Request) {
	if s.loggingClient == nil {
		s.writeJSON(w, http.StatusServiceUnavailable, ErrorResponse{
			Error:   "service_unavailable",
			Message: "logging service not configured",
		})
		return
	}

	// Parse pagination parameters
	limit := 100
	offset := 0

	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 {
			limit = val
		}
	}

	if o := r.URL.Query().Get("offset"); o != "" {
		if val, err := strconv.Atoi(o); err == nil && val >= 0 {
			offset = val
		}
	}

	// Query entries
	entries, total, err := s.loggingClient.GetQSOEntries(limit, offset)
	if err != nil {
		s.writeJSON(w, http.StatusInternalServerError, ErrorResponse{
			Error:   "query_failed",
			Message: err.Error(),
		})
		return
	}

	// Convert to response format
	response := LogEntriesResponse{
		Entries: convertQSOEntries(entries),
		Total:   total,
		Limit:   limit,
		Offset:  offset,
	}

	s.writeJSON(w, http.StatusOK, response)
}

// convertQSOEntries converts storage entries to HTTP response format.
func convertQSOEntries(entries []storage.QSOEntry) []QSOEntryResponse {
	if entries == nil {
		return []QSOEntryResponse{}
	}

	result := make([]QSOEntryResponse, len(entries))
	for i, e := range entries {
		result[i] = QSOEntryResponse{
			ID:          e.ID,
			Timestamp:   e.Timestamp.Format("2006-01-02T15:04:05Z"),
			Callsign:    e.Callsign,
			FrequencyHz: e.FrequencyHz,
			Mode:        e.Mode,
			PowerWatts:  e.PowerWatts,
			Notes:       e.Notes,
			Source:      e.Source,
		}
	}
	return result
}

// loggingClientAdapter adapts storage.LoggingService to LoggingClient interface.
type loggingClientAdapter struct {
	service *storage.LoggingService
}

func NewLoggingClientAdapter(service *storage.LoggingService) LoggingClient {
	return &loggingClientAdapter{service: service}
}

func (a *loggingClientAdapter) LogQSO(entry *storage.QSOEntry) error {
	return a.service.LogQSO(entry)
}

func (a *loggingClientAdapter) GetQSOEntries(limit, offset int) ([]storage.QSOEntry, int, error) {
	return a.service.GetQSOEntries(limit, offset)
}

func (a *loggingClientAdapter) Health() storage.LoggingHealth {
	return a.service.Health()
}

// StubLoggingClient is a stub implementation of LoggingClient for testing.
type StubLoggingClient struct {
	LogQSOFunc        func(entry *storage.QSOEntry) error
	GetQSOEntriesFunc func(limit, offset int) ([]storage.QSOEntry, int, error)
	HealthFunc        func() storage.LoggingHealth
}

func (c *StubLoggingClient) LogQSO(entry *storage.QSOEntry) error {
	if c.LogQSOFunc != nil {
		return c.LogQSOFunc(entry)
	}
	return nil
}

func (c *StubLoggingClient) GetQSOEntries(limit, offset int) ([]storage.QSOEntry, int, error) {
	if c.GetQSOEntriesFunc != nil {
		return c.GetQSOEntriesFunc(limit, offset)
	}
	return []storage.QSOEntry{}, 0, nil
}

func (c *StubLoggingClient) Health() storage.LoggingHealth {
	if c.HealthFunc != nil {
		return c.HealthFunc()
	}
	return storage.LoggingHealth{OK: true}
}

// Ensure stubs implement interfaces.
var _ LoggingClient = (*StubLoggingClient)(nil)
var _ LoggingClient = (*loggingClientAdapter)(nil)
