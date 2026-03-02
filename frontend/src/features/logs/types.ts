/**
 * Types for the Logs feature
 * 
 * Operator logging UI with QSO entries, history, and retention controls
 */

// QSO log entry from API
export interface QSOEntry {
  id: number;
  timestamp: string;
  callsign: string;
  frequency_hz: number;
  mode: string;
  power_watts?: number;
  notes?: string;
  source: string;
}

// Request to create a new log entry
export interface QSOEntryRequest {
  callsign: string;
  frequency_hz: number;
  mode: string;
  power_watts?: number;
  notes?: string;
  source?: string;
}

// Paginated response from GET /api/v1/log
export interface LogEntriesResponse {
  entries: QSOEntry[];
  total: number;
  limit: number;
  offset: number;
}

// Create log entry response
export interface LogEntryCreatedResponse {
  success: boolean;
  message?: string;
}

// API error response
export interface ApiErrorResponse {
  error: string;
  message?: string;
}

// Filter options for log history
export interface LogFilter {
  callsign?: string;       // Partial match filter
  dateFrom?: string;       // ISO date string
  dateTo?: string;         // ISO date string
  mode?: string;           // Mode filter
}

// Retention policy settings
export interface RetentionPolicy {
  retentionDays: number;   // Days to keep logs (default 365)
  autoPurge: boolean;      // Auto-purge enabled
  lastPurged?: string;     // Last purge timestamp
}

// Pending log entry for optimistic UI
export interface PendingLogEntry extends QSOEntryRequest {
  _pendingId: string;      // Temporary ID for pending entries
  _status: 'pending' | 'success' | 'error';
  _error?: string;
}

// Log mode options for the form
export type LogMode = 'USB' | 'LSB' | 'CW' | 'FT8' | 'FT4' | 'JS8' | 'RTTY' | 'PSK31' | 'SSB' | 'FM' | 'AM';

// Mode configuration for display
export interface LogModeConfig {
  value: LogMode;
  label: string;
  category: 'voice' | 'cw' | 'digital';
}

// Predefined mode configurations
export const LOG_MODE_CONFIGS: LogModeConfig[] = [
  { value: 'USB', label: 'USB', category: 'voice' },
  { value: 'LSB', label: 'LSB', category: 'voice' },
  { value: 'SSB', label: 'SSB', category: 'voice' },
  { value: 'FM', label: 'FM', category: 'voice' },
  { value: 'AM', label: 'AM', category: 'voice' },
  { value: 'CW', label: 'CW', category: 'cw' },
  { value: 'FT8', label: 'FT8', category: 'digital' },
  { value: 'FT4', label: 'FT4', category: 'digital' },
  { value: 'JS8', label: 'JS8', category: 'digital' },
  { value: 'RTTY', label: 'RTTY', category: 'digital' },
  { value: 'PSK31', label: 'PSK31', category: 'digital' },
];

// Common bands for frequency display
export const BAND_LABELS: Record<string, string> = {
  '160': '160m',
  '80': '80m',
  '60': '60m',
  '40': '40m',
  '30': '30m',
  '20': '20m',
  '17': '17m',
  '15': '15m',
  '12': '12m',
  '10': '10m',
  '6': '6m',
  '2': '2m',
};

// Helper to get band from frequency
export function getBandFromFrequency(hz: number): string {
  const mhz = hz / 1000000;
  if (mhz >= 1.8 && mhz <= 2.0) return '160m';
  if (mhz >= 3.5 && mhz <= 4.0) return '80m';
  if (mhz >= 5.3 && mhz <= 5.5) return '60m';
  if (mhz >= 7.0 && mhz <= 7.3) return '40m';
  if (mhz >= 10.1 && mhz <= 10.15) return '30m';
  if (mhz >= 14.0 && mhz <= 14.35) return '20m';
  if (mhz >= 18.0 && mhz <= 18.17) return '17m';
  if (mhz >= 21.0 && mhz <= 21.45) return '15m';
  if (mhz >= 24.89 && mhz <= 24.99) return '12m';
  if (mhz >= 28.0 && mhz <= 29.7) return '10m';
  if (mhz >= 50.0 && mhz <= 54.0) return '6m';
  if (mhz >= 144.0 && mhz <= 148.0) return '2m';
  return '';
}

// Helper to format frequency for display
export function formatFrequency(hz: number): string {
  const mhz = hz / 1000000;
  if (mhz >= 1) {
    return `${mhz.toFixed(3)} MHz`;
  }
  const khz = hz / 1000;
  return `${khz.toFixed(1)} kHz`;
}

// Helper to format timestamp for display
export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
