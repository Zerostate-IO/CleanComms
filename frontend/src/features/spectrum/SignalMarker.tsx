/**
 * Signal Marker Overlay Component
 * 
 * Renders clickable signal markers on spectrum displays.
 * Supports hover states and click-to-tune callbacks.
 */

import { useState, useCallback, memo } from 'react';
import type { SignalMarker, SignalMarkerOverlayProps } from './types';

/** Individual marker component */
interface MarkerProps {
  marker: SignalMarker;
  x: number;
  y: number;
  width: number;
  onClick?: (marker: SignalMarker, event: React.MouseEvent) => void;
  onHover?: (marker: SignalMarker | null) => void;
}

const Marker = memo(function Marker({
  marker,
  x,
  y,
  width,
  onClick,
  onHover,
}: MarkerProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(marker, e);
    },
    [marker, onClick]
  );
  
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    onHover?.(marker);
  }, [marker, onHover]);
  
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    onHover?.(null);
  }, [onHover]);
  
  // Calculate marker dimensions
  const markerHeight = 4; // Base height of marker line
  const hitAreaPadding = 8; // Extra padding for easier clicking
  
  return (
    <g
      className={`signal-marker ${marker.isActive ? 'signal-marker--active' : ''} ${isHovered ? 'signal-marker--hovered' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: 'pointer' }}
    >
      {/* Hit area (invisible, larger than visible marker) */}
      <rect
        x={x - hitAreaPadding}
        y={y - hitAreaPadding}
        width={width + hitAreaPadding * 2}
        height={markerHeight + hitAreaPadding * 2}
        fill="transparent"
      />
      
      {/* Visible marker */}
      <rect
        x={x}
        y={y}
        width={Math.max(width, 2)}
        height={markerHeight}
        className="signal-marker__rect"
        rx={1}
      />
      
      {/* Active indicator */}
      {marker.isActive && (
        <circle
          cx={x + width / 2}
          cy={y - 6}
          r={3}
          className="signal-marker__active-dot"
        />
      )}
      
      {/* Hover highlight */}
      {isHovered && (
        <>
          <rect
            x={x - 2}
            y={y - 2}
            width={width + 4}
            height={markerHeight + 4}
            className="signal-marker__hover-highlight"
            rx={2}
          />
          
          {/* Label tooltip */}
          {marker.label && (
            <g className="signal-marker__tooltip">
              <rect
                x={x + width / 2 - 30}
                y={y - 24}
                width={60}
                height={18}
                className="signal-marker__tooltip-bg"
                rx={3}
              />
              <text
                x={x + width / 2}
                y={y - 12}
                className="signal-marker__tooltip-text"
                textAnchor="middle"
              >
                {marker.label}
              </text>
            </g>
          )}
        </>
      )}
    </g>
  );
});

/**
 * Signal Marker Overlay
 * 
 * Renders multiple signal markers as an SVG overlay.
 */
export function SignalMarkerOverlay({
  markers,
  centerFrequency,
  span,
  width,
  height,
  onMarkerClick,
  onMarkerHover,
}: SignalMarkerOverlayProps) {
  // Convert frequency to pixel position
  const freqToPixel = (freq: number): number => {
    const startFreq = centerFrequency - span / 2;
    return ((freq - startFreq) / span) * width;
  };
  
  // Convert bandwidth to pixel width
  const bandwidthToPixels = (bw: number): number => {
    return (bw / span) * width;
  };
  
  // Filter markers that are within the visible range
  const visibleMarkers = markers.filter((marker) => {
    const startFreq = centerFrequency - span / 2;
    const endFreq = centerFrequency + span / 2;
    return marker.frequency >= startFreq && marker.frequency <= endFreq;
  });
  
  if (visibleMarkers.length === 0) {
    return null;
  }
  
  return (
    <svg
      className="signal-marker-overlay"
      width={width}
      height={height}
      role="img"
      aria-label={`${visibleMarkers.length} signal markers`}
    >
      {visibleMarkers.map((marker) => {
        const x = freqToPixel(marker.frequency - marker.width / 2);
        const markerWidth = bandwidthToPixels(marker.width);
        const y = 8; // Position at top of spectrum
        
        return (
          <Marker
            key={marker.id}
            marker={marker}
            x={x}
            y={y}
            width={markerWidth}
            onClick={onMarkerClick}
            onHover={onMarkerHover}
          />
        );
      })}
    </svg>
  );
}

export default SignalMarkerOverlay;
