// Package storage provides SQLite-based persistence for CleanComms.
package storage

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"
)

// QSOEntry represents a single QSO log entry.
type QSOEntry struct {
	ID          int64     `json:"id"`
	Timestamp   time.Time `json:"timestamp"`
	Callsign    string    `json:"callsign"`
	FrequencyHz int64     `json:"frequency_hz"`
	Mode        string    `json:"mode"`
	PowerWatts  int       `json:"power_watts,omitempty"`
	Notes       string    `json:"notes,omitempty"`
	Source      string    `json:"source"`
}

// EventEntry represents a system event entry.
type EventEntry struct {
	ID        int64          `json:"id"`
	Timestamp time.Time      `json:"timestamp"`
	Type      string         `json:"type"`
	Category  string         `json:"category"`
	Data      map[string]any `json:"data,omitempty"`
}

// ProfileEntry represents a station profile.
type ProfileEntry struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Callsign    string    `json:"callsign,omitempty"`
	GridLocator string    `json:"grid_locator,omitempty"`
	StationName string    `json:"station_name,omitempty"`
	Antenna     string    `json:"antenna,omitempty"`
	PowerWatts  int       `json:"power_watts,omitempty"`
	IsDefault   bool      `json:"is_default"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// LoggingConfig holds configuration for the logging service.
type LoggingConfig struct {
	// BufferSize is the channel buffer size for async writes.
	BufferSize int
	// BatchSize is the maximum number of entries to write in a single batch.
	BatchSize int
	// FlushInterval is the maximum time to wait before flushing buffered entries.
	FlushInterval time.Duration
	// RetentionDays is the number of days to retain log entries (0 = keep forever).
	RetentionDays int
}

// DefaultLoggingConfig returns the default logging configuration.
func DefaultLoggingConfig() LoggingConfig {
	return LoggingConfig{
		BufferSize:    1000,
		BatchSize:     100,
		FlushInterval: 100 * time.Millisecond,
		RetentionDays: 365,
	}
}

// writeRequest represents a pending write operation.
type writeRequest struct {
	entry *QSOEntry
	event *EventEntry
	done  chan error
}

// LoggingService provides async logging for QSO entries and events.
type LoggingService struct {
	store  *SQLiteStore
	logger *slog.Logger
	config LoggingConfig

	// Async write handling
	writeCh chan *writeRequest
	ctx     context.Context
	cancel  context.CancelFunc
	wg      sync.WaitGroup

	// Health status
	mu     sync.RWMutex
	health LoggingHealth
}

// LoggingHealth represents the health status of the logging service.
type LoggingHealth struct {
	OK           bool      `json:"ok"`
	Error        string    `json:"error,omitempty"`
	BufferUsed   int       `json:"buffer_used"`
	BufferSize   int       `json:"buffer_size"`
	PendingWrite int       `json:"pending_writes"`
	LastCheck    time.Time `json:"last_check"`
}

// NewLoggingService creates a new logging service.
func NewLoggingService(store *SQLiteStore, logger *slog.Logger, config LoggingConfig) *LoggingService {
	if config.BufferSize <= 0 {
		config.BufferSize = DefaultLoggingConfig().BufferSize
	}
	if config.BatchSize <= 0 {
		config.BatchSize = DefaultLoggingConfig().BatchSize
	}
	if config.FlushInterval <= 0 {
		config.FlushInterval = DefaultLoggingConfig().FlushInterval
	}

	return &LoggingService{
		store:   store,
		logger:  logger,
		config:  config,
		writeCh: make(chan *writeRequest, config.BufferSize),
		health: LoggingHealth{
			OK:         false,
			Error:      "not started",
			BufferSize: config.BufferSize,
		},
	}
}

// Start begins the background write goroutine.
func (s *LoggingService) Start(ctx context.Context) {
	s.ctx, s.cancel = context.WithCancel(ctx)

	s.wg.Add(1)
	go s.writeLoop()

	s.mu.Lock()
	s.health.OK = true
	s.health.Error = ""
	s.health.LastCheck = time.Now()
	s.mu.Unlock()

	s.logger.Info("logging service started",
		"buffer_size", s.config.BufferSize,
		"batch_size", s.config.BatchSize,
		"flush_interval", s.config.FlushInterval,
	)
}

// Stop stops the background goroutines and flushes pending writes.
func (s *LoggingService) Stop() error {
	if s.cancel != nil {
		s.cancel()
	}
	s.wg.Wait()

	if err := s.store.Close(); err != nil {
		return fmt.Errorf("failed to close store: %w", err)
	}

	s.logger.Info("logging service stopped")
	return nil
}

// Health returns the current health status.
func (s *LoggingService) Health() LoggingHealth {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Update buffer stats
	s.health.BufferUsed = len(s.writeCh)
	s.health.LastCheck = time.Now()

	// Check database health
	if s.store == nil || !s.store.IsHealthy() {
		s.health.OK = false
		s.health.Error = "database unavailable"
	}

	return s.health
}

// LogQSO queues a QSO entry for async writing.
// This method is non-blocking and returns immediately.
// Use LogQSOSync for synchronous writes when needed.
func (s *LoggingService) LogQSO(entry *QSOEntry) error {
	s.mu.RLock()
	healthy := s.health.OK
	s.mu.RUnlock()

	if !healthy {
		return fmt.Errorf("logging service not healthy")
	}

	// Set defaults
	if entry.Timestamp.IsZero() {
		entry.Timestamp = time.Now()
	}
	if entry.Source == "" {
		entry.Source = "manual"
	}

	// Non-blocking send with buffer check
	select {
	case s.writeCh <- &writeRequest{entry: entry}:
		return nil
	default:
		// Buffer full - this shouldn't happen with proper sizing
		s.logger.Warn("write buffer full, dropping entry")
		return fmt.Errorf("write buffer full")
	}
}

// LogQSOSync writes a QSO entry synchronously.
func (s *LoggingService) LogQSOSync(entry *QSOEntry) error {
	if entry.Timestamp.IsZero() {
		entry.Timestamp = time.Now()
	}
	if entry.Source == "" {
		entry.Source = "manual"
	}

	return s.insertQSO(entry)
}

// LogEvent queues an event entry for async writing.
func (s *LoggingService) LogEvent(event *EventEntry) error {
	s.mu.RLock()
	healthy := s.health.OK
	s.mu.RUnlock()

	if !healthy {
		return fmt.Errorf("logging service not healthy")
	}

	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}

	select {
	case s.writeCh <- &writeRequest{event: event}:
		return nil
	default:
		s.logger.Warn("write buffer full, dropping event")
		return fmt.Errorf("write buffer full")
	}
}

// writeLoop processes pending write requests in batches.
func (s *LoggingService) writeLoop() {
	defer s.wg.Done()

	batch := make([]*writeRequest, 0, s.config.BatchSize)
	ticker := time.NewTicker(s.config.FlushInterval)
	defer ticker.Stop()

	flush := func() {
		if len(batch) == 0 {
			return
		}

		// Process batch
		for _, req := range batch {
			var err error
			if req.entry != nil {
				err = s.insertQSO(req.entry)
			} else if req.event != nil {
				err = s.insertEvent(req.event)
			}
			if req.done != nil {
				req.done <- err
			} else if err != nil {
				s.logger.Error("failed to write entry", "error", err)
			}
		}

		batch = batch[:0]
	}

	for {
		select {
		case <-s.ctx.Done():
			// Flush remaining entries before shutdown
			flush()
			return

		case req := <-s.writeCh:
			batch = append(batch, req)
			if len(batch) >= s.config.BatchSize {
				flush()
			}

		case <-ticker.C:
			flush()
		}
	}
}

// insertQSO inserts a QSO entry into the database.
func (s *LoggingService) insertQSO(entry *QSOEntry) error {
	db := s.store.DB()
	if db == nil {
		return fmt.Errorf("database not available")
	}

	_, err := db.Exec(`
		INSERT INTO qso_log (timestamp, callsign, frequency_hz, mode, power_watts, notes, source)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, entry.Timestamp, entry.Callsign, entry.FrequencyHz, entry.Mode, entry.PowerWatts, entry.Notes, entry.Source)

	return err
}

