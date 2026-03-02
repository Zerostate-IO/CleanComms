/**
 * Spectrum/Waterfall Display Types
 * V1: Display-only with click-to-tune hooks
 * V2: Will add IQ capture and ML classification (no hard dependency in V1)
 */

/** FFT bin data representing signal strength at each frequency point */
export interface SpectrumData {
  /** Center frequency in Hz */
  centerFrequency: number;
  /** Frequency span in Hz (total width of display) */
  span: number;
  /** Array of signal strength values in dB (one per FFT bin) */
  bins: Float32Array;
  /** Timestamp of this data frame */
  timestamp: number;
}

/** A detected or marked signal on the spectrum */
export interface SignalMarker {
  /** Unique identifier for this marker */
  id: string;
  /** Center frequency in Hz */
  frequency: number;
  /** Signal strength in dB */
  strength: number;
  /** Bandwidth in Hz */
  width: number;
  /** Optional label (e.g., callsign, mode) */
  label?: string;
  /** Whether this is the active/tuned signal */
  isActive?: boolean;
}

/** Configuration for spectrum display */
export interface SpectrumConfig {
  /** Center frequency in Hz */
  centerFrequency: number;
  /** Frequency span in Hz */
  span: number;
  /** Minimum dB level for display */
  minDb: number;
  /** Maximum dB level for display */
  maxDb: number;
  /** FFT bin count */
  fftSize: number;
  /** Update rate in milliseconds */
  updateInterval: number;
}

/** Waterfall history line */
export interface WaterfallLine {
  /** FFT bin data (normalized 0-255 for color mapping) */
  bins: Uint8Array;
  /** Timestamp when this line was captured */
  timestamp: number;
}

/** Color palette for waterfall display */
export type ColorPalette = 'plasma' | 'viridis' | 'grayscale' | 'heat';

/** Stream adapter interface for spectrum data sources */
export interface SpectrumStreamAdapter {
  /** Subscribe to spectrum data updates */
  subscribe: (callback: (data: SpectrumData) => void) => () => void;
  /** Check if the stream is available */
  isAvailable: () => boolean;
  /** Start the stream */
  start?: () => void;
  /** Stop the stream */
  stop?: () => void;
}

/** Props for click-to-tune callback */
export interface ClickToTuneEvent {
  /** Clicked frequency in Hz */
  frequency: number;
  /** Offset from center frequency in Hz */
  offset: number;
  /** Signal strength at clicked location in dB */
  strength: number;
  /** Original mouse event */
  originalEvent: React.MouseEvent;
}

/** Spectrum display props */
export interface SpectrumDisplayProps {
  /** Center frequency in Hz */
  centerFrequency: number;
  /** Frequency span in Hz */
  span: number;
  /** Stream adapter for data source */
  streamAdapter?: SpectrumStreamAdapter | null;
  /** Signal markers to display */
  markers?: SignalMarker[];
  /** Click-to-tune callback */
  onFrequencyClick?: (event: ClickToTuneEvent) => void;
  /** Minimum dB level */
  minDb?: number;
  /** Maximum dB level */
  maxDb?: number;
  /** Custom class name */
  className?: string;
  /** Height in pixels */
  height?: number;
  /** Show frequency axis */
  showAxis?: boolean;
  /** Currently tuned frequency (for highlight) */
  tunedFrequency?: number;
}

/** Waterfall display props */
export interface WaterfallDisplayProps {
  /** Center frequency in Hz */
  centerFrequency: number;
  /** Frequency span in Hz */
  span: number;
  /** Stream adapter for data source */
  streamAdapter?: SpectrumStreamAdapter | null;
  /** Color palette */
  palette?: ColorPalette;
  /** Click-to-tune callback */
  onFrequencyClick?: (event: ClickToTuneEvent) => void;
  /** Custom class name */
  className?: string;
  /** Height in pixels */
  height?: number;
  /** Number of history lines to display */
  historyLines?: number;
  /** Scroll speed (lines per second) */
  scrollSpeed?: number;
}

/** Frequency axis props */
export interface FrequencyAxisProps {
  /** Center frequency in Hz */
  centerFrequency: number;
  /** Frequency span in Hz */
  span: number;
  /** Width in pixels */
  width: number;
  /** Show band edges if provided */
  bandEdges?: { low: number; high: number; label?: string }[];
  /** Currently tuned frequency for highlight */
  tunedFrequency?: number;
  /** Custom class name */
  className?: string;
}

/** Signal marker overlay props */
export interface SignalMarkerOverlayProps {
  /** Markers to display */
  markers: SignalMarker[];
  /** Center frequency in Hz */
  centerFrequency: number;
  /** Frequency span in Hz */
  span: number;
  /** Canvas/element width in pixels */
  width: number;
  /** Canvas/element height in pixels */
  height: number;
  /** Click callback */
  onMarkerClick?: (marker: SignalMarker, event: React.MouseEvent) => void;
  /** Hover callback */
  onMarkerHover?: (marker: SignalMarker | null) => void;
}

/** Spectrum stream state */
export interface SpectrumStreamState {
  /** Whether the stream is connected */
  isConnected: boolean;
  /** Whether the stream is in error state */
  hasError: boolean;
  /** Error message if any */
  errorMessage?: string;
  /** Last received data */
  lastData?: SpectrumData;
  /** Number of frames received */
  frameCount: number;
}

/** Default spectrum configuration values */
export const DEFAULT_SPECTRUM_CONFIG: SpectrumConfig = {
  centerFrequency: 14074000, // 20m FT8
  span: 10000, // 10 kHz
  minDb: -120,
  maxDb: -40,
  fftSize: 1024,
  updateInterval: 100, // 10 fps
};

/** Preset span options */
export const SPAN_PRESETS = [
  { label: '3 kHz', value: 3000 },
  { label: '10 kHz', value: 10000 },
  { label: '30 kHz', value: 30000 },
  { label: '100 kHz', value: 100000 },
  { label: '500 kHz', value: 500000 },
] as const;

/** Color palette definitions (RGB stops) */
export const COLOR_PALETTES: Record<ColorPalette, [number, number, number][]> = {
  plasma: [
    [13, 8, 135],
    [126, 3, 168],
    [204, 71, 120],
    [248, 149, 64],
    [240, 249, 33],
  ],
  viridis: [
    [68, 1, 84],
    [59, 82, 139],
    [33, 145, 140],
    [94, 201, 98],
    [253, 231, 37],
  ],
  grayscale: [
    [0, 0, 0],
    [50, 50, 50],
    [100, 100, 100],
    [180, 180, 180],
    [255, 255, 255],
  ],
  heat: [
    [0, 0, 0],
    [128, 0, 0],
    [255, 128, 0],
    [255, 255, 0],
    [255, 255, 255],
  ],
};
