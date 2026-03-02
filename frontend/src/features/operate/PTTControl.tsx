/**
 * PTTControl - Push-to-Talk control with safety checks
 * 
 * Large TX/RX toggle button with:
 * - Visual feedback: Green=RX, Red=TX, Gray=Blocked
 * - Coordinator health check before allowing TX
 * - Blocked state shown if dependencies degraded
 * - PTT timeout indication
 */
import { useState, useCallback, useEffect } from 'react';
import type { PTTState, HealthResponse } from './types';

interface PTTControlProps {
  currentState: PTTState;
  onPTTChange: (state: PTTState) => Promise<boolean>;
  health: HealthResponse | null;
  isBlocked: boolean;
  blockedReason: string | null;
  disabled?: boolean;
  pttTimeout?: number;  // Timeout in seconds for visual countdown
}

export function PTTControl({
  currentState,
  onPTTChange,
  health,
  isBlocked,
  blockedReason,
  disabled = false,
  pttTimeout = 60,
}: PTTControlProps) {
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txDuration, setTxDuration] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  // Track TX duration for timeout warning
  useEffect(() => {
    if (currentState === 'tx') {
      const interval = setInterval(() => {
        setTxDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTxDuration(0);
    }
  }, [currentState]);

  // Calculate timeout warning level
  const getTimeoutWarningLevel = (): 'none' | 'warning' | 'critical' => {
    if (currentState !== 'tx') return 'none';
    const ratio = txDuration / pttTimeout;
    if (ratio >= 0.9) return 'critical';
    if (ratio >= 0.75) return 'warning';
    return 'none';
  };

  const warningLevel = getTimeoutWarningLevel();
  const remainingTime = pttTimeout - txDuration;

  // Check if TX is allowed
  const canTransmit = useCallback((): { allowed: boolean; reason?: string } => {
    if (disabled) {
      return { allowed: false, reason: 'Control disabled' };
    }
    if (isBlocked) {
      return { allowed: false, reason: blockedReason || 'System degraded' };
    }
    if (!health) {
      return { allowed: false, reason: 'Health status unknown' };
    }
    if (health.status !== 'ok') {
      return { allowed: false, reason: 'System unhealthy' };
    }
    if (health.coordinator !== 'ok') {
      return { allowed: false, reason: 'Coordinator unavailable' };
    }
    return { allowed: true };
  }, [disabled, isBlocked, blockedReason, health]);

  // Handle PTT button press
  const handlePTTDown = useCallback(async () => {
    if (isChanging) return;

    const { allowed, reason } = canTransmit();
    if (!allowed) {
      setError(reason || 'Cannot transmit');
      setTimeout(() => setError(null), 2000);
      return;
    }

    setIsHolding(true);
    setIsChanging(true);
    setError(null);

    const success = await onPTTChange('tx');
    
    setIsChanging(false);
    
    if (!success) {
      setIsHolding(false);
      // Error is handled by the hook
    }
  }, [canTransmit, isChanging, onPTTChange]);

  // Handle PTT button release
  const handlePTTUp = useCallback(async () => {
    if (isChanging || currentState !== 'tx') return;

    setIsHolding(false);
    setIsChanging(true);

    const success = await onPTTChange('rx');
    
    setIsChanging(false);
    
    if (!success) {
      // Error is handled by the hook
    }
  }, [isChanging, currentState, onPTTChange]);

  // Handle click (toggle mode for accessibility)
  const handleToggle = useCallback(async () => {
    if (currentState === 'rx') {
      await handlePTTDown();
    } else {
      await handlePTTUp();
    }
  }, [currentState, handlePTTDown, handlePTTUp]);

  // Get button state class
  const getButtonStateClass = (): string => {
    if (isBlocked || !health || health.status !== 'ok') {
      return 'ptt-btn--blocked';
    }
    if (currentState === 'tx') {
      return 'ptt-btn--tx';
    }
    return 'ptt-btn--rx';
  };

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get health indicator
  const getHealthIndicator = (): { color: string; label: string } => {
    if (!health) return { color: 'gray', label: 'Unknown' };
    if (health.coordinator !== 'ok') return { color: 'red', label: 'Coordinator Down' };
    if (health.rigctld !== 'ok') return { color: 'red', label: 'Rig Down' };
    if (health.fldigi !== 'ok') return { color: 'orange', label: 'Modem Down' };
    if (health.status === 'ok') return { color: 'green', label: 'Ready' };
    return { color: 'orange', label: 'Degraded' };
  };

  const healthIndicator = getHealthIndicator();

  return (
    <div className="ptt-control">
      <div className="ptt-control__header">
        <label className="ptt-control__label">Transmit</label>
        <div className={`ptt-control__health ptt-control__health--${healthIndicator.color}`}>
          {healthIndicator.label}
        </div>
      </div>

      {error && (
        <div className="ptt-control__error" role="alert">
          {error}
        </div>
      )}

      {isBlocked && blockedReason && (
        <div className="ptt-control__blocked-notice">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          <span>TX Blocked: {blockedReason}</span>
        </div>
      )}

      <button
        className={`ptt-btn ${getButtonStateClass()} ${isChanging ? 'ptt-btn--changing' : ''} ${warningLevel !== 'none' ? `ptt-btn--${warningLevel}` : ''}`}
        onMouseDown={handlePTTDown}
        onMouseUp={handlePTTUp}
        onMouseLeave={() => {
          if (isHolding && currentState === 'tx') {
            handlePTTUp();
          }
        }}
        onClick={handleToggle}
        disabled={disabled || (isBlocked && currentState !== 'tx')}
        aria-label={currentState === 'tx' ? 'Release to receive' : 'Press to transmit'}
        aria-pressed={currentState === 'tx'}
      >
        <div className="ptt-btn__content">
          <div className="ptt-btn__icon">
            {currentState === 'tx' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
                <path d="M19 10v2a7 7 0 0 0-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            )}
          </div>
          <span className="ptt-btn__state">
            {isChanging ? '...' : currentState.toUpperCase()}
          </span>
          {currentState === 'tx' && (
            <span className={`ptt-btn__timer ${warningLevel !== 'none' ? 'ptt-btn__timer--warning' : ''}`}>
              {formatTime(txDuration)} / {formatTime(pttTimeout)}
            </span>
          )}
        </div>
        
        {warningLevel === 'critical' && (
          <div className="ptt-btn__timeout-warning">
            ⚠️ Timeout in {remainingTime}s
          </div>
        )}
      </button>

      <div className="ptt-control__hint">
        {isBlocked 
          ? 'Resolve system issues to enable TX'
          : currentState === 'tx'
            ? 'Release button or click to stop transmitting'
            : 'Hold or click to transmit'
        }
      </div>
    </div>
  );
}
