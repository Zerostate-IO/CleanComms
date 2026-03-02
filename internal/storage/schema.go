// Package storage provides SQLite-based persistence for CleanComms.
package storage

import (
	"database/sql"
)

// schemaSQL contains the database schema definition.
const schemaSQL = `
-- QSO log table for amateur radio contacts
CREATE TABLE IF NOT EXISTS qso_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    callsign TEXT NOT NULL,
    frequency_hz INTEGER NOT NULL,
    mode TEXT NOT NULL,
    power_watts INTEGER,
    notes TEXT,
    source TEXT DEFAULT 'manual',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Events table for system events and signals
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    type TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Profiles table for station profile data
CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    callsign TEXT,
    grid_locator TEXT,
    station_name TEXT,
    antenna TEXT,
    power_watts INTEGER,
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_qso_timestamp ON qso_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_qso_callsign ON qso_log(callsign);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles(name);
`

// applySchema applies the database schema.
func applySchema(db *sql.DB) error {
	_, err := db.Exec(schemaSQL)
	return err
}
