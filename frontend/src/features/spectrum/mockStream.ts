/**
 * Mock Spectrum Stream Generator
 * 
 * Generates synthetic spectrum data for development and testing.
 * Simulates signals at various frequencies with configurable noise floor.
 * 
 * V1: This is display-only mock data
 * V2: Will integrate with real IQ capture (no hard dependency in V1)
 */

import type { SpectrumData, SpectrumStreamAdapter, SpectrumConfig } from './types';
import { DEFAULT_SPECTRUM_CONFIG } from './types';

/** Configuration for mock signal generator */
interface MockSignalConfig {
  /** Center frequency in Hz */
  frequency: number;
  /** Bandwidth in Hz */
  bandwidth: number;
  /** Signal strength in dB */
  strength: number;
  /** Random variation amount in dB */
  variation?: number;
  /** Fade in/out period in milliseconds (0 = constant) */
  fadePeriod?: number;
}

/** Configuration for mock stream */
interface MockStreamConfig {
  /** Spectrum configuration */
  spectrum: SpectrumConfig;
  /** Signals to generate */
  signals: MockSignalConfig[];
  /** Noise floor in dB */
  noiseFloor: number;
  /** Update interval in milliseconds */
  updateInterval?: number;
}

/** Generate Gaussian noise */
function gaussianNoise(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Generate a signal peak using Gaussian shape */
function generateSignalPeak(
  binIndex: number,
  centerBin: number,
  halfBandwidthBins: number,
  peakStrength: number
): number {
  const distance = Math.abs(binIndex - centerBin);
  if (distance > halfBandwidthBins * 2) return 0;
  
  // Gaussian curve for signal shape
  const normalizedDistance = distance / halfBandwidthBins;
  return peakStrength * Math.exp(-normalizedDistance * normalizedDistance * 2);
}

/** Generate mock spectrum data */
function generateMockData(
  config: MockStreamConfig,
  timestamp: number
): SpectrumData {
  const { spectrum, signals, noiseFloor } = config;
  const { centerFrequency, span, fftSize } = spectrum;
  
  // Create FFT bins array
  const bins = new Float32Array(fftSize);
  
  // Frequency per bin
  const freqPerBin = span / fftSize;
  const startFreq = centerFrequency - span / 2;
  
  // Fill with noise floor + random variation
  for (let i = 0; i < fftSize; i++) {
    // Base noise floor with random variation
    bins[i] = noiseFloor + gaussianNoise() * 5;
  }
  
  // Add signals
  for (const signal of signals) {
    // Calculate signal parameters
    const signalStrength = signal.strength + (signal.variation ?? 0) * gaussianNoise();
    
    // Apply fade if configured
    let fadeMultiplier = 1;
    if (signal.fadePeriod && signal.fadePeriod > 0) {
      fadeMultiplier = 0.5 + 0.5 * Math.sin((timestamp / signal.fadePeriod) * Math.PI * 2);
    }
    
    // Calculate bin range for this signal
    const centerBin = Math.round((signal.frequency - startFreq) / freqPerBin);
    const halfBandwidthBins = Math.ceil(signal.bandwidth / freqPerBin / 2);
    
    // Add signal to bins
    for (let i = 0; i < fftSize; i++) {
      const peak = generateSignalPeak(i, centerBin, halfBandwidthBins, signalStrength);
      bins[i] = Math.max(bins[i], bins[i] + peak * fadeMultiplier);
    }
  }
  
  return {
    centerFrequency,
    span,
    bins,
    timestamp,
  };
}

/** Default mock signals for 20m band */
const DEFAULT_SIGNALS: MockSignalConfig[] = [
  // FT8 signals around 14.074 MHz
  { frequency: 14074000, bandwidth: 50, strength: -60, variation: 5 },
  { frequency: 14074150, bandwidth: 50, strength: -70, variation: 8 },
  { frequency: 14074300, bandwidth: 50, strength: -55, variation: 5, fadePeriod: 3000 },
  { frequency: 14073800, bandwidth: 50, strength: -65, variation: 6 },
  
  // Wider signal (simulating voice)
  { frequency: 14076000, bandwidth: 3000, strength: -50, variation: 3, fadePeriod: 5000 },
  
  // Weak signal
  { frequency: 14072500, bandwidth: 100, strength: -85, variation: 10 },
  
  // Strong signal
  { frequency: 14078000, bandwidth: 200, strength: -45, variation: 2 },
];

/** Create a mock spectrum stream adapter */
export function createMockStreamAdapter(
  customConfig?: Partial<MockStreamConfig>
): SpectrumStreamAdapter {
  const config: MockStreamConfig = {
    spectrum: {
      ...DEFAULT_SPECTRUM_CONFIG,
      ...customConfig?.spectrum,
    },
    signals: customConfig?.signals ?? DEFAULT_SIGNALS,
    noiseFloor: customConfig?.noiseFloor ?? -110,
    updateInterval: customConfig?.updateInterval ?? 100,
  };
  
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let subscribers: Set<(data: SpectrumData) => void> = new Set();
  let isRunning = false;
  
  const tick = () => {
    const data = generateMockData(config, Date.now());
    subscribers.forEach(callback => callback(data));
  };
  
  return {
    subscribe: (callback: (data: SpectrumData) => void) => {
      subscribers.add(callback);
      
      // Start streaming on first subscriber
      if (subscribers.size === 1 && !isRunning) {
        isRunning = true;
        // Send initial data immediately
        tick();
        intervalId = setInterval(tick, config.updateInterval);
      }
      
      // Return unsubscribe function
      return () => {
        subscribers.delete(callback);
        
        // Stop streaming when no subscribers
        if (subscribers.size === 0 && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
          isRunning = false;
        }
      };
    },
    
    isAvailable: () => true,
    
    start: () => {
      if (!isRunning) {
        isRunning = true;
        tick();
        intervalId = setInterval(tick, config.updateInterval);
      }
    },
    
    stop: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        isRunning = false;
      }
    },
  };
}

/** Create an unavailable/failing stream adapter for testing fallback UI */
export function createUnavailableStreamAdapter(): SpectrumStreamAdapter {
  return {
    subscribe: () => () => {},
    isAvailable: () => false,
  };
}

/** Create a delayed stream adapter (simulates slow connection) */
export function createDelayedStreamAdapter(
  delayMs: number = 2000,
  innerAdapter?: SpectrumStreamAdapter
): SpectrumStreamAdapter {
  const adapter = innerAdapter ?? createMockStreamAdapter();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let innerUnsubscribe: (() => void) | null = null;
  
  return {
    subscribe: (callback) => {
      timeoutId = setTimeout(() => {
        innerUnsubscribe = adapter.subscribe(callback);
      }, delayMs);
      
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (innerUnsubscribe) innerUnsubscribe();
      };
    },
    isAvailable: () => adapter.isAvailable(),
    start: () => adapter.start?.(),
    stop: () => adapter.stop?.(),
  };
}

/** Export default mock adapter for easy use */
export const mockStreamAdapter = createMockStreamAdapter();
