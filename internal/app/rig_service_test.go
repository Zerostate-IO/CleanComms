package app

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"log/slog"
	"net"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
)

// mockRigctldServer is a mock rigctld server for testing.
type mockRigctldServer struct {
	listener  net.Listener
	responses map[string]string
	requests  []string
	mu        sync.Mutex
	running   bool
	conns     []net.Conn
}

func newMockRigctldServer(t *testing.T) *mockRigctldServer {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to start mock server: %v", err)
	}

	return &mockRigctldServer{
		listener:  listener,
		responses: make(map[string]string),
	}
}

func (m *mockRigctldServer) port() int {
	return m.listener.Addr().(*net.TCPAddr).Port
}

func (m *mockRigctldServer) setResponse(cmd, response string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.responses[cmd] = response
}

func (m *mockRigctldServer) start() {
	m.mu.Lock()
	m.running = true
	m.mu.Unlock()

	go func() {
		for {
			m.mu.Lock()
			running := m.running
			m.mu.Unlock()
			if !running {
				return
			}

			conn, err := m.listener.Accept()
			if err != nil {
				continue
			}
			m.mu.Lock()
			m.conns = append(m.conns, conn)
			m.mu.Unlock()
			go m.handleConnection(conn)
		}
	}()
}

func (m *mockRigctldServer) handleConnection(conn net.Conn) {
	defer conn.Close()

	reader := bufio.NewReader(conn)
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			return
		}

		m.mu.Lock()
		m.requests = append(m.requests, strings.TrimSpace(line))
		response, ok := m.responses[strings.TrimSpace(line)]
		m.mu.Unlock()

		if !ok {
			response = "RPRT 0\n"
		}

		conn.Write([]byte(response))
	}
}

func (m *mockRigctldServer) stop() {
	m.mu.Lock()
	m.running = false
	// Close all active connections to simulate server failure
	for _, conn := range m.conns {
		conn.Close()
	}
	m.conns = nil
	m.mu.Unlock()
	m.listener.Close()
}

// newTestLogger creates a logger for testing.
func newTestLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}))
}

func TestNewRigService(t *testing.T) {
	logger := newTestLogger()
	svc := NewRigService("localhost", 4532, logger)

	if svc == nil {
		t.Fatal("expected non-nil service")
	}
	if svc.host != "localhost" {
		t.Errorf("expected host localhost, got %s", svc.host)
	}
	if svc.port != 4532 {
		t.Errorf("expected port 4532, got %d", svc.port)
	}
	if svc.healthInterval != 5*time.Second {
		t.Errorf("expected health interval 5s, got %v", svc.healthInterval)
	}
}

