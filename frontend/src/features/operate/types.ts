/**
 * Types for the Operate workflow feature
 */

// Radio modes supported by the system
export type RadioMode = 'USB' | 'LSB' | 'CW' | 'RTTY' | 'PKT' | 'FM' | 'AM';

// PTT states
export type PTTState = 'rx' | 'tx';

// Health status values
export type HealthStatusValue = 'ok' | 'degraded' | 'error';

/**
 * Rig status from /api/v1/rig/status
 */
export interface RigStatus {
  frequency: number;      // Frequency in Hz
  mode: RadioMode;        // Current mode
  ptt: boolean;           // PTT state (true = TX)
  connected: boolean;     // Connection status
}

/**
 * Health response from /health
 */
export interface HealthResponse {
  status: HealthStatusValue;
  rigctld: HealthStatusValue;
  fldigi: HealthStatusValue;
  features: Record<string, boolean>;
  coordinator: HealthStatusValue;
  logging: HealthStatusValue;
}

/**
 * Frequency set request
 */
export interface FrequencyRequest {
  hz: number;
}

/**
 * Mode set request
 */
export interface ModeRequest {
  mode: RadioMode;
}

/**
 * PTT set request
 */
export interface PTTRequest {
  state: PTTState;
}

/**
 * PTT response
 */
export interface PTTResponse {
  state: PTTState;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
}

/**
 * Quick channel definition
 */
export interface QuickChannel {
  id: string;
  label: string;
  frequency: number;      // Hz
  mode: RadioMode;
  band: string;           // e.g., "20m", "40m"
  description?: string;
}

/**
 * Tuning step sizes in Hz
 */
export type TuningStep = 100 | 1000 | 10000 | 100000;

/**
 * Operate page state
 */
export interface OperateState {
  rigStatus: RigStatus | null;
  health: HealthResponse | null;
  isLoading: boolean;
  error: string | null;
  pttBlocked: boolean;
  pttBlockedReason: string | null;
}

/**
 * Mode configuration for UI display
 */
export interface ModeConfig {
  value: RadioMode;
  label: string;
  description: string;
  category: 'voice' | 'cw' | 'digital';
}

// Predefined mode configurations
export const MODE_CONFIGS: ModeConfig[] = [
  { value: 'USB', label: 'USB', description: 'Upper Sideband', category: 'voice' },
  { value: 'LSB', label: 'LSB', description: 'Lower Sideband', category: 'voice' },
  { value: 'CW', label: 'CW', description: 'Continuous Wave', category: 'cw' },
  { value: 'RTTY', label: 'RTTY', description: 'Radio Teletype', category: 'digital' },
  { value: 'PKT', label: 'PKT', description: 'Packet/Digital', category: 'digital' },
  { value: 'FM', label: 'FM', description: 'Frequency Modulation', category: 'voice' },
  { value: 'AM', label: 'AM', description: 'Amplitude Modulation', category: 'voice' },
];

// Common quick channels for North America
export const COMMON_CHANNELS: QuickChannel[] = [
  { id: 'ft8-20m', label: 'FT8 20m', frequency: 14074000, mode: 'USB', band: '20m', description: '14.074 MHz' },
  { id: 'ft8-40m', label: 'FT8 40m', frequency: 7074000, mode: 'USB', band: '40m', description: '7.074 MHz' },
  { id: 'ft8-80m', label: 'FT8 80m', frequency: 3574000, mode: 'USB', band: '80m', description: '3.574 MHz' },
  { id: 'cw-20m', label: 'CW 20m', frequency: 14025000, mode: 'CW', band: '20m', description: '14.025 MHz' },
  { id: 'cw-40m', label: 'CW 40m', frequency: 7025000, mode: 'CW', band: '40m', description: '7.025 MHz' },
  { id: 'ssb-20m', label: 'SSB 20m', frequency: 14200000, mode: 'USB', band: '20m', description: '14.200 MHz' },
  { id: 'ssb-40m', label: 'SSB 40m', frequency: 7250000, mode: 'LSB', band: '40m', description: '7.250 MHz' },
  { id: 'js8-20m', label: 'JS8 20m', frequency: 14078000, mode: 'USB', band: '20m', description: '14.078 MHz' },
];