// insertEvent inserts an event entry into the database.
func (s *LoggingService) insertEvent(event *EventEntry) error {
	db := s.store.DB()
	if db == nil {
		return fmt.Errorf("database not available")
	}

	var dataJSON []byte
	var err error
	if event.Data != nil {
		dataJSON, err = json.Marshal(event.Data)
		if err != nil {
			return fmt.Errorf("failed to marshal event data: %w", err)
		}
	}

	_, err = db.Exec(`
		INSERT INTO events (timestamp, type, category, data)
		VALUES (?, ?, ?, ?)
	`, event.Timestamp, event.Type, event.Category, string(dataJSON))

	return err
}

// GetQSOEntries retrieves QSO entries with pagination.
func (s *LoggingService) GetQSOEntries(limit, offset int) ([]QSOEntry, int, error) {
	db := s.store.DB()
	if db == nil {
		return nil, 0, fmt.Errorf("database not available")
	}

	if limit <= 0 {
		limit = 100
	}
	if limit > 1000 {
		limit = 1000
	}

	// Get total count
	var total int
	err := db.QueryRow(`SELECT COUNT(*) FROM qso_log`).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count entries: %w", err)
	}

	// Get entries
	rows, err := db.Query(`
		SELECT id, timestamp, callsign, frequency_hz, mode, power_watts, notes, source
		FROM qso_log
		ORDER BY timestamp DESC
		LIMIT ? OFFSET ?
	`, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query entries: %w", err)
	}
	defer rows.Close()

	var entries []QSOEntry
	for rows.Next() {
		var entry QSOEntry
		var powerWatts sql.NullInt32
		var notes sql.NullString

		err := rows.Scan(
			&entry.ID,
			&entry.Timestamp,
			&entry.Callsign,
			&entry.FrequencyHz,
			&entry.Mode,
			&powerWatts,
			&notes,
			&entry.Source,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan entry: %w", err)
		}

		if powerWatts.Valid {
			entry.PowerWatts = int(powerWatts.Int32)
		}
		if notes.Valid {
			entry.Notes = notes.String
		}

		entries = append(entries, entry)
	}

	if entries == nil {
		entries = []QSOEntry{}
	}

	return entries, total, rows.Err()
}