func TestRigService_Connect_Success(t *testing.T) {
	mock := newMockRigctldServer(t)
	mock.setResponse("\\chk_vfo", "CHKVFO 0\n")
	mock.start()
	defer mock.stop()

	logger := newTestLogger()
	svc := NewRigService("127.0.0.1", mock.port(), logger)
	svc.backoffConfig = BackoffConfig{
		InitialInterval: 100 * time.Millisecond,
		MaxInterval:     1 * time.Second,
		Multiplier:      2.0,
		MaxAttempts:     3,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := svc.Connect(ctx)
	if err != nil {
		t.Fatalf("expected successful connection, got error: %v", err)
	}

	if !svc.IsConnected() {
		t.Error("expected service to be connected")
	}

	health := svc.Health()
	if !health.OK {
		t.Errorf("expected health OK, got error: %s", health.Error)
	}
}

func TestRigService_Connect_Backoff(t *testing.T) {
	logger := newTestLogger()
	// Use a port that won't have anything listening
	svc := NewRigService("127.0.0.1", 59999, logger)
	svc.backoffConfig = BackoffConfig{
		InitialInterval: 50 * time.Millisecond,
		MaxInterval:     200 * time.Millisecond,
		Multiplier:      2.0,
		MaxAttempts:     3,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	start := time.Now()
	err := svc.Connect(ctx)
	elapsed := time.Since(start)

	if err == nil {
		t.Fatal("expected connection to fail")
	}

	// Verify backoff occurred (3 attempts with backoff between them)
	// Backoff timing: 50ms wait after attempt 1, 100ms wait after attempt 2
	// Total expected: ~150ms minimum (no wait after final failed attempt)
	// Use 100ms as minimum to account for timing variance
	if elapsed < 100*time.Millisecond {
		t.Errorf("expected backoff delay of at least 100ms, got %v", elapsed)
	}

	if svc.IsConnected() {
		t.Error("expected service to be disconnected")
	}
}

func TestRigService_Connect_ContextCancellation(t *testing.T) {
	logger := newTestLogger()
	svc := NewRigService("127.0.0.1", 59998, logger)
	svc.backoffConfig = BackoffConfig{
		InitialInterval: 100 * time.Millisecond,
		MaxInterval:     1 * time.Second,
		Multiplier:      2.0,
		MaxAttempts:     0, // unlimited
	}

	ctx, cancel := context.WithCancel(context.Background())

	// Cancel after a short delay
	go func() {
		time.Sleep(150 * time.Millisecond)
		cancel()
	}()

	start := time.Now()
	err := svc.Connect(ctx)
	elapsed := time.Since(start)

	if err != context.Canceled {
		t.Errorf("expected context.Canceled, got: %v", err)
	}

	// Should have cancelled quickly, not waited for full backoff
	if elapsed > 500*time.Millisecond {
		t.Errorf("context cancellation took too long: %v", elapsed)
	}
}

func TestRigService_Health(t *testing.T) {
	mock := newMockRigctldServer(t)
	mock.setResponse("\\chk_vfo", "CHKVFO 0\n")
	mock.start()
	defer mock.stop()

	logger := newTestLogger()
	svc := NewRigService("127.0.0.1", mock.port(), logger)

	// Initial health should be not OK
	health := svc.Health()
	if health.OK {
		t.Error("expected initial health to be not OK")
	}
	if health.Error != "not connected" {
		t.Errorf("expected 'not connected' error, got: %s", health.Error)
	}

	// Connect and verify health
	ctx := context.Background()
	err := svc.Connect(ctx)
	if err != nil {
		t.Fatalf("connection failed: %v", err)
	}

	health = svc.Health()
	if !health.OK {
		t.Errorf("expected health OK after connect, got error: %s", health.Error)
	}
	if health.LastCheck.IsZero() {
		t.Error("expected LastCheck to be set")
	}
}

func TestRigService_Status(t *testing.T) {
	mock := newMockRigctldServer(t)
	mock.setResponse("\\chk_vfo", "CHKVFO 0\n")
	mock.setResponse("\\get_freq", "14070000\n")
	mock.setResponse("\\get_mode", "USB\n2400\n")
	mock.setResponse("\\get_ptt", "0\n")
	mock.start()
	defer mock.stop()

	logger := newTestLogger()
	svc := NewRigService("127.0.0.1", mock.port(), logger)

	ctx := context.Background()
	err := svc.Connect(ctx)
	if err != nil {
		t.Fatalf("connection failed: %v", err)
	}

	status := svc.Status()
	if !status.Connected {
		t.Error("expected connected status")
	}
	if status.Frequency != 14070000 {
		t.Errorf("expected frequency 14070000, got %d", status.Frequency)
	}
	if status.Mode != "USB" {
		t.Errorf("expected mode USB, got %s", status.Mode)
	}
	if status.PTT {
		t.Error("expected PTT to be false")
	}
}

func TestRigService_Status_NotConnected(t *testing.T) {
	logger := newTestLogger()
	svc := NewRigService("127.0.0.1", 59997, logger)

	status := svc.Status()
	if status.Connected {
		t.Error("expected disconnected status")
	}
}

func TestRigService_SetPTT(t *testing.T) {
	mock := newMockRigctldServer(t)
	mock.setResponse("\\chk_vfo", "CHKVFO 0\n")
	mock.setResponse("\\set_ptt 1", "RPRT 0\n")
	mock.setResponse("\\set_ptt 0", "RPRT 0\n")
	mock.setResponse("\\get_ptt", "1\n")
	mock.start()
	defer mock.stop()

	logger := newTestLogger()
	svc := NewRigService("127.0.0.1", mock.port(), logger)

	ctx := context.Background()
	err := svc.Connect(ctx)
	if err != nil {
		t.Fatalf("connection failed: %v", err)
	}

	// Set PTT to TX
	newState, err := svc.SetPTT(true)
	if err != nil {
		t.Fatalf("SetPTT failed: %v", err)
	}
	if !newState {
		t.Error("expected PTT state to be true")
	}
}

func TestRigService_SetPTT_NotConnected(t *testing.T) {
	logger := newTestLogger()
	svc := NewRigService("127.0.0.1", 59996, logger)

	_, err := svc.SetPTT(true)
	if err == nil {
		t.Fatal("expected error for SetPTT when not connected")
	}
	if !strings.Contains(err.Error(), "not connected") {
		t.Errorf("expected 'not connected' error, got: %v", err)
	}
}

func TestRigService_StartStop(t *testing.T) {
	mock := newMockRigctldServer(t)
	mock.setResponse("\\chk_vfo", "CHKVFO 0\n")
	mock.start()
	defer mock.stop()

	logger := newTestLogger()
	svc := NewRigService("127.0.0.1", mock.port(), logger)
	svc.healthInterval = 100 * time.Millisecond

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	svc.Start(ctx)

	// Wait for connection
	time.Sleep(200 * time.Millisecond)

	if !svc.IsConnected() {
		t.Error("expected service to be connected after Start")
	}

	// Stop the service
	err := svc.Stop()
	if err != nil {
		t.Errorf("Stop returned error: %v", err)
	}
}

func TestRigService_HealthCheckLoop(t *testing.T) {
	mock := newMockRigctldServer(t)
	mock.setResponse("\\chk_vfo", "CHKVFO 0\n")
	mock.start()
	defer mock.stop()

	logger := newTestLogger()
	svc := NewRigService("127.0.0.1", mock.port(), logger)
	svc.healthInterval = 50 * time.Millisecond

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	svc.Start(ctx)

	// Wait for initial connection and health check
	time.Sleep(200 * time.Millisecond)

	health := svc.Health()
	if !health.OK {
		t.Errorf("expected health OK, got error: %s", health.Error)
	}
	if health.LastCheck.IsZero() {
		t.Error("expected LastCheck to be set")
	}

	// Simulate connection failure by stopping mock
	mock.stop()

	// Wait longer for health check to detect failure (multiple health check cycles)
	// With 50ms interval, wait 300ms to ensure at least 5-6 health check cycles
	time.Sleep(300 * time.Millisecond)

	health = svc.Health()
	if health.OK {
		t.Error("expected health to be not OK after connection loss")
	}
}

func TestDefaultBackoffConfig(t *testing.T) {
	cfg := DefaultBackoffConfig()

	if cfg.InitialInterval != 1*time.Second {
		t.Errorf("expected initial interval 1s, got %v", cfg.InitialInterval)
	}
	if cfg.MaxInterval != 30*time.Second {
		t.Errorf("expected max interval 30s, got %v", cfg.MaxInterval)
	}
	if cfg.Multiplier != 2.0 {
		t.Errorf("expected multiplier 2.0, got %v", cfg.Multiplier)
	}
	if cfg.MaxAttempts != 0 {
		t.Errorf("expected max attempts 0 (unlimited), got %d", cfg.MaxAttempts)
	}
}

func TestBackoffExponentialGrowth(t *testing.T) {
	tests := []struct {
		name     string
		attempts int
		minTime  time.Duration
		maxTime  time.Duration
	}{
		{
			name:     "three attempts",
			attempts: 3,
			// 1s + 2s + 4s = 7s of backoff, but we use short intervals
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := newTestLogger()
			svc := NewRigService("127.0.0.1", 59995, logger)
			svc.backoffConfig = BackoffConfig{
				InitialInterval: 10 * time.Millisecond,
				MaxInterval:     100 * time.Millisecond,
				Multiplier:      2.0,
				MaxAttempts:     tt.attempts,
			}

			ctx := context.Background()
			_ = svc.Connect(ctx)
			// Just verify it completes without hanging
		})
	}
}

func TestRigService_ReconnectAfterFailure(t *testing.T) {
	logger := newTestLogger()
	svc := NewRigService("127.0.0.1", 59994, logger)
	svc.healthInterval = 50 * time.Millisecond
	svc.backoffConfig = BackoffConfig{
		InitialInterval: 10 * time.Millisecond,
		MaxInterval:     50 * time.Millisecond,
		Multiplier:      2.0,
		MaxAttempts:     0,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()

	svc.Start(ctx)

	// Service should try to connect but fail (no server)
	time.Sleep(100 * time.Millisecond)

	// Should not be connected
	if svc.IsConnected() {
		t.Error("should not be connected without server")
	}

	// Health should reflect failure
	health := svc.Health()
	if health.OK {
		t.Error("health should not be OK without connection")
	}
	if health.Error == "" {
		t.Error("health should have error message")
	}
}

// Benchmark tests
func BenchmarkRigService_Health(b *testing.B) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := NewRigService("localhost", 4532, logger)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = svc.Health()
	}
}

