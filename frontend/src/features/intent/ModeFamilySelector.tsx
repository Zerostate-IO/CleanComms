/**
 * ModeFamilySelector Component
 * 
 * Select mode family (Digital, CW, SSB) and specific mode.
 * Shows band-aware recommendations for SSB (LSB below 10MHz, USB above).
 */

import { useMemo } from 'react';
import type { ModeFamilySelectorProps } from './types';
import { 
  ModeFamily, 
  OperatingMode, 
  getModesForFamily, 
  getModeConfig,
  suggestSSBMode,
} from './types';

// Common frequency presets for quick selection
const FREQUENCY_PRESETS: Record<ModeFamily, Array<{ freq: number; label: string }>> = {
  digital: [
    { freq: 3573000, label: '80m FT8' },
    { freq: 7074000, label: '40m FT8' },
    { freq: 10136000, label: '30m FT8' },
    { freq: 14074000, label: '20m FT8' },
    { freq: 21074000, label: '15m FT8' },
    { freq: 28074000, label: '10m FT8' },
  ],
  cw: [
    { freq: 3550000, label: '80m CW' },
    { freq: 7030000, label: '40m CW' },
    { freq: 10116000, label: '30m CW' },
    { freq: 14060000, label: '20m CW' },
    { freq: 21060000, label: '15m CW' },
  ],
  ssb: [
    { freq: 3850000, label: '80m SSB' },
    { freq: 7150000, label: '40m SSB' },
    { freq: 14195000, label: '20m SSB' },
    { freq: 21295000, label: '15m SSB' },
    { freq: 28395000, label: '10m SSB' },
  ],
};

export function ModeFamilySelector({
  modeFamily,
  mode,
  frequency,
  onModeFamilyChange,
  onModeChange,
  onFrequencyChange,
  pending,
  disabled = false,
}: ModeFamilySelectorProps) {
  // Get available modes for current family
  const availableModes = useMemo(() => getModesForFamily(modeFamily), [modeFamily]);
  
  // Get current mode config
  const currentModeConfig = useMemo(() => getModeConfig(mode), [mode]);
  
  // Format frequency for display
  const formatFrequency = (hz: number): string => {
    const mhz = hz / 1000000;
    return `${mhz.toFixed(4)} MHz`;
  };
  
  // Parse frequency from input
  const parseFrequency = (input: string): number => {
    // Accept MHz input
    const mhz = parseFloat(input);
    if (!isNaN(mhz)) {
      return Math.round(mhz * 1000000);
    }
    return frequency;
  };
  
  // Get SSB recommendation
  const ssbRecommendation = useMemo(() => {
    if (modeFamily !== 'ssb') return null;
    const suggested = suggestSSBMode(frequency);
    return {
      mode: suggested,
      reason: frequency < 10000000 
        ? 'LSB convention for bands below 10 MHz' 
        : 'USB convention for bands above 10 MHz',
    };
  }, [modeFamily, frequency]);

  // Check if current SSB mode matches recommendation
  const ssbModeMatchesConvention = useMemo(() => {
    if (modeFamily !== 'ssb') return true;
    return mode === suggestSSBMode(frequency);
  }, [modeFamily, mode, frequency]);

  return (
    <div className="mode-family-selector">
      <div className="mode-family-selector__label">
        <span>Mode Family</span>
        {pending && (
          <span className="pending-badge" aria-label="Pending change">
            PENDING
          </span>
        )}
      </div>
      
      {/* Mode Family Tabs */}
      <div className="mode-family-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={modeFamily === 'digital'}
          className={`mode-family-tab ${modeFamily === 'digital' ? 'mode-family-tab--active' : ''}`}
          onClick={() => onModeFamilyChange('digital')}
          disabled={disabled}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M6 8h.01M10 8h.01M14 8h.01M6 12h12M6 16h8" />
          </svg>
          <span>Digital</span>
          <span className="mode-family-tab__hint">FT8, PSK31...</span>
        </button>
        
        <button
          type="button"
          role="tab"
          aria-selected={modeFamily === 'cw'}
          className={`mode-family-tab ${modeFamily === 'cw' ? 'mode-family-tab--active' : ''}`}
          onClick={() => onModeFamilyChange('cw')}
          disabled={disabled}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12h16M4 12l4-4M4 12l4 4" />
          </svg>
          <span>CW</span>
          <span className="mode-family-tab__hint">Morse Code</span>
        </button>
        
        <button
          type="button"
          role="tab"
          aria-selected={modeFamily === 'ssb'}
          className={`mode-family-tab ${modeFamily === 'ssb' ? 'mode-family-tab--active' : ''}`}
          onClick={() => onModeFamilyChange('ssb')}
          disabled={disabled}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          </svg>
          <span>SSB</span>
          <span className="mode-family-tab__hint">Voice</span>
        </button>
      </div>
      
      {/* Mode Selection */}
      <div className="mode-selection">
        <label className="mode-selection__label">Mode</label>
        <select
          className="mode-selection__dropdown"
          value={mode}
          onChange={(e) => onModeChange(e.target.value as OperatingMode)}
          disabled={disabled}
        >
          {availableModes.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} {m.description ? `— ${m.description}` : ''}
            </option>
          ))}
        </select>
        
        {/* Mode-specific settings */}
        {modeFamily === 'cw' && currentModeConfig?.tone && (
          <div className="mode-settings">
            <span className="mode-settings__item">
              Default tone: {currentModeConfig.tone} Hz
            </span>
          </div>
        )}
        
        {modeFamily === 'ssb' && !ssbModeMatchesConvention && (
          <div className="mode-settings mode-settings--warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              {ssbRecommendation?.reason}. Consider switching to {ssbRecommendation?.mode}.
            </span>
          </div>
        )}
      </div>
      
      {/* Frequency Selection */}
      <div className="frequency-selection">
        <label className="frequency-selection__label">Frequency</label>
        
        <div className="frequency-input-group">
          <input
            type="number"
            className="frequency-input"
            value={(frequency / 1000000).toFixed(6)}
            onChange={(e) => onFrequencyChange(parseFrequency(e.target.value))}
            step="0.001"
            min="1.8"
            max="30"
            disabled={disabled}
          />
          <span className="frequency-unit">MHz</span>
        </div>
        
        {/* Quick frequency presets */}
        <div className="frequency-presets">
          <span className="frequency-presets__label">Quick Select:</span>
          <div className="frequency-presets__buttons">
            {FREQUENCY_PRESETS[modeFamily].map((preset) => (
              <button
                key={preset.freq}
                type="button"
                className={`frequency-preset-btn ${frequency === preset.freq ? 'frequency-preset-btn--active' : ''}`}
                onClick={() => onFrequencyChange(preset.freq)}
                disabled={disabled}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Current frequency display */}
        <div className="frequency-display">
          <span className="frequency-display__value">{formatFrequency(frequency)}</span>
          {modeFamily === 'ssb' && (
            <span className="frequency-display__mode-hint">
              ({ssbRecommendation?.mode} recommended)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
