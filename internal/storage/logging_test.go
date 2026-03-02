// Package storage provides SQLite-based persistence for CleanComms.
package storage

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"
)

func TestNewSQLiteStore(t *testing.T) {
	// Create temp directory
	tmpDir, err := os.MkdirTemp("", "cleancomms-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	dbPath := filepath.Join(tmpDir, "test.db")
	cfg := SQLiteConfig{
		Path:          dbPath,
		RetentionDays: 365,
	}

	store, err := NewSQLiteStore(cfg)
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}
	defer store.Close()

	// Verify store is healthy
	if !store.IsHealthy() {
		t.Error("expected store to be healthy")
	}

	// Verify database file was created
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		t.Error("expected database file to be created")
	}
}

func TestSQLiteStore_WALMode(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "cleancomms-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	dbPath := filepath.Join(tmpDir, "test.db")
	cfg := SQLiteConfig{Path: dbPath}

	store, err := NewSQLiteStore(cfg)
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}
	defer store.Close()

	// Verify WAL mode is enabled
	var journalMode string
	err = store.DB().QueryRow("PRAGMA journal_mode").Scan(&journalMode)
	if err != nil {
		t.Fatalf("failed to query journal mode: %v", err)
	}

	if journalMode != "wal" {
		t.Errorf("expected journal_mode 'wal', got '%s'", journalMode)
	}
}

func TestLoggingService_BasicOperations(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "cleancomms-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	dbPath := filepath.Join(tmpDir, "test.db")
	store, err := NewSQLiteStore(SQLiteConfig{Path: dbPath})
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}
	defer store.Close()

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	config := LoggingConfig{
		BufferSize:    100,
		BatchSize:     10,
		FlushInterval: 10 * time.Millisecond,
	}

	svc := NewLoggingService(store, logger, config)
	ctx := context.Background()
	svc.Start(ctx)

	// Test synchronous write
	entry := &QSOEntry{
		Callsign:    "W1AW",
		FrequencyHz: 14070000,
		Mode:        "USB",
		PowerWatts:  100,
		Notes:       "Test QSO",
		Source:      "test",
	}

	err = svc.LogQSOSync(entry)
	if err != nil {
		t.Fatalf("failed to log QSO: %v", err)
	}

	// Verify entry was written
	entries, total, err := svc.GetQSOEntries(10, 0)
	if err != nil {
		t.Fatalf("failed to get entries: %v", err)
	}

	if total != 1 {
		t.Errorf("expected 1 entry, got %d", total)
	}

	if len(entries) != 1 {
		t.Fatalf("expected 1 entry in slice, got %d", len(entries))
	}

	if entries[0].Callsign != "W1AW" {
		t.Errorf("expected callsign 'W1AW', got '%s'", entries[0].Callsign)
	}

	svc.Stop()
}

func TestLoggingService_AsyncWrites(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "cleancomms-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	dbPath := filepath.Join(tmpDir, "test.db")
	store, err := NewSQLiteStore(SQLiteConfig{Path: dbPath})
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}
	defer store.Close()

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	config := LoggingConfig{
		BufferSize:    100,
		BatchSize:     10,
		FlushInterval: 10 * time.Millisecond,
	}

	svc := NewLoggingService(store, logger, config)
	ctx := context.Background()
	svc.Start(ctx)

	// Write multiple entries asynchronously
	for i := 0; i < 50; i++ {
		entry := &QSOEntry{
			Callsign:    fmt.Sprintf("W%dAW", i),
			FrequencyHz: 14070000 + int64(i*1000),
			Mode:        "USB",
			Source:      "test",
		}
		err = svc.LogQSO(entry)
		if err != nil {
			t.Fatalf("failed to queue QSO: %v", err)
		}
	}

	// Wait for flush
	time.Sleep(100 * time.Millisecond)

	// Verify entries were written
	_, total, err := svc.GetQSOEntries(100, 0)
	if err != nil {
		t.Fatalf("failed to get entries: %v", err)
	}

	if total != 50 {
		t.Errorf("expected 50 entries, got %d", total)
	}

	svc.Stop()
}

