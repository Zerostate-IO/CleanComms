/**
 * ModeControl - Mode selection component
 * 
 * Provides mode selection (USB, LSB, CW, RTTY, PKT, FM, AM)
 * Shows active mode with highlight
 * API call on selection
 */
import { useState, useCallback } from 'react';
import { MODE_CONFIGS, type RadioMode, type ModeConfig } from './types';

interface ModeControlProps {
  currentMode: RadioMode;
  onModeChange: (mode: RadioMode) => Promise<boolean>;
  disabled?: boolean;
  pttActive?: boolean;  // If true, mode changes should be blocked
}

export function ModeControl({
  currentMode,
  onModeChange,
  disabled = false,
  pttActive = false,
}: ModeControlProps) {
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleModeClick = useCallback(async (mode: RadioMode) => {
    // Don't change if already selected or disabled
    if (mode === currentMode || disabled || isChanging) return;
    
    // Block mode changes while transmitting
    if (pttActive) {
      setError('Cannot change mode while transmitting');
      setTimeout(() => setError(null), 2000);
      return;
    }

    setIsChanging(true);
    setError(null);

    const success = await onModeChange(mode);

    setIsChanging(false);
    
    if (!success) {
      setError('Failed to change mode');
      setTimeout(() => setError(null), 2000);
    }
  }, [currentMode, disabled, isChanging, pttActive, onModeChange]);

  // Group modes by category
  const voiceModes = MODE_CONFIGS.filter(m => m.category === 'voice');
  const cwModes = MODE_CONFIGS.filter(m => m.category === 'cw');
  const digitalModes = MODE_CONFIGS.filter(m => m.category === 'digital');

  const renderModeButton = (config: ModeConfig) => {
    const isActive = config.value === currentMode;
    const isDisabled = disabled || isChanging || pttActive;

    return (
      <button
        key={config.value}
        className={`mode-btn ${isActive ? 'mode-btn--active' : ''} mode-btn--${config.category}`}
        onClick={() => handleModeClick(config.value)}
        disabled={isDisabled}
        aria-pressed={isActive}
        title={config.description}
      >
        <span className="mode-btn__label">{config.label}</span>
      </button>
    );
  };

  const currentModeConfig = MODE_CONFIGS.find(m => m.value === currentMode);

  return (
    <div className="mode-control">
      <div className="mode-control__header">
        <label className="mode-control__label">Mode</label>
        {currentModeConfig && (
          <span className="mode-control__current" title={currentModeConfig.description}>
            {currentModeConfig.description}
          </span>
        )}
      </div>

      {error && (
        <div className="mode-control__error" role="alert">
          {error}
        </div>
      )}

      {pttActive && (
        <div className="mode-control__warning">
          Mode changes blocked while transmitting
        </div>
      )}

      <div className="mode-control__groups">
        <div className="mode-group">
          <span className="mode-group__label">Voice</span>
          <div className="mode-group__buttons">
            {voiceModes.map(renderModeButton)}
          </div>
        </div>

        <div className="mode-group">
          <span className="mode-group__label">CW</span>
          <div className="mode-group__buttons">
            {cwModes.map(renderModeButton)}
          </div>
        </div>

        <div className="mode-group">
          <span className="mode-group__label">Digital</span>
          <div className="mode-group__buttons">
            {digitalModes.map(renderModeButton)}
          </div>
        </div>
      </div>
    </div>
  );
}
