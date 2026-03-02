/**
 * Setup Flow Custom Hooks
 * Hooks for managing setup state, radio catalog, and profile persistence
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  RadioCatalogEntry,
  SetupProfile,
  SetupStep,
  ValidationErrors,
  DetectedPort,
  AudioDevice,
  SerialPortConfig,
  AudioDeviceConfig,
  PTTMethod,
  ProtocolProfile,
} from './types';

const STORAGE_KEY = 'cleancomms-setup';

// Default configuration values
const defaultSerialConfig: SerialPortConfig = {
  path: '',
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  flowControl: 'none',
};

const defaultAudioConfig: AudioDeviceConfig = {
  inputDeviceId: '',
  outputDeviceId: '',
  inputVolume: 0.8,
  outputVolume: 0.8,
};

const defaultProfile: Omit<SetupProfile, 'createdAt' | 'updatedAt'> = {
  radioModelCode: '',
  radioModel: '',
  radioManufacturer: '',
  protocolProfile: '',
  serialConfig: defaultSerialConfig,
  audioConfig: defaultAudioConfig,
  pttMethod: 'rts',
};

/**
 * Hook for loading and managing radio catalog
 */
export function useRadioCatalog() {
  const [catalog, setCatalog] = useState<RadioCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        // Load from public/data/radios/catalog/*.json
        const catalogFiles = [
          '/data/radios/catalog/tx-500.json',
          '/data/radios/catalog/tx-500mp.json',
          '/data/radios/catalog/x6100.json',
          '/data/radios/catalog/trusdx.json',
          '/data/radios/catalog/fx-4cr.json',
        ];

        const responses = await Promise.all(
          catalogFiles.map(async (file) => {
            try {
              const res = await fetch(file);
              if (!res.ok) return null;
              return res.json() as Promise<RadioCatalogEntry>;
            } catch {
              return null;
            }
          })
        );

        const validEntries = responses.filter(
          (entry): entry is RadioCatalogEntry => entry !== null
        );

        setCatalog(validEntries);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load radio catalog');
      } finally {
        setLoading(false);
      }
    }

    loadCatalog();
  }, []);

  return { catalog, loading, error };
}

/**
 * Hook for setup profile state and persistence
 */
