// Package control provides PTT coordination and safety watchdogs for CleanComms.
package control

import (
	"context"
	"errors"
	"log/slog"
	"sync"
	"time"
)

// RigController defines the interface for rig control operations.
type RigController interface {
	// SetPTT sets the PTT state on the rig.
	SetPTT(state bool) (bool, error)
	// Health returns the current health status.
	Health() RigHealthStatus
}

// ModemController defines the interface for modem control operations.
type ModemController interface {
	// SetTX sets the transmit state on the modem.
	SetTX(tx bool) error
	// Health returns the current health status.
	Health() ModemHealthStatus
}

// RigHealthStatus represents the health of the rig connection.
type RigHealthStatus struct {
	OK    bool
	Error string
}

// ModemHealthStatus represents the health of the modem connection.
type ModemHealthStatus struct {
	OK    bool
	Error string
}

// CoordinatorState represents the PTT state machine state.
type CoordinatorState int

const (
	// StateRX means the system is in receive mode.
	StateRX CoordinatorState = iota
	// StateTX means the system is in transmit mode.
	StateTX
)

func (s CoordinatorState) String() string {
	if s == StateTX {
		return "TX"
	}
	return "RX"
}

// ErrDegraded is returned when attempting TX while system is degraded.
var ErrDegraded = errors.New("system degraded: cannot enter TX mode")

// ErrNotRunning is returned when coordinator is not started.
var ErrNotRunning = errors.New("coordinator not running")

// Coordinator orchestrates PTT control between rig and modem with safety watchdog.
type Coordinator struct {
	rig    RigController
	modem  ModemController
	logger *slog.Logger

	// Configuration
	pttTimeout time.Duration

	// State (protected by mu)
	mu          sync.RWMutex
	state       CoordinatorState
	lastTXStart time.Time
	running     bool

	// Lifecycle
	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup
}

// CoordinatorConfig holds configuration for the coordinator.
type CoordinatorConfig struct {
	// PTTTimeout is the maximum time allowed in TX mode before forced RX.
	PTTTimeout time.Duration
}

// DefaultCoordinatorConfig returns the default configuration.
func DefaultCoordinatorConfig() CoordinatorConfig {
	return CoordinatorConfig{
		PTTTimeout: 60 * time.Second,
	}
}

// NewCoordinator creates a new control coordinator.
func NewCoordinator(rig RigController, modem ModemController, logger *slog.Logger, config CoordinatorConfig) *Coordinator {
	if config.PTTTimeout <= 0 {
		config.PTTTimeout = 60 * time.Second
	}

	return &Coordinator{
		rig:        rig,
		modem:      modem,
		logger:     logger,
		pttTimeout: config.PTTTimeout,
		state:      StateRX,
		running:    false,
	}
}

// Start begins the watchdog goroutine.
func (c *Coordinator) Start(ctx context.Context) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.running {
		return
	}

	c.ctx, c.cancel = context.WithCancel(ctx)
	c.running = true

	c.wg.Add(1)
	go c.watchdogLoop()

	c.logger.Info("control coordinator started",
		"ptt_timeout", c.pttTimeout,
	)
}

// Stop stops the watchdog goroutine.
func (c *Coordinator) Stop() {
	c.mu.Lock()
	if !c.running {
		c.mu.Unlock()
		return
	}
	c.running = false
	c.cancel()
	c.mu.Unlock()

	c.wg.Wait()

	// Ensure we end in RX state
	c.mu.Lock()
	c.state = StateRX
	c.mu.Unlock()

	c.logger.Info("control coordinator stopped")
}

// SetPTT sets the PTT state, blocking if degraded.
// It enforces ready-state ordering: both rig and modem must be healthy for TX.
func (c *Coordinator) SetPTT(tx bool) error {
	c.mu.RLock()
	running := c.running
	c.mu.RUnlock()

	if !running {
		return ErrNotRunning
	}

	if tx {
		return c.enterTX()
	}
	return c.enterRX()
}

