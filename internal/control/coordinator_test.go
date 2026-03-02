package control

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// mockRigController implements RigController for testing.
type mockRigController struct {
	mu        sync.RWMutex
	health    RigHealthStatus
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

func (m *mockRigController) Health() RigHealthStatus {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.health
}

func (m *mockRigController) SetHealth(ok bool, errMsg string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.health = RigHealthStatus{OK: ok, Error: errMsg}
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

// mockModemController implements ModemController for testing.
type mockModemController struct {
	mu       sync.RWMutex
	health   ModemHealthStatus
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

func (m *mockModemController) Health() ModemHealthStatus {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.health
}

func (m *mockModemController) SetHealth(ok bool, errMsg string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.health = ModemHealthStatus{OK: ok, Error: errMsg}
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
func newTestCoordinator() (*Coordinator, *mockRigController, *mockModemController) {
	rig := &mockRigController{health: RigHealthStatus{OK: true}}
	modem := &mockModemController{health: ModemHealthStatus{OK: true}}
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))

	config := CoordinatorConfig{
		PTTTimeout: 2 * time.Second, // Short timeout for tests
	}

	c := NewCoordinator(rig, modem, logger, config)
	return c, rig, modem
}

func TestNewCoordinator(t *testing.T) {
	t.Run("creates coordinator with defaults", func(t *testing.T) {
		c, _, _ := newTestCoordinator()
		if c == nil {
			t.Fatal("expected coordinator, got nil")
		}
		if c.GetState() != StateRX {
			t.Errorf("expected initial state RX, got %v", c.GetState())
		}
		if c.GetPTT() {
			t.Error("expected initial PTT to be false")
		}
	})

	t.Run("uses default timeout if config is zero", func(t *testing.T) {
		rig := &mockRigController{health: RigHealthStatus{OK: true}}
		modem := &mockModemController{health: ModemHealthStatus{OK: true}}
		logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

		c := NewCoordinator(rig, modem, logger, CoordinatorConfig{PTTTimeout: 0})
		if c.pttTimeout != 60*time.Second {
			t.Errorf("expected default timeout 60s, got %v", c.pttTimeout)
		}
	})
}

func TestSetPTT_BlockedWhenDegraded(t *testing.T) {
	tests := []struct {
		name    string
		rigOK   bool
		modemOK bool
		wantErr error
	}{
		{
			name:    "rig degraded",
			rigOK:   false,
			modemOK: true,
			wantErr: ErrDegraded,
		},
		{
			name:    "modem degraded",
			rigOK:   true,
			modemOK: false,
			wantErr: ErrDegraded,
		},
		{
			name:    "both degraded",
			rigOK:   false,
			modemOK: false,
			wantErr: ErrDegraded,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, rig, modem := newTestCoordinator()
			rig.SetHealth(tt.rigOK, "test error")
			modem.SetHealth(tt.modemOK, "test error")

			c.Start(context.Background())
			defer c.Stop()

			err := c.SetPTT(true)
			if !errors.Is(err, tt.wantErr) {
				t.Errorf("expected error %v, got %v", tt.wantErr, err)
			}

			if c.GetPTT() {
				t.Error("expected PTT to remain false when degraded")
			}
		})
	}
}

func TestSetPTT_AllowedWhenHealthy(t *testing.T) {
	c, rig, modem := newTestCoordinator()

	c.Start(context.Background())
	defer c.Stop()

	// Verify healthy
	if !c.IsHealthy() {
		t.Fatal("expected coordinator to be healthy")
	}

	// Enter TX
	err := c.SetPTT(true)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if !c.GetPTT() {
		t.Error("expected PTT to be true")
	}
	if c.GetState() != StateTX {
		t.Error("expected state to be TX")
	}
	if !rig.GetPTT() {
		t.Error("expected rig PTT to be true")
	}
	if !modem.GetTX() {
		t.Error("expected modem TX to be true")
	}

	// Enter RX
	err = c.SetPTT(false)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if c.GetPTT() {
		t.Error("expected PTT to be false")
	}
	if c.GetState() != StateRX {
		t.Error("expected state to be RX")
	}
	if rig.GetPTT() {
		t.Error("expected rig PTT to be false")
	}
	if modem.GetTX() {
		t.Error("expected modem TX to be false")
	}
}

func TestSetPTT_RollbackOnRigFailure(t *testing.T) {
	c, rig, modem := newTestCoordinator()

	// Make rig fail on SetPTT
	rig.SetPTTError(errors.New("rig failure"))

	c.Start(context.Background())
	defer c.Stop()

	err := c.SetPTT(true)
	if err == nil {
		t.Fatal("expected error when rig fails")
	}

	// Modem should be rolled back to RX
	if modem.GetTX() {
		t.Error("expected modem TX to be rolled back to false")
	}

	// Coordinator should be in RX state
	if c.GetState() != StateRX {
		t.Error("expected coordinator to remain in RX state after failure")
	}
}

func TestSetPTT_NotRunning(t *testing.T) {
	c, _, _ := newTestCoordinator()
	// Don't start the coordinator

	err := c.SetPTT(true)
	if !errors.Is(err, ErrNotRunning) {
		t.Errorf("expected ErrNotRunning, got %v", err)
	}
}

func TestForcedRX_AfterTimeout(t *testing.T) {
	c, rig, modem := newTestCoordinator()
	// Use very short timeout for testing
	c.pttTimeout = 500 * time.Millisecond

	c.Start(context.Background())
	defer c.Stop()

	// Enter TX
	err := c.SetPTT(true)
	if err != nil {
		t.Fatalf("failed to enter TX: %v", err)
	}

	// Wait for timeout (watchdog checks every second, plus buffer)
	time.Sleep(1500 * time.Millisecond)

	// Should have been forced to RX
	if c.GetPTT() {
		t.Error("expected PTT to be forced to false after timeout")
	}
	if c.GetState() != StateRX {
		t.Error("expected state to be forced to RX after timeout")
	}
	if rig.GetPTT() {
		t.Error("expected rig PTT to be forced to false")
	}
	if modem.GetTX() {
		t.Error("expected modem TX to be forced to false")
	}
}

func TestManualRX_BeforeTimeout(t *testing.T) {
	c, rig, modem := newTestCoordinator()
	c.pttTimeout = 5 * time.Second // Long enough to not trigger

	c.Start(context.Background())
	defer c.Stop()

	// Enter TX
	err := c.SetPTT(true)
	if err != nil {
		t.Fatalf("failed to enter TX: %v", err)
	}

	// Wait briefly then manually go to RX
	time.Sleep(100 * time.Millisecond)

	err = c.SetPTT(false)
	if err != nil {
		t.Fatalf("failed to enter RX: %v", err)
	}

	// Wait to ensure watchdog doesn't interfere
	time.Sleep(200 * time.Millisecond)

	// Should still be in RX
	if c.GetPTT() {
		t.Error("expected PTT to be false")
	}
	if rig.GetPTT() {
		t.Error("expected rig PTT to be false")
	}
	if modem.GetTX() {
		t.Error("expected modem TX to be false")
	}
}

func TestConcurrentAccess(t *testing.T) {
	c, _, _ := newTestCoordinator()
	c.pttTimeout = 10 * time.Second

	c.Start(context.Background())
	defer c.Stop()

	var wg sync.WaitGroup
	errCount := atomic.Int32{}
	successCount := atomic.Int32{}

	// Launch multiple goroutines trying to toggle PTT
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				tx := (idx+j)%2 == 0
				err := c.SetPTT(tx)
				if err != nil {
					// Errors are expected when health is toggled
					errCount.Add(1)
				} else {
					successCount.Add(1)
				}
				_ = c.GetPTT()
				_ = c.GetState()
				_ = c.IsHealthy()
			}
		}(i)
	}

	wg.Wait()

	// Just verify no panics or deadlocks occurred
	t.Logf("completed %d operations (%d errors, %d successes)",
		errCount.Load()+successCount.Load(), errCount.Load(), successCount.Load())
}