func TestLoggingService_BurstLoad(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "cleancomms-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	dbPath := filepath.Join(tmpDir, "test.db")
	store, err := NewSQLiteStore(SQLiteConfig{Path: dbPath})
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}
	defer store.Close()

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	config := LoggingConfig{
		BufferSize:    2000,
		BatchSize:     100,
		FlushInterval: 50 * time.Millisecond,
	}

	svc := NewLoggingService(store, logger, config)
	ctx := context.Background()
	svc.Start(ctx)

	// Burst load: 1000 inserts
	const burstCount = 1000
	start := time.Now()

	var wg sync.WaitGroup
	errors := make(chan error, burstCount)

	for i := 0; i < burstCount; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			entry := &QSOEntry{
				Callsign:    fmt.Sprintf("W%04dAW", idx),
				FrequencyHz: 14070000 + int64(idx*100),
				Mode:        "USB",
				Source:      "burst_test",
			}
			if err := svc.LogQSO(entry); err != nil {
				errors <- err
			}
		}(i)
	}

	wg.Wait()
	close(errors)

	// Check for errors
	for err := range errors {
		if err != nil {
			t.Errorf("burst load error: %v", err)
		}
	}

	elapsed := time.Since(start)
	t.Logf("Burst load of %d entries completed in %v", burstCount, elapsed)

	// Wait for all writes to flush
	time.Sleep(500 * time.Millisecond)

	// Verify entries were written
	_, total, err := svc.GetQSOEntries(burstCount+100, 0)
	if err != nil {
		t.Fatalf("failed to get entries: %v", err)
	}

	if total != burstCount {
		t.Errorf("expected %d entries, got %d", burstCount, total)
	}

	// Verify bounded latency
	if elapsed > 5*time.Second {
		t.Errorf("burst load took too long: %v", elapsed)
	}

	svc.Stop()
}

func TestLoggingService_GetQSOByCallsign(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "cleancomms-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	dbPath := filepath.Join(tmpDir, "test.db")
	store, err := NewSQLiteStore(SQLiteConfig{Path: dbPath})
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}
	defer store.Close()

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	config := LoggingConfig{
		BufferSize:    100,
		BatchSize:     10,
		FlushInterval: 10 * time.Millisecond,
	}

	svc := NewLoggingService(store, logger, config)
	ctx := context.Background()
	svc.Start(ctx)

	// Write test entries
	testCallsigns := []string{"W1AW", "W2AW", "W1AW", "W3AW", "W1AW"}
	for i, cs := range testCallsigns {
		entry := &QSOEntry{
			Callsign:    cs,
			FrequencyHz: 14070000 + int64(i*1000),
			Mode:        "USB",
			Source:      "test",
		}
		err = svc.LogQSOSync(entry)
		if err != nil {
			t.Fatalf("failed to log QSO: %v", err)
		}
	}

	// Query by callsign
	entries, err := svc.GetQSOByCallsign("W1AW", 10)
	if err != nil {
		t.Fatalf("failed to get entries by callsign: %v", err)
	}

	if len(entries) != 3 {
		t.Errorf("expected 3 entries for W1AW, got %d", len(entries))
	}

	// Verify all entries have correct callsign
	for _, e := range entries {
		if e.Callsign != "W1AW" {
			t.Errorf("expected callsign 'W1AW', got '%s'", e.Callsign)
		}
	}

	svc.Stop()
}

func TestLoggingService_Health(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "cleancomms-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	dbPath := filepath.Join(tmpDir, "test.db")
	store, err := NewSQLiteStore(SQLiteConfig{Path: dbPath})
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}
	defer store.Close()

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	config := LoggingConfig{
		BufferSize:    100,
		BatchSize:     10,
		FlushInterval: 10 * time.Millisecond,
	}

	svc := NewLoggingService(store, logger, config)

	// Before start, health should show not started
	health := svc.Health()
	if health.OK {
		t.Error("expected health to be not OK before start")
	}

	ctx := context.Background()
	svc.Start(ctx)

	// After start, health should be OK
	health = svc.Health()
	if !health.OK {
		t.Errorf("expected health to be OK after start, got error: %s", health.Error)
	}

	svc.Stop()
}

