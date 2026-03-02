/**
 * Confidence Display Component
 * 
 * Visual confidence meter with animated fill and color coding.
 * Shows AI classification confidence as a percentage.
 */

import { useMemo } from 'react';
import { useConfidenceColor, useConfidenceLabel, useConfidenceAnimation } from './hooks';
import type { ConfidenceDisplayProps } from './types';
import '../../styles/SignalId.css';

/** Get size-specific styles */
function getSizeStyles(size: 'sm' | 'md' | 'lg') {
  switch (size) {
    case 'sm':
      return { height: 4, fontSize: 10, labelSize: 9 };
    case 'lg':
      return { height: 12, fontSize: 16, labelSize: 12 };
    default:
      return { height: 8, fontSize: 14, labelSize: 11 };
  }
}

export function ConfidenceDisplay({
  confidence,
  size = 'md',
  showValue = true,
  className = '',
}: ConfidenceDisplayProps) {
  const color = useConfidenceColor(confidence);
  const label = useConfidenceLabel(confidence);
  const animatedConfidence = useConfidenceAnimation(confidence);
  const sizeStyles = useMemo(() => getSizeStyles(size), [size]);

  const clampedAnimated = Math.max(0, Math.min(100, animatedConfidence));

  return (
    <div className={`confidence-display confidence-display--${size} ${className}`}>
      <div className="confidence-display__header">
        {showValue && (
          <span 
            className="confidence-display__value"
            style={{ color, fontSize: sizeStyles.fontSize }}
          >
            {clampedAnimated}%
          </span>
        )}
        <span 
          className="confidence-display__label"
          style={{ fontSize: sizeStyles.labelSize }}
        >
          {label}
        </span>
      </div>
      
      <div 
        className="confidence-display__track"
        style={{ height: sizeStyles.height }}
      >
        <div 
          className="confidence-display__fill"
          style={{ 
            width: `${clampedAnimated}%`,
            backgroundColor: color,
          }}
        />
        <div 
          className="confidence-display__glow"
          style={{ 
            width: `${clampedAnimated}%`,
            boxShadow: `0 0 ${sizeStyles.height * 2}px ${color}`,
          }}
        />
      </div>
    </div>
  );
}

/** Mini confidence badge for inline display */
export function ConfidenceBadge({ 
  confidence, 
  className = '' 
}: { confidence: number; className?: string }) {
  const color = useConfidenceColor(confidence);
  
  return (
    <span 
      className={`confidence-badge ${className}`}
      style={{ borderColor: color, color }}
    >
      {confidence}%
    </span>
  );
}

/** Confidence indicator dot */
export function ConfidenceDot({ 
  confidence, 
  className = '' 
}: { confidence: number; className?: string }) {
  const color = useConfidenceColor(confidence);
  
  return (
    <span 
      className={`confidence-dot ${className}`}
      style={{ backgroundColor: color }}
      title={`${confidence}% confidence`}
    />
  );
}
