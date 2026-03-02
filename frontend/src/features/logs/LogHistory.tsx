/**
 * LogHistory - Log history display with filtering
 * 
 * Shows QSO entries with search/filter capabilities
 * Supports filtering by callsign, date range, and mode
 */
import { useState, useCallback } from 'react';
import type { LogFilter, QSOEntry } from './types';
import { LOG_MODE_CONFIGS, formatFrequency, formatTimestamp, getBandFromFrequency } from './types';
import '../../styles/Logs.css';

// Extended entry type for display (includes pending state)
interface DisplayEntry extends QSOEntry {
  _pending?: boolean;
  _pendingId?: string;
  _status?: 'pending' | 'success' | 'error';
  _error?: string;
}

interface LogHistoryProps {
  entries: DisplayEntry[];
  total: number;
  isLoading: boolean;
  error: string | null;
  filter: LogFilter;
  onUpdateFilter: (filter: Partial<LogFilter>) => void;
  onClearFilter: () => void;
  onRetryEntry?: (pendingId: string) => void;
  // Pagination
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
}

export function LogHistory({
  entries,
  total,
  isLoading,
  error,
  filter,
  onUpdateFilter,
  onClearFilter,
  onRetryEntry,
  currentPage,
  totalPages,
  hasNextPage,
  hasPrevPage,
  onNextPage,
  onPrevPage,
}: LogHistoryProps) {
  const [showFilters, setShowFilters] = useState(false);

  // Check if any filters are active
  const hasActiveFilters = Boolean(filter.callsign || filter.dateFrom || filter.dateTo || filter.mode);

  // Handle date change
  const handleDateFromChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateFilter({ dateFrom: e.target.value || undefined });
  }, [onUpdateFilter]);

  const handleDateToChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateFilter({ dateTo: e.target.value || undefined });
  }, [onUpdateFilter]);

  // Handle callsign filter
  const handleCallsignChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateFilter({ callsign: e.target.value || undefined });
  }, [onUpdateFilter]);

  // Handle mode filter
  const handleModeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateFilter({ mode: e.target.value || undefined });
  }, [onUpdateFilter]);

  // Get status class for entry row
  const getStatusClass = (entry: DisplayEntry): string => {
    if (entry._pending) {
      switch (entry._status) {
        case 'pending': return 'log-history__row--pending';
        case 'error': return 'log-history__row--error';
        case 'success': return 'log-history__row--success';
      }
    }
    return '';
  };

  return (
    <div className="log-history">
      {/* Header with filter toggle */}
      <div className="log-history__header">
        <div className="log-history__title-row">
          <h3 className="log-history__title">
            QSO Log
            {total > 0 && <span className="log-history__count">({total} entries)</span>}
          </h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`log-history__filter-toggle ${hasActiveFilters ? 'log-history__filter-toggle--active' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filters
            {hasActiveFilters && <span className="log-history__filter-badge" />}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="log-history__filters">
            <div className="log-history__filter-row">
              {/* Callsign filter */}
              <div className="log-history__filter-group">
                <label htmlFor="filter-callsign" className="log-history__filter-label">
                  Callsign
                </label>
                <input
                  id="filter-callsign"
                  type="text"
                  value={filter.callsign || ''}
                  onChange={handleCallsignChange}
                  placeholder="Search..."
                  className="log-history__filter-input"
                />
              </div>

              {/* Mode filter */}
              <div className="log-history__filter-group">
                <label htmlFor="filter-mode" className="log-history__filter-label">
                  Mode
                </label>
                <select
                  id="filter-mode"
                  value={filter.mode || ''}
                  onChange={handleModeChange}
                  className="log-history__filter-select"
                >
                  <option value="">All modes</option>
                  {LOG_MODE_CONFIGS.map((config) => (
                    <option key={config.value} value={config.value}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date from */}
              <div className="log-history__filter-group">
                <label htmlFor="filter-date-from" className="log-history__filter-label">
                  From
                </label>
                <input
                  id="filter-date-from"
                  type="date"
                  value={filter.dateFrom || ''}
                  onChange={handleDateFromChange}
                  className="log-history__filter-input"
                />
              </div>

              {/* Date to */}
              <div className="log-history__filter-group">
                <label htmlFor="filter-date-to" className="log-history__filter-label">
                  To
                </label>
                <input
                  id="filter-date-to"
                  type="date"
                  value={filter.dateTo || ''}
                  onChange={handleDateToChange}
                  className="log-history__filter-input"
                />
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={onClearFilter}
                  className="log-history__clear-btn"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="log-history__error" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="log-history__table-wrapper">
        {isLoading ? (
          <div className="log-history__loading">
            <span className="log-history__loading-spinner" />
            <span>Loading entries...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="log-history__empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <p>No QSO entries found</p>
            {hasActiveFilters && (
              <button onClick={onClearFilter} className="log-history__empty-clear">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <table className="log-history__table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Callsign</th>
                <th>Frequency</th>
                <th>Mode</th>
                <th>Power</th>
                <th>Notes</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry._pending ? entry._pendingId : entry.id} className={getStatusClass(entry)}>
                  <td className="log-history__cell log-history__cell--time">
                    {formatTimestamp(entry.timestamp)}
                  </td>
                  <td className="log-history__cell log-history__cell--callsign">
                    <span className="log-history__callsign">{entry.callsign}</span>
                  </td>
                  <td className="log-history__cell log-history__cell--freq">
                    <span className="log-history__freq">{formatFrequency(entry.frequency_hz)}</span>
                    <span className="log-history__band">{getBandFromFrequency(entry.frequency_hz)}</span>
                  </td>
                  <td className="log-history__cell log-history__cell--mode">
                    <span className={`log-history__mode-badge log-history__mode-badge--${entry.mode.toLowerCase()}`}>
                      {entry.mode}
                    </span>
                  </td>
                  <td className="log-history__cell log-history__cell--power">
                    {entry.power_watts ? `${entry.power_watts}W` : '-'}
                  </td>
                  <td className="log-history__cell log-history__cell--notes">
                    {entry.notes || '-'}
                  </td>
                  <td className="log-history__cell log-history__cell--status">
                    {entry._pending ? (
                      entry._status === 'pending' ? (
                        <span className="log-history__status log-history__status--pending">
                          <span className="log-history__status-spinner" />
                          Queueing
                        </span>
                      ) : entry._status === 'error' ? (
                        <span className="log-history__status log-history__status--error">
                          <span className="log-history__status-icon">✗</span>
                          Failed
                          {onRetryEntry && (
                            <button
                              onClick={() => onRetryEntry(entry._pendingId!)}
                              className="log-history__retry-btn"
                            >
                              Retry
                            </button>
                          )}
                        </span>
                      ) : (
                        <span className="log-history__status log-history__status--success">
                          <span className="log-history__status-icon">✓</span>
                          Saved
                        </span>
                      )
                    ) : (
                      <span className="log-history__status log-history__status--saved">
                        {entry.source}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="log-history__pagination">
          <button
            onClick={onPrevPage}
            disabled={!hasPrevPage}
            className="log-history__page-btn"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Prev
          </button>
          
          <span className="log-history__page-info">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={onNextPage}
            disabled={!hasNextPage}
            className="log-history__page-btn"
          >
            Next
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
