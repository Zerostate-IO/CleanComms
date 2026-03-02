package app

import (
	"context"
	"encoding/xml"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
)

// mockFldigiServer is a mock fldigi XML-RPC server for testing.
type mockFldigiServer struct {
	server   *httptest.Server
	mu       sync.Mutex
	mode     string
	tx       bool
	version  string
	running  bool
	requests []string
}

func newMockFldigiServer(t *testing.T) *mockFldigiServer {
	m := &mockFldigiServer{
		mode:    "PSK31",
		tx:      false,
		version: "4.2.05",
	}
	m.server = httptest.NewServer(http.HandlerFunc(m.handleXMLRPC))
	return m
}

func (m *mockFldigiServer) url() string {
	return m.server.URL + "/RPC2"
}

func (m *mockFldigiServer) setMode(mode string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.mode = mode
}

func (m *mockFldigiServer) setTX(tx bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.tx = tx
}

func (m *mockFldigiServer) stop() {
	m.mu.Lock()
	m.running = false
	m.mu.Unlock()
	m.server.Close()
}

func (m *mockFldigiServer) handleXMLRPC(w http.ResponseWriter, r *http.Request) {
	m.mu.Lock()
	m.running = true
	m.mu.Unlock()

	body, _ := io.ReadAll(r.Body)
	m.mu.Lock()
	m.requests = append(m.requests, string(body))
	m.mu.Unlock()

	// Parse the method name from XML
	var call struct {
		MethodName string `xml:"methodName"`
	}
	xml.Unmarshal(body, &call)

	var response string
	switch call.MethodName {
	case "fldigi.version":
		response = xmlResponse(m.version)
	case "modem.get_name":
		m.mu.Lock()
		mode := m.mode
		m.mu.Unlock()
		response = xmlResponse(mode)
	case "modem.set_by_name":
		// Parse the mode argument
		var callWithArgs struct {
			Params struct {
				Param []struct {
					Value struct {
						String string `xml:"string"`
					} `xml:"value"`
				} `xml:"param"`
			} `xml:"params"`
		}
		xml.Unmarshal(body, &callWithArgs)
		if len(callWithArgs.Params.Param) > 0 {
			m.mu.Lock()
			m.mode = callWithArgs.Params.Param[0].Value.String
			m.mu.Unlock()
		}
		response = xmlResponseInt(0)
	case "main.get_tx":
		m.mu.Lock()
		tx := m.tx
		m.mu.Unlock()
		if tx {
			response = xmlResponseInt(1)
		} else {
			response = xmlResponseInt(0)
		}
	case "main.set_tx":
		m.mu.Lock()
		m.tx = true
		m.mu.Unlock()
		response = xmlResponseInt(0)
	default:
		response = xmlResponse("")
	}

	w.Header().Set("Content-Type", "text/xml")
	w.Write([]byte(response))
}

func xmlResponse(value string) string {
	return `<?xml version="1.0"?><methodResponse><params><param><value><string>` + value + `</string></value></param></params></methodResponse>`
}

func xmlResponseInt(value int) string {
	return `<?xml version="1.0"?><methodResponse><params><param><value><int>` + itoa(value) + `</int></value></param></params></methodResponse>`
}

// itoa converts int to string without importing strconv
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var neg bool
	if n < 0 {
		neg = true
		n = -n
	}
	var digits []byte
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}
	if neg {
		digits = append([]byte{'-'}, digits...)
	}
	return string(digits)
}

// newModemTestLogger creates a logger for testing.
func newModemTestLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}))
}

func TestNewModemService(t *testing.T) {
	logger := newModemTestLogger()
	svc := NewModemService("http://127.0.0.1:7362/RPC2", logger)

	if svc == nil {
		t.Fatal("expected non-nil service")
	}
	if svc.xmlrpcAddr != "http://127.0.0.1:7362/RPC2" {
		t.Errorf("expected xmlrpc addr, got %s", svc.xmlrpcAddr)
	}
	if svc.healthInterval != 5*time.Second {
		t.Errorf("expected health interval 5s, got %v", svc.healthInterval)
	}
}

