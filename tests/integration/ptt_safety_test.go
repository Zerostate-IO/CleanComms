// Package integration provides integration tests for CleanComms safety-critical paths.
package integration

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/Zerostate-IO/CleanComms/internal/control"
)

// mockRigController implements control.RigController for testing.
type mockRigController struct {
	mu        sync.RWMutex
	health    control.RigHealthStatus
	pttState  bool
	setPTTErr error
}

func (m *mockRigController) SetPTT(state bool) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.setPTTErr != nil {
		return m.pttState, m.setPTTErr
	}
	m.pttState = state
	return m.pttState, nil
}

func (m *mockRigController) Health() control.RigHealthStatus {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.health
}

func (m *mockRigController) SetHealth(ok bool, errMsg string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.health = control.RigHealthStatus{OK: ok, Error: errMsg}
}

func (m *mockRigController) SetPTTError(err error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.setPTTErr = err
}

func (m *mockRigController) GetPTT() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.pttState
}

// mockModemController implements control.ModemController for testing.
type mockModemController struct {
	mu       sync.RWMutex
	health   control.ModemHealthStatus
	txState  bool
	setTXErr error
}

func (m *mockModemController) SetTX(tx bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.setTXErr != nil {
		return m.setTXErr
	}
	m.txState = tx
	return nil
}

func (m *mockModemController) Health() control.ModemHealthStatus {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.health
}

func (m *mockModemController) SetHealth(ok bool, errMsg string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.health = control.ModemHealthStatus{OK: ok, Error: errMsg}
}

func (m *mockModemController) SetTXError(err error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.setTXErr = err
}

func (m *mockModemController) GetTX() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.txState
}

// newTestCoordinator creates a coordinator with mocks for testing.
func newTestCoordinator() (*control.Coordinator, *mockRigController, *mockModemController) {
	rig := &mockRigController{health: control.RigHealthStatus{OK: true}}
	modem := &mockModemController{health: control.ModemHealthStatus{OK: true}}
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))

	config := control.CoordinatorConfig{
		PTTTimeout: 2 * time.Second,
	}

	c := control.NewCoordinator(rig, modem, logger, config)
	return c, rig, modem
}

type orderTrackingRig struct {
	*mockRigController
	order   *[]string
	orderMu *sync.Mutex
}

func (o *orderTrackingRig) SetPTT(state bool) (bool, error) {
	o.orderMu.Lock()
	*o.order = append(*o.order, "rig_ptt")
	o.orderMu.Unlock()
	return o.mockRigController.SetPTT(state)
}

type orderTrackingModem struct {
	*mockModemController
	order   *[]string
	orderMu *sync.Mutex
}

func (o *orderTrackingModem) SetTX(tx bool) error {
	o.orderMu.Lock()
	*o.order = append(*o.order, "modem_tx")
	o.orderMu.Unlock()
	return o.mockModemController.SetTX(tx)
}

// TestPTTSafety_TXBlockedWhenCoordinatorDegraded verifies that TX is blocked
// when the coordinator is in a degraded state (either rig or modem unhealthy).
// This is a safety-critical test to prevent accidental transmission.
func TestPTTSafety_TXBlockedWhenCoordinatorDegraded(t *testing.T) {
	tests := []struct {
		name       string
		rigOK      bool
		modemOK    bool
		rigError   string
		modemError string
	}{
		{
			name:       "rig degraded - connection lost",
			rigOK:      false,
			modemOK:    true,
			rigError:   "connection lost",
			modemError: "",
		},
		{
			name:       "modem degraded - service unavailable",
			rigOK:      true,
			modemOK:    false,
			rigError:   "",
			modemError: "service unavailable",
		},
		{
			name:       "both degraded - complete system failure",
			rigOK:      false,
			modemOK:    false,
			rigError:   "connection lost",
			modemError: "service unavailable",
		},
		{
			name:       "rig degraded with timeout error",
			rigOK:      false,
			modemOK:    true,
			rigError:   "operation timeout",
			modemError: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, rig, modem := newTestCoordinator()

			// Set health states
			rig.SetHealth(tt.rigOK, tt.rigError)
			modem.SetHealth(tt.modemOK, tt.modemError)

			c.Start(context.Background())
			defer c.Stop()

			// Verify coordinator reports degraded state
			if c.IsHealthy() {
				t.Error("expected coordinator to report unhealthy/degraded state")
			}

			// Attempt to enter TX mode - should be blocked
			err := c.SetPTT(true)
			if !errors.Is(err, control.ErrDegraded) {
				t.Errorf("expected ErrDegraded, got: %v", err)
			}

			// Verify PTT was NOT set
			if c.GetPTT() {
				t.Error("PTT should remain false when system is degraded")
			}

			// Verify rig PTT was NOT set
			if rig.GetPTT() {
				t.Error("rig PTT should not be set when system is degraded")
			}

			// Verify modem TX was NOT set
			if modem.GetTX() {
				t.Error("modem TX should not be set when system is degraded")
			}

			// Verify state remains in RX
			if c.GetState() != control.StateRX {
				t.Error("coordinator should remain in RX state when degraded")
			}
		})
	}
}