func TestLoggingService_LogEvent(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "cleancomms-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	dbPath := filepath.Join(tmpDir, "test.db")
	store, err := NewSQLiteStore(SQLiteConfig{Path: dbPath})
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}
	defer store.Close()

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	config := LoggingConfig{
		BufferSize:    100,
		BatchSize:     10,
		FlushInterval: 10 * time.Millisecond,
	}

	svc := NewLoggingService(store, logger, config)
	ctx := context.Background()
	svc.Start(ctx)

	// Log an event
	event := &EventEntry{
		Type:     "mode_change",
		Category: "radio",
		Data: map[string]any{
			"from": "USB",
			"to":   "LSB",
		},
	}

	err = svc.LogEvent(event)
	if err != nil {
		t.Fatalf("failed to log event: %v", err)
	}

	// Wait for flush
	time.Sleep(50 * time.Millisecond)

	// Verify event was written
	var count int
	err = store.DB().QueryRow("SELECT COUNT(*) FROM events WHERE type = ?", "mode_change").Scan(&count)
	if err != nil {
		t.Fatalf("failed to count events: %v", err)
	}

	if count != 1 {
		t.Errorf("expected 1 event, got %d", count)
	}

	svc.Stop()
}

func TestLoggingService_Pagination(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "cleancomms-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	dbPath := filepath.Join(tmpDir, "test.db")
	store, err := NewSQLiteStore(SQLiteConfig{Path: dbPath})
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}
	defer store.Close()

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	config := LoggingConfig{
		BufferSize:    100,
		BatchSize:     10,
		FlushInterval: 10 * time.Millisecond,
	}

	svc := NewLoggingService(store, logger, config)
	ctx := context.Background()
	svc.Start(ctx)

	// Write 25 entries
	for i := 0; i < 25; i++ {
		entry := &QSOEntry{
			Callsign:    fmt.Sprintf("W%02dAW", i),
			FrequencyHz: 14070000 + int64(i*1000),
			Mode:        "USB",
			Source:      "test",
		}
		err = svc.LogQSOSync(entry)
		if err != nil {
			t.Fatalf("failed to log QSO: %v", err)
		}
	}

	// Test pagination
	page1, total, err := svc.GetQSOEntries(10, 0)
	if err != nil {
		t.Fatalf("failed to get page 1: %v", err)
	}

	if total != 25 {
		t.Errorf("expected total 25, got %d", total)
	}

	if len(page1) != 10 {
		t.Errorf("expected 10 entries on page 1, got %d", len(page1))
	}

	page2, _, err := svc.GetQSOEntries(10, 10)
	if err != nil {
		t.Fatalf("failed to get page 2: %v", err)
	}

	if len(page2) != 10 {
		t.Errorf("expected 10 entries on page 2, got %d", len(page2))
	}

	page3, _, err := svc.GetQSOEntries(10, 20)
	if err != nil {
		t.Fatalf("failed to get page 3: %v", err)
	}

	if len(page3) != 5 {
		t.Errorf("expected 5 entries on page 3, got %d", len(page3))
	}

	svc.Stop()
}

func TestLoggingService_UnavailableDB(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	config := LoggingConfig{
		BufferSize:    100,
		BatchSize:     10,
		FlushInterval: 10 * time.Millisecond,
	}

	// Create service with nil store (simulating unavailable DB)
	svc := &LoggingService{
		store:   nil,
		logger:  logger,
		config:  config,
		writeCh: make(chan *writeRequest, config.BufferSize),
	}

	// Should not be able to log
	entry := &QSOEntry{
		Callsign:    "W1AW",
		FrequencyHz: 14070000,
		Mode:        "USB",
	}

	err := svc.LogQSO(entry)
	if err == nil {
		t.Error("expected error when logging with unavailable service")
	}

	// Health check should fail
	health := svc.Health()
	if health.OK {
		t.Error("expected health to be not OK with unavailable service")
	}
}