export function useSetupProfile() {
  const [profile, setProfile] = useState<SetupProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved) as SetupProfile;
      } catch {
        // Invalid saved data, use defaults
      }
    }
    return {
      ...defaultProfile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const saveProfile = useCallback((updates: Partial<SetupProfile>) => {
    setProfile((prev) => {
      const updated = {
        ...prev,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearProfile = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile({
      ...defaultProfile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, []);

  return { profile, saveProfile, clearProfile };
}

/**
 * Hook for setup step navigation and validation
 */
export function useSetupSteps(profile: SetupProfile, selectedRadio: RadioCatalogEntry | null) {
  const [currentStep, setCurrentStep] = useState<SetupStep>('radio');

  const steps = useMemo(
    () => [
      { id: 'radio' as const, label: 'Radio Selection', completed: false, hasError: false },
      { id: 'serial' as const, label: 'Serial Port', completed: false, hasError: false },
      { id: 'audio' as const, label: 'Audio Routing', completed: false, hasError: false },
      { id: 'review' as const, label: 'Review', completed: false, hasError: false },
    ],
    []
  );

  const validateStep = useCallback(
    (step: SetupStep): ValidationErrors => {
      const errors: ValidationErrors = {};

      switch (step) {
        case 'radio':
          if (!profile.radioModelCode) {
            errors.radioModelCode = 'Please select a radio model';
          }
          break;

        case 'serial':
          if (!profile.serialConfig.path) {
            errors['serialConfig.path'] = 'Serial port path is required';
          }
          if (!profile.serialConfig.baudRate) {
            errors['serialConfig.baudRate'] = 'Baud rate is required';
          }
          break;

        case 'audio':
          // Audio is optional for some radios - check if radio supports audio
          if (selectedRadio) {
            const profileKey = profile.protocolProfile || 
              selectedRadio.recommendations?.preferred_profile ||
              Object.keys(selectedRadio.protocol_profiles)[0];
            const protocolProfile = selectedRadio.protocol_profiles[profileKey];
            
            if (protocolProfile?.audio?.usb_audio) {
              if (!profile.audioConfig.inputDeviceId) {
                errors['audioConfig.inputDeviceId'] = 'Audio input device is required';
              }
              if (!profile.audioConfig.outputDeviceId) {
                errors['audioConfig.outputDeviceId'] = 'Audio output device is required';
              }
            }
          }
          break;

        case 'review':
          // Review step validates everything
          return {
            ...validateStep('radio'),
            ...validateStep('serial'),
            ...validateStep('audio'),
          };
      }

      return errors;
    },
    [profile, selectedRadio]
  );

  const canProceed = useCallback(
    (step: SetupStep): boolean => {
      const errors = validateStep(step);
      return Object.keys(errors).length === 0;
    },
    [validateStep]
  );

  const goToNextStep = useCallback(() => {
    const stepOrder: SetupStep[] = ['radio', 'serial', 'audio', 'review'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1 && canProceed(currentStep)) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  }, [currentStep, canProceed]);

  const goToPreviousStep = useCallback(() => {
    const stepOrder: SetupStep[] = ['radio', 'serial', 'audio', 'review'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  }, [currentStep]);

  return {
    currentStep,
    setCurrentStep,
    steps,
    validateStep,
    canProceed,
    goToNextStep,
    goToPreviousStep,
  };
}

/**
 * Hook for serial port detection
 * Note: This is a mock implementation - real detection would require backend support
 */
export function useSerialPorts() {
  const [ports, setPorts] = useState<DetectedPort[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshPorts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Mock serial port detection
      // In production, this would call /api/v1/system/ports
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const mockPorts: DetectedPort[] = [
        { path: '/dev/ttyUSB0', manufacturer: 'FTDI', product: 'USB Serial', vendorId: '0403', productId: '6001' },
        { path: '/dev/ttyACM0', manufacturer: 'Lab599', product: 'TX-500', vendorId: '0403', productId: '6015' },
      ];
      
      setPorts(mockPorts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect serial ports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPorts();
  }, [refreshPorts]);

  return { ports, loading, error, refreshPorts };
}

/**
 * Hook for audio device enumeration
 */
export function useAudioDevices() {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDevices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use Web Audio API to enumerate devices
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        throw new Error('Audio device enumeration not supported');
      }

      // Request permission first
      await navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      });

      const deviceList = await navigator.mediaDevices.enumerateDevices();
      
      const audioDevices: AudioDevice[] = deviceList
        .filter((device) => device.kind === 'audioinput' || device.kind === 'audiooutput')
        .map((device) => ({
          deviceId: device.deviceId,
          kind: device.kind as 'audioinput' | 'audiooutput',
          label: device.label || `${device.kind === 'audioinput' ? 'Microphone' : 'Speaker'} (${device.deviceId.slice(0, 8)})`,
        }));

      setDevices(audioDevices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enumerate audio devices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  const inputDevices = useMemo(
    () => devices.filter((d) => d.kind === 'audioinput'),
    [devices]
  );

  const outputDevices = useMemo(
    () => devices.filter((d) => d.kind === 'audiooutput'),
    [devices]
  );

  return {
    devices,
    inputDevices,
    outputDevices,
    loading,
    error,
    refreshDevices,
  };
}

/**
 * Hook to get capability-aware configuration for selected radio
 */
export function useRadioCapabilities(
  radio: RadioCatalogEntry | null,
  profileName: string | null
) {
  return useMemo(() => {
    if (!radio) return null;

    const profileKey = profileName || 
      radio.recommendations?.preferred_profile ||
      Object.keys(radio.protocol_profiles)[0];
    
    const protocolProfile = radio.protocol_profiles[profileKey] as ProtocolProfile | undefined;
    
    if (!protocolProfile) return null;

    return {
      serial: protocolProfile.serial || null,
      cat: protocolProfile.cat || null,
      ptt: protocolProfile.ptt || null,
      audio: protocolProfile.audio || null,
      // Capability flags for UI
      supportsCAT: !!(protocolProfile.cat?.frequency_control || protocolProfile.cat?.mode_control),
      supportsPTT: !!(protocolProfile.ptt?.cat_ptt || protocolProfile.ptt?.rts_ptt || protocolProfile.ptt?.dtr_ptt),
      supportsUSBAudio: !!protocolProfile.audio?.usb_audio,
      supportsAccPort: !!protocolProfile.audio?.acc_port,
      // Available PTT methods
      availablePTTMethods: {
        cat: !!protocolProfile.ptt?.cat_ptt,
        rts: !!protocolProfile.ptt?.rts_ptt,
        dtr: !!protocolProfile.ptt?.dtr_ptt,
        hardware: !!protocolProfile.ptt?.hardware_ptt,
        vox: !!protocolProfile.ptt?.vox,
      } as Record<PTTMethod, boolean>,
    };
  }, [radio, profileName]);
}
