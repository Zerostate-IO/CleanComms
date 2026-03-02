package http

import (
	"context"
	"net/http"
	"strings"

	"github.com/Zerostate-IO/CleanComms/internal/lookup"
)

// LookupClient defines the interface for callsign lookup operations.
type LookupClient interface {
	// Lookup performs a callsign lookup.
	Lookup(ctx context.Context, callsign string) (*lookup.CallsignInfo, error)

	// IsEnabled returns true if lookup is configured and enabled.
	IsEnabled() bool
}

// LookupResponse represents the response for a callsign lookup.
type LookupResponse struct {
	Callsign     string `json:"callsign"`
	Name         string `json:"name,omitempty"`
	Address      string `json:"address,omitempty"`
	City         string `json:"city,omitempty"`
	State        string `json:"state,omitempty"`
	PostalCode   string `json:"postal_code,omitempty"`
	Country      string `json:"country,omitempty"`
	Grid         string `json:"grid,omitempty"`
	LicenseClass string `json:"license_class,omitempty"`
	Source       string `json:"source"`
}

// handleLookup handles GET /api/v1/lookup/{callsign} requests.
func (s *Server) handleLookup(w http.ResponseWriter, r *http.Request) {
	// Check if lookup is enabled
	if s.lookupClient == nil || !s.lookupClient.IsEnabled() {
		s.writeJSON(w, http.StatusServiceUnavailable, ErrorResponse{
			Error:   "service_unavailable",
			Message: "lookup service not configured",
		})
		return
	}

	// Extract callsign from path
	// Path format: /api/v1/lookup/{callsign}
	path := r.URL.Path
	parts := strings.Split(path, "/")
	if len(parts) < 5 || parts[4] == "" {
		s.writeJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "callsign is required",
		})
		return
	}

	callsign := strings.ToUpper(strings.TrimSpace(parts[4]))
	if callsign == "" {
		s.writeJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: "callsign is required",
		})
		return
	}

	// Perform lookup
	info, err := s.lookupClient.Lookup(r.Context(), callsign)
	if err != nil {
		// Check error type
		if strings.Contains(err.Error(), "not found") {
			s.writeJSON(w, http.StatusNotFound, ErrorResponse{
				Error:   "not_found",
				Message: "callsign not found in database",
			})
			return
		}

		s.writeJSON(w, http.StatusServiceUnavailable, ErrorResponse{
			Error:   "lookup_failed",
			Message: "unable to perform lookup",
		})
		return
	}

	// Build response
	resp := LookupResponse{
		Callsign:     info.Callsign,
		Name:         info.Name,
		Address:      info.Address,
		City:         info.City,
		State:        info.State,
		PostalCode:   info.PostalCode,
		Country:      info.Country,
		Grid:         info.Grid,
		LicenseClass: info.LicenseClass,
		Source:       info.Source,
	}

	s.writeJSON(w, http.StatusOK, resp)
}

// StubLookupClient is a stub implementation of LookupClient for testing.
type StubLookupClient struct {
	LookupFunc func(ctx context.Context, callsign string) (*lookup.CallsignInfo, error)
	Enabled    bool
}

func (c *StubLookupClient) Lookup(ctx context.Context, callsign string) (*lookup.CallsignInfo, error) {
	if c.LookupFunc != nil {
		return c.LookupFunc(ctx, callsign)
	}
	return &lookup.CallsignInfo{
		Callsign: callsign,
		Name:     "Test Operator",
		City:     "Anytown",
		State:    "CA",
		Country:  "United States",
		Source:   "stub",
	}, nil
}

func (c *StubLookupClient) IsEnabled() bool {
	return c.Enabled
}

// Ensure stub implements interface
var _ LookupClient = (*StubLookupClient)(nil)
