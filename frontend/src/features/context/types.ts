/**
 * Context Types - Shared types for context data providers
 * 
 * Defines types for solar conditions and grid location data
 * with offline/degraded state handling
 */

/**
 * Solar data from NOAA SWPC
 * Used for propagation condition awareness
 */
export interface SolarData {
  /** Solar Flux Index (SFI) - 10.7cm radio flux */
  sfi: number;
  /** A-index - daily geomagnetic activity */
  a_index: number;
  /** K-index - 3-hour geomagnetic activity */
  k_index: number;
  /** Data source identifier */
  source: string;
  /** ISO timestamp of last update */
  updated_at: string;
}

/**
 * Grid location data
 * Maidenhead locator system for amateur radio
 */
export interface GridLocation {
  /** Full Maidenhead grid square (e.g., "FN31pr") */
  grid: string;
  /** Latitude in decimal degrees */
  latitude: number;
  /** Longitude in decimal degrees */
  longitude: number;
  /** 6-character grid square (field + square + subsquare) */
  grid6: string;
  /** 4-character grid square (field + square) */
  grid4: string;
  /** 2-character grid field */
  field: string;
}

/**
 * Context data fetch state
 */
export type FetchStatus = 'fresh' | 'stale' | 'offline' | 'error' | 'loading';

/**
 * Cached data wrapper with metadata
 */
export interface CachedData<T> {
  /** The cached data */
  data: T | null;
  /** Current fetch status */
  status: FetchStatus;
  /** Timestamp when data was fetched */
  fetchedAt: string | null;
  /** Error message if status is 'error' */
  error: string | null;
  /** Whether data is from cache (offline/stale) */
  isFromCache: boolean;
  /** Age of cached data in milliseconds */
  cacheAge: number | null;
}

/**
 * Solar data with cache metadata
 */
export type CachedSolarData = CachedData<SolarData>;

/**
 * Grid location with cache metadata
 */
export type CachedGridLocation = CachedData<GridLocation>;

/**
 * Context provider configuration
 */
export interface ContextConfig {
  /** Cache timeout in milliseconds (default: 5 minutes) */
  cacheTimeout: number;
  /** Poll interval for fresh data (default: 60 seconds) */
  pollInterval: number;
  /** Enable offline mode simulation for testing */
  offlineMode?: boolean;
}

/**
 * Default context configuration
 */
export const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  pollInterval: 60 * 1000, // 60 seconds
  offlineMode: false,
};
