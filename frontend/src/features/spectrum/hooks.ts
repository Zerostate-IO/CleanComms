/**
 * Spectrum Display Custom Hooks
 * 
 * React hooks for managing spectrum data streams and state.
 * Handles subscription lifecycle and provides graceful fallback.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  SpectrumData,
  SpectrumStreamAdapter,
  SpectrumStreamState,
  WaterfallLine,
  ClickToTuneEvent,
} from './types';

/**
 * Hook for subscribing to a spectrum data stream
 * 
 * Manages the subscription lifecycle and provides connection state.
 */
export function useSpectrumStream(
  adapter: SpectrumStreamAdapter | null | undefined
): SpectrumStreamState {
  const [state, setState] = useState<SpectrumStreamState>({
    isConnected: false,
    hasError: false,
    frameCount: 0,
  });
  
  useEffect(() => {
    if (!adapter) {
      setState({
        isConnected: false,
        hasError: false,
        frameCount: 0,
      });
      return;
    }
    
    if (!adapter.isAvailable()) {
      setState({
        isConnected: false,
        hasError: true,
        errorMessage: 'Stream unavailable',
        frameCount: 0,
      });
      return;
    }
    
    setState(prev => ({ ...prev, hasError: false }));
    
    const unsubscribe = adapter.subscribe((data) => {
      setState(prev => ({
        isConnected: true,
        hasError: false,
        lastData: data,
        frameCount: prev.frameCount + 1,
      }));
    });
    
    return () => {
      unsubscribe();
    };
  }, [adapter]);
  
  return state;
}

/**
 * Hook for managing waterfall history
 * 
 * Maintains a fixed-size buffer of waterfall lines for display.
 */
export function useWaterfallHistory(
  streamState: SpectrumStreamState,
  maxLines: number = 100
): WaterfallLine[] {
  const [history, setHistory] = useState<WaterfallLine[]>([]);
  const lastTimestampRef = useRef<number>(0);
  
  useEffect(() => {
    const data = streamState.lastData;
    if (!data || data.timestamp === lastTimestampRef.current) {
      return;
    }
    
    lastTimestampRef.current = data.timestamp;
    
    // Normalize bins to 0-255 range for color mapping
    const normalizedBins = new Uint8Array(data.bins.length);
    const minDb = -120;
    const maxDb = -40;
    const range = maxDb - minDb;
    
    for (let i = 0; i < data.bins.length; i++) {
      const normalized = (data.bins[i] - minDb) / range;
      normalizedBins[i] = Math.max(0, Math.min(255, Math.round(normalized * 255)));
    }
    
    const newLine: WaterfallLine = {
      bins: normalizedBins,
      timestamp: data.timestamp,
    };
    
    setHistory(prev => {
      const newHistory = [...prev, newLine];
      // Keep only the most recent lines
      if (newHistory.length > maxLines) {
        return newHistory.slice(-maxLines);
      }
      return newHistory;
    });
  }, [streamState.lastData, maxLines]);
  
  return history;
}

/**
 * Hook for click-to-tune functionality
 * 
 * Converts canvas click coordinates to frequency values.
 */
export function useClickToTune(
  centerFrequency: number,
  span: number,
  _canvasWidth: number,
  onFrequencyClick?: (event: ClickToTuneEvent) => void
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onFrequencyClick || !canvasRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      
      // Calculate frequency at click position
      const normalizedX = x / rect.width; // 0 to 1
      const offset = (normalizedX - 0.5) * span; // -span/2 to +span/2
      const frequency = centerFrequency + offset;
      
      // Get signal strength at this position (if spectrum data available)
      const strength = -80; // Default, could be enhanced with actual data
      
      onFrequencyClick({
        frequency,
        offset,
        strength,
        originalEvent: event,
      });
    },
    [centerFrequency, span, onFrequencyClick]
  );
  
  return {
    canvasRef,
    handleClick,
  };
}

/**
 * Hook for animating spectrum display with requestAnimationFrame
 * 
 * Provides smooth 60fps updates while respecting the data stream rate.
 */
