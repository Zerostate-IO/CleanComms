/**
 * Intent and Operating Profile Types
 * 
 * Defines the Step 2 workflow types for CleanComms:
 * - Intent: Listen vs Broadcast mode selection
 * - Mode Family: Digital, CW, or SSB mode groups
 * - Operating Profile: Saved configurations for quick recall
 */

// Intent types - determines if operator wants to receive or transmit
export type IntentType = 'listen' | 'broadcast';

// Mode families group related operating modes
export type ModeFamily = 'digital' | 'cw' | 'ssb';

// Digital modes supported within the digital family
export type DigitalMode = 'FT8' | 'FT4' | 'PSK31' | 'RTTY' | 'JS8' | 'WSPR';

// SSB modes depend on band convention (LSB below 10MHz, USB above)
export type SSBMode = 'USB' | 'LSB';

// All supported modes union
export type OperatingMode = DigitalMode | 'CW' | SSBMode;

// Mode configuration with metadata
export interface ModeConfig {
  id: OperatingMode;
  label: string;
  family: ModeFamily;
  description?: string;
  tone?: number; // For CW tone frequency
  bandwidth?: number; // Approximate bandwidth in Hz
}

// Operating profile for saving/loading configurations
export interface OperatingProfile {
  id: string;
  name: string;
  intent: IntentType;
  modeFamily: ModeFamily;
  mode: OperatingMode;
  frequency: number; // in Hz
  notes?: string;
  tags?: string[];
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

// Pending state for changes that haven't been activated
export interface PendingState {
  intent?: IntentType;
  modeFamily?: ModeFamily;
  mode?: OperatingMode;
  frequency?: number;
  hasChanges: boolean;
}

// Intent state managed by the feature
export interface IntentState {
  // Current focused values (UI state, not yet activated)
  focused: {
    intent: IntentType;
    modeFamily: ModeFamily;
    mode: OperatingMode;
    frequency: number;
  };
  // Active values (live radio state)
  active: {
    intent: IntentType;
    modeFamily: ModeFamily;
    mode: OperatingMode;
    frequency: number;
  };
  // Saved profiles
  profiles: OperatingProfile[];
}

// Band information from bandplan data
export interface BandInfo {
  name: string;
  startHz: number;
  endHz: number;
  modes: string[];
  licenseClass?: string[];
  notes?: string;
}

// Frequency preset from common frequencies data
export interface FrequencyPreset {
  frequencyHz: number;
  mode: string;
  band: string;
  description: string;
  category?: string;
  tags?: string[];
}

// Props interfaces for components
export interface IntentSelectorProps {
  value: IntentType;
  pending: boolean;
  onChange: (intent: IntentType) => void;
  disabled?: boolean;
}

export interface ModeFamilySelectorProps {
  modeFamily: ModeFamily;
  mode: OperatingMode;
  frequency: number;
  onModeFamilyChange: (family: ModeFamily) => void;
  onModeChange: (mode: OperatingMode) => void;
  onFrequencyChange: (frequency: number) => void;
  pending: boolean;
  disabled?: boolean;
}

export interface ProfileManagerProps {
  profiles: OperatingProfile[];
  currentConfig: {
    intent: IntentType;
    modeFamily: ModeFamily;
    mode: OperatingMode;
    frequency: number;
  };
  onLoadProfile: (profile: OperatingProfile) => void;
  onSaveProfile: (profile: Omit<OperatingProfile, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteProfile: (profileId: string) => void;
  disabled?: boolean;
}

export interface IntentPageProps {
  // Will be connected to app state
  initialState?: Partial<IntentState>;
}

// Constants for mode configurations
export const DIGITAL_MODES: ModeConfig[] = [
  { id: 'FT8', label: 'FT8', family: 'digital', description: 'Weak-signal digital', bandwidth: 50 },
  { id: 'FT4', label: 'FT4', family: 'digital', description: 'Contest digital', bandwidth: 90 },
  { id: 'PSK31', label: 'PSK31', family: 'digital', description: 'Text chat digital', bandwidth: 31 },
  { id: 'RTTY', label: 'RTTY', family: 'digital', description: 'Radioteletype', bandwidth: 250 },
  { id: 'JS8', label: 'JS8', family: 'digital', description: 'JS8Call messaging', bandwidth: 50 },
  { id: 'WSPR', label: 'WSPR', family: 'digital', description: 'Propagation beacon', bandwidth: 6 },
];

export const CW_MODE: ModeConfig = {
  id: 'CW',
  label: 'CW',
  family: 'cw',
  description: 'Morse code',
  tone: 600, // Default side tone
  bandwidth: 150,
};

export const SSB_MODES: ModeConfig[] = [
  { id: 'USB', label: 'USB', family: 'ssb', description: 'Upper sideband (above 10MHz)', bandwidth: 2700 },
  { id: 'LSB', label: 'LSB', family: 'ssb', description: 'Lower sideband (below 10MHz)', bandwidth: 2700 },
];

export const ALL_MODES: ModeConfig[] = [...DIGITAL_MODES, CW_MODE, ...SSB_MODES];

// Helper function to get modes for a family
export function getModesForFamily(family: ModeFamily): ModeConfig[] {
  switch (family) {
    case 'digital':
      return DIGITAL_MODES;
    case 'cw':
      return [CW_MODE];
    case 'ssb':
      return SSB_MODES;
  }
}

// Helper function to suggest SSB mode based on frequency
export function suggestSSBMode(frequencyHz: number): SSBMode {
  // Convention: LSB below 10MHz, USB above 10MHz
  const TEN_MHZ = 10000000;
  return frequencyHz < TEN_MHZ ? 'LSB' : 'USB';
}

// Helper function to get mode config by ID
export function getModeConfig(modeId: OperatingMode): ModeConfig | undefined {
  return ALL_MODES.find(m => m.id === modeId);
}