// GetQSOByCallsign retrieves QSO entries for a specific callsign.
func (s *LoggingService) GetQSOByCallsign(callsign string, limit int) ([]QSOEntry, error) {
	db := s.store.DB()
	if db == nil {
		return nil, fmt.Errorf("database not available")
	}

	if limit <= 0 {
		limit = 100
	}

	rows, err := db.Query(`
		SELECT id, timestamp, callsign, frequency_hz, mode, power_watts, notes, source
		FROM qso_log
		WHERE callsign = ?
		ORDER BY timestamp DESC
		LIMIT ?
	`, callsign, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query entries: %w", err)
	}
	defer rows.Close()

	var entries []QSOEntry
	for rows.Next() {
		var entry QSOEntry
		var powerWatts sql.NullInt32
		var notes sql.NullString

		err := rows.Scan(
			&entry.ID,
			&entry.Timestamp,
			&entry.Callsign,
			&entry.FrequencyHz,
			&entry.Mode,
			&powerWatts,
			&notes,
			&entry.Source,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan entry: %w", err)
		}

		if powerWatts.Valid {
			entry.PowerWatts = int(powerWatts.Int32)
		}
		if notes.Valid {
			entry.Notes = notes.String
		}

		entries = append(entries, entry)
	}

	if entries == nil {
		entries = []QSOEntry{}
	}

	return entries, rows.Err()
}

// RunRetention removes old entries based on retention policy.
func (s *LoggingService) RunRetention() error {
	if s.config.RetentionDays <= 0 {
		return nil // Keep forever
	}

	db := s.store.DB()
	if db == nil {
		return fmt.Errorf("database not available")
	}

	cutoff := time.Now().AddDate(0, 0, -s.config.RetentionDays)

	// Delete old QSO entries
	result, err := db.Exec(`DELETE FROM qso_log WHERE timestamp < ?`, cutoff)
	if err != nil {
		return fmt.Errorf("failed to delete old qso entries: %w", err)
	}
	qsoDeleted, _ := result.RowsAffected()

	// Delete old events
	result, err = db.Exec(`DELETE FROM events WHERE timestamp < ?`, cutoff)
	if err != nil {
		return fmt.Errorf("failed to delete old events: %w", err)
	}
	eventsDeleted, _ := result.RowsAffected()

	if qsoDeleted > 0 || eventsDeleted > 0 {
		s.logger.Info("retention cleanup completed",
			"qso_deleted", qsoDeleted,
			"events_deleted", eventsDeleted,
		)
	}

	return nil
}
