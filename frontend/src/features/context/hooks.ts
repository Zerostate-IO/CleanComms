/**
 * Context Hooks - Data fetching with offline/caching support
 * 
 * Provides hooks for fetching context data (solar, grid location)
 * with automatic cache management and offline degradation
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  SolarData,
  GridLocation,
  CachedSolarData,
  CachedGridLocation,
  FetchStatus,
  ContextConfig,
} from './types';
import { DEFAULT_CONTEXT_CONFIG } from './types';

const API_BASE = '/api/v1';

// Local storage keys for cache persistence
const CACHE_KEYS = {
  solar: 'cleacomms_cache_solar',
  grid: 'cleacomms_cache_grid',
};

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T;
  fetchedAt: string;
}

/**
 * Get cached data from localStorage
 */
function getCache<T>(key: string): CacheEntry<T> | null {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Set cache data in localStorage
 */
function setCache<T>(key: string, data: T): void {
  try {
    const cacheEntry: CacheEntry<T> = {
      data,
      fetchedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(cacheEntry));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Calculate cache age in milliseconds
 */
function getCacheAge(fetchedAt: string | null): number | null {
  if (!fetchedAt) return null;
  const fetched = new Date(fetchedAt).getTime();
  return Date.now() - fetched;
}

/**
 * Determine fetch status based on cache age and config
 */
function determineStatus(
  isOnline: boolean,
  cacheAge: number | null,
  cacheTimeout: number,
  hasError: boolean
): FetchStatus {
  if (hasError) return 'error';
  if (!isOnline) return 'offline';
  if (cacheAge === null) return 'loading';
  if (cacheAge > cacheTimeout) return 'stale';
  return 'fresh';
}

/**
 * Generic fetch hook with caching and offline support
 */
function useContextFetch<T>(
  endpoint: string,
  cacheKey: string,
  config: ContextConfig = DEFAULT_CONTEXT_CONFIG
): {
  data: T | null;
  status: FetchStatus;
  fetchedAt: string | null;
  error: string | null;
  isFromCache: boolean;
  cacheAge: number | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<FetchStatus>('loading');
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Check if offline
    if (!navigator.onLine || config.offlineMode) {
      const cached = getCache<T>(cacheKey);
      if (cached) {
        setData(cached.data);
        setFetchedAt(cached.fetchedAt);
        setCacheAge(getCacheAge(cached.fetchedAt));
        setIsFromCache(true);
        setStatus('offline');
      } else {
        setStatus('offline');
        setError('No cached data available');
      }
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setError(null);

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
      setFetchedAt(new Date().toISOString());
      setCacheAge(0);
      setIsFromCache(false);
      setStatus('fresh');
      
      // Update cache
      setCache(cacheKey, result);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore abort errors
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);

      // Try to use cached data on error
      const cached = getCache<T>(cacheKey);
      if (cached) {
        setData(cached.data);
        setFetchedAt(cached.fetchedAt);
        setCacheAge(getCacheAge(cached.fetchedAt));
        setIsFromCache(true);
        setStatus('stale');
      } else {
        setStatus('error');
      }
    }
  }, [endpoint, cacheKey, config.offlineMode]);

  // Initial fetch and polling
  useEffect(() => {
    // Load cached data immediately
    const cached = getCache<T>(cacheKey);
    if (cached) {
      setData(cached.data);
      setFetchedAt(cached.fetchedAt);
      const age = getCacheAge(cached.fetchedAt);
      setCacheAge(age);
      setIsFromCache(true);
      setStatus(determineStatus(navigator.onLine, age, config.cacheTimeout, false));
    }

    // Fetch fresh data
    fetchData();

    // Set up polling
    const interval = setInterval(fetchData, config.pollInterval);

    // Update cache age periodically
    const ageInterval = setInterval(() => {
      if (fetchedAt) {
        setCacheAge(getCacheAge(fetchedAt));
      }
    }, 1000);

    // Listen for online/offline events
    const handleOnline = () => fetchData();
    const handleOffline = () => {
      const cached = getCache<T>(cacheKey);
      if (cached) {
        setData(cached.data);
        setFetchedAt(cached.fetchedAt);
        setCacheAge(getCacheAge(cached.fetchedAt));
        setIsFromCache(true);
      }
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      clearInterval(ageInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, cacheKey, config.cacheTimeout, config.pollInterval, fetchedAt]);

  return {
    data,
    status,
    fetchedAt,
    error,
    isFromCache,
    cacheAge,
    refetch: fetchData,
  };
}

/**
 * Hook for fetching solar data with caching
 * 
 * Provides solar flux index, A-index, and K-index
 * with automatic offline fallback to cached data
 */
export function useSolarData(
  config?: Partial<ContextConfig>
): CachedSolarData & { refetch: () => Promise<void> } {
  const result = useContextFetch<SolarData>('/context/solar', CACHE_KEYS.solar, {
    ...DEFAULT_CONTEXT_CONFIG,
    ...config,
  });

  return {
    data: result.data,
    status: result.status,
    fetchedAt: result.fetchedAt,
    error: result.error,
    isFromCache: result.isFromCache,
    cacheAge: result.cacheAge,
    refetch: result.refetch,
  };
}

/**
 * Hook for fetching grid location with caching
 * 
 * Provides Maidenhead grid square and coordinates
 * with automatic offline fallback to cached data
 */
export function useGridLocation(
  config?: Partial<ContextConfig>
): CachedGridLocation & { refetch: () => Promise<void> } {
  const result = useContextFetch<GridLocation>('/context/grid', CACHE_KEYS.grid, {
    ...DEFAULT_CONTEXT_CONFIG,
    ...config,
  });

  return {
    data: result.data,
    status: result.status,
    fetchedAt: result.fetchedAt,
    error: result.error,
    isFromCache: result.isFromCache,
    cacheAge: result.cacheAge,
    refetch: result.refetch,
  };
}

/**
 * Hook for mock solar data (development/testing)
 * 
 * Returns mock data without making API calls
 */
export function useMockSolarData(): CachedSolarData {
  const mockData: SolarData = {
    sfi: 72,
    a_index: 5,
    k_index: 2,
    source: 'NOAA SWPC',
    updated_at: new Date().toISOString(),
  };

  return {
    data: mockData,
    status: 'fresh',
    fetchedAt: new Date().toISOString(),
    error: null,
    isFromCache: false,
    cacheAge: 0,
  };
}

/**
 * Hook for mock grid location (development/testing)
 * 
 * Returns mock data without making API calls
 */
export function useMockGridLocation(): CachedGridLocation {
  // Example: FN31pr is roughly West Virginia, USA
  const mockData: GridLocation = {
    grid: 'FN31pr',
    latitude: 38.0,
    longitude: -81.0,
    grid6: 'FN31pr',
    grid4: 'FN31',
    field: 'FN',
  };

  return {
    data: mockData,
    status: 'fresh',
    fetchedAt: new Date().toISOString(),
    error: null,
    isFromCache: false,
    cacheAge: 0,
  };
}

/**
 * Get status indicator color based on fetch status
 */
export function getStatusColor(status: FetchStatus): string {
  switch (status) {
    case 'fresh':
      return 'var(--accent-success)';
    case 'stale':
      return 'var(--accent-warning)';
    case 'offline':
      return 'var(--text-muted)';
    case 'error':
      return 'var(--accent-danger)';
    case 'loading':
      return 'var(--text-secondary)';
    default:
      return 'var(--text-muted)';
  }
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: FetchStatus, isFromCache: boolean): string {
  if (isFromCache && status === 'offline') {
    return 'Offline (Cached)';
  }
  if (isFromCache && status === 'stale') {
    return 'Stale Data';
  }
  
  switch (status) {
    case 'fresh':
      return 'Live';
    case 'stale':
      return 'Stale';
    case 'offline':
      return 'Offline';
    case 'error':
      return 'Error';
    case 'loading':
      return 'Loading...';
    default:
      return 'Unknown';
  }
}

/**
 * Format cache age for display
 */
export function formatCacheAge(ageMs: number | null): string {
  if (ageMs === null) return '';
  
  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ago`;
  }
  if (minutes > 0) {
    return `${minutes}m ago`;
  }
  return `${seconds}s ago`;
}