export function useSpectrumAnimation(
  callback: (timestamp: number) => void,
  isActive: boolean = true
) {
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  
  useEffect(() => {
    if (!isActive) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      return;
    }
    
    const animate = (timestamp: number) => {
      if (previousTimeRef.current !== undefined) {
        callback(timestamp);
      }
      previousTimeRef.current = timestamp;
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [callback, isActive]);
}

/**
 * Hook for color palette interpolation
 * 
 * Converts normalized values (0-255) to RGB colors using a palette.
 */
export function useColorPalette(palette: [number, number, number][]) {
  const colorCache = useRef<Uint8Array | null>(null);
  
  useEffect(() => {
    // Pre-compute color lookup table
    const lut = new Uint8Array(256 * 3);
    const stops = palette.length - 1;
    
    for (let i = 0; i < 256; i++) {
      const normalized = i / 255;
      const position = normalized * stops;
      const lowerIndex = Math.floor(position);
      const upperIndex = Math.min(lowerIndex + 1, stops);
      const t = position - lowerIndex;
      
      const lower = palette[lowerIndex];
      const upper = palette[upperIndex];
      
      const baseIndex = i * 3;
      lut[baseIndex] = Math.round(lower[0] + (upper[0] - lower[0]) * t);
      lut[baseIndex + 1] = Math.round(lower[1] + (upper[1] - lower[1]) * t);
      lut[baseIndex + 2] = Math.round(lower[2] + (upper[2] - lower[2]) * t);
    }
    
    colorCache.current = lut;
  }, [palette]);
  
  const getColor = useCallback((value: number): [number, number, number] => {
    if (!colorCache.current) {
      return [0, 0, 0];
    }
    
    const index = Math.max(0, Math.min(255, value)) * 3;
    return [
      colorCache.current[index],
      colorCache.current[index + 1],
      colorCache.current[index + 2],
    ];
  }, []);
  
  return { getColor, colorLUT: colorCache };
}

/**
 * Hook for detecting signals in spectrum data
 * 
 * Simple peak detection for automatic signal marker generation.
 */
export function useSignalDetection(
  data: SpectrumData | undefined,
  threshold: number = -70,
  minBandwidth: number = 50
): { frequency: number; strength: number; width: number }[] {
  const [signals, setSignals] = useState<{ frequency: number; strength: number; width: number }[]>([]);
  
  useEffect(() => {
    if (!data) {
      setSignals([]);
      return;
    }
    
    const { centerFrequency, span, bins } = data;
    const freqPerBin = span / bins.length;
    const startFreq = centerFrequency - span / 2;
    
    const detected: { frequency: number; strength: number; width: number }[] = [];
    let inPeak = false;
    let peakStart = 0;
    let peakMax = -Infinity;
    let peakMaxIndex = 0;
    
    for (let i = 0; i < bins.length; i++) {
      const isAboveThreshold = bins[i] > threshold;
      
      if (isAboveThreshold && !inPeak) {
        // Start of new peak
        inPeak = true;
        peakStart = i;
        peakMax = bins[i];
        peakMaxIndex = i;
      } else if (isAboveThreshold && inPeak) {
        // Continue peak
        if (bins[i] > peakMax) {
          peakMax = bins[i];
          peakMaxIndex = i;
        }
      } else if (!isAboveThreshold && inPeak) {
        // End of peak
        inPeak = false;
        const width = (i - peakStart) * freqPerBin;
        
        if (width >= minBandwidth) {
          detected.push({
            frequency: startFreq + peakMaxIndex * freqPerBin,
            strength: peakMax,
            width,
          });
        }
      }
    }
    
    setSignals(detected);
  }, [data, threshold, minBandwidth]);
  
  return signals;
}

/**
 * Hook for canvas resize handling
 * 
 * Automatically resizes canvas to match its display size.
 */
export function useCanvasResize(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  onResize?: (width: number, height: number) => void
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
        
        onResize?.(width, height);
      }
    });
    
    resizeObserver.observe(canvas);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [canvasRef, onResize]);
}
