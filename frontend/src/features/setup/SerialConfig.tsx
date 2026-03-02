/**
 * Serial Port Configuration Component
 * Configures serial port settings with capability-aware controls
 */

import { useMemo } from 'react';
import type { 
  SerialPortConfig, 
  DetectedPort, 
  SerialConfig as RadioSerialConfig,
  RadioCatalogEntry,
} from './types';

interface SerialConfigProps {
  config: SerialPortConfig;
  onChange: (config: SerialPortConfig) => void;
  detectedPorts: DetectedPort[];
  portsLoading?: boolean;
  portsError?: string | null;
  onRefreshPorts: () => void;
  radio: RadioCatalogEntry | null;
  selectedProfile: string | null;
  validationError?: string;
}

// Common baud rates
const BAUD_RATES = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];

export function SerialConfig({
  config,
  onChange,
  detectedPorts,
  portsLoading,
  portsError,
  onRefreshPorts,
  radio,
  selectedProfile,
  validationError,
}: SerialConfigProps) {
  // Get radio's supported serial config
  const radioSerialConfig = useMemo((): RadioSerialConfig | null => {
    if (!radio) return null;
    
    const profileKey = selectedProfile || 
      radio.recommendations?.preferred_profile ||
      Object.keys(radio.protocol_profiles)[0];
    
    return radio.protocol_profiles[profileKey]?.serial || null;
  }, [radio, selectedProfile]);

  // Determine which baud rates are available
  const availableBaudRates = useMemo(() => {
    if (!radioSerialConfig?.supported_baud_rates) {
      return BAUD_RATES;
    }
    return radioSerialConfig.supported_baud_rates;
  }, [radioSerialConfig]);

  // Get warning message for a setting
  function getSettingWarning(setting: keyof SerialPortConfig, value: unknown): string | null {
    if (!radioSerialConfig) return null;
    
    if (setting === 'baudRate' && typeof value === 'number') {
      if (!radioSerialConfig.supported_baud_rates.includes(value)) {
        return `This radio only supports: ${radioSerialConfig.supported_baud_rates.join(', ')} baud`;
      }
    }
    
    return null;
  }

  function handleChange<K extends keyof SerialPortConfig>(
    key: K,
    value: SerialPortConfig[K]
  ) {
    onChange({
      ...config,
      [key]: value,
    });
  }

  return (
    <div className="serial-config">
      <div className="serial-config-header">
        <h2>Serial Port Configuration</h2>
        <p className="help-text">
          Configure the serial connection to your radio for CAT control.
        </p>
      </div>

      {/* Port Selection */}
      <div className="config-section">
        <div className="config-section-header">
          <h3>Port Selection</h3>
          <button 
            type="button" 
            className="refresh-button"
            onClick={onRefreshPorts}
            disabled={portsLoading}
          >
            {portsLoading ? '⟳ Scanning...' : '↻ Refresh'}
          </button>
        </div>

        {portsError && (
          <div className="config-error">
            <span>⚠️ {portsError}</span>
          </div>
        )}

        <div className="config-field">
          <label htmlFor="serial-port">Serial Port</label>
          <select
            id="serial-port"
            value={config.path}
            onChange={(e) => handleChange('path', e.target.value)}
            className={validationError ? 'error' : ''}
          >
            <option value="">-- Select a port --</option>
            {detectedPorts.map((port) => (
              <option key={port.path} value={port.path}>
                {port.path}
                {port.product ? ` - ${port.product}` : ''}
                {port.manufacturer ? ` (${port.manufacturer})` : ''}
              </option>
            ))}
          </select>
          {validationError && (
            <span className="field-error">{validationError}</span>
          )}
          <span className="field-help">
            Select the USB serial port connected to your radio
          </span>
        </div>

        {/* Manual path entry option */}
        <div className="config-field">
          <label htmlFor="serial-path-manual">Or enter path manually</label>
          <input
            id="serial-path-manual"
            type="text"
            placeholder="/dev/ttyUSB0"
            value={config.path}
            onChange={(e) => handleChange('path', e.target.value)}
          />
        </div>
      </div>

      {/* Serial Parameters */}
      <div className="config-section">
        <h3>Serial Parameters</h3>
        
        {radioSerialConfig && radio && (
          <div className="radio-config-notice">
            <span>ℹ️ Recommended settings from {radio.identity.model}:</span>
            <ul>
              <li>Baud rate: {radioSerialConfig.default_baud}</li>
              <li>Data bits: {radioSerialConfig.data_bits}</li>
              <li>Stop bits: {radioSerialConfig.stop_bits}</li>
              <li>Parity: {radioSerialConfig.parity}</li>
              <li>Flow control: {radioSerialConfig.flow_control}</li>
            </ul>
          </div>
        )}

        <div className="config-grid">
          {/* Baud Rate */}
          <div className="config-field">
            <label htmlFor="baud-rate">Baud Rate</label>
            <select
              id="baud-rate"
              value={config.baudRate}
              onChange={(e) => handleChange('baudRate', parseInt(e.target.value, 10))}
            >
              {BAUD_RATES.map((rate) => {
                const isAvailable = availableBaudRates.includes(rate);
                return (
                  <option 
                    key={rate} 
                    value={rate}
                    disabled={!isAvailable}
                  >
                    {rate} {!isAvailable ? '(unsupported)' : ''}
                  </option>
                );
              })}
            </select>
            {getSettingWarning('baudRate', config.baudRate) && (
              <span className="field-warning">
                ⚠️ {getSettingWarning('baudRate', config.baudRate)}
              </span>
            )}
          </div>

          {/* Data Bits */}
          <div className="config-field">
            <label htmlFor="data-bits">Data Bits</label>
            <select
              id="data-bits"
              value={config.dataBits}
              onChange={(e) => handleChange('dataBits', parseInt(e.target.value, 10) as 7 | 8)}
            >
              <option value={8}>8</option>
              <option value={7}>7</option>
            </select>
          </div>

          {/* Stop Bits */}
          <div className="config-field">
            <label htmlFor="stop-bits">Stop Bits</label>
            <select
              id="stop-bits"
              value={config.stopBits}
              onChange={(e) => handleChange('stopBits', parseInt(e.target.value, 10) as 1 | 2)}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </div>

          {/* Parity */}
          <div className="config-field">
            <label htmlFor="parity">Parity</label>
            <select
              id="parity"
              value={config.parity}
              onChange={(e) => handleChange('parity', e.target.value as 'none' | 'even' | 'odd')}
            >
              <option value="none">None</option>
              <option value="even">Even</option>
              <option value="odd">Odd</option>
            </select>
          </div>

          {/* Flow Control */}
          <div className="config-field">
            <label htmlFor="flow-control">Flow Control</label>
            <select
              id="flow-control"
              value={config.flowControl}
              onChange={(e) => handleChange('flowControl', e.target.value as 'none' | 'hardware' | 'software')}
            >
              <option value="none">None</option>
              <option value="hardware">Hardware (RTS/CTS)</option>
              <option value="software">Software (XON/XOFF)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
