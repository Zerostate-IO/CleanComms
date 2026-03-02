/**
 * Spectrum Display Component
 * 
 * Canvas-based spectrum display showing signal strength vs frequency.
 * X-axis: Frequency (kHz or MHz based on span)
 * Y-axis: Signal strength (dB)
 * 
 * V1: Display-only with click-to-tune
 * V2: Will add IQ capture (no hard dependency)
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import type { SpectrumDisplayProps, ClickToTuneEvent } from './types';
import { useSpectrumStream, useCanvasResize } from './hooks';
import { FrequencyAxis } from './FrequencyAxis';
import { SignalMarkerOverlay } from './SignalMarker';
import '../../styles/Spectrum.css';

/** Default display configuration */
const DEFAULT_HEIGHT = 200;
const DEFAULT_MIN_DB = -120;
const DEFAULT_MAX_DB = -40;
const AXIS_HEIGHT = 28;

export function SpectrumDisplay({
  centerFrequency,
  span,
  streamAdapter,
  markers = [],
  onFrequencyClick,
  minDb = DEFAULT_MIN_DB,
  maxDb = DEFAULT_MAX_DB,
  className = '',
  height = DEFAULT_HEIGHT,
  showAxis = true,
  tunedFrequency,
}: SpectrumDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [hoveredFrequency, setHoveredFrequency] = useState<number | null>(null);
  
  // Subscribe to spectrum stream
  const streamState = useSpectrumStream(streamAdapter);
  const { isConnected, hasError, lastData, errorMessage } = streamState;
  
  // Handle canvas resize
  useCanvasResize(canvasRef, (width) => {
    setContainerWidth(width);
  });
  
  // Render spectrum on canvas
  const renderSpectrum = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.width / dpr;
    const displayHeight = canvas.height / dpr;
    
    // Clear canvas
    ctx.fillStyle = 'var(--bg-secondary)';
    ctx.fillRect(0, 0, displayWidth, displayHeight);
    
    // Draw grid
    drawGrid(ctx, displayWidth, displayHeight, minDb, maxDb);
    
    if (!lastData) {
      // No data - show placeholder
      drawPlaceholder(ctx, displayWidth, displayHeight);
      return;
    }
    
    // Draw spectrum line
    drawSpectrumLine(ctx, lastData.bins, displayWidth, displayHeight, minDb, maxDb);
    
    // Draw center frequency line
    drawCenterLine(ctx, displayWidth, displayHeight);
    
    // Draw tuned frequency marker
    if (tunedFrequency) {
      drawTunedMarker(ctx, centerFrequency, span, tunedFrequency, displayWidth, displayHeight);
    }
  }, [lastData, minDb, maxDb, centerFrequency, span, tunedFrequency]);
  
  // Animation loop
  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      renderSpectrum();
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [renderSpectrum]);
  
  // Handle click for frequency tuning
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onFrequencyClick) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const displayWidth = rect.width;
      
      // Calculate frequency at click position
      const normalizedX = x / displayWidth;
      const offset = (normalizedX - 0.5) * span;
      const frequency = centerFrequency + offset;
      
      // Get signal strength at click position
      let strength = -100;
      if (lastData) {
        const binIndex = Math.floor(normalizedX * lastData.bins.length);
        if (binIndex >= 0 && binIndex < lastData.bins.length) {
          strength = lastData.bins[binIndex];
        }
      }
      
      const clickEvent: ClickToTuneEvent = {
        frequency,
        offset,
        strength,
        originalEvent: event,
      };
      
      onFrequencyClick(clickEvent);
    },
    [centerFrequency, span, lastData, onFrequencyClick]
  );
  
  // Handle mouse move for frequency tooltip
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const displayWidth = rect.width;
      
      const normalizedX = x / displayWidth;
      const offset = (normalizedX - 0.5) * span;
      const frequency = centerFrequency + offset;
      
      setHoveredFrequency(frequency);
    },
    [centerFrequency, span]
  );
  
  const handleMouseLeave = useCallback(() => {
    setHoveredFrequency(null);
  }, []);
  
  // Calculate total height including axis
  const totalHeight = showAxis ? height + AXIS_HEIGHT : height;
  
  return (
    <div
      ref={containerRef}
      className={`spectrum-display ${className} ${!isConnected ? 'spectrum-display--disconnected' : ''}`}
      style={{ height: totalHeight }}
    >
      {/* Status indicator */}
      {hasError && (
        <div className="spectrum-display__error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{errorMessage || 'Stream unavailable'}</span>
          <button
            className="spectrum-display__retry"
            onClick={() => streamAdapter?.start?.()}
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Loading state */}
      {!hasError && !isConnected && (
        <div className="spectrum-display__loading">
          <div className="spectrum-display__spinner" />
          <span>Connecting...</span>
        </div>
      )}
      
      {/* Frequency tooltip */}
      {hoveredFrequency && isConnected && (
        <div className="spectrum-display__tooltip">
          {(hoveredFrequency / 1000).toFixed(2)} kHz
        </div>
      )}
      
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="spectrum-display__canvas"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      
      {/* Signal markers overlay */}
      {isConnected && markers.length > 0 && (
        <div className="spectrum-display__markers">
          <SignalMarkerOverlay
            markers={markers}
            centerFrequency={centerFrequency}
            span={span}
            width={containerWidth}
            height={height}
          />
        </div>
      )}
      
      {/* Frequency axis */}
      {showAxis && containerWidth > 0 && (
        <div className="spectrum-display__axis">
          <FrequencyAxis
            centerFrequency={centerFrequency}
            span={span}
            width={containerWidth}
            tunedFrequency={tunedFrequency}
          />
        </div>
      )}
    </div>
  );
}

