// Package app provides the core application scaffold for CleanComms daemon.
package app

import (
	"context"
	"errors"
	"log/slog"
	"sync"
	"time"

	"github.com/Zerostate-IO/CleanComms/internal/rigctld"
)

// RigHealth represents the health status of the rig connection.
type RigHealth struct {
	OK        bool      `json:"ok"`
	Error     string    `json:"error,omitempty"`
	LastCheck time.Time `json:"last_check"`
}

// RigStatus represents the current state of the radio.
type RigStatus struct {
	Frequency int64  `json:"frequency"`
	Mode      string `json:"mode"`
	PTT       bool   `json:"ptt"`
	Connected bool   `json:"connected"`
}

// RigService wraps the rigctld client with health monitoring and reconnection.
type RigService struct {
	client *rigctld.Client
	logger *slog.Logger

	mu           sync.RWMutex
	health       RigHealth
	status       RigStatus
	connected    bool
	reconnecting bool

	// Configuration
	host           string
	port           int
	healthInterval time.Duration
	backoffConfig  BackoffConfig

	// Lifecycle
	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup
}

// BackoffConfig holds exponential backoff configuration.
type BackoffConfig struct {
	InitialInterval time.Duration
	MaxInterval     time.Duration
	Multiplier      float64
	MaxAttempts     int // 0 means unlimited
}

// DefaultBackoffConfig returns the default backoff configuration.
func DefaultBackoffConfig() BackoffConfig {
	return BackoffConfig{
		InitialInterval: 1 * time.Second,
		MaxInterval:     30 * time.Second,
		Multiplier:      2.0,
		MaxAttempts:     0, // unlimited
	}
}

// NewRigService creates a new rig service with the given configuration.
func NewRigService(host string, port int, logger *slog.Logger) *RigService {
	return &RigService{
		client:         rigctld.NewClient(host, port),
		logger:         logger,
		host:           host,
		port:           port,
		healthInterval: 5 * time.Second,
		backoffConfig:  DefaultBackoffConfig(),
		health: RigHealth{
			OK:        false,
			Error:     "not connected",
			LastCheck: time.Time{},
		},
		status: RigStatus{
			Connected: false,
		},
	}
}

// Connect establishes a connection to rigctld with exponential backoff.
// It blocks until connected or context is cancelled.
func (s *RigService) Connect(ctx context.Context) error {
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
		err := s.client.Connect()
		if err == nil {
			s.mu.Lock()
			s.connected = true
			s.health = RigHealth{
				OK:        true,
				Error:     "",
				LastCheck: time.Now(),
			}
			s.status.Connected = true
			s.mu.Unlock()

			s.logger.Info("rigctld connection established",
				"host", s.host,
				"port", s.port,
				"attempts", attempt,
			)
			return nil
		}

		// Log the failure with attempt count
		s.logger.Warn("rigctld connection failed, retrying",
			"host", s.host,
			"port", s.port,
			"attempt", attempt,
			"error", err,
			"next_retry", interval,
		)

		// Update health status to reflect failure
		s.mu.Lock()
		s.health = RigHealth{
			OK:        false,
			Error:     err.Error(),
			LastCheck: time.Now(),
		}
		s.mu.Unlock()

		// Check if we've exceeded max attempts
		if backoff.MaxAttempts > 0 && attempt >= backoff.MaxAttempts {
			return errors.New("rigctld: max connection attempts exceeded")
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

// Start begins the background health check goroutine.
// It also starts an async connection attempt.
func (s *RigService) Start(ctx context.Context) {
	s.ctx, s.cancel = context.WithCancel(ctx)

	// Start health check goroutine
	s.wg.Add(1)
	go s.healthCheckLoop()

	// Start async connection attempt
	s.wg.Add(1)
	go s.connectionLoop()
}

// Stop stops the background goroutines and disconnects.
func (s *RigService) Stop() error {
	if s.cancel != nil {
		s.cancel()
	}
	s.wg.Wait()

	if s.client != nil {
		return s.client.Disconnect()
	}
	return nil
}

// healthCheckLoop periodically checks the health of the rigctld connection.
func (s *RigService) healthCheckLoop() {
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
func (s *RigService) connectionLoop() {
	defer s.wg.Done()

	// Initial connection attempt
	err := s.Connect(s.ctx)
	if err != nil {
		s.logger.Error("initial rigctld connection failed", "error", err)
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
						s.logger.Error("rigctld reconnection failed", "error", err)
					}
				}()
			}
		}
	}
}

// performHealthCheck checks the connection health via ping.
func (s *RigService) performHealthCheck() {
	s.mu.RLock()
	connected := s.connected
	s.mu.RUnlock()

	if !connected {
		return
	}

	err := s.client.Ping()
	now := time.Now()

	s.mu.Lock()
	defer s.mu.Unlock()

	if err != nil {
		s.logger.Warn("rigctld health check failed",
			"error", err,
			"last_check", now,
		)
		s.health = RigHealth{
			OK:        false,
			Error:     err.Error(),
			LastCheck: now,
		}
		s.connected = false
		s.status.Connected = false
	} else {
		s.health = RigHealth{
			OK:        true,
			Error:     "",
			LastCheck: now,
		}
	}
}

// Health returns the current health status.
func (s *RigService) Health() RigHealth {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.health
}

// Status returns the current rig status.
func (s *RigService) Status() RigStatus {
	s.mu.RLock()
	connected := s.connected
	s.mu.RUnlock()

	if !connected {
		return RigStatus{Connected: false}
	}

	// Fetch current values from rigctld
	freq, err := s.client.GetFrequency()
	if err != nil {
		s.logger.Warn("failed to get frequency", "error", err)
	}

	mode, err := s.client.GetMode()
	if err != nil {
		s.logger.Warn("failed to get mode", "error", err)
	}

	ptt, err := s.client.GetPTT()
	if err != nil {
		s.logger.Warn("failed to get PTT state", "error", err)
	}

	s.mu.Lock()
	s.status = RigStatus{
		Frequency: int64(freq),
		Mode:      mode,
		PTT:       ptt,
		Connected: true,
	}
	status := s.status
	s.mu.Unlock()

	return status
}

// SetPTT sets the PTT state and returns the new state.
func (s *RigService) SetPTT(state bool) (bool, error) {
	s.mu.RLock()
	connected := s.connected
	s.mu.RUnlock()

	if !connected {
		return false, errors.New("rigctld: not connected")
	}

	err := s.client.SetPTT(state)
	if err != nil {
		return false, err
	}

	// Verify the new state
	newState, err := s.client.GetPTT()
	if err != nil {
		return state, nil // Return requested state if verification fails
	}

	return newState, nil
}

// IsConnected returns whether the service is currently connected.
func (s *RigService) IsConnected() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.connected
}
