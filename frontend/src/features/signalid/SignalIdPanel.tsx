/**
 * Signal ID Panel Component
 * 
 * V2 advisory-only AI signal identification panel.
 * - Displays classification results with confidence
 * - Shows source attribution
 * - Provides copy-to-radio action (explicit user action only)
 * - Includes kill switch to disable AI suggestions
 */

import { useSignalIdState, useSignalKeyboardNavigation, formatFrequency } from './hooks';
import { ConfidenceDisplay, ConfidenceDot } from './ConfidenceDisplay';
import { SignalSuggestions } from './SignalSuggestions';
import type { SignalIdPanelProps, SignalClassification } from './types';
import '../../styles/SignalId.css';

/** AI brain icon */
function AIIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
      <path d="M20 12v2a8 8 0 0 1-16 0v-2" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
      <circle cx="9" cy="7" r="1" fill="currentColor" />
      <circle cx="15" cy="7" r="1" fill="currentColor" />
    </svg>
  );
}

/** Kill switch/power icon */
function PowerIcon({ isOn }: { isOn: boolean }) {
  return (
    <svg 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
      className={isOn ? 'signal-id-panel__power-icon--on' : ''}
    >
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  );
}

/** Signal strength bars */
function SignalStrength({ strength }: { strength: number }) {
  const normalized = Math.max(0, Math.min(100, (strength + 120) * (100 / 80)));
  const bars = Math.ceil(normalized / 25);
  
  return (
    <div className="signal-id-panel__strength">
      {[1, 2, 3, 4].map((level) => (
        <div
          key={level}
          className={`signal-id-panel__strength-bar ${
            level <= bars ? 'signal-id-panel__strength-bar--active' : ''
          }`}
        />
      ))}
    </div>
  );
}

/** Individual signal list item */
function SignalListItem({
  classification,
  isSelected,
  onSelect,
}: {
  classification: SignalClassification;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`signal-id-panel__list-item ${
        isSelected ? 'signal-id-panel__list-item--selected' : ''
      }`}
      onClick={onSelect}
    >
      <div className="signal-id-panel__list-item-header">
        <ConfidenceDot confidence={classification.confidence} />
        <span className="signal-id-panel__list-item-mode">
          {classification.modulation}
        </span>
        <SignalStrength strength={classification.signalStrength} />
      </div>
      <div className="signal-id-panel__list-item-freq">
        {formatFrequency(classification.frequency)}
      </div>
      <div className="signal-id-panel__list-item-confidence">
        <ConfidenceDisplay 
          confidence={classification.confidence}
          size="sm"
          showValue
        />
      </div>
    </button>
  );
}

export function SignalIdPanel({
  isVisible = true,
  centerFrequency,
  onCopyToRadio,
  className = '',
}: SignalIdPanelProps) {
  const { 
    state, 
    toggleEnabled, 
    selectClassification,
    clearClassifications,
  } = useSignalIdState(true);

  // Keyboard navigation
  useSignalKeyboardNavigation(
    state.classifications,
    state.selectedId,
    selectClassification
  );

  const selectedClassification = state.classifications.find(
    (c) => c.id === state.selectedId
  );

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`signal-id-panel ${className}`}>
      {/* Header with Kill Switch */}
      <div className="signal-id-panel__header">
        <div className="signal-id-panel__title">
          <AIIcon />
          <h3>AI Signal Identification</h3>
          <span className={`signal-id-panel__status ${
            state.isEnabled ? 'signal-id-panel__status--enabled' : 'signal-id-panel__status--disabled'
          }`}>
            {state.isEnabled ? 'Active' : 'Disabled'}
          </span>
        </div>
        
        {/* Kill Switch Toggle */}
        <button
          className={`signal-id-panel__kill-switch ${
            state.isEnabled ? 'signal-id-panel__kill-switch--on' : 'signal-id-panel__kill-switch--off'
          }`}
          onClick={toggleEnabled}
          title={state.isEnabled ? 'Disable AI suggestions (Kill Switch)' : 'Enable AI suggestions'}
        >
          <PowerIcon isOn={state.isEnabled} />
          <span className="signal-id-panel__kill-switch-label">
            {state.isEnabled ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      {/* Panel Content */}
      <div className="signal-id-panel__content">
        {state.isEnabled ? (
          <>
            {/* Loading State */}
            {state.isAnalyzing && (
              <div className="signal-id-panel__loading">
                <div className="signal-id-panel__spinner" />
                <span>Analyzing signals...</span>
              </div>
            )}

            {/* Empty State */}
            {!state.isAnalyzing && state.classifications.length === 0 && (
              <div className="signal-id-panel__empty">
                <AIIcon />
                <p>No signals detected</p>
                <span>AI classification will appear when signals are found</span>
              </div>
            )}

            {/* Signal List + Detail View */}
            {!state.isAnalyzing && state.classifications.length > 0 && (
              <div className="signal-id-panel__main">
                {/* Signal List */}
                <div className="signal-id-panel__list">
                  <div className="signal-id-panel__list-header">
                    <span>Detected Signals ({state.classifications.length})</span>
                    <button
                      className="signal-id-panel__clear-btn"
                      onClick={clearClassifications}
                      title="Clear all classifications"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="signal-id-panel__list-items">
                    {state.classifications.map((classification) => (
                      <SignalListItem
                        key={classification.id}
                        classification={classification}
                        isSelected={classification.id === state.selectedId}
                        onSelect={() => selectClassification(classification.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Detail View */}
                <div className="signal-id-panel__detail">
                  {selectedClassification ? (
                    <SignalSuggestions
                      classification={selectedClassification}
                      onCopyToRadio={onCopyToRadio}
                    />
                  ) : (
                    <div className="signal-id-panel__detail-empty">
                      <p>Select a signal to view suggestions</p>
                      <span className="signal-id-panel__hint">
                        Use arrow keys or click to select
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Disabled State */
          <div className="signal-id-panel__disabled">
            <PowerIcon isOn={false} />
            <h4>AI Suggestions Disabled</h4>
            <p>
              The kill switch is active. Enable to receive AI-powered signal
              identification and mode suggestions.
            </p>
            <button
              className="signal-id-panel__enable-btn"
              onClick={toggleEnabled}
            >
              <PowerIcon isOn={false} />
              Enable AI Suggestions
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      {state.isEnabled && (
        <div className="signal-id-panel__footer">
          <span className="signal-id-panel__footer-text">
            Advisory only • Explicit action required
          </span>
          {centerFrequency && (
            <span className="signal-id-panel__footer-freq">
              Center: {formatFrequency(centerFrequency)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
