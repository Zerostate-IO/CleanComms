// Package http provides the HTTP API server for CleanComms daemon.
package http

import (
	"context"
	"log/slog"
	"net/http"
	"time"
)

// RigClient defines the interface for rig control operations.
// This will be implemented by the rigctld client in Task 5.
type RigClient interface {
	// Status returns the current rig status.
	Status() RigStatus
	// SetPTT sets the PTT state. Returns the new state or an error.
	SetPTT(state bool) (bool, error)
	// Health returns the health status of the rig connection.
	Health() HealthStatus
}

// ModemClient defines the interface for modem operations.
// This will be implemented by the fldigi client in Task 6.
type ModemClient interface {
	// Status returns the current modem status.
	Status() ModemStatus
	// Health returns the health status of the modem connection.
	Health() HealthStatus
}

// CoordinatorClient defines the interface for PTT coordination operations.
type CoordinatorClient interface {
	// SetPTT sets the PTT state through the coordinator.
	SetPTT(tx bool) error
	// GetPTT returns the current PTT state.
	GetPTT() bool
	// IsHealthy returns true if coordinator reports healthy state.
	IsHealthy() bool
}
// RigStatus represents the current state of the radio.
type RigStatus struct {
	Frequency int64  `json:"frequency"`
	Mode      string `json:"mode"`
	PTT       bool   `json:"ptt"`
	Connected bool   `json:"connected"`
}

// ModemStatus represents the current state of the modem.
type ModemStatus struct {
	Mode      string `json:"mode"`
	TX        bool   `json:"tx"`
	Connected bool   `json:"connected"`
}

// HealthStatus represents the health of a dependency.
type HealthStatus struct {
	OK      bool   `json:"ok"`
	Message string `json:"message,omitempty"`
}

// Server represents the HTTP API server.
type Server struct {
	server          *http.Server
	logger          *slog.Logger
	rigClient       RigClient
	modemClient     ModemClient
	coordinator     CoordinatorClient
	loggingClient   LoggingClient
	lookupClient    LookupClient
	featureFlags    map[string]bool
}

// NewServer creates a new HTTP server instance.
func NewServer(addr string, logger *slog.Logger, rigClient RigClient, modemClient ModemClient, coordinator CoordinatorClient, loggingClient LoggingClient, lookupClient LookupClient, features map[string]bool) *Server {
	s := &Server{
		logger:       logger,
		rigClient:    rigClient,
		modemClient:  modemClient,
		coordinator:  coordinator,
		loggingClient: loggingClient,
		lookupClient: lookupClient,
		featureFlags: features,
	}

	mux := http.NewServeMux()
	s.registerRoutes(mux)

	s.server = &http.Server{
		Addr:         addr,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	return s
}

// registerRoutes sets up all HTTP routes.
func (s *Server) registerRoutes(mux *http.ServeMux) {
	// Health endpoint
	mux.HandleFunc("GET /health", s.handleHealth)

	// Rig control endpoints
	mux.HandleFunc("GET /api/v1/rig/status", s.handleRigStatus)
	mux.HandleFunc("POST /api/v1/rig/ptt", s.handlePTT)

	// Modem status endpoint
	mux.HandleFunc("GET /api/v1/modem/status", s.handleModemStatus)

	// Logging endpoints
	mux.HandleFunc("POST /api/v1/log", s.handleLogCreate)
	mux.HandleFunc("GET /api/v1/log", s.handleLogList)

	// Lookup endpoint
	mux.HandleFunc("GET /api/v1/lookup/", s.handleLookup)
}

// Start starts the HTTP server.
func (s *Server) Start() error {
	s.logger.Info("HTTP server starting", "addr", s.server.Addr)
	return s.server.ListenAndServe()
}

// Shutdown gracefully shuts down the HTTP server.
func (s *Server) Shutdown(ctx context.Context) error {
	s.logger.Info("HTTP server shutting down")
	return s.server.Shutdown(ctx)
}
