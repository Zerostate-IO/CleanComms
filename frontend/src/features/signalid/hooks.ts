/**
 * Signal Identification Custom Hooks
 * 
 * React hooks for managing signal classification state and AI suggestions.
 * Advisory-only: suggestions must be explicitly applied by user.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  SignalClassification,
  SignalIdState,
  RadioSuggestion,
  CopyToRadioResult,
} from './types';

/** Generate mock classification data for development */
function generateMockClassifications(): SignalClassification[] {
  const now = Date.now();
  
  return [
    {
      id: 'sig-001',
      frequency: 14074000,
      bandwidth: 50,
      modulation: 'FT8',
      confidence: 94,
      alternatives: [
        { modulation: 'FT4', confidence: 12 },
        { modulation: 'JS8', confidence: 8 },
      ],
      signalStrength: -65,
      timestamp: now - 2000,
      source: 'CleanComms AI',
    },
    {
      id: 'sig-002',
      frequency: 14075000,
      bandwidth: 2400,
      modulation: 'USB',
      confidence: 78,
      alternatives: [
        { modulation: 'LSB', confidence: 22 },
      ],
      signalStrength: -72,
      timestamp: now - 3500,
      source: 'CleanComms AI',
    },
    {
      id: 'sig-003',
      frequency: 14078000,
      bandwidth: 150,
      modulation: 'CW',
      confidence: 89,
      alternatives: [
        { modulation: 'PSK31', confidence: 15 },
      ],
      signalStrength: -58,
      timestamp: now - 1000,
      source: 'CleanComms AI',
    },
  ];
}

/** Convert classification to radio suggestion */
function classificationToSuggestion(classification: SignalClassification): RadioSuggestion {
  const baseSuggestion: RadioSuggestion = {
    classificationId: classification.id,
    mode: classification.modulation,
    frequency: classification.frequency,
    bandwidth: classification.bandwidth,
    description: `Set radio to ${classification.modulation} mode at ${formatFrequency(classification.frequency)}`,
  };

  // Add mode-specific settings
  switch (classification.modulation) {
    case 'CW':
      return {
        ...baseSuggestion,
        bandwidth: 500,
        agc: 'fast',
        description: `CW mode, 500 Hz filter, fast AGC`,
      };
    case 'FT8':
    case 'FT4':
    case 'JS8':
      return {
        ...baseSuggestion,
        bandwidth: 3000,
        agc: 'medium',
        description: `${classification.modulation} digital mode, 3 kHz filter`,
      };
    case 'USB':
    case 'LSB':
      return {
        ...baseSuggestion,
        bandwidth: 2400,
        agc: 'medium',
        description: `${classification.modulation} voice, 2.4 kHz filter`,
      };
    case 'RTTY':
      return {
        ...baseSuggestion,
        bandwidth: 500,
        agc: 'fast',
        ifShift: 0,
        description: `RTTY mode, 500 Hz filter, fast AGC`,
      };
    default:
      return baseSuggestion;
  }
}

/** Format frequency for display */
export function formatFrequency(hz: number): string {
  if (hz >= 1e6) {
    return `${(hz / 1e6).toFixed(4)} MHz`;
  } else if (hz >= 1e3) {
    return `${(hz / 1e3).toFixed(2)} kHz`;
  }
  return `${hz} Hz`;
}

/**
 * Hook for managing signal ID panel state
 * 
 * Handles enable/disable (kill switch), classification data, and selection.
 */
