/**
 * GridDisplay - Maidenhead grid square display component
 * 
 * Shows the operator's current Maidenhead locator with:
 * - 6-character grid square (e.g., FN31pr)
 * - Latitude/longitude coordinates
 * - Visual grid representation
 */
import { useMemo } from 'react';
import type { GridLocation } from '../context/types';
import '../../styles/Map.css';

interface GridDisplayProps {
  /** Grid location data */
  location: GridLocation | null;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

/**
 * Convert latitude/longitude to approximate Maidenhead grid
 * This is a simplified calculation for display purposes
 */
function calculateGrid(lat: number, lon: number): string {
  // Field (2 characters): 20° lat x 40° lon
  const fieldLat = String.fromCharCode(65 + Math.floor((lat + 90) / 10));
  const fieldLon = String.fromCharCode(65 + Math.floor((lon + 180) / 20));
  
  // Square (2 digits): 1° lat x 2° lon
  const squareLat = Math.floor((lat + 90) % 10).toString();
  const squareLon = Math.floor((lon + 180) / 2 % 10).toString();
  
  // Subsquare (2 characters): 2.5' lat x 5' lon
  const subsquareLat = String.fromCharCode(97 + Math.floor(((lat + 90) % 1) * 60 / 2.5));
  const subsquareLon = String.fromCharCode(97 + Math.floor(((lon + 180) % 2) * 60 / 5));
  
  return `${fieldLon}${fieldLat}${squareLon}${squareLat}${subsquareLon}${subsquareLat}`;
}

export function GridDisplay({ 
  location, 
  isLoading = false, 
  error = null,
  compact = false 
}: GridDisplayProps) {
  // Calculate display values
  const displayData = useMemo(() => {
    if (!location) {
      return {
        grid: '------',
        grid4: '----',
        field: '--',
        lat: 0,
        lon: 0,
        latStr: '--°--\'--"',
        lonStr: '--°--\'--"',
      };
    }

    // Format coordinates as DMS
    const formatDMS = (decimal: number, isLat: boolean): string => {
      const abs = Math.abs(decimal);
      const degrees = Math.floor(abs);
      const minutesFloat = (abs - degrees) * 60;
      const minutes = Math.floor(minutesFloat);
      const seconds = Math.round((minutesFloat - minutes) * 60);
      const dir = isLat 
        ? (decimal >= 0 ? 'N' : 'S')
        : (decimal >= 0 ? 'E' : 'W');
      return `${degrees}°${minutes.toString().padStart(2, '0')}'${seconds.toString().padStart(2, '0')}"${dir}`;
    };

    return {
      grid: location.grid || calculateGrid(location.latitude, location.longitude),
      grid4: location.grid4 || (location.grid ? location.grid.slice(0, 4) : '----'),
      field: location.field || (location.grid ? location.grid.slice(0, 2) : '--'),
      lat: location.latitude,
      lon: location.longitude,
      latStr: formatDMS(location.latitude, true),
      lonStr: formatDMS(location.longitude, false),
    };
  }, [location]);

  if (isLoading) {
    return (
      <div className="grid-display grid-display--loading">
        <div className="grid-display__skeleton">
          <div className="grid-display__skeleton-line grid-display__skeleton-line--grid" />
          <div className="grid-display__skeleton-line grid-display__skeleton-line--coords" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid-display grid-display--error">
        <div className="grid-display__error-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <span className="grid-display__error-text">{error}</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="grid-display grid-display--compact">
        <div className="grid-display__grid-badge">
          <span className="grid-display__grid-label">GRID</span>
          <span className="grid-display__grid-value">{displayData.grid}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid-display">
      {/* Main grid square display */}
      <div className="grid-display__grid-section">
        <div className="grid-display__grid-visual">
          <div className="grid-display__field">
            <span className="grid-display__field-char">{displayData.field[0]}</span>
            <span className="grid-display__field-char">{displayData.field[1]}</span>
          </div>
          <div className="grid-display__square">
            <span className="grid-display__square-char">{displayData.grid4[2]}</span>
            <span className="grid-display__square-char">{displayData.grid4[3]}</span>
          </div>
          <div className="grid-display__subsquare">
            <span className="grid-display__subsquare-char">{displayData.grid[4]}</span>
            <span className="grid-display__subsquare-char">{displayData.grid[5]}</span>
          </div>
        </div>
        
        <div className="grid-display__grid-info">
          <div className="grid-display__grid-label-row">
            <span className="grid-display__label">Maidenhead Locator</span>
          </div>
          <div className="grid-display__grid-main">
            <span className="grid-display__grid-6char">{displayData.grid}</span>
          </div>
          <div className="grid-display__grid-secondary">
            <span className="grid-display__grid-4char">{displayData.grid4}</span>
            <span className="grid-display__grid-separator">•</span>
            <span className="grid-display__grid-field">{displayData.field}</span>
          </div>
        </div>
      </div>

      {/* Coordinates section */}
      <div className="grid-display__coords-section">
        <div className="grid-display__coord">
          <span className="grid-display__coord-label">LAT</span>
          <span className="grid-display__coord-value">{displayData.latStr}</span>
          <span className="grid-display__coord-decimal">
            {displayData.lat.toFixed(4)}°
          </span>
        </div>
        <div className="grid-display__coord">
          <span className="grid-display__coord-label">LON</span>
          <span className="grid-display__coord-value">{displayData.lonStr}</span>
          <span className="grid-display__coord-decimal">
            {displayData.lon.toFixed(4)}°
          </span>
        </div>
      </div>

      {/* Visual grid representation */}
      <div className="grid-display__visual-section">
        <div className="grid-display__visual-label">Grid Reference</div>
        <div className="grid-display__visual-grid">
          {/* Simplified grid visualization */}
          <div className="grid-display__visual-row">
            <div className="grid-display__visual-cell grid-display__visual-cell--label">U</div>
            <div className="grid-display__visual-cell" />
            <div className="grid-display__visual-cell" />
            <div className="grid-display__visual-cell" />
          </div>
          <div className="grid-display__visual-row">
            <div className="grid-display__visual-cell grid-display__visual-cell--label">T</div>
            <div className="grid-display__visual-cell" />
            <div className="grid-display__visual-cell grid-display__visual-cell--active" />
            <div className="grid-display__visual-cell" />
          </div>
          <div className="grid-display__visual-row">
            <div className="grid-display__visual-cell grid-display__visual-cell--label">S</div>
            <div className="grid-display__visual-cell" />
            <div className="grid-display__visual-cell" />
            <div className="grid-display__visual-cell" />
          </div>
          <div className="grid-display__visual-row grid-display__visual-row--bottom">
            <div className="grid-display__visual-cell grid-display__visual-cell--corner" />
            <div className="grid-display__visual-cell grid-display__visual-cell--label">0</div>
            <div className="grid-display__visual-cell grid-display__visual-cell--label">1</div>
            <div className="grid-display__visual-cell grid-display__visual-cell--label">2</div>
          </div>
        </div>
      </div>
    </div>
  );
}
