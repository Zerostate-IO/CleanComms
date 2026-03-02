/**
 * Custom hooks for Intent and Operating Profile state management
 * 
 * Provides:
 * - useIntentState: Manages focused vs active state with pending detection
 * - useProfiles: CRUD operations with localStorage persistence
 * - usePendingChanges: Tracks changes between focused and active states
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type {
  IntentType,
  ModeFamily,
  OperatingMode,
  OperatingProfile,
  IntentState,
  PendingState,
} from './types';

// Storage key for profiles
const PROFILES_STORAGE_KEY = 'cleancomms-operating-profiles';

// Default state
const DEFAULT_STATE: IntentState = {
  focused: {
    intent: 'listen',
    modeFamily: 'digital',
    mode: 'FT8',
    frequency: 14074000, // 20m FT8
  },
  active: {
    intent: 'listen',
    modeFamily: 'digital',
    mode: 'FT8',
    frequency: 14074000,
  },
  profiles: [],
};

/**
 * Hook for managing intent state with focused/active pattern
 */
export function useIntentState(initialState?: Partial<IntentState>) {
  const [state, setState] = useState<IntentState>(() => ({
    ...DEFAULT_STATE,
    ...initialState,
    focused: { ...DEFAULT_STATE.focused, ...initialState?.focused },
    active: { ...DEFAULT_STATE.active, ...initialState?.active },
  }));

  // Update focused intent (UI only, not live)
  const setFocusedIntent = useCallback((intent: IntentType) => {
    setState(prev => ({
      ...prev,
      focused: { ...prev.focused, intent },
    }));
  }, []);

  // Update focused mode family
  const setFocusedModeFamily = useCallback((modeFamily: ModeFamily) => {
    setState(prev => {
      // Get default mode for the new family
      let defaultMode: OperatingMode;
      switch (modeFamily) {
        case 'digital':
          defaultMode = 'FT8';
          break;
        case 'cw':
          defaultMode = 'CW';
          break;
        case 'ssb':
          defaultMode = prev.focused.frequency < 10000000 ? 'LSB' : 'USB';
          break;
      }
      
      return {
        ...prev,
        focused: { ...prev.focused, modeFamily, mode: defaultMode },
      };
    });
  }, []);

  // Update focused mode
  const setFocusedMode = useCallback((mode: OperatingMode) => {
    setState(prev => ({
      ...prev,
      focused: { ...prev.focused, mode },
    }));
  }, []);

  // Update focused frequency
  const setFocusedFrequency = useCallback((frequency: number) => {
    setState(prev => {
      // Auto-adjust SSB mode based on frequency convention
      let mode = prev.focused.mode;
      if (prev.focused.modeFamily === 'ssb') {
        mode = frequency < 10000000 ? 'LSB' : 'USB';
      }
      
      return {
        ...prev,
        focused: { ...prev.focused, frequency, mode },
      };
    });
  }, []);

  // Load a profile into focused state
  const loadProfile = useCallback((profile: OperatingProfile) => {
    setState(prev => ({
      ...prev,
      focused: {
        intent: profile.intent,
        modeFamily: profile.modeFamily,
        mode: profile.mode,
        frequency: profile.frequency,
      },
    }));
  }, []);

  // Activate focused state (make it live)
  const activate = useCallback(() => {
    setState(prev => ({
      ...prev,
      active: { ...prev.focused },
    }));
  }, []);

  // Calculate pending state
  const pending: PendingState = useMemo(() => {
    const { focused, active } = state;
    
    const intentChanged = focused.intent !== active.intent;
    const modeFamilyChanged = focused.modeFamily !== active.modeFamily;
    const modeChanged = focused.mode !== active.mode;
    const frequencyChanged = focused.frequency !== active.frequency;
    
    return {
      intent: intentChanged ? focused.intent : undefined,
      modeFamily: modeFamilyChanged ? focused.modeFamily : undefined,
      mode: modeChanged ? focused.mode : undefined,
      frequency: frequencyChanged ? focused.frequency : undefined,
      hasChanges: intentChanged || modeFamilyChanged || modeChanged || frequencyChanged,
    };
  }, [state]);

  return {
    state,
    pending,
    setFocusedIntent,
    setFocusedModeFamily,
    setFocusedMode,
    setFocusedFrequency,
    loadProfile,
    activate,
    setState,
  };
}

/**
 * Hook for managing operating profiles with localStorage persistence
 */
