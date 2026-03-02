/**
 * Waterfall Display Component
 * 
 * Scrolling time-frequency display showing signal history.
 * Color mapping: blue (weak) -> green -> yellow -> red (strong)
 * New data scrolls down, old data scrolls up (or vice versa based on config).
 * 
 * V1: Display-only with click-to-tune
 * V2: Will integrate with IQ capture for ML classification
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import type { WaterfallDisplayProps, ClickToTuneEvent, ColorPalette } from './types';
import { COLOR_PALETTES } from './types';
import { useSpectrumStream, useWaterfallHistory, useCanvasResize, useColorPalette } from './hooks';
import { FrequencyAxis } from './FrequencyAxis';
import '../../styles/Spectrum.css';

/** Default configuration */
const DEFAULT_HEIGHT = 300;
const DEFAULT_HISTORY_LINES = 200;
const AXIS_HEIGHT = 28;

export function WaterfallDisplay({
  centerFrequency,
  span,
  streamAdapter,
  palette = 'plasma',
  onFrequencyClick,
  className = '',
  height = DEFAULT_HEIGHT,
  historyLines = DEFAULT_HISTORY_LINES,
}: WaterfallDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Subscribe to spectrum stream
  const streamState = useSpectrumStream(streamAdapter);
  const { isConnected, hasError, errorMessage } = streamState;
  
  // Get waterfall history
  const history = useWaterfallHistory(streamState, historyLines);
  
  // Get color palette
  const paletteColors = COLOR_PALETTES[palette];
  const { getColor } = useColorPalette(paletteColors);
  
  // Handle canvas resize
  useCanvasResize(canvasRef, (width) => {
    setContainerWidth(width);
  });
  
  // Render waterfall
  const renderWaterfall = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.width / dpr;
    const displayHeight = canvas.height / dpr;
    
    // Clear canvas
    ctx.fillStyle = '#0a0e14'; // bg-primary
    ctx.fillRect(0, 0, displayWidth, displayHeight);
    
    // Calculate line height
    const lineHeight = displayHeight / historyLines;

    // Draw history lines (newest at bottom)
    const startIndex = Math.max(0, history.length - Math.floor(displayHeight / lineHeight));
    
    for (let i = startIndex; i < history.length; i++) {
      const line = history[i];
      const y = (i - startIndex) * lineHeight;
      
      // Create image data for this line
      const imageData = ctx.createImageData(displayWidth, Math.ceil(lineHeight) + 1);
      const data = imageData.data;
      
      for (let x = 0; x < displayWidth; x++) {
        const binIndex = Math.floor((x / displayWidth) * line.bins.length);
        const value = line.bins[binIndex] || 0;
        const color = getColor(value);
        
        // Fill pixels for this line height
        for (let py = 0; py < Math.ceil(lineHeight) + 1; py++) {
          const pixelIndex = ((py * displayWidth) + x) * 4;
          data[pixelIndex] = color[0];     // R
          data[pixelIndex + 1] = color[1]; // G
          data[pixelIndex + 2] = color[2]; // B
          data[pixelIndex + 3] = 255;      // A
        }
      }
      
      ctx.putImageData(imageData, 0, Math.floor(y));
    }
    
    // Draw center frequency line
    drawCenterLine(ctx, displayWidth, displayHeight);
    
    // Draw time scale indicators
    drawTimeScale(ctx, displayHeight, history.length);
  }, [history, historyLines, getColor]);
  
  // Animation loop
  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      renderWaterfall();
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [renderWaterfall]);
  
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
      
      const clickEvent: ClickToTuneEvent = {
        frequency,
        offset,
        strength: -80, // Unknown from waterfall
        originalEvent: event,
      };
      
      onFrequencyClick(clickEvent);
    },
    [centerFrequency, span, onFrequencyClick]
  );
  
  // Calculate total height including axis
  const totalHeight = height + AXIS_HEIGHT;
  
  return (
    <div
      ref={containerRef}
      className={`waterfall-display ${className} ${!isConnected ? 'waterfall-display--disconnected' : ''}`}
      style={{ height: totalHeight }}
    >
      {/* Status indicator */}
      {hasError && (
        <div className="waterfall-display__error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{errorMessage || 'Stream unavailable'}</span>
          <button
            className="waterfall-display__retry"
            onClick={() => streamAdapter?.start?.()}
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Loading state */}
      {!hasError && !isConnected && (
        <div className="waterfall-display__loading">
          <div className="waterfall-display__spinner" />
          <span>Connecting...</span>
        </div>
      )}
      
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="waterfall-display__canvas"
        onClick={handleClick}
      />
      
      {/* Frequency axis */}
      {containerWidth > 0 && (
        <div className="waterfall-display__axis">
          <FrequencyAxis
            centerFrequency={centerFrequency}
            span={span}
            width={containerWidth}
          />
        </div>
      )}
      
      {/* Color scale legend */}
      <div className="waterfall-display__legend">
        <div className="waterfall-display__legend-gradient" />
        <div className="waterfall-display__legend-labels">
          <span>Weak</span>
          <span>Strong</span>
        </div>
      </div>
    </div>
  );
}

/** Draw center frequency line */
function drawCenterLine(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const centerX = width / 2;
  
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  
  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, height);
  ctx.stroke();
  
  ctx.setLineDash([]);
}

/** Draw time scale on the left edge */
function drawTimeScale(
  ctx: CanvasRenderingContext2D,
  height: number,
  historyLength: number
) {
  // Only draw if we have enough history
  if (historyLength < 10) return;
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.font = '10px var(--font-display)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  // Show "now" at bottom
  ctx.fillText('now', 4, height - 14);
  
  // Show time indicator at top if we have enough history
  if (historyLength > 50) {
    ctx.fillText(`${Math.floor(historyLength / 10)}s`, 4, 4);
  }
}

/**
 * Waterfall Panel Component
 * 
 * Combines spectrum display and waterfall for a complete view.
 */
export function WaterfallPanel({
  centerFrequency,
  span,
  streamAdapter,
  onFrequencyClick,
  className = '',
}: Omit<WaterfallDisplayProps, 'height' | 'historyLines' | 'palette'> & {
  spectrumHeight?: number;
  waterfallHeight?: number;
}) {
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette>('plasma');
  
  return (
    <div className={`waterfall-panel ${className}`}>
      {/* Palette selector */}
      <div className="waterfall-panel__controls">
        <label className="waterfall-panel__label">Palette:</label>
        <select
          className="waterfall-panel__select"
          value={selectedPalette}
          onChange={(e) => setSelectedPalette(e.target.value as ColorPalette)}
        >
          <option value="plasma">Plasma</option>
          <option value="viridis">Viridis</option>
          <option value="heat">Heat</option>
          <option value="grayscale">Grayscale</option>
        </select>
      </div>
      
      {/* Waterfall */}
      <WaterfallDisplay
        centerFrequency={centerFrequency}
        span={span}
        streamAdapter={streamAdapter}
        palette={selectedPalette}
        onFrequencyClick={onFrequencyClick}
        height={250}
      />
    </div>
  );
}

export default WaterfallDisplay;
