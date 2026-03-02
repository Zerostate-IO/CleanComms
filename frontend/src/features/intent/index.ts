/**
 * Intent Feature Module
 * 
 * Exports all components and types for the Intent + Operating Profile flow.
 */

// Components
export { IntentPage } from './IntentPage';
export { IntentSelector } from './IntentSelector';
export { ModeFamilySelector } from './ModeFamilySelector';
export { ProfileManager } from './ProfileManager';

// Hooks
export { 
  useIntentState, 
  useProfiles, 
  usePendingChanges,
  useFrequencyPresets,
} from './hooks';

// Types
export type {
  IntentType,
  ModeFamily,
  DigitalMode,
  SSBMode,
  OperatingMode,
  ModeConfig,
  OperatingProfile,
  PendingState,
  IntentState,
  BandInfo,
  FrequencyPreset,
  IntentSelectorProps,
  ModeFamilySelectorProps,
  ProfileManagerProps,
  IntentPageProps,
} from './types';

// Constants and helpers
export {
  DIGITAL_MODES,
  CW_MODE,
  SSB_MODES,
  ALL_MODES,
  getModesForFamily,
  suggestSSBMode,
  getModeConfig,
} from './types';
