/**
 * LogEntryForm - Form to add log entries
 * 
 * Fast entry form with callsign, frequency, mode, power, and notes
 * Supports quick entry with optimistic UI updates
 */
import { useState, useCallback } from 'react';
import type { QSOEntryRequest, LogMode } from './types';
import { LOG_MODE_CONFIGS } from './types';
import '../../styles/Logs.css';

interface LogEntryFormProps {
  onSubmit: (entry: QSOEntryRequest) => Promise<boolean>;
  isSubmitting: boolean;
  defaultFrequency?: number;
  defaultMode?: LogMode;
}

export function LogEntryForm({
  onSubmit,
  isSubmitting,
  defaultFrequency = 14074000,
  defaultMode = 'USB',
}: LogEntryFormProps) {
  const [callsign, setCallsign] = useState('');
  const [frequency, setFrequency] = useState(defaultFrequency.toString());
  const [mode, setMode] = useState<LogMode>(defaultMode);
  const [power, setPower] = useState('100');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validate callsign format (basic validation)
  const validateCallsign = (value: string): boolean => {
    // Basic amateur radio callsign pattern
    const callsignPattern = /^[A-Za-z0-9]{3,7}$/;
    return callsignPattern.test(value);
  };

  // Validate frequency (positive integer)
  const validateFrequency = (value: string): boolean => {
    const num = parseInt(value, 10);
    return !isNaN(num) && num > 0 && num <= 1000000000; // Up to 1 GHz
  };

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate callsign
    const upperCallsign = callsign.toUpperCase().trim();
    if (!validateCallsign(upperCallsign)) {
      setError('Invalid callsign format (3-7 alphanumeric characters)');
      return;
    }

    // Validate frequency
    const freqHz = parseInt(frequency, 10);
    if (!validateFrequency(frequency.toString())) {
      setError('Invalid frequency (must be 1-1,000,000,000 Hz)');
      return;
    }

    // Create entry request
    const entry: QSOEntryRequest = {
      callsign: upperCallsign,
      frequency_hz: freqHz,
      mode,
      power_watts: parseInt(power, 10) || undefined,
      notes: notes.trim() || undefined,
      source: 'web-ui',
    };

    const result = await onSubmit(entry);
    if (result) {
      // Clear form on success
      setCallsign('');
      setNotes('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
  }, [callsign, frequency, mode, power, notes, onSubmit]);

  // Quick frequency presets
  const frequencyPresets = [
    { label: '20m FT8', freq: 14074000 },
    { label: '40m FT8', freq: 7074000 },
    { label: '20m SSB', freq: 14200000 },
    { label: '40m SSB', freq: 7250000 },
  ];

  // Format frequency for display (MHz)
  const formatFreqMHz = (hz: string): string => {
    const num = parseInt(hz, 10);
    if (isNaN(num)) return '0.000';
    return (num / 1000000).toFixed(3);
  };

  return (
    <div className="log-entry-form">
      <div className="log-entry-form__header">
        <h3 className="log-entry-form__title">New QSO Entry</h3>
        {success && (
          <span className="log-entry-form__success">✓ Entry queued</span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="log-entry-form__form">
        {error && (
          <div className="log-entry-form__error" role="alert">
            {error}
          </div>
        )}

        {/* Callsign - Main field */}
        <div className="log-entry-form__field log-entry-form__field--callsign">
          <label htmlFor="callsign" className="log-entry-form__label">
            Callsign *
          </label>
          <input
            id="callsign"
            type="text"
            value={callsign}
            onChange={(e) => setCallsign(e.target.value.toUpperCase())}
            placeholder="W1AW"
            maxLength={7}
            className="log-entry-form__input log-entry-form__input--callsign"
            disabled={isSubmitting}
            autoComplete="off"
            autoFocus
          />
        </div>

        {/* Frequency and Mode row */}
        <div className="log-entry-form__row">
          <div className="log-entry-form__field log-entry-form__field--freq">
            <label htmlFor="frequency" className="log-entry-form__label">
              Frequency (Hz)
            </label>
            <div className="log-entry-form__freq-input">
              <input
                id="frequency"
                type="number"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="log-entry-form__input"
                disabled={isSubmitting}
              />
              <span className="log-entry-form__freq-display">
                {formatFreqMHz(frequency)} MHz
              </span>
            </div>
          </div>

          <div className="log-entry-form__field log-entry-form__field--mode">
            <label htmlFor="mode" className="log-entry-form__label">
              Mode
            </label>
            <select
              id="mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as LogMode)}
              className="log-entry-form__select"
              disabled={isSubmitting}
            >
              {LOG_MODE_CONFIGS.map((config) => (
                <option key={config.value} value={config.value}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          <div className="log-entry-form__field log-entry-form__field--power">
            <label htmlFor="power" className="log-entry-form__label">
              Power (W)
            </label>
            <input
              id="power"
              type="number"
              value={power}
              onChange={(e) => setPower(e.target.value)}
              placeholder="100"
              min="0"
              max="1500"
              className="log-entry-form__input log-entry-form__input--power"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Frequency presets */}
        <div className="log-entry-form__presets">
          <span className="log-entry-form__presets-label">Quick:</span>
          {frequencyPresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setFrequency(preset.freq.toString())}
              className="log-entry-form__preset-btn"
              disabled={isSubmitting}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Notes */}
        <div className="log-entry-form__field">
          <label htmlFor="notes" className="log-entry-form__label">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes about this contact..."
            rows={2}
            className="log-entry-form__textarea"
            disabled={isSubmitting}
          />
        </div>

        {/* Submit button */}
        <div className="log-entry-form__actions">
          <button
            type="submit"
            className="log-entry-form__submit"
            disabled={isSubmitting || !callsign.trim()}
          >
            {isSubmitting ? (
              <>
                <span className="log-entry-form__spinner" />
                Queueing...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Log QSO
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