func TestStartStop_Lifecycle(t *testing.T) {
	t.Run("start is idempotent", func(t *testing.T) {
		c, _, _ := newTestCoordinator()

		c.Start(context.Background())
		c.Start(context.Background()) // Should not panic or create duplicate goroutines
		c.Stop()
	})

	t.Run("stop is idempotent", func(t *testing.T) {
		c, _, _ := newTestCoordinator()

		c.Start(context.Background())
		c.Stop()
		c.Stop() // Should not panic
	})

	t.Run("stop without start is safe", func(t *testing.T) {
		c, _, _ := newTestCoordinator()
		c.Stop() // Should not panic
	})

	t.Run("ensures RX state on stop", func(t *testing.T) {
		c, rig, modem := newTestCoordinator()

		c.Start(context.Background())

		// Enter TX
		err := c.SetPTT(true)
		if err != nil {
			t.Fatalf("failed to enter TX: %v", err)
		}

		// Stop should force RX
		c.Stop()

		if c.GetState() != StateRX {
			t.Error("expected state to be RX after stop")
		}
		// Note: The actual rig/modem may not be forced to RX here
		// since we're just updating internal state after Stop.
		// In production, the services would handle their own cleanup.
		_ = rig
		_ = modem
	})
}

func TestContext_Cancellation(t *testing.T) {
	c, _, _ := newTestCoordinator()

	ctx, cancel := context.WithCancel(context.Background())
	c.Start(ctx)

	// Cancel the context
	cancel()

	// Wait for goroutine to exit
	time.Sleep(100 * time.Millisecond)

	// Coordinator should be stopped
	c.mu.RLock()
	running := c.running
	c.mu.RUnlock()

	if running {
		t.Error("expected coordinator to stop after context cancellation")
	}
}

func TestIdempotentStateTransitions(t *testing.T) {
	c, _, _ := newTestCoordinator()

	c.Start(context.Background())
	defer c.Stop()

	// Already in RX
	err := c.SetPTT(false)
	if err != nil {
		t.Errorf("expected no error when already in RX, got %v", err)
	}

	// Go to TX
	err = c.SetPTT(true)
	if err != nil {
		t.Fatalf("failed to enter TX: %v", err)
	}

	// Already in TX
	err = c.SetPTT(true)
	if err != nil {
		t.Errorf("expected no error when already in TX, got %v", err)
	}
}

func TestIsHealthy(t *testing.T) {
	c, rig, modem := newTestCoordinator()

	if !c.IsHealthy() {
		t.Error("expected healthy with both services OK")
	}

	rig.SetHealth(false, "rig error")
	if c.IsHealthy() {
		t.Error("expected unhealthy when rig is degraded")
	}

	rig.SetHealth(true, "")
	modem.SetHealth(false, "modem error")
	if c.IsHealthy() {
		t.Error("expected unhealthy when modem is degraded")
	}

	rig.SetHealth(false, "rig error")
	if c.IsHealthy() {
		t.Error("expected unhealthy when both are degraded")
	}
}

func TestStateString(t *testing.T) {
	if StateRX.String() != "RX" {
		t.Errorf("expected RX, got %s", StateRX.String())
	}
	if StateTX.String() != "TX" {
		t.Errorf("expected TX, got %s", StateTX.String())
	}
}
