/**
 * Signal Identification Types
 * V2: Advisory-only AI signal classification with confidence displays
 */

/** Signal modulation type classification */
export type ModulationType =
  | 'USB' | 'LSB'
  | 'AM' | 'FM' | 'NFM'
  | 'CW'
  | 'FT8' | 'FT4'
  | 'JS8'
  | 'PSK31' | 'PSK63'
  | 'RTTY'
  | 'OLIVIA' | 'CONTESTIA'
  | 'SSTV'
  | 'UNKNOWN';

/** Signal classification result from AI analysis */
export interface SignalClassification {
  /** Unique identifier for this classification */
  id: string;
  /** Frequency in Hz */
  frequency: number;
  /** Bandwidth in Hz */
  bandwidth: number;
  /** Predicted modulation type */
  modulation: ModulationType;
  /** Confidence score (0-100) */
  confidence: number;
  /** Secondary predictions with lower confidence */
  alternatives?: Array<{
    modulation: ModulationType;
    confidence: number;
  }>;
  /** Signal strength in dB */
  signalStrength: number;
  /** Timestamp of analysis */
  timestamp: number;
  /** Source attribution */
  source: 'CleanComms AI';
}

/** Radio configuration suggestion derived from classification */
export interface RadioSuggestion {
  /** Reference to the classification */
  classificationId: string;
  /** Suggested mode */
  mode: ModulationType;
  /** Suggested frequency (may differ slightly from classification) */
  frequency: number;
  /** Suggested filter bandwidth */
  bandwidth: number;
  /** Optional AGC setting */
  agc?: 'fast' | 'medium' | 'slow' | 'off';
  /** Optional IF shift suggestion */
  ifShift?: number;
  /** Human-readable description of the suggestion */
  description: string;
}

/** Panel state for the signal ID UI */
export interface SignalIdState {
  /** Whether AI suggestions are enabled */
  isEnabled: boolean;
  /** Whether the panel is actively analyzing */
  isAnalyzing: boolean;
  /** Current classification results */
  classifications: SignalClassification[];
  /** Currently selected classification for detail view */
  selectedId: string | null;
  /** Last error message if any */
  error?: string;
}

/** Props for SignalIdPanel component */
export interface SignalIdPanelProps {
  /** Whether the panel is expanded/visible */
  isVisible?: boolean;
  /** Current center frequency for context */
  centerFrequency?: number;
  /** Callback when user copies a suggestion to radio */
  onCopyToRadio?: (suggestion: RadioSuggestion) => void;
  /** Custom class name */
  className?: string;
}

/** Props for ConfidenceDisplay component */
export interface ConfidenceDisplayProps {
  /** Confidence value (0-100) */
  confidence: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show numeric value */
  showValue?: boolean;
  /** Custom class name */
  className?: string;
}

/** Props for SignalSuggestions component */
export interface SignalSuggestionsProps {
  /** Classification to show suggestions for */
  classification: SignalClassification;
  /** Callback when user accepts a suggestion */
  onCopyToRadio?: (suggestion: RadioSuggestion) => void;
  /** Whether suggestions are disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

/** Kill switch state change callback */
export type KillSwitchCallback = (enabled: boolean) => void;

/** Copy to radio action result */
export interface CopyToRadioResult {
  success: boolean;
  suggestion: RadioSuggestion;
  error?: string;
}