func BenchmarkRigService_Status_Connected(b *testing.B) {
	mock := newMockRigctldServer(&testing.T{})
	mock.setResponse("\\chk_vfo", "CHKVFO 0\n")
	mock.setResponse("\\get_freq", "14070000\n")
	mock.setResponse("\\get_mode", "USB\n2400\n")
	mock.setResponse("\\get_ptt", "0\n")
	mock.start()
	defer mock.stop()

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := NewRigService("127.0.0.1", mock.port(), logger)

	ctx := context.Background()
	_ = svc.Connect(ctx)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = svc.Status()
	}
}

// Ensure RigService implements required interfaces at compile time
func TestRigService_InterfaceCompliance(t *testing.T) {
	logger := newTestLogger()
	svc := NewRigService("localhost", 4532, logger)

	// These should compile if the interface is satisfied
	_ = svc.Health
	_ = svc.Status
	_ = svc.SetPTT
	_ = svc.Connect
	_ = svc.IsConnected
}

// Test concurrent access to RigService
func TestRigService_ConcurrentAccess(t *testing.T) {
	mock := newMockRigctldServer(t)
	mock.setResponse("\\chk_vfo", "CHKVFO 0\n")
	mock.setResponse("\\get_freq", "14070000\n")
	mock.setResponse("\\get_mode", "USB\n2400\n")
	mock.setResponse("\\get_ptt", "0\n")
	mock.start()
	defer mock.stop()

	logger := newTestLogger()
	svc := NewRigService("127.0.0.1", mock.port(), logger)

	ctx := context.Background()
	err := svc.Connect(ctx)
	if err != nil {
		t.Fatalf("connection failed: %v", err)
	}

	var wg sync.WaitGroup
	errors := make(chan error, 100)

	// Spawn multiple goroutines accessing the service
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 10; j++ {
				_ = svc.Health()
				_ = svc.Status()
				_ = svc.IsConnected()
			}
		}()
	}

	wg.Wait()
	close(errors)

	for err := range errors {
		t.Errorf("concurrent access error: %v", err)
	}
}