func TestModemService_Connect_Success(t *testing.T) {
	mock := newMockFldigiServer(t)
	defer mock.stop()

	logger := newModemTestLogger()
	svc := NewModemService(mock.url(), logger)
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

func TestModemService_Connect_Backoff(t *testing.T) {
	logger := newModemTestLogger()
	// Use a URL that won't have anything listening
	svc := NewModemService("http://127.0.0.1:59999/RPC2", logger)
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
	// Total expected: ~150ms minimum
	// Use 100ms as minimum to account for timing variance
	if elapsed < 100*time.Millisecond {
		t.Errorf("expected backoff delay of at least 100ms, got %v", elapsed)
	}

	if svc.IsConnected() {
		t.Error("expected service to be disconnected")
	}
}

func TestModemService_Connect_ContextCancellation(t *testing.T) {
	logger := newModemTestLogger()
	svc := NewModemService("http://127.0.0.1:59998/RPC2", logger)
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

func TestModemService_Health(t *testing.T) {
	mock := newMockFldigiServer(t)
	defer mock.stop()

	logger := newModemTestLogger()
	svc := NewModemService(mock.url(), logger)

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

func TestModemService_Status(t *testing.T) {
	mock := newMockFldigiServer(t)
	mock.setMode("PSK31")
	mock.setTX(false)
	defer mock.stop()

	logger := newModemTestLogger()
	svc := NewModemService(mock.url(), logger)

	ctx := context.Background()
	err := svc.Connect(ctx)
	if err != nil {
		t.Fatalf("connection failed: %v", err)
	}

	status := svc.Status()
	if !status.Connected {
		t.Error("expected connected status")
	}
	if status.Mode != "PSK31" {
		t.Errorf("expected mode PSK31, got %s", status.Mode)
	}
	if status.TX {
		t.Error("expected TX to be false")
	}
}

func TestModemService_Status_NotConnected(t *testing.T) {
	logger := newModemTestLogger()
	svc := NewModemService("http://127.0.0.1:59997/RPC2", logger)

	status := svc.Status()
	if status.Connected {
		t.Error("expected disconnected status")
	}
}

func TestModemService_EnsureMode(t *testing.T) {
	mock := newMockFldigiServer(t)
	mock.setMode("USB")
	defer mock.stop()

	logger := newModemTestLogger()
	svc := NewModemService(mock.url(), logger)

	ctx := context.Background()
	err := svc.Connect(ctx)
	if err != nil {
		t.Fatalf("connection failed: %v", err)
	}

	// Ensure mode is set
	err = svc.EnsureMode("PSK31")
	if err != nil {
		t.Fatalf("EnsureMode failed: %v", err)
	}

	// Verify mode was changed
	status := svc.Status()
	if status.Mode != "PSK31" {
		t.Errorf("expected mode PSK31, got %s", status.Mode)
	}

	// Ensure mode again (should be idempotent)
	err = svc.EnsureMode("PSK31")
	if err != nil {
		t.Fatalf("EnsureMode (idempotent) failed: %v", err)
	}
}

func TestModemService_EnsureMode_NotConnected(t *testing.T) {
	logger := newModemTestLogger()
	svc := NewModemService("http://127.0.0.1:59996/RPC2", logger)

	err := svc.EnsureMode("PSK31")
	if err == nil {
		t.Fatal("expected error for EnsureMode when not connected")
	}
	if !strings.Contains(err.Error(), "not connected") {
		t.Errorf("expected 'not connected' error, got: %v", err)
	}
}

func TestModemService_StartStop(t *testing.T) {
	mock := newMockFldigiServer(t)
	defer mock.stop()

	logger := newModemTestLogger()
	svc := NewModemService(mock.url(), logger)
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

func TestModemService_HealthCheckLoop(t *testing.T) {
	mock := newMockFldigiServer(t)
	defer mock.stop()

	logger := newModemTestLogger()
	svc := NewModemService(mock.url(), logger)
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

	// Wait longer for health check to detect failure
	time.Sleep(300 * time.Millisecond)

	health = svc.Health()
	if health.OK {
		t.Error("expected health to be not OK after connection loss")
	}
}

func TestModemService_SetDefaultMode(t *testing.T) {
	mock := newMockFldigiServer(t)
	mock.setMode("USB")
	defer mock.stop()

	logger := newModemTestLogger()
	svc := NewModemService(mock.url(), logger)
	svc.healthInterval = 50 * time.Millisecond
	svc.SetDefaultMode("PSK31")

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	svc.Start(ctx)

	// Wait for connection and mode setting
	time.Sleep(200 * time.Millisecond)

	if !svc.IsConnected() {
		t.Error("expected service to be connected")
	}

	// Verify mode was set to default
	status := svc.Status()
	if status.Mode != "PSK31" {
		t.Errorf("expected mode PSK31, got %s", status.Mode)
	}

	svc.Stop()
}

func TestModemService_ReconnectAfterFailure(t *testing.T) {
	logger := newModemTestLogger()
	svc := NewModemService("http://127.0.0.1:59994/RPC2", logger)
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
func BenchmarkModemService_Health(b *testing.B) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := NewModemService("http://localhost:7362/RPC2", logger)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = svc.Health()
	}
}

func BenchmarkModemService_Status_Connected(b *testing.B) {
	mock := newMockFldigiServer(&testing.T{})
	defer mock.stop()

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := NewModemService(mock.url(), logger)

	ctx := context.Background()
	_ = svc.Connect(ctx)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = svc.Status()
	}
}

// Ensure ModemService implements required interfaces at compile time
func TestModemService_InterfaceCompliance(t *testing.T) {
	logger := newModemTestLogger()
	svc := NewModemService("http://localhost:7362/RPC2", logger)

	// These should compile if the interface is satisfied
	_ = svc.Health
	_ = svc.Status
	_ = svc.Connect
	_ = svc.IsConnected
	_ = svc.EnsureMode
}

// Test concurrent access to ModemService
func TestModemService_ConcurrentAccess(t *testing.T) {
	mock := newMockFldigiServer(t)
	defer mock.stop()

	logger := newModemTestLogger()
	svc := NewModemService(mock.url(), logger)

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

// Test modemClientAdapter
func TestModemClientAdapter(t *testing.T) {
	mock := newMockFldigiServer(t)
	defer mock.stop()

	logger := newModemTestLogger()
	svc := NewModemService(mock.url(), logger)

	ctx := context.Background()
	err := svc.Connect(ctx)
	if err != nil {
		t.Fatalf("connection failed: %v", err)
	}

	adapter := &modemClientAdapter{service: svc}

	// Test Status
	status := adapter.Status()
	if !status.Connected {
		t.Error("expected connected status via adapter")
	}

	// Test Health
	health := adapter.Health()
	if !health.OK {
		t.Errorf("expected health OK via adapter, got: %s", health.Message)
	}
}
