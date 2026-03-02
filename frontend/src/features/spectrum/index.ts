/**
 * Spectrum/Waterfall Display Feature
 * 
 * V1: Display-only with click-to-tune hooks
 * V2: Will add IQ capture and ML classification (no hard dependency)
 */

// Components
export { SpectrumDisplay } from './SpectrumDisplay';
export { WaterfallDisplay, WaterfallPanel } from './WaterfallDisplay';
export { FrequencyAxis } from './FrequencyAxis';
export { SignalMarkerOverlay } from './SignalMarker';

// Hooks
export {
  useSpectrumStream,
  useWaterfallHistory,
  useClickToTune,
  useSpectrumAnimation,
  useColorPalette,
  useSignalDetection,
  useCanvasResize,
} from './hooks';

// Mock data generator
export {
  createMockStreamAdapter,
  createUnavailableStreamAdapter,
  createDelayedStreamAdapter,
  mockStreamAdapter,
} from './mockStream';

// Types
export type {
  SpectrumData,
  SignalMarker,
  SpectrumConfig,
  WaterfallLine,
  ColorPalette,
  SpectrumStreamAdapter,
  ClickToTuneEvent,
  SpectrumDisplayProps,
  WaterfallDisplayProps,
  FrequencyAxisProps,
  SignalMarkerOverlayProps,
  SpectrumStreamState,
} from './types';

// Constants
export {
  DEFAULT_SPECTRUM_CONFIG,
  SPAN_PRESETS,
  COLOR_PALETTES,
} from './types';
