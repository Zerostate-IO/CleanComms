/**
 * IntentSelector Component
 * 
 * Toggle between Listen and Broadcast intent modes.
 * Shows pending badge when intent differs from active state.
 */

import type { IntentSelectorProps } from './types';

export function IntentSelector({ 
  value, 
  pending, 
  onChange, 
  disabled = false 
}: IntentSelectorProps) {
  return (
    <div className="intent-selector" role="radiogroup" aria-label="Operating Intent">
      <div className="intent-selector__label">
        <span>Intent</span>
        {pending && (
          <span className="intent-selector__pending-badge" aria-label="Pending change">
            PENDING
          </span>
        )}
      </div>
      
      <div className="intent-selector__options">
        <button
          type="button"
          role="radio"
          aria-checked={value === 'listen'}
          className={`intent-option ${value === 'listen' ? 'intent-option--selected' : ''}`}
          onClick={() => onChange('listen')}
          disabled={disabled}
        >
          <svg className="intent-option__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          <span className="intent-option__label">Listen</span>
          <span className="intent-option__desc">Receive only</span>
        </button>
        
        <button
          type="button"
          role="radio"
          aria-checked={value === 'broadcast'}
          className={`intent-option ${value === 'broadcast' ? 'intent-option--selected intent-option--broadcast' : ''}`}
          onClick={() => onChange('broadcast')}
          disabled={disabled}
        >
          <svg className="intent-option__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="2" />
            <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
          </svg>
          <span className="intent-option__label">Broadcast</span>
          <span className="intent-option__desc">Transmit enabled</span>
        </button>
      </div>
      
      <div className="intent-selector__info">
        {value === 'listen' ? (
          <p>Receive mode — No transmissions will be made. Safe for monitoring and scanning.</p>
        ) : (
          <p className="intent-selector__warning">
            Transmit mode — Radio will transmit when activated. Ensure proper frequency authorization.
          </p>
        )}
      </div>
    </div>
  );
}
