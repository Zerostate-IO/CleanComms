// Package app provides the core application scaffold for CleanComms daemon.
package app

import (
	"context"
	"errors"
	"log/slog"
	"sync"
	"time"

	"github.com/Zerostate-IO/CleanComms/internal/fldigi"
	"github.com/Zerostate-IO/CleanComms/internal/http"
)

// ModemHealth represents the health status of the modem connection.
type ModemHealth struct {
	OK        bool      `json:"ok"`
	Error     string    `json:"error,omitempty"`
	Mode      string    `json:"mode,omitempty"`
	LastCheck time.Time `json:"last_check"`
}

// ModemStatus represents the current state of the modem.
type ModemStatus struct {
	Mode      string `json:"mode"`
	TX        bool   `json:"tx"`
	Connected bool   `json:"connected"`
}

// ModemService wraps the fldigi client with health monitoring and reconnection.
type ModemService struct {
	client *fldigi.Client
	logger *slog.Logger

	mu           sync.RWMutex
	health       ModemHealth
	status       ModemStatus
	connected    bool
	reconnecting bool

	// Configuration
	xmlrpcAddr     string
	defaultMode    string
	healthInterval time.Duration
	backoffConfig  BackoffConfig

	// Lifecycle
	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup
}

// NewModemService creates a new modem service with the given configuration.
func NewModemService(xmlrpcURL string, logger *slog.Logger) *ModemService {
	return &ModemService{
		client:         fldigi.NewClient(xmlrpcURL),
		logger:         logger,
		xmlrpcAddr:     xmlrpcURL,
		healthInterval: 5 * time.Second,
		backoffConfig:  DefaultBackoffConfig(),
		health: ModemHealth{
			OK:    false,
			Error: "not connected",
		},
		status: ModemStatus{
			Connected: false,
		},
	}
}

// SetDefaultMode configures the default mode to ensure after connection.
func (s *ModemService) SetDefaultMode(mode string) {
	s.mu.Lock()
	s.defaultMode = mode
	s.mu.Unlock()
}

// Connect establishes a connection to fldigi with exponential backoff.
// It blocks until connected or context is cancelled.
func (s *ModemService) Connect(ctx context.Context) error {
	s.mu.Lock()
	if s.connected {
		s.mu.Unlock()
		return nil
	}
	s.mu.Unlock()

	backoff := s.backoffConfig
	attempt := 0
	interval := backoff.InitialInterval

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		attempt++
		err := s.probe()
		if err == nil {
			s.mu.Lock()
			s.connected = true
			s.health = ModemHealth{
				OK:        true,
				Error:     "",
				Mode:      s.status.Mode,
				LastCheck: time.Now(),
			}
			s.status.Connected = true
			s.mu.Unlock()

			s.logger.Info("fldigi connection established",
				"addr", s.xmlrpcAddr,
				"mode", s.status.Mode,
				"attempts", attempt,
			)
			return nil
		}

		// Log the failure with attempt count
		s.logger.Warn("fldigi connection failed, retrying",
			"addr", s.xmlrpcAddr,
			"attempt", attempt,
			"error", err,
			"next_retry", interval,
		)

		// Update health status to reflect failure
		s.mu.Lock()
		s.health = ModemHealth{
			OK:        false,
			Error:     err.Error(),
			LastCheck: time.Now(),
		}
		s.mu.Unlock()

		// Check if we've exceeded max attempts
		if backoff.MaxAttempts > 0 && attempt >= backoff.MaxAttempts {
			return errors.New("fldigi: max connection attempts exceeded")
		}

		// Wait before retry
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(interval):
		}

		// Calculate next interval with exponential backoff
		interval = time.Duration(float64(interval) * backoff.Multiplier)
		if interval > backoff.MaxInterval {
			interval = backoff.MaxInterval
		}
	}
}

// probe checks if fldigi is reachable and updates status.
func (s *ModemService) probe() error {
	if err := s.client.Ping(); err != nil {
		return err
	}

	mode, err := s.client.GetMode()
	if err != nil {
		return err
	}

	tx, err := s.client.GetTX()
	if err != nil {
		return err
	}

	s.mu.Lock()
	s.status = ModemStatus{
		Mode:      mode,
		TX:        tx,
		Connected: true,
	}
	s.mu.Unlock()

	return nil
}

// Start begins the background health check goroutine.
// It also starts an async connection attempt.
func (s *ModemService) Start(ctx context.Context) {
	s.ctx, s.cancel = context.WithCancel(ctx)

	// Start health check goroutine
	s.wg.Add(1)
	go s.healthCheckLoop()

	// Start async connection attempt
	s.wg.Add(1)
	go s.connectionLoop()
}

// Stop stops the background goroutines.
func (s *ModemService) Stop() error {
	if s.cancel != nil {
		s.cancel()
	}
	s.wg.Wait()
	return nil
}

// healthCheckLoop periodically checks the health of the fldigi connection.
func (s *ModemService) healthCheckLoop() {
	defer s.wg.Done()

	ticker := time.NewTicker(s.healthInterval)
	defer ticker.Stop()

	for {
		select {
		case <-s.ctx.Done():
			return
		case <-ticker.C:
			s.performHealthCheck()
		}
	}
}

