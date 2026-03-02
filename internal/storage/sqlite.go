// Package storage provides SQLite-based persistence for CleanComms.
package storage

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	_ "github.com/mattn/go-sqlite3"
)

// SQLiteStore wraps a SQLite database connection with WAL mode.
type SQLiteStore struct {
	db   *sql.DB
	path string
	mu   sync.RWMutex
}

// SQLiteConfig holds configuration for the SQLite store.
type SQLiteConfig struct {
	// Path is the filesystem path to the SQLite database file.
	Path string
	// RetentionDays is the number of days to retain log entries (0 = keep forever).
	RetentionDays int
}

// DefaultSQLiteConfig returns the default configuration.
func DefaultSQLiteConfig() SQLiteConfig {
	return SQLiteConfig{
		Path:          "data/cleancomms.db",
		RetentionDays: 365,
	}
}

// NewSQLiteStore creates a new SQLite store with WAL mode enabled.
func NewSQLiteStore(cfg SQLiteConfig) (*SQLiteStore, error) {
	// Ensure parent directory exists
	dir := filepath.Dir(cfg.Path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create database directory: %w", err)
	}

	// Open database connection
	db, err := sql.Open("sqlite3", cfg.Path)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Enable WAL mode for better concurrent access
	if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to enable WAL mode: %w", err)
	}

	// Enable async writes (NORMAL is safe with WAL)
	if _, err := db.Exec("PRAGMA synchronous=NORMAL"); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to set synchronous mode: %w", err)
	}

	// Set busy timeout for concurrent access
	if _, err := db.Exec("PRAGMA busy_timeout=5000"); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to set busy timeout: %w", err)
	}

	// Apply schema
	if err := applySchema(db); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to apply schema: %w", err)
	}

	store := &SQLiteStore{
		db:   db,
		path: cfg.Path,
	}

	return store, nil
}

// DB returns the underlying database connection.
func (s *SQLiteStore) DB() *sql.DB {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.db
}

// Close closes the database connection.
func (s *SQLiteStore) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.db != nil {
		return s.db.Close()
	}
	return nil
}

// Path returns the database file path.
func (s *SQLiteStore) Path() string {
	return s.path
}

// IsHealthy returns true if the database is accessible.
func (s *SQLiteStore) IsHealthy() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.db == nil {
		return false
	}

	err := s.db.Ping()
	return err == nil
}