// GetPTT returns the current PTT state.
func (c *Coordinator) GetPTT() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.state == StateTX
}

// GetState returns the current coordinator state.
func (c *Coordinator) GetState() CoordinatorState {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.state
}

// IsHealthy returns true if both rig and modem are healthy.
func (c *Coordinator) IsHealthy() bool {
	rigHealth := c.rig.Health()
	modemHealth := c.modem.Health()
	return rigHealth.OK && modemHealth.OK
}

// enterTX transitions to TX mode if healthy.
func (c *Coordinator) enterTX() error {
	// Check health first
	rigHealth := c.rig.Health()
	modemHealth := c.modem.Health()

	if !rigHealth.OK || !modemHealth.OK {
		c.logger.Warn("TX blocked due to degraded state",
			"rig_ok", rigHealth.OK,
			"rig_error", rigHealth.Error,
			"modem_ok", modemHealth.OK,
			"modem_error", modemHealth.Error,
		)
		return ErrDegraded
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	// Already in TX
	if c.state == StateTX {
		return nil
	}

	// Order: Set modem TX first, then rig PTT
	// This ensures the modem is ready to transmit before RF is applied
	if err := c.modem.SetTX(true); err != nil {
		c.logger.Error("failed to set modem TX", "error", err)
		return err
	}

	if _, err := c.rig.SetPTT(true); err != nil {
		// Rollback modem TX on rig failure
		_ = c.modem.SetTX(false)
		c.logger.Error("failed to set rig PTT, rolling back modem TX", "error", err)
		return err
	}

	c.state = StateTX
	c.lastTXStart = time.Now()

	c.logger.Info("entered TX mode",
		"ptt_timeout", c.pttTimeout,
	)

	return nil
}

// enterRX transitions to RX mode.
func (c *Coordinator) enterRX() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Already in RX
	if c.state == StateRX {
		return nil
	}

	// Order: Release rig PTT first, then modem TX
	// This ensures RF is stopped before modem stops transmitting
	var rigErr, modemErr error

	if _, err := c.rig.SetPTT(false); err != nil {
		rigErr = err
		c.logger.Error("failed to release rig PTT", "error", err)
	}

	if err := c.modem.SetTX(false); err != nil {
		modemErr = err
		c.logger.Error("failed to set modem RX", "error", err)
	}

	c.state = StateRX

	// Return first error encountered
	if rigErr != nil {
		return rigErr
	}
	if modemErr != nil {
		return modemErr
	}

	c.logger.Info("entered RX mode")

	return nil
}

// forceRX forces the system to RX mode due to timeout.
// This is called by the watchdog when TX exceeds the timeout.
func (c *Coordinator) forceRX() {
	c.mu.Lock()
	if c.state != StateTX {
		c.mu.Unlock()
		return
	}
	c.mu.Unlock()

	// Log safety event before forcing
	c.logger.Warn("PTT timeout exceeded, forcing RX",
		"timeout", c.pttTimeout,
	)

	if err := c.enterRX(); err != nil {
		c.logger.Error("failed to force RX after timeout", "error", err)
	}
}

// watchdogLoop monitors TX duration and forces RX if timeout exceeded.
func (c *Coordinator) watchdogLoop() {
	defer c.wg.Done()

	// Check every second
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-c.ctx.Done():
			// Context cancelled - mark as not running
			c.mu.Lock()
			c.running = false
			c.mu.Unlock()
			return
		case <-ticker.C:
			c.checkTimeout()
		}
	}
}

// checkTimeout checks if TX has exceeded the timeout.
func (c *Coordinator) checkTimeout() {
	c.mu.RLock()
	state := c.state
	lastTXStart := c.lastTXStart
	c.mu.RUnlock()

	if state != StateTX {
		return
	}

	if time.Since(lastTXStart) > c.pttTimeout {
		c.forceRX()
	}
}
