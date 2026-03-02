/**
 * Audio Configuration Component
 * Configures audio routing with capability-aware controls
 */

import { useMemo } from 'react';
import type { 
  AudioDeviceConfig, 
  AudioDevice, 
  PTTMethod,
  RadioCatalogEntry,
  ProtocolProfile,
} from './types';

interface AudioConfigProps {
  config: AudioDeviceConfig;
  onConfigChange: (config: AudioDeviceConfig) => void;
  pttMethod: PTTMethod;
  onPttMethodChange: (method: PTTMethod) => void;
  inputDevices: AudioDevice[];
  outputDevices: AudioDevice[];
  devicesLoading?: boolean;
  devicesError?: string | null;
  onRefreshDevices: () => void;
  radio: RadioCatalogEntry | null;
  selectedProfile: string | null;
  validationErrors?: {
    inputDeviceId?: string;
    outputDeviceId?: string;
    pttMethod?: string;
  };
}

export function AudioConfig({
  config,
  onConfigChange,
  pttMethod,
  onPttMethodChange,
  inputDevices,
  outputDevices,
  devicesLoading,
  devicesError,
  onRefreshDevices,
  radio,
  selectedProfile,
  validationErrors,
}: AudioConfigProps) {
  // Get radio's audio and PTT capabilities
  const capabilities = useMemo(() => {
    if (!radio) return null;
    
    const profileKey = selectedProfile || 
      radio.recommendations?.preferred_profile ||
      Object.keys(radio.protocol_profiles)[0];
    
    const profile = radio.protocol_profiles[profileKey] as ProtocolProfile | undefined;
    
    return {
      audio: profile?.audio || null,
      ptt: profile?.ptt || null,
    };
  }, [radio, selectedProfile]);

  // Available PTT methods based on radio capabilities
  const availablePttMethods = useMemo((): { method: PTTMethod; label: string; available: boolean }[] => {
    const ptt = capabilities?.ptt;
    
    return [
      { method: 'rts', label: 'RTS Serial Line', available: !!ptt?.rts_ptt },
      { method: 'cat', label: 'CAT Command', available: !!ptt?.cat_ptt },
      { method: 'dtr', label: 'DTR Serial Line', available: !!ptt?.dtr_ptt },
      { method: 'hardware', label: 'Hardware PTT', available: !!ptt?.hardware_ptt },
      { method: 'vox', label: 'VOX (Voice)', available: !!ptt?.vox },
    ];
  }, [capabilities]);

  // Check if USB audio is supported
  const usbAudioSupported = useMemo(() => {
    return !!capabilities?.audio?.usb_audio;
  }, [capabilities]);

  function handleConfigChange<K extends keyof AudioDeviceConfig>(
    key: K,
    value: AudioDeviceConfig[K]
  ) {
    onConfigChange({
      ...config,
      [key]: value,
    });
  }

  // Show audio config as optional/disabled if radio doesn't support USB audio
  const audioDisabled = !usbAudioSupported;

  return (
    <div className="audio-config">
      <div className="audio-config-header">
        <h2>Audio & PTT Configuration</h2>
        <p className="help-text">
          Configure audio routing between your radio and digital mode software.
        </p>
      </div>

      {/* PTT Configuration */}
      <div className="config-section">
        <h3>PTT (Push-To-Talk) Method</h3>
        <p className="section-help">
          Choose how CleanComms will key your transmitter. Grayed out options are not supported by your radio.
        </p>

        <div className="ptt-methods">
          {availablePttMethods.map(({ method, label, available }) => (
            <label 
              key={method} 
              className={`ptt-method-option ${!available ? 'unavailable' : ''} ${pttMethod === method ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="ptt-method"
                value={method}
                checked={pttMethod === method}
                onChange={() => onPttMethodChange(method)}
                disabled={!available}
              />
              <span className="ptt-method-label">
                {label}
                {!available && (
                  <span className="unavailable-note">
                    This radio does not support {label}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>

        {validationErrors?.pttMethod && (
          <span className="field-error">{validationErrors.pttMethod}</span>
        )}
      </div>

      {/* Audio Configuration */}
      <div className={`config-section ${audioDisabled ? 'disabled' : ''}`}>
        <div className="config-section-header">
          <h3>Audio Routing</h3>
          <button 
            type="button" 
            className="refresh-button"
            onClick={onRefreshDevices}
            disabled={devicesLoading || audioDisabled}
          >
            {devicesLoading ? '⟳ Scanning...' : '↻ Refresh'}
          </button>
        </div>

        {devicesError && (
          <div className="config-error">
            <span>⚠️ {devicesError}</span>
          </div>
        )}

        {audioDisabled ? (
          <div className="audio-not-supported">
            <span className="info-icon">ℹ️</span>
            <div className="info-content">
              <strong>USB Audio Not Available</strong>
              <p>
                {radio?.identity.model || 'This radio'} does not support USB audio.
                {capabilities?.audio?.acc_port && (
                  <> You can use the ACC port with an external audio interface.</>
                )}
              </p>
              <p className="skip-note">
                You can skip this step and proceed to review.
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="section-help">
              Select the audio devices for digital mode operation. 
              Your radio should appear as a USB audio device when connected.
            </p>

            <div className="config-grid">
              {/* Input Device */}
              <div className="config-field">
                <label htmlFor="audio-input">Audio Input (From Radio)</label>
                <select
                  id="audio-input"
                  value={config.inputDeviceId}
                  onChange={(e) => handleConfigChange('inputDeviceId', e.target.value)}
                  className={validationErrors?.inputDeviceId ? 'error' : ''}
                >
                  <option value="">-- Select input device --</option>
                  {inputDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
                {validationErrors?.inputDeviceId && (
                  <span className="field-error">{validationErrors.inputDeviceId}</span>
                )}
              </div>

              {/* Output Device */}
              <div className="config-field">
                <label htmlFor="audio-output">Audio Output (To Radio)</label>
                <select
                  id="audio-output"
                  value={config.outputDeviceId}
                  onChange={(e) => handleConfigChange('outputDeviceId', e.target.value)}
                  className={validationErrors?.outputDeviceId ? 'error' : ''}
                >
                  <option value="">-- Select output device --</option>
                  {outputDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
                {validationErrors?.outputDeviceId && (
                  <span className="field-error">{validationErrors.outputDeviceId}</span>
                )}
              </div>
            </div>

            {/* Volume Controls */}
            <div className="config-grid">
              {/* Input Volume */}
              <div className="config-field">
                <label htmlFor="input-volume">
                  Input Level: {Math.round(config.inputVolume * 100)}%
                </label>
                <input
                  id="input-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.inputVolume}
                  onChange={(e) => handleConfigChange('inputVolume', parseFloat(e.target.value))}
                  className="volume-slider"
                />
              </div>

              {/* Output Volume */}
              <div className="config-field">
                <label htmlFor="output-volume">
                  Output Level: {Math.round(config.outputVolume * 100)}%
                </label>
                <input
                  id="output-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.outputVolume}
                  onChange={(e) => handleConfigChange('outputVolume', parseFloat(e.target.value))}
                  className="volume-slider"
                />
              </div>
            </div>

            {/* Audio Capabilities Info */}
            {capabilities?.audio && (
              <div className="audio-capabilities-info">
                <h4>Radio Audio Capabilities</h4>
                <ul>
                  <li>
                    <span className={capabilities.audio.input_level_control ? 'supported' : 'unsupported'}>
                      {capabilities.audio.input_level_control ? '✓' : '✗'}
                    </span>
                    {' '}Software input level control
                  </li>
                  <li>
                    <span className={capabilities.audio.output_level_control ? 'supported' : 'unsupported'}>
                      {capabilities.audio.output_level_control ? '✓' : '✗'}
                    </span>
                    {' '}Software output level control
                  </li>
                  {capabilities.audio.sample_rates && (
                    <li>
                      <span className="supported">ℹ</span>
                      {' '}Sample rates: {capabilities.audio.sample_rates.join(', ')} Hz
                    </li>
                  )}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
