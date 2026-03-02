/**
 * RetentionPolicy - Retention settings for log entries
 * 
 * Controls for retention days, auto-purge toggle, and manual purge
 * Settings stored in localStorage (backend integration optional)
 */
import { useState, useCallback } from 'react';
import type { RetentionPolicy } from './types';
import '../../styles/Logs.css';

interface RetentionPolicyProps {
  policy: RetentionPolicy;
  onSetRetentionDays: (days: number) => void;
  onToggleAutoPurge: () => void;
  onManualPurge: () => Promise<{ success: boolean; error?: string }>;
}

export function RetentionPolicy({
  policy,
  onSetRetentionDays,
  onToggleAutoPurge,
  onManualPurge,
}: RetentionPolicyProps) {
  const [isPurging, setIsPurging] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [purgeSuccess, setPurgeSuccess] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Predefined retention options
  const retentionOptions = [
    { days: 30, label: '30 days' },
    { days: 90, label: '90 days' },
    { days: 180, label: '6 months' },
    { days: 365, label: '1 year' },
    { days: 730, label: '2 years' },
    { days: 1825, label: '5 years' },
    { days: 3650, label: '10 years' },
  ];

  // Handle manual purge
  const handlePurge = useCallback(async () => {
    if (!window.confirm(`Purge all log entries older than ${policy.retentionDays} days? This cannot be undone.`)) {
      return;
    }

    setIsPurging(true);
    setPurgeError(null);
    setPurgeSuccess(false);

    const result = await onManualPurge();
    
    setIsPurging(false);
    
    if (result.success) {
      setPurgeSuccess(true);
      setTimeout(() => setPurgeSuccess(false), 3000);
    } else {
      setPurgeError(result.error || 'Purge failed');
    }
  }, [onManualPurge, policy.retentionDays]);

  // Format last purged date
  const formatLastPurged = (iso?: string): string => {
    if (!iso) return 'Never';
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate cutoff date
  const getCutoffDate = (): string => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - policy.retentionDays);
    return cutoff.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="retention-policy">
      <div className="retention-policy__header">
        <h3 className="retention-policy__title">Retention Policy</h3>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="retention-policy__toggle"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          {showAdvanced ? 'Hide' : 'Settings'}
        </button>
      </div>

      {showAdvanced && (
        <div className="retention-policy__content">
          {/* Retention period selector */}
          <div className="retention-policy__field">
            <label className="retention-policy__label">
              Keep logs for
            </label>
            <div className="retention-policy__options">
              {retentionOptions.map((option) => (
                <button
                  key={option.days}
                  onClick={() => onSetRetentionDays(option.days)}
                  className={`retention-policy__option ${
                    policy.retentionDays === option.days ? 'retention-policy__option--active' : ''
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="retention-policy__hint">
              Entries older than {getCutoffDate()} will be eligible for purge
            </p>
          </div>

          {/* Auto-purge toggle */}
          <div className="retention-policy__field">
            <div className="retention-policy__toggle-row">
              <div>
                <label className="retention-policy__label">Auto-purge</label>
                <p className="retention-policy__hint">
                  Automatically delete old entries on startup
                </p>
              </div>
              <button
                onClick={onToggleAutoPurge}
                className={`retention-policy__switch ${
                  policy.autoPurge ? 'retention-policy__switch--on' : ''
                }`}
                role="switch"
                aria-checked={policy.autoPurge}
              >
                <span className="retention-policy__switch-thumb" />
              </button>
            </div>
          </div>

          {/* Manual purge */}
          <div className="retention-policy__field">
            <div className="retention-policy__purge-row">
              <div>
                <label className="retention-policy__label">Manual purge</label>
                <p className="retention-policy__hint">
                  Last purged: {formatLastPurged(policy.lastPurged)}
                </p>
              </div>
              <button
                onClick={handlePurge}
                disabled={isPurging}
                className="retention-policy__purge-btn"
              >
                {isPurging ? (
                  <>
                    <span className="retention-policy__purge-spinner" />
                    Purging...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Purge Now
                  </>
                )}
              </button>
            </div>
            {purgeError && (
              <div className="retention-policy__error" role="alert">
                {purgeError}
              </div>
            )}
            {purgeSuccess && (
              <div className="retention-policy__success">
                ✓ Purge completed successfully
              </div>
            )}
          </div>

          {/* Privacy note */}
          <div className="retention-policy__note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>
              Logs are stored locally and never sent to remote services by default.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