export function useSignalIdState(initialEnabled: boolean = true) {
  const [state, setState] = useState<SignalIdState>({
    isEnabled: initialEnabled,
    isAnalyzing: false,
    classifications: [],
    selectedId: null,
  });

  // Mock data loading effect
  useEffect(() => {
    if (!state.isEnabled) {
      setState(prev => ({
        ...prev,
        classifications: [],
        isAnalyzing: false,
      }));
      return;
    }

    // Simulate analysis
    setState(prev => ({ ...prev, isAnalyzing: true }));
    
    const timer = setTimeout(() => {
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        classifications: generateMockClassifications(),
      }));
    }, 500);

    return () => clearTimeout(timer);
  }, [state.isEnabled]);

  /** Toggle AI suggestions on/off (kill switch) */
  const toggleEnabled = useCallback(() => {
    setState(prev => ({
      ...prev,
      isEnabled: !prev.isEnabled,
      selectedId: null,
    }));
  }, []);

  /** Select a classification for detail view */
  const selectClassification = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedId: id }));
  }, []);

  /** Clear all classifications */
  const clearClassifications = useCallback(() => {
    setState(prev => ({
      ...prev,
      classifications: [],
      selectedId: null,
    }));
  }, []);

  return {
    state,
    toggleEnabled,
    selectClassification,
    clearClassifications,
  };
}

/**
 * Hook for copy-to-radio action
 * 
 * Handles the explicit user action to apply a suggestion.
 * This is advisory-only and never auto-applies.
 */
export function useCopyToRadio(
  onCopy?: (suggestion: RadioSuggestion) => void
) {
  const [isCopying, setIsCopying] = useState(false);
  const [lastResult, setLastResult] = useState<CopyToRadioResult | null>(null);

  /** Copy suggestion to radio - explicit user action only */
  const copyToRadio = useCallback(
    async (classification: SignalClassification) => {
      setIsCopying(true);
      
      try {
        const suggestion = classificationToSuggestion(classification);
        
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const result: CopyToRadioResult = {
          success: true,
          suggestion,
        };
        
        setLastResult(result);
        onCopy?.(suggestion);
        
        return result;
      } catch (error) {
        const result: CopyToRadioResult = {
          success: false,
          suggestion: classificationToSuggestion(classification),
          error: error instanceof Error ? error.message : 'Copy failed',
        };
        
        setLastResult(result);
        return result;
      } finally {
        setIsCopying(false);
      }
    },
    [onCopy]
  );

  return {
    copyToRadio,
    isCopying,
    lastResult,
  };
}

/**
 * Hook for confidence level color mapping
 * 
 * Returns color based on confidence percentage.
 */
export function useConfidenceColor(confidence: number): string {
  if (confidence >= 85) return 'var(--accent-success)';
  if (confidence >= 70) return 'var(--accent-primary)';
  if (confidence >= 50) return 'var(--accent-warning)';
  return 'var(--accent-danger)';
}

/**
 * Hook for confidence level label
 * 
 * Returns human-readable confidence label.
 */
export function useConfidenceLabel(confidence: number): string {
  if (confidence >= 90) return 'Very High';
  if (confidence >= 75) return 'High';
  if (confidence >= 60) return 'Medium';
  if (confidence >= 40) return 'Low';
  return 'Very Low';
}

/**
 * Hook for animating confidence meter
 * 
 * Provides smooth animation from 0 to target confidence.
 */
export function useConfidenceAnimation(
  targetConfidence: number,
  duration: number = 800
) {
  const [displayConfidence, setDisplayConfidence] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = null;
    
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * targetConfidence);
      
      setDisplayConfidence(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [targetConfidence, duration]);

  return displayConfidence;
}

/**
 * Hook for keyboard navigation in signal list
 * 
 * Enables arrow key navigation through classifications.
 */
export function useSignalKeyboardNavigation(
  classifications: SignalClassification[],
  selectedId: string | null,
  onSelect: (id: string | null) => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (classifications.length === 0) return;

      const currentIndex = classifications.findIndex(c => c.id === selectedId);

      switch (e.key) {
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          if (currentIndex < classifications.length - 1) {
            onSelect(classifications[currentIndex + 1].id);
          } else if (currentIndex === -1) {
            onSelect(classifications[0].id);
          }
          break;

        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          if (currentIndex > 0) {
            onSelect(classifications[currentIndex - 1].id);
          }
          break;

        case 'Escape':
          e.preventDefault();
          onSelect(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [classifications, selectedId, onSelect]);
}
