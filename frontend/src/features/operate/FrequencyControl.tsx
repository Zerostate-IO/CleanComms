/**
 * FrequencyControl - Frequency input and tuning component
 * 
 * Displays frequency in MHz with kHz precision
 * Provides up/down tuning buttons with configurable step sizes
 * Supports direct input with validation
 */
import { useState, useCallback, useEffect } from 'react';
import type { TuningStep } from './types';

interface FrequencyControlProps {
  frequency: number;           // Current frequency in Hz
  onFrequencyChange: (hz: number) => Promise<boolean>;
  disabled?: boolean;
  minFrequency?: number;       // Min frequency in Hz (default: 1.8 MHz)
  maxFrequency?: number;       // Max frequency in Hz (default: 30 MHz)
}

const DEFAULT_MIN_FREQ = 1800000;  // 1.8 MHz (160m band)
const DEFAULT_MAX_FREQ = 30000000; // 30 MHz (10m band)

const TUNING_STEPS: { value: TuningStep; label: string }[] = [
  { value: 100, label: '100 Hz' },
  { value: 1000, label: '1 kHz' },
  { value: 10000, label: '10 kHz' },
  { value: 100000, label: '100 kHz' },
];

export function FrequencyControl({
  frequency,
  onFrequencyChange,
  disabled = false,
  minFrequency = DEFAULT_MIN_FREQ,
  maxFrequency = DEFAULT_MAX_FREQ,
}: FrequencyControlProps) {
  const [step, setStep] = useState<TuningStep>(1000);
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  // Format frequency for display (MHz with 3 decimal places)
  const formatFrequency = useCallback((hz: number): string => {
    const mhz = hz / 1000000;
    return mhz.toFixed(6);
  }, []);

  // Parse frequency from input
  const parseFrequency = useCallback((input: string): number | null => {
    // Remove any non-numeric characters except decimal point
    const cleaned = input.replace(/[^0-9.]/g, '');
    const value = parseFloat(cleaned);
    
    if (isNaN(value)) return null;
    
    // Assume input is in MHz
    return Math.round(value * 1000000);
  }, []);

  // Update input value when frequency changes externally
  useEffect(() => {
    if (!isInputFocused) {
      setInputValue(formatFrequency(frequency));
    }
  }, [frequency, isInputFocused, formatFrequency]);

  // Validate frequency
  const validateFrequency = useCallback((hz: number): string | null => {
    if (hz < minFrequency) {
      return `Below minimum frequency (${(minFrequency / 1000000).toFixed(3)} MHz)`;
    }
    if (hz > maxFrequency) {
      return `Above maximum frequency (${(maxFrequency / 1000000).toFixed(3)} MHz)`;
    }
    return null;
  }, [minFrequency, maxFrequency]);

  // Handle tuning button clicks
  const handleTune = useCallback(async (direction: 'up' | 'down') => {
    if (disabled || isChanging) return;

    const newFreq = direction === 'up' 
      ? frequency + step 
      : frequency - step;

    const error = validateFrequency(newFreq);
    if (error) {
      setInputError(error);
      setTimeout(() => setInputError(null), 2000);
      return;
    }

    setIsChanging(true);
    setInputError(null);
    
    const success = await onFrequencyChange(newFreq);
    
    setIsChanging(false);
    if (!success) {
      setInputError('Failed to change frequency');
      setTimeout(() => setInputError(null), 2000);
    }
  }, [frequency, step, disabled, isChanging, validateFrequency, onFrequencyChange]);

  // Handle direct input
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setInputError(null);
  }, []);

  // Handle input commit (blur or enter)
  const handleInputCommit = useCallback(async () => {
    const newFreq = parseFrequency(inputValue);
    
    if (newFreq === null) {
      setInputError('Invalid frequency');
      setInputValue(formatFrequency(frequency));
      return;
    }

    const error = validateFrequency(newFreq);
    if (error) {
      setInputError(error);
      setInputValue(formatFrequency(frequency));
      return;
    }

    setIsChanging(true);
    const success = await onFrequencyChange(newFreq);
    setIsChanging(false);

    if (success) {
      setInputValue(formatFrequency(newFreq));
    } else {
      setInputError('Failed to set frequency');
      setInputValue(formatFrequency(frequency));
    }
  }, [inputValue, frequency, parseFrequency, validateFrequency, onFrequencyChange, formatFrequency]);

  // Handle key events on input
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInputCommit();
    } else if (e.key === 'Escape') {
      setInputValue(formatFrequency(frequency));
      setInputError(null);
      (e.target as HTMLInputElement).blur();
    }
  }, [handleInputCommit, frequency, formatFrequency]);

  // Get frequency band name
  const getBandName = useCallback((hz: number): string => {
    const mhz = hz / 1000000;
    if (mhz >= 1.8 && mhz <= 2.0) return '160m';
    if (mhz >= 3.5 && mhz <= 4.0) return '80m';
    if (mhz >= 5.3 && mhz <= 5.4) return '60m';
    if (mhz >= 7.0 && mhz <= 7.3) return '40m';
    if (mhz >= 10.1 && mhz <= 10.15) return '30m';
    if (mhz >= 14.0 && mhz <= 14.35) return '20m';
    if (mhz >= 18.068 && mhz <= 18.168) return '17m';
    if (mhz >= 21.0 && mhz <= 21.45) return '15m';
    if (mhz >= 24.89 && mhz <= 24.99) return '12m';
    if (mhz >= 28.0 && mhz <= 29.7) return '10m';
    return 'OOB'; // Out of band
  }, []);

  return (
    <div className="frequency-control">
      <div className="frequency-control__header">
        <label className="frequency-control__label">Frequency</label>
        <span className="frequency-control__band">{getBandName(frequency)}</span>
      </div>

      <div className="frequency-control__display">
        <button
          className="frequency-control__tune-btn frequency-control__tune-btn--down"
          onClick={() => handleTune('down')}
          disabled={disabled || isChanging || frequency <= minFrequency}
          aria-label="Decrease frequency"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="frequency-control__input-wrapper">
          <input
            type="text"
            className={`frequency-control__input ${inputError ? 'frequency-control__input--error' : ''}`}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => {
              setIsInputFocused(false);
              handleInputCommit();
            }}
            onKeyDown={handleInputKeyDown}
            disabled={disabled || isChanging}
            aria-label="Frequency in MHz"
          />
          <span className="frequency-control__unit">MHz</span>
        </div>

        <button
          className="frequency-control__tune-btn frequency-control__tune-btn--up"
          onClick={() => handleTune('up')}
          disabled={disabled || isChanging || frequency >= maxFrequency}
          aria-label="Increase frequency"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {inputError && (
        <div className="frequency-control__error" role="alert">
          {inputError}
        </div>
      )}

      <div className="frequency-control__steps">
        <span className="frequency-control__steps-label">Step:</span>
        <div className="frequency-control__step-buttons">
          {TUNING_STEPS.map((s) => (
            <button
              key={s.value}
              className={`frequency-control__step-btn ${step === s.value ? 'frequency-control__step-btn--active' : ''}`}
              onClick={() => setStep(s.value)}
              disabled={disabled}
              aria-pressed={step === s.value}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
