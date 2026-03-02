/**
 * MapPanel - Map and grid location panel
 * 
 * Displays the operator's current grid location with:
 * - Maidenhead grid square display
 * - Latitude/longitude coordinates
 * - Offline/degraded status indicators
 * - Data source labeling
 */
import { GridDisplay } from './GridDisplay';
import { 
  useMockGridLocation,
  getStatusColor,
  getStatusLabel,
  formatCacheAge,
} from '../context/hooks';
import type { FetchStatus } from '../context/types';
import '../../styles/Map.css';

interface MapPanelProps {
  /** Use mock data for development */
  useMockData?: boolean;
  /** Compact mode */
  compact?: boolean;
}

/**
 * Status indicator component
 */
function StatusIndicator({ 
  status, 
  isFromCache,
  cacheAge,
  source 
}: { 
  status: FetchStatus; 
  isFromCache: boolean;
  cacheAge: number | null;
  source: string;
}) {
  return (
    <div className="map-panel__status">
      <div className="map-panel__status-row">
        <span 
          className="map-panel__status-dot"
          style={{ backgroundColor: getStatusColor(status) }}
        />
        <span className="map-panel__status-label">
          {getStatusLabel(status, isFromCache)}
        </span>
        {cacheAge !== null && isFromCache && (
          <span className="map-panel__status-age">
            {formatCacheAge(cacheAge)}
          </span>
        )}
      </div>
      <div className="map-panel__source">
        <span className="map-panel__source-label">Source:</span>
        <span className="map-panel__source-value">{source}</span>
      </div>
    </div>
  );
}

export function MapPanel({ useMockData = true, compact = false }: MapPanelProps) {
  // Use mock data for now - in production this would use useGridLocation()
  const gridData = useMockGridLocation();
  
  const status = gridData.status;
  const isFromCache = gridData.isFromCache;
  const cacheAge = gridData.cacheAge;

  // Determine data source
  const getSource = (): string => {
    if (isFromCache) return 'Local Cache';
    if (useMockData) return 'Mock Data';
    return 'GPS / Manual Entry';
  };

  return (
    <div className="map-panel">
      {/* Header */}
      <div className="map-panel__header">
        <div className="map-panel__title">
          <svg className="map-panel__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <h3 className="map-panel__title-text">Grid Location</h3>
        </div>
        <StatusIndicator 
          status={status} 
          isFromCache={isFromCache}
          cacheAge={cacheAge}
          source={getSource()}
        />
      </div>

      {/* Map placeholder - simplified grid visualization */}
      <div className="map-panel__map-area">
        <div className="map-panel__map-placeholder">
          <div className="map-panel__map-grid">
            {/* Simplified world grid lines */}
            <div className="map-panel__grid-line map-panel__grid-line--equator" />
            <div className="map-panel__grid-line map-panel__grid-line--meridian" />
            <div className="map-panel__grid-lines">
              {[...Array(5)].map((_, i) => (
                <div key={`h${i}`} className="map-panel__grid-line-h" style={{ top: `${20 + i * 15}%` }} />
              ))}
              {[...Array(7)].map((_, i) => (
                <div key={`v${i}`} className="map-panel__grid-line-v" style={{ left: `${10 + i * 13}%` }} />
              ))}
            </div>
            {/* Position marker */}
            <div className="map-panel__position-marker">
              <div className="map-panel__marker-pulse" />
              <div className="map-panel__marker-dot" />
            </div>
          </div>
          <div className="map-panel__map-label">Grid FN • North America</div>
        </div>
      </div>

      {/* Grid display */}
      <div className="map-panel__grid-display">
        <GridDisplay 
          location={gridData.data}
          isLoading={status === 'loading'}
          error={gridData.error}
          compact={compact}
        />
      </div>

      {/* Quick actions */}
      <div className="map-panel__actions">
        <button className="map-panel__action-btn" title="Copy grid square">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>Copy</span>
        </button>
        <button className="map-panel__action-btn" title="Refresh location">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span>Refresh</span>
        </button>
        <button className="map-panel__action-btn" title="Set location manually">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
          </svg>
          <span>Set</span>
        </button>
      </div>

      {/* Footer with timestamp */}
      {gridData.fetchedAt && (
        <div className="map-panel__footer">
          <span className="map-panel__footer-label">Updated:</span>
          <span className="map-panel__footer-time">
            {new Date(gridData.fetchedAt).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}
