/**
 * LogsPage - Main logs page
 * 
 * Combines log entry form, history display, and retention controls
 * Provides complete operator logging UX with fast writes and local filtering
 */
import { useLogsState } from './hooks';
import { LogEntryForm } from './LogEntryForm';
import { LogHistory } from './LogHistory';
import { RetentionPolicy } from './RetentionPolicy';
import type { QSOEntryRequest } from './types';
import '../../styles/Logs.css';

interface LogsPageProps {
  disabled?: boolean;
  defaultFrequency?: number;
  defaultMode?: 'USB' | 'LSB' | 'CW' | 'FT8' | 'FT4' | 'JS8' | 'RTTY' | 'PSK31' | 'SSB' | 'FM' | 'AM';
}

export function LogsPage({
  disabled = false,
  defaultFrequency,
  defaultMode = 'USB',
}: LogsPageProps) {
  const {
    // Entries
    entries,
    total,
    isLoading,
    error,
    refetch,
    
    // Filtering
    filter,
    updateFilter,
    clearFilter,
    
    // Creation
    createEntry,
    isSubmitting,
    retryEntry,
    
    // Retention
    policy,
    setRetentionDays,
    toggleAutoPurge,
    manualPurge,
    
    // Pagination
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
  } = useLogsState();

  // Handle form submission
  const handleSubmit = async (entry: QSOEntryRequest): Promise<boolean> => {
    if (disabled) return false;
    return createEntry(entry);
  };

  return (
    <div className="logs-page">
      {/* Header */}
      <div className="logs-page__header">
        <div className="logs-page__header-content">
          <h2 className="logs-page__title">Operator Log</h2>
          <p className="logs-page__subtitle">
            QSO logging with local storage
          </p>
        </div>
        <button
          onClick={refetch}
          className="logs-page__refresh-btn"
          disabled={isLoading}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Main content grid */}
      <div className="logs-page__grid">
        {/* Left column - Entry form and retention */}
        <div className="logs-page__column logs-page__column--sidebar">
          {/* Log entry form */}
          <LogEntryForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            defaultFrequency={defaultFrequency}
            defaultMode={defaultMode}
          />

          {/* Retention policy */}
          <RetentionPolicy
            policy={policy}
            onSetRetentionDays={setRetentionDays}
            onToggleAutoPurge={toggleAutoPurge}
            onManualPurge={manualPurge}
          />
        </div>

        {/* Right column - Log history */}
        <div className="logs-page__column logs-page__column--main">
          <LogHistory
            entries={entries}
            total={total}
            isLoading={isLoading}
            error={error}
            filter={filter}
            onUpdateFilter={updateFilter}
            onClearFilter={clearFilter}
            onRetryEntry={retryEntry}
            currentPage={currentPage}
            totalPages={totalPages}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            onNextPage={nextPage}
            onPrevPage={prevPage}
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="logs-page__status">
        <div className="logs-page__status-item">
          <span className="logs-page__status-label">Total entries:</span>
          <span className="logs-page__status-value">{total}</span>
        </div>
        <div className="logs-page__status-item">
          <span className="logs-page__status-label">Retention:</span>
          <span className="logs-page__status-value">{policy.retentionDays} days</span>
        </div>
        <div className="logs-page__status-item">
          <span className="logs-page__status-label">Storage:</span>
          <span className="logs-page__status-value">Local (SQLite)</span>
        </div>
      </div>
    </div>
  );
}
