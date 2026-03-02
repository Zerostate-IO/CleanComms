/**
 * Frequency Axis Component
 * 
 * Renders frequency labels along the X-axis of spectrum displays.
 * Shows center frequency, band edges, and tuned frequency highlight.
 */

import { useMemo } from 'react';
import type { FrequencyAxisProps } from './types';

/** Format frequency for display */
function formatFrequency(hz: number, span: number): string {
  // Use kHz for small spans, MHz for large spans
  if (span < 100000) {
    // Show in kHz
    const khz = hz / 1000;
    return `${khz.toFixed(1)}`;
  } else {
    // Show in MHz
    const mhz = hz / 1000000;
    return `${mhz.toFixed(3)}`;
  }
}

/** Calculate nice tick intervals */
function calculateTickInterval(span: number, targetTicks: number): number {
  // Nice intervals: 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, etc.
  const roughInterval = span / targetTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
  const normalized = roughInterval / magnitude;
  
  let niceNormalized: number;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;
  
  return niceNormalized * magnitude;
}

/** Generate tick marks */
function generateTicks(
  startFreq: number,
  endFreq: number,
  interval: number
): number[] {
  const ticks: number[] = [];
  const firstTick = Math.ceil(startFreq / interval) * interval;
  
  for (let freq = firstTick; freq <= endFreq; freq += interval) {
    ticks.push(freq);
  }
  
  return ticks;
}

export function FrequencyAxis({
  centerFrequency,
  span,
  width,
  bandEdges,
  tunedFrequency,
  className = '',
}: FrequencyAxisProps) {
  const startFreq = centerFrequency - span / 2;
  const endFreq = centerFrequency + span / 2;
  
  // Calculate tick positions
  const { ticks, tickInterval } = useMemo(() => {
    const targetTicks = Math.max(5, Math.min(10, Math.floor(width / 80)));
    const interval = calculateTickInterval(span, targetTicks);
    const ticks = generateTicks(startFreq, endFreq, interval);
    return { ticks, tickInterval: interval };
  }, [startFreq, endFreq, span, width]);
  
  // Convert frequency to pixel position
  const freqToPixel = (freq: number): number => {
    return ((freq - startFreq) / span) * width;
  };
  
  // Format tick label based on span size
  const formatTick = (freq: number): string => {
    if (span < 10000) {
      // Small span: show Hz offset from center
      const offset = (freq - centerFrequency) / 1000;
      return `${offset > 0 ? '+' : ''}${offset.toFixed(1)}k`;
    } else if (span < 100000) {
      // Medium span: show kHz
      return `${(freq / 1000).toFixed(0)}k`;
    } else {
      // Large span: show MHz
      return `${(freq / 1000000).toFixed(3)}`;
    }
  };
  
  return (
    <div className={`frequency-axis ${className}`}>
      <svg
        className="frequency-axis__svg"
        width={width}
        height="24"
        role="img"
        aria-label={`Frequency axis from ${formatFrequency(startFreq, span)} to ${formatFrequency(endFreq, span)}`}
      >
        {/* Axis line */}
        <line
          x1="0"
          y1="12"
          x2={width}
          y2="12"
          className="frequency-axis__line"
        />
        
        {/* Band edges (if provided) */}
        {bandEdges?.map((edge, index) => (
          <g key={index} className="frequency-axis__band-edge">
            {/* Low edge */}
            <line
              x1={freqToPixel(edge.low)}
              y1="4"
              x2={freqToPixel(edge.low)}
              y2="20"
              className="frequency-axis__band-edge-line"
            />
            {/* High edge */}
            <line
              x1={freqToPixel(edge.high)}
              y1="4"
              x2={freqToPixel(edge.high)}
              y2="20"
              className="frequency-axis__band-edge-line"
            />
            {/* Band label */}
            {edge.label && (
              <text
                x={(freqToPixel(edge.low) + freqToPixel(edge.high)) / 2}
                y="4"
                className="frequency-axis__band-label"
                textAnchor="middle"
              >
                {edge.label}
              </text>
            )}
          </g>
        ))}
        
        {/* Frequency ticks */}
        {ticks.map((freq) => {
          const x = freqToPixel(freq);
          const isCenter = Math.abs(freq - centerFrequency) < tickInterval / 10;
          
          return (
            <g key={freq} className={`frequency-axis__tick ${isCenter ? 'frequency-axis__tick--center' : ''}`}>
              <line
                x1={x}
                y1="8"
                x2={x}
                y2="16"
                className="frequency-axis__tick-mark"
              />
              <text
                x={x}
                y="22"
                className="frequency-axis__tick-label"
                textAnchor="middle"
              >
                {formatTick(freq)}
              </text>
            </g>
          );
        })}
        
        {/* Tuned frequency marker */}
        {tunedFrequency && tunedFrequency >= startFreq && tunedFrequency <= endFreq && (
          <g className="frequency-axis__tuned">
            <line
              x1={freqToPixel(tunedFrequency)}
              y1="0"
              x2={freqToPixel(tunedFrequency)}
              y2="24"
              className="frequency-axis__tuned-line"
            />
            <polygon
              points={`${freqToPixel(tunedFrequency)},0 ${freqToPixel(tunedFrequency) - 4},-6 ${freqToPixel(tunedFrequency) + 4},-6`}
              className="frequency-axis__tuned-marker"
            />
          </g>
        )}
        
        {/* Center frequency indicator */}
        <line
          x1={width / 2}
          y1="0"
          x2={width / 2}
          y2="24"
          className="frequency-axis__center-line"
        />
      </svg>
    </div>
  );
}

export default FrequencyAxis;