// connectionLoop manages the connection state and reconnection.
func (s *ModemService) connectionLoop() {
	defer s.wg.Done()

	// Initial connection attempt
	err := s.Connect(s.ctx)
	if err != nil {
		s.logger.Error("initial fldigi connection failed", "error", err)
	}

	// Ensure default mode after initial connection
	s.mu.RLock()
	defaultMode := s.defaultMode
	s.mu.RUnlock()

	if defaultMode != "" && s.connected {
		if ensureErr := s.EnsureMode(defaultMode); ensureErr != nil {
			s.logger.Warn("failed to ensure default mode after connection",
				"mode", defaultMode,
				"error", ensureErr,
			)
		}
	}

	// Monitor connection and reconnect if needed
	ticker := time.NewTicker(s.healthInterval)
	defer ticker.Stop()

	for {
		select {
		case <-s.ctx.Done():
			return
		case <-ticker.C:
			s.mu.RLock()
			connected := s.connected
			reconnecting := s.reconnecting
			s.mu.RUnlock()

			if !connected && !reconnecting {
				// Connection lost, attempt reconnect
				s.mu.Lock()
				s.reconnecting = true
				s.mu.Unlock()

				go func() {
					defer func() {
						s.mu.Lock()
						s.reconnecting = false
						s.mu.Unlock()
					}()

					err := s.Connect(s.ctx)
					if err != nil {
						s.logger.Error("fldigi reconnection failed", "error", err)
						return
					}

					// Ensure default mode after reconnection
					s.mu.RLock()
					mode := s.defaultMode
					s.mu.RUnlock()

					if mode != "" {
						if ensureErr := s.EnsureMode(mode); ensureErr != nil {
							s.logger.Warn("failed to ensure mode after reconnection",
								"mode", mode,
								"error", ensureErr,
							)
						}
					}
				}()
			}
		}
	}
}

// performHealthCheck checks the connection health via ping.
func (s *ModemService) performHealthCheck() {
	s.mu.RLock()
	connected := s.connected
	s.mu.RUnlock()

	if !connected {
		return
	}

	err := s.probe()
	now := time.Now()

	s.mu.Lock()
	defer s.mu.Unlock()

	if err != nil {
		s.logger.Warn("fldigi health check failed",
			"error", err,
			"last_check", now,
		)
		s.health = ModemHealth{
			OK:        false,
			Error:     err.Error(),
			LastCheck: now,
		}
		s.connected = false
		s.status.Connected = false
	} else {
		s.health = ModemHealth{
			OK:        true,
			Error:     "",
			Mode:      s.status.Mode,
			LastCheck: now,
		}
	}
}

// Health returns the current health status.
func (s *ModemService) Health() ModemHealth {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.health
}

// Status returns the current modem status.
func (s *ModemService) Status() ModemStatus {
	s.mu.RLock()
	connected := s.connected
	s.mu.RUnlock()

	if !connected {
		return ModemStatus{Connected: false}
	}

	// Fetch current values from fldigi
	mode, err := s.client.GetMode()
	if err != nil {
		s.logger.Warn("failed to get mode", "error", err)
	}

	tx, err := s.client.GetTX()
	if err != nil {
		s.logger.Warn("failed to get TX state", "error", err)
	}

	s.mu.Lock()
	s.status = ModemStatus{
		Mode:      mode,
		TX:        tx,
		Connected: true,
	}
	status := s.status
	s.mu.Unlock()

	return status
}

// EnsureMode sets the modem mode idempotently.
// It returns nil if the mode is already set to the requested value.
func (s *ModemService) EnsureMode(mode string) error {
	s.mu.RLock()
	connected := s.connected
	currentMode := s.status.Mode
	s.mu.RUnlock()

	if !connected {
		return errors.New("fldigi: not connected")
	}

	// Check if already in requested mode
	if currentMode == mode {
		s.logger.Debug("mode already set", "mode", mode)
		return nil
	}

	s.logger.Info("setting modem mode", "from", currentMode, "to", mode)

	if err := s.client.SetMode(mode); err != nil {
		s.logger.Error("failed to set mode", "mode", mode, "error", err)
		return err
	}

	// Update cached status
	s.mu.Lock()
	s.status.Mode = mode
	s.health.Mode = mode
	s.mu.Unlock()

	s.logger.Info("mode set successfully", "mode", mode)
	return nil
}

// IsConnected returns whether the service is currently connected.
func (s *ModemService) IsConnected() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.connected
}

// modemClientAdapter adapts ModemService to http.ModemClient interface.
type modemClientAdapter struct {
	service *ModemService
}

func (a *modemClientAdapter) Status() http.ModemStatus {
	s := a.service.Status()
	return http.ModemStatus{
		Mode:      s.Mode,
		TX:        s.TX,
		Connected: s.Connected,
	}
}

func (a *modemClientAdapter) Health() http.HealthStatus {
	h := a.service.Health()
	return http.HealthStatus{
		OK:      h.OK,
		Message: h.Error,
	}
}

// Ensure ModemService implements http.ModemClient interface (through adapter).
var _ http.ModemClient = (*modemClientAdapter)(nil)