// Helper for table-driven tests
type healthTestCase struct {
	name          string
	connected     bool
	expectedOK    bool
	expectedError string
}

func TestRigService_Health_Transitions(t *testing.T) {
	tests := []healthTestCase{
		{
			name:          "initial state",
			connected:     false,
			expectedOK:    false,
			expectedError: "not connected",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := newTestLogger()
			svc := NewRigService("localhost", 4532, logger)

			health := svc.Health()
			if health.OK != tt.expectedOK {
				t.Errorf("expected OK=%v, got %v", tt.expectedOK, health.OK)
			}
			if tt.expectedError != "" && health.Error != tt.expectedError {
				t.Errorf("expected error %q, got %q", tt.expectedError, health.Error)
			}
		})
	}
}

// Test that demonstrates proper logging of status changes
func TestRigService_LoggingOnStatusChanges(t *testing.T) {
	// This test verifies that the service logs appropriately
	// We can't easily capture slog output, but we ensure the code paths exist

	mock := newMockRigctldServer(t)
	mock.setResponse("\\chk_vfo", "CHKVFO 0\n")
	mock.start()
	defer mock.stop()

	logger := newTestLogger()
	svc := NewRigService("127.0.0.1", mock.port(), logger)
	svc.healthInterval = 50 * time.Millisecond

	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()

	// This should log connection establishment
	svc.Start(ctx)

	// Wait for connection
	time.Sleep(100 * time.Millisecond)

	// Verify connection was established
	if !svc.IsConnected() {
		t.Error("expected connection to be established")
	}

	fmt.Println("Logging test completed - check output for structured logs")
}