/** Draw grid lines */
function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  minDb: number,
  maxDb: number
) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  
  // Horizontal lines (dB levels)
  const dbRange = maxDb - minDb;
  const dbStep = 20; // Every 20 dB
  const numHorizontal = Math.floor(dbRange / dbStep);
  
  for (let i = 0; i <= numHorizontal; i++) {
    const y = (i / numHorizontal) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  // Vertical lines (frequency divisions)
  const numVertical = 8;
  for (let i = 0; i <= numVertical; i++) {
    const x = (i / numVertical) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
}

/** Draw spectrum line from FFT data */
function drawSpectrumLine(
  ctx: CanvasRenderingContext2D,
  bins: Float32Array,
  width: number,
  height: number,
  minDb: number,
  maxDb: number
) {
  const dbRange = maxDb - minDb;
  const binsPerPixel = bins.length / width;
  
  // Create gradient fill
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(0, 212, 170, 0.8)'); // accent-primary
  gradient.addColorStop(0.5, 'rgba(0, 136, 204, 0.5)'); // accent-secondary
  gradient.addColorStop(1, 'rgba(0, 136, 204, 0.1)');
  
  ctx.beginPath();
  ctx.moveTo(0, height);
  
  for (let x = 0; x < width; x++) {
    const binIndex = Math.floor(x * binsPerPixel);
    
    // Average multiple bins if needed
    let value = -120;
    if (binIndex < bins.length) {
      value = bins[binIndex];
    }
    
    // Normalize to 0-1 range
    const normalized = Math.max(0, Math.min(1, (value - minDb) / dbRange));
    const y = height - normalized * height;
    
    if (x === 0) {
      ctx.lineTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.lineTo(width, height);
  ctx.closePath();
  
  // Fill
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Draw line on top
  ctx.strokeStyle = 'rgba(0, 212, 170, 1)';
  ctx.lineWidth = 1.5;
  
  ctx.beginPath();
  for (let x = 0; x < width; x++) {
    const binIndex = Math.floor(x * binsPerPixel);
    let value = -120;
    if (binIndex < bins.length) {
      value = bins[binIndex];
    }
    const normalized = Math.max(0, Math.min(1, (value - minDb) / dbRange));
    const y = height - normalized * height;
    
    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

/** Draw center frequency line */
function drawCenterLine(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const centerX = width / 2;
  
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  
  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, height);
  ctx.stroke();
  
  ctx.setLineDash([]);
}

/** Draw tuned frequency marker */
function drawTunedMarker(
  ctx: CanvasRenderingContext2D,
  centerFrequency: number,
  span: number,
  tunedFrequency: number,
  width: number,
  height: number
) {
  const startFreq = centerFrequency - span / 2;
  const normalized = (tunedFrequency - startFreq) / span;
  const x = normalized * width;
  
  if (x < 0 || x > width) return;
  
  ctx.strokeStyle = 'rgba(248, 81, 73, 0.8)'; // accent-danger
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height);
  ctx.stroke();
  
  // Draw small triangle at top
  ctx.fillStyle = 'rgba(248, 81, 73, 1)';
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x - 5, -8);
  ctx.lineTo(x + 5, -8);
  ctx.closePath();
  ctx.fill();
}

/** Draw placeholder when no data */
function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.fillStyle = 'rgba(139, 148, 158, 0.5)';
  ctx.font = '14px var(--font-body)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('No spectrum data', width / 2, height / 2);
}

export default SpectrumDisplay;
