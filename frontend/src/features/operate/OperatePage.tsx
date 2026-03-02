/**
 * OperatePage - Main operator console
 * 
 * Combines all operate controls into a cohesive interface:
 * - Frequency control with tuning
 * - Mode selection
 * - PTT control with safety checks
 * - Quick channel buttons
 * 
 * Integrates with coordinator safety logic
 */
import { useCallback, useState, useEffect } from 'react';
import { FrequencyControl } from './FrequencyControl';
import { ModeControl } from './ModeControl';
import { PTTControl } from './PTTControl';
import { QuickChannels } from './QuickChannels';
import { useOperateState, useKeyboardShortcuts } from './hooks';
import type { RadioMode, PTTState } from './types';
import '../../styles/Operate.css';

interface OperatePageProps {
  disabled?: boolean;
}

export function OperatePage({ disabled = false }: OperatePageProps) {
  const {
    rigStatus,
    health,
    isLoading,
    error,
    isTXBlocked,
    blockedReason,
    setFrequency,
    setMode,
    pttControl,
    refetch,
  } = useOperateState();

  // Track pending frequency for optimistic updates
  const [pendingFrequency, setPendingFrequency] = useState<number | null>(null);
  const [pendingMode, setPendingMode] = useState<RadioMode | null>(null);

  // Update pending values when rig status changes
  useEffect(() => {
    if (rigStatus) {
      setPendingFrequency(rigStatus.frequency);
      setPendingMode(rigStatus.mode as RadioMode);
    }
  }, [rigStatus]);

  // Current display values (pending or from rig status)
  const currentFrequency = pendingFrequency ?? rigStatus?.frequency ?? 14070000;
  const currentMode = pendingMode ?? rigStatus?.mode ?? 'USB';
  const isTransmitting = pttControl.currentState === 'tx' || rigStatus?.ptt === true;

  // Handle frequency change
  const handleFrequencyChange = useCallback(async (hz: number): Promise<boolean> => {
    setPendingFrequency(hz);
    const success = await setFrequency(hz);
    if (!success) {
      // Revert to actual frequency on failure
      setPendingFrequency(rigStatus?.frequency ?? null);
    }
    return success;
  }, [setFrequency, rigStatus]);

  // Handle mode change
  const handleModeChange = useCallback(async (mode: RadioMode): Promise<boolean> => {
    setPendingMode(mode);
    const success = await setMode(mode);
    if (!success) {
      // Revert to actual mode on failure
      setPendingMode(rigStatus?.mode as RadioMode ?? null);
    }
    return success;
  }, [setMode, rigStatus]);

  // Handle quick channel selection (sets both frequency and mode)
  const handleChannelSelect = useCallback(async (frequency: number, mode: RadioMode): Promise<boolean> => {
    // Set both frequency and mode
    const freqSuccess = await handleFrequencyChange(frequency);
    const modeSuccess = await handleModeChange(mode);
    return freqSuccess && modeSuccess;
  }, [handleFrequencyChange, handleModeChange]);

  // Handle PTT toggle
  const handlePTTToggle = useCallback(async (): Promise<boolean> => {
    const newState: PTTState = isTransmitting ? 'rx' : 'tx';
    return pttControl.setPTT(newState);
  }, [isTransmitting, pttControl]);

  // Handle PTT state change
  const handlePTTChange = useCallback(async (state: PTTState): Promise<boolean> => {
    return pttControl.setPTT(state);
  }, [pttControl]);

  // Tuning step for keyboard shortcuts (1 kHz)
  const tuningStep = 1000;

  // Keyboard shortcuts
  useKeyboardShortcuts(
    handlePTTToggle,
    () => handleFrequencyChange(currentFrequency + tuningStep),
    () => handleFrequencyChange(currentFrequency - tuningStep),
    !disabled && !isTXBlocked
  );

  // Get system status summary
  const getSystemStatus = (): { status: string; color: string; details: string[] } => {
    if (!health) {
      return { status: 'Unknown', color: 'gray', details: ['No health data'] };
    }

    const details: string[] = [];
    
    if (health.rigctld !== 'ok') details.push('Rig control issue');
    if (health.fldigi !== 'ok') details.push('Modem issue');
    if (health.coordinator !== 'ok') details.push('Coordinator issue');
    
    if (health.status === 'ok') {
      return { status: 'Ready', color: 'green', details: ['All systems operational'] };
    }
    
    return { status: 'Degraded', color: 'orange', details };
  };

  const systemStatus = getSystemStatus();

  return (
    <div className="operate-page">
      {/* System status bar */}
      <div className={`operate-page__status-bar operate-page__status-bar--${systemStatus.color}`}>
        <div className="operate-page__status-main">
          <span className="operate-page__status-indicator" />
          <span className="operate-page__status-text">System: {systemStatus.status}</span>
        </div>
        <div className="operate-page__status-details">
          {systemStatus.details.map((detail, i) => (
            <span key={i}>{detail}</span>
          ))}
        </div>
        {isLoading && (
          <div className="operate-page__loading">
            <span className="operate-page__loading-spinner" />
            <span>Syncing...</span>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="operate-page__error-banner" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button onClick={refetch} className="operate-page__retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Main control grid */}
      <div className="operate-page__grid">
        {/* Left column - Primary controls */}
        <div className="operate-page__column operate-page__column--primary">
          {/* Frequency control */}
          <div className="operate-panel operate-panel--frequency">
            <FrequencyControl
              frequency={currentFrequency}
              onFrequencyChange={handleFrequencyChange}
              disabled={disabled || isTransmitting}
            />
          </div>

          {/* Mode control */}
          <div className="operate-panel operate-panel--mode">
            <ModeControl
              currentMode={currentMode}
              onModeChange={handleModeChange}
              disabled={disabled}
              pttActive={isTransmitting}
            />
          </div>
        </div>

        {/* Right column - PTT and quick channels */}
        <div className="operate-page__column operate-page__column--secondary">
          {/* PTT control */}
          <div className="operate-panel operate-panel--ptt">
            <PTTControl
              currentState={pttControl.currentState}
              onPTTChange={handlePTTChange}
              health={health}
              isBlocked={isTXBlocked}
              blockedReason={blockedReason}
              disabled={disabled}
            />
          </div>

          {/* Quick channels */}
          <div className="operate-panel operate-panel--channels">
            <QuickChannels
              currentFrequency={currentFrequency}
              currentMode={currentMode}
              onChannelSelect={handleChannelSelect}
              disabled={disabled}
              pttActive={isTransmitting}
            />
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="operate-page__shortcuts">
        <span className="operate-page__shortcuts-label">Keyboard:</span>
        <kbd>Space</kbd> PTT
        <kbd>↑</kbd><kbd>↓</kbd> Tune
      </div>
    </div>
  );
}
