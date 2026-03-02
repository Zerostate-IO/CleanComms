/**
 * Signal Suggestions Component
 * 
 * Displays radio configuration suggestions derived from AI classification.
 * Advisory-only: user must explicitly click "Copy to Radio" to apply.
 */

import { useMemo } from 'react';
import { ConfidenceDisplay } from './ConfidenceDisplay';
import { useCopyToRadio, formatFrequency } from './hooks';
import type { SignalSuggestionsProps, RadioSuggestion } from './types';
import '../../styles/SignalId.css';

/** Generate suggestion from classification */
function useSuggestion(frequency: number, modulation: string, bandwidth: number): RadioSuggestion {
  return useMemo(() => {
    const baseSuggestion: RadioSuggestion = {
      classificationId: '',
      mode: modulation as RadioSuggestion['mode'],
      frequency,
      bandwidth,
      description: '',
    };

    switch (modulation) {
      case 'CW':
        return {
          ...baseSuggestion,
          bandwidth: 500,
          agc: 'fast',
          description: 'CW mode, 500 Hz filter, fast AGC',
        };
      case 'FT8':
      case 'FT4':
      case 'JS8':
        return {
          ...baseSuggestion,
          bandwidth: 3000,
          agc: 'medium',
          description: `${modulation} digital mode, 3 kHz filter`,
        };
      case 'USB':
      case 'LSB':
        return {
          ...baseSuggestion,
          bandwidth: 2400,
          agc: 'medium',
          description: `${modulation} voice, 2.4 kHz filter`,
        };
      case 'RTTY':
        return {
          ...baseSuggestion,
          bandwidth: 500,
          agc: 'fast',
          ifShift: 0,
          description: 'RTTY mode, 500 Hz filter, fast AGC',
        };
      default:
        return {
          ...baseSuggestion,
          description: `${modulation} mode`,
        };
    }
  }, [frequency, modulation, bandwidth]);
}

/** Copy icon SVG */
function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/** Checkmark icon SVG */
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/** Radio icon SVG */
function RadioIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
    </svg>
  );
}

export function SignalSuggestions({
  classification,
  onCopyToRadio,
  disabled = false,
  className = '',
}: SignalSuggestionsProps) {
  const suggestion = useSuggestion(
    classification.frequency,
    classification.modulation,
    classification.bandwidth
  );
  
  const { copyToRadio, isCopying, lastResult } = useCopyToRadio(onCopyToRadio);
  
  const wasCopied = lastResult?.success && lastResult.suggestion.classificationId === classification.id;

  const handleCopy = () => {
    if (!disabled && !isCopying) {
      copyToRadio(classification);
    }
  };

  return (
    <div className={`signal-suggestions ${className}`}>
      {/* Source Attribution */}
      <div className="signal-suggestions__source">
        <span className="signal-suggestions__source-icon">◉</span>
        Analysis by {classification.source}
      </div>

      {/* Main Classification */}
      <div className="signal-suggestions__main">
        <div className="signal-suggestions__modulation">
          {classification.modulation}
        </div>
        <ConfidenceDisplay 
          confidence={classification.confidence}
          size="sm"
          showValue
        />
      </div>

      {/* Suggested Settings */}
      <div className="signal-suggestions__settings">
        <div className="signal-suggestions__setting">
          <span className="signal-suggestions__setting-label">Frequency</span>
          <span className="signal-suggestions__setting-value">
            {formatFrequency(suggestion.frequency)}
          </span>
        </div>
        <div className="signal-suggestions__setting">
          <span className="signal-suggestions__setting-label">Mode</span>
          <span className="signal-suggestions__setting-value">{suggestion.mode}</span>
        </div>
        <div className="signal-suggestions__setting">
          <span className="signal-suggestions__setting-label">Filter</span>
          <span className="signal-suggestions__setting-value">{suggestion.bandwidth} Hz</span>
        </div>
        {suggestion.agc && (
          <div className="signal-suggestions__setting">
            <span className="signal-suggestions__setting-label">AGC</span>
            <span className="signal-suggestions__setting-value">{suggestion.agc}</span>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="signal-suggestions__description">
        {suggestion.description}
      </p>

      {/* Alternative Classifications */}
      {classification.alternatives && classification.alternatives.length > 0 && (
        <div className="signal-suggestions__alternatives">
          <span className="signal-suggestions__alternatives-label">Other possibilities:</span>
          <div className="signal-suggestions__alternatives-list">
            {classification.alternatives.map((alt, index) => (
              <span 
                key={index}
                className="signal-suggestions__alternative"
              >
                {alt.modulation} ({alt.confidence}%)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Copy to Radio Button */}
      <button
        className={`signal-suggestions__copy-btn ${wasCopied ? 'signal-suggestions__copy-btn--copied' : ''}`}
        onClick={handleCopy}
        disabled={disabled || isCopying}
        title="Copy these settings to radio (does not auto-apply)"
      >
        <RadioIcon />
        <span>
          {isCopying ? 'Copying...' : wasCopied ? 'Copied!' : 'Copy to Radio'}
        </span>
        {wasCopied ? <CheckIcon /> : <CopyIcon />}
      </button>

      {/* Advisory Notice */}
      <p className="signal-suggestions__advisory">
        Advisory only. Settings are not applied automatically.
      </p>
    </div>
  );
}