export function useProfiles() {
  const [profiles, setProfiles] = useState<OperatingProfile[]>(() => {
    try {
      const stored = localStorage.getItem(PROFILES_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as OperatingProfile[];
      }
    } catch (e) {
      console.error('Failed to load profiles from localStorage:', e);
    }
    return [];
  });

  // Persist profiles to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    } catch (e) {
      console.error('Failed to save profiles to localStorage:', e);
    }
  }, [profiles]);

  // Create new profile
  const createProfile = useCallback((
    profile: Omit<OperatingProfile, 'id' | 'createdAt' | 'updatedAt'>
  ): OperatingProfile => {
    const now = new Date().toISOString();
    const newProfile: OperatingProfile = {
      ...profile,
      id: `profile-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };
    
    setProfiles(prev => [...prev, newProfile]);
    return newProfile;
  }, []);

  // Update existing profile
  const updateProfile = useCallback((
    profileId: string,
    updates: Partial<Omit<OperatingProfile, 'id' | 'createdAt'>>
  ): OperatingProfile | null => {
    let updatedProfile: OperatingProfile | null = null;
    
    setProfiles(prev => prev.map(profile => {
      if (profile.id === profileId) {
        updatedProfile = {
          ...profile,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        return updatedProfile;
      }
      return profile;
    }));
    
    return updatedProfile;
  }, []);

  // Delete profile
  const deleteProfile = useCallback((profileId: string) => {
    setProfiles(prev => prev.filter(p => p.id !== profileId));
  }, []);

  // Get profile by ID
  const getProfile = useCallback((profileId: string): OperatingProfile | undefined => {
    return profiles.find(p => p.id === profileId);
  }, [profiles]);

  return {
    profiles,
    createProfile,
    updateProfile,
    deleteProfile,
    getProfile,
    setProfiles,
  };
}

/**
 * Hook for tracking pending changes with helper utilities
 */
export function usePendingChanges(focused: IntentState['focused'], active: IntentState['active']) {
  return useMemo(() => {
    const changes: string[] = [];
    
    if (focused.intent !== active.intent) {
      changes.push(`Intent: ${active.intent} → ${focused.intent}`);
    }
    if (focused.modeFamily !== active.modeFamily) {
      changes.push(`Mode Family: ${active.modeFamily} → ${focused.modeFamily}`);
    }
    if (focused.mode !== active.mode) {
      changes.push(`Mode: ${active.mode} → ${focused.mode}`);
    }
    if (focused.frequency !== active.frequency) {
      const formatFreq = (hz: number) => `${(hz / 1000000).toFixed(3)} MHz`;
      changes.push(`Frequency: ${formatFreq(active.frequency)} → ${formatFreq(focused.frequency)}`);
    }
    
    return {
      hasChanges: changes.length > 0,
      changes,
      changeCount: changes.length,
    };
  }, [focused, active]);
}

/**
 * Hook for frequency presets based on mode
 */
export function useFrequencyPresets(_mode: OperatingMode, modeFamily: ModeFamily) {
  // Common FT8 frequencies (Hz)
  const ft8Frequencies = useMemo(() => [
    { freq: 1840000, label: '160m' },
    { freq: 3573000, label: '80m' },
    { freq: 5357000, label: '60m' },
    { freq: 7074000, label: '40m' },
    { freq: 10136000, label: '30m' },
    { freq: 14074000, label: '20m' },
    { freq: 18100000, label: '17m' },
    { freq: 21074000, label: '15m' },
    { freq: 24915000, label: '12m' },
    { freq: 28074000, label: '10m' },
  ], []);

  // CW calling frequencies
  const cwFrequencies = useMemo(() => [
    { freq: 3550000, label: '80m' },
    { freq: 7030000, label: '40m' },
    { freq: 10116000, label: '30m' },
    { freq: 14060000, label: '20m' },
    { freq: 18095000, label: '17m' },
    { freq: 21060000, label: '15m' },
    { freq: 24906000, label: '12m' },
    { freq: 28060000, label: '10m' },
  ], []);

  // SSB calling frequencies
  const ssbFrequencies = useMemo(() => [
    { freq: 3850000, label: '80m LSB' },
    { freq: 7150000, label: '40m LSB' },
    { freq: 14195000, label: '20m USB' },
    { freq: 18130000, label: '17m USB' },
    { freq: 21295000, label: '15m USB' },
    { freq: 24950000, label: '12m USB' },
    { freq: 28395000, label: '10m USB' },
  ], []);

  return useMemo(() => {
    if (modeFamily === 'digital') {
      return ft8Frequencies;
    }
    if (modeFamily === 'cw') {
      return cwFrequencies;
    }
    return ssbFrequencies;
  }, [modeFamily, ft8Frequencies, cwFrequencies, ssbFrequencies]);
}
