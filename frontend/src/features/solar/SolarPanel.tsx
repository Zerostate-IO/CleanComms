/**
 * SolarPanel - Solar conditions display panel
 * 
 * Shows current solar flux and geomagnetic conditions:
 * - Solar Flux Index (SFI)
 * - A-index (daily geomagnetic)
 * - K-index (3-hour geomagnetic)
 * - Propagation quality indicator
 * - Offline/degraded status
 */
import { useMemo } from 'react';
import { 
  useMockSolarData,
  getStatusColor,
  getStatusLabel,
  formatCacheAge,
} from '../context/hooks';
import type { FetchStatus } from '../context/types';
import '../../styles/Solar.css';

interface SolarPanelProps {
  /** Use mock data for development */
  useMockData?: boolean;
  /** Compact mode */
  compact?: boolean;
}

/**
 * Get SFI quality rating
 * Higher SFI = better HF propagation
 */
function getSFIQuality(sfi: number): { label: string; color: string; description: string } {
  if (sfi >= 150) return { label: 'Excellent', color: 'var(--accent-success)', description: 'Excellent HF conditions' };
  if (sfi >= 120) return { label: 'Good', color: 'var(--accent-primary)', description: 'Good HF propagation' };
  if (sfi >= 90) return { label: 'Fair', color: 'var(--accent-secondary)', description: 'Fair conditions' };
  if (sfi >= 70) return { label: 'Poor', color: 'var(--accent-warning)', description: 'Below average' };
  return { label: 'Very Poor', color: 'var(--accent-danger)', description: 'Poor HF conditions' };
}

/**
 * Get A-index quality rating
 * Lower A-index = less geomagnetic disturbance
 */
function getAIndexQuality(aIndex: number): { label: string; color: string } {
  if (aIndex <= 7) return { label: 'Quiet', color: 'var(--accent-success)' };
  if (aIndex <= 15) return { label: 'Unsettled', color: 'var(--accent-warning)' };
  if (aIndex <= 30) return { label: 'Active', color: 'var(--accent-secondary)' };
  return { label: 'Storm', color: 'var(--accent-danger)' };
}

/**
 * Get K-index quality rating
 * Lower K-index = less geomagnetic disturbance
 */
function getKIndexQuality(kIndex: number): { label: string; color: string; bars: number } {
  const bars = Math.min(9, Math.max(0, Math.round(kIndex)));
  if (kIndex <= 2) return { label: 'Quiet', color: 'var(--accent-success)', bars };
  if (kIndex <= 4) return { label: 'Unsettled', color: 'var(--accent-warning)', bars };
  if (kIndex <= 6) return { label: 'Active', color: 'var(--accent-secondary)', bars };
  return { label: 'Storm', color: 'var(--accent-danger)', bars };
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
    <div className="solar-panel__status">
      <div className="solar-panel__status-row">
        <span 
          className="solar-panel__status-dot"
          style={{ backgroundColor: getStatusColor(status) }}
        />
        <span className="solar-panel__status-label">
          {getStatusLabel(status, isFromCache)}
        </span>
        {cacheAge !== null && isFromCache && (
          <span className="solar-panel__status-age">
            {formatCacheAge(cacheAge)}
          </span>
        )}
      </div>
      <div className="solar-panel__source">
        <span className="solar-panel__source-label">Source:</span>
        <span className="solar-panel__source-value">{source}</span>
      </div>
    </div>
  );
}

/**
 * Solar metric card component
 */
function MetricCard({
  label,
  value,
  unit,
  quality,
  description,
  icon,
}: {
  label: string;
  value: number | string;
  unit?: string;
  quality?: { label: string; color: string };
  description?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="solar-metric">
      <div className="solar-metric__icon">{icon}</div>
      <div className="solar-metric__content">
        <div className="solar-metric__label">{label}</div>
        <div className="solar-metric__value">
          <span className="solar-metric__number">{value}</span>
          {unit && <span className="solar-metric__unit">{unit}</span>}
        </div>
        {quality && (
          <div className="solar-metric__quality" style={{ color: quality.color }}>
            {quality.label}
          </div>
        )}
        {description && (
          <div className="solar-metric__description">{description}</div>
        )}
      </div>
    </div>
  );
}

/**
 * K-index bar graph component
 */
function KIndexBars({ color, bars }: { color: string; bars: number }) {
  return (
    <div className="solar-k-bars">
      <div className="solar-k-bars__label">0</div>
      <div className="solar-k-bars__graph">
        {[...Array(9)].map((_, i) => (
          <div 
            key={i} 
            className={`solar-k-bars__bar ${i < bars ? 'solar-k-bars__bar--active' : ''}`}
            style={{ 
              height: `${10 + i * 10}%`,
              backgroundColor: i < bars ? color : undefined,
            }}
          />
        ))}
      </div>
      <div className="solar-k-bars__label">9</div>
    </div>
  );
}