// TestPTTSafety_GracefulDegradationDuringTX verifies that if degradation
// occurs while in TX mode, subsequent PTT requests are blocked.
func TestPTTSafety_GracefulDegradationDuringTX(t *testing.T) {
	c, rig, _ := newTestCoordinator()
	c.Start(context.Background())
	defer c.Stop()

	// Start healthy - enter TX
	err := c.SetPTT(true)
	if err != nil {
		t.Fatalf("failed to enter TX when healthy: %v", err)
	}

	// Simulate rig degradation while in TX
	rig.SetHealth(false, "rig disconnected")

	// Return to RX
	err = c.SetPTT(false)
	if err != nil {
		t.Fatalf("failed to return to RX: %v", err)
	}

	// Now try to enter TX again - should be blocked
	err = c.SetPTT(true)
	if !errors.Is(err, control.ErrDegraded) {
		t.Errorf("expected ErrDegraded after returning to RX with degraded state, got: %v", err)
	}

	// Verify state remains in RX
	if c.GetState() != control.StateRX {
		t.Error("coordinator should be in RX state after blocked TX attempt")
	}
}

// TestPTTSafety_ConcurrentDegradation verifies thread safety when
// degradation occurs during concurrent PTT operations.
func TestPTTSafety_ConcurrentDegradation(t *testing.T) {
	c, rig, modem := newTestCoordinator()
	c.Start(context.Background())
	defer c.Stop()

	var wg sync.WaitGroup
	errCount := 0
	successCount := 0
	mu := sync.Mutex{}

	// Launch goroutines that attempt PTT operations
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()

			for j := 0; j < 50; j++ {
				// Randomly degrade/restore health
				if idx == 0 && j%10 == 0 {
					rig.SetHealth(j%20 == 0, "intermittent failure")
				}

				err := c.SetPTT(j%2 == 0)
				mu.Lock()
				if err != nil {
					errCount++
				} else {
					successCount++
				}
				mu.Unlock()
			}
		}(i)
	}

	wg.Wait()

	// Restore health and verify we can still operate
	rig.SetHealth(true, "")
	modem.SetHealth(true, "")

	err := c.SetPTT(false)
	if err != nil {
		t.Errorf("should be able to set PTT false when healthy: %v", err)
	}
}

// TestPTTSafety_TransitionOrder verifies that modem TX is set before rig PTT
// to ensure the audio path is ready before RF is applied.
func TestPTTSafety_TransitionOrder(t *testing.T) {
	// Track order of operations
	order := make([]string, 0, 2)
	orderMu := sync.Mutex{}

	rig := &orderTrackingRig{
		mockRigController: &mockRigController{health: control.RigHealthStatus{OK: true}},
		order:             &order,
		orderMu:           &orderMu,
	}
	modem := &orderTrackingModem{
		mockModemController: &mockModemController{health: control.ModemHealthStatus{OK: true}},
		order:               &order,
		orderMu:             &orderMu,
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	config := control.CoordinatorConfig{PTTTimeout: 2 * time.Second}
	c := control.NewCoordinator(rig, modem, logger, config)

	c.Start(context.Background())
	defer c.Stop()

	// Enter TX
	err := c.SetPTT(true)
	if err != nil {
		t.Fatalf("failed to enter TX: %v", err)
	}

	// Verify order: modem TX should be set before rig PTT
	orderMu.Lock()
	if len(order) != 2 {
		t.Fatalf("expected 2 operations, got %d", len(order))
	}
	if order[0] != "modem_tx" {
		t.Errorf("expected modem_tx first, got %s", order[0])
	}
	if order[1] != "rig_ptt" {
		t.Errorf("expected rig_ptt second, got %s", order[1])
	}
	orderMu.Unlock()
}

// TestPTTSafety_RollbackOnFailure verifies that if rig PTT fails,
// the modem TX is rolled back to prevent audio without RF.
func TestPTTSafety_RollbackOnFailure(t *testing.T) {
	c, rig, modem := newTestCoordinator()

	// Make rig fail on SetPTT
	rig.SetPTTError(errors.New("rig failure"))

	c.Start(context.Background())
	defer c.Stop()

	// Attempt to enter TX
	err := c.SetPTT(true)
	if err == nil {
		t.Fatal("expected error when rig fails")
	}

	// Modem should be rolled back to RX
	if modem.GetTX() {
		t.Error("modem TX should be rolled back to false after rig failure")
	}

	// Coordinator should be in RX state
	if c.GetState() != control.StateRX {
		t.Error("coordinator should be in RX state after rollback")
	}
}