export function SolarPanel({ useMockData = true, compact = false }: SolarPanelProps) {
  // Use mock data for now - in production this would use useSolarData()
  const solarData = useMockSolarData();
  
  const status = solarData.status;
  const isFromCache = solarData.isFromCache;
  const cacheAge = solarData.cacheAge;
  const data = solarData.data;

  // Calculate quality metrics
  const metrics = useMemo(() => {
    if (!data) return null;
    
    return {
      sfi: getSFIQuality(data.sfi),
      aIndex: getAIndexQuality(data.a_index),
      kIndex: getKIndexQuality(data.k_index),
    };
  }, [data]);

  // Determine data source
  const getSource = (): string => {
    if (isFromCache) return 'Local Cache';
    if (useMockData) return 'Mock Data';
    return data?.source || 'NOAA SWPC';
  };

  if (status === 'loading') {
    return (
      <div className="solar-panel">
        <div className="solar-panel__header">
          <div className="solar-panel__title">
            <svg className="solar-panel__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            <h3 className="solar-panel__title-text">Solar Conditions</h3>
          </div>
        </div>
        <div className="solar-panel__loading">
          <div className="solar-panel__loading-spinner" />
          <span>Loading solar data...</span>
        </div>
      </div>
    );
  }

  if (status === 'error' && !data) {
    return (
      <div className="solar-panel">
        <div className="solar-panel__header">
          <div className="solar-panel__title">
            <svg className="solar-panel__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
            </svg>
            <h3 className="solar-panel__title-text">Solar Conditions</h3>
          </div>
        </div>
        <div className="solar-panel__error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{solarData.error || 'Failed to load solar data'}</span>
          <button className="solar-panel__retry-btn">Retry</button>
        </div>
      </div>
    );
  }

  if (!data || !metrics) {
    return null;
  }

  if (compact) {
    return (
      <div className="solar-panel solar-panel--compact">
        <div className="solar-panel__compact-row">
          <div className="solar-panel__compact-metric">
            <span className="solar-panel__compact-label">SFI</span>
            <span 
              className="solar-panel__compact-value"
              style={{ color: metrics.sfi.color }}
            >
              {data.sfi}
            </span>
          </div>
          <div className="solar-panel__compact-metric">
            <span className="solar-panel__compact-label">A</span>
            <span 
              className="solar-panel__compact-value"
              style={{ color: metrics.aIndex.color }}
            >
              {data.a_index}
            </span>
          </div>
          <div className="solar-panel__compact-metric">
            <span className="solar-panel__compact-label">K</span>
            <span 
              className="solar-panel__compact-value"
              style={{ color: metrics.kIndex.color }}
            >
              {data.k_index}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="solar-panel">
      {/* Header */}
      <div className="solar-panel__header">
        <div className="solar-panel__title">
          <svg className="solar-panel__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <h3 className="solar-panel__title-text">Solar Conditions</h3>
        </div>
        <StatusIndicator 
          status={status} 
          isFromCache={isFromCache}
          cacheAge={cacheAge}
          source={getSource()}
        />
      </div>

      {/* Propagation summary */}
      <div className="solar-panel__summary">
        <div className="solar-panel__summary-label">HF Propagation</div>
        <div 
          className="solar-panel__summary-status"
          style={{ color: metrics.sfi.color }}
        >
          {metrics.sfi.label}
        </div>
        <div className="solar-panel__summary-desc">{metrics.sfi.description}</div>
      </div>

      {/* Metrics grid */}
      <div className="solar-panel__metrics">
        {/* SFI Card */}
        <MetricCard
          label="Solar Flux Index"
          value={data.sfi}
          quality={metrics.sfi}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          }
        />

        {/* A-index Card */}
        <MetricCard
          label="A-Index"
          value={data.a_index}
          quality={metrics.aIndex}
          description="Daily geomagnetic"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          }
        />

        {/* K-index Card with bars */}
        <div className="solar-metric solar-metric--k-index">
          <div className="solar-metric__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M3 15h18M9 3v18" />
            </svg>
          </div>
          <div className="solar-metric__content">
            <div className="solar-metric__label">K-Index</div>
            <div className="solar-metric__value">
              <span className="solar-metric__number">{data.k_index}</span>
              <span className="solar-metric__unit">/ 9</span>
            </div>
            <div className="solar-metric__quality" style={{ color: metrics.kIndex.color }}>
              {metrics.kIndex.label}
            </div>
            <div className="solar-metric__description">3-hour geomagnetic</div>
          </div>
          <KIndexBars
            color={metrics.kIndex.color}
            bars={metrics.kIndex.bars}
          />
        </div>
      </div>

      {/* Quick reference */}
      <div className="solar-panel__reference">
        <div className="solar-panel__reference-title">Quick Reference</div>
        <div className="solar-panel__reference-grid">
          <div className="solar-panel__reference-item">
            <span className="solar-panel__ref-label">SFI</span>
            <span className="solar-panel__ref-range">&gt;120 Good</span>
          </div>
          <div className="solar-panel__reference-item">
            <span className="solar-panel__ref-label">A</span>
            <span className="solar-panel__ref-range">&lt;8 Quiet</span>
          </div>
          <div className="solar-panel__reference-item">
            <span className="solar-panel__ref-label">K</span>
            <span className="solar-panel__ref-range">&lt;3 Quiet</span>
          </div>
        </div>
      </div>

      {/* Footer with timestamp */}
      {solarData.fetchedAt && (
        <div className="solar-panel__footer">
          <span className="solar-panel__footer-label">Updated:</span>
          <span className="solar-panel__footer-time">
            {new Date(solarData.fetchedAt).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}
