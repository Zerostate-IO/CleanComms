/**
 * Custom hooks for the Logs feature
 * 
 * Implements fast writes with optimistic UI updates
 * Local filtering and retention policy management
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  QSOEntry,
  QSOEntryRequest,
  LogEntriesResponse,
  LogFilter,
  RetentionPolicy,
  PendingLogEntry,
  ApiErrorResponse,
} from './types';

const API_BASE = '/api/v1';

// Local storage keys
const RETENTION_POLICY_KEY = 'cleancomms_retention_policy';

/**
 * Generate a unique pending ID
 */
function generatePendingId(): string {
  return `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null; status: number }> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      try {
        const errorData: ApiErrorResponse = await response.json();
        return {
          data: null,
          error: errorData.message || errorData.error || `HTTP ${response.status}`,
          status: response.status,
        };
      } catch {
        return {
          data: null,
          error: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        };
      }
    }

    const data = await response.json();
    return { data, error: null, status: response.status };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Network error',
      status: 0,
    };
  }
}

/**
 * Hook for fetching log entries with pagination
 */
export function useLogEntries(limit: number = 100, offset: number = 0) {
  const [entries, setEntries] = useState<QSOEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: err } = await apiFetch<LogEntriesResponse>(
      `${API_BASE}/log?limit=${limit}&offset=${offset}`
    );

    if (err) {
      setError(err);
    } else if (data) {
      setEntries(data.entries);
      setTotal(data.total);
    }
    setIsLoading(false);
  }, [limit, offset]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return { entries, total, isLoading, error, refetch: fetchEntries };
}

/**
 * Hook for creating log entries with optimistic UI updates
 */
export function useLogEntryCreate() {
  const [pendingEntries, setPendingEntries] = useState<PendingLogEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pendingQueueRef = useRef<PendingLogEntry[]>([]);

  // Process the queue of pending entries
  const processQueue = useCallback(async () => {
    if (pendingQueueRef.current.length === 0 || isSubmitting) return;

    const entry = pendingQueueRef.current[0];
    setIsSubmitting(true);

    const { error: err } = await apiFetch<{ success: boolean }>(
      `${API_BASE}/log`,
      {
        method: 'POST',
        body: JSON.stringify({
          callsign: entry.callsign,
          frequency_hz: entry.frequency_hz,
          mode: entry.mode,
          power_watts: entry.power_watts,
          notes: entry.notes,
          source: entry.source || 'web-ui',
        }),
      }
    );

    // Update the pending entry status
    setPendingEntries(prev =>
      prev.map(p =>
        p._pendingId === entry._pendingId
          ? { ...p, _status: err ? 'error' : 'success', _error: err || undefined }
          : p
      )
    );

    // Remove from queue after a delay (for visual feedback)
    setTimeout(() => {
      setPendingEntries(prev => prev.filter(p => p._pendingId !== entry._pendingId));
    }, err ? 3000 : 1000);

    pendingQueueRef.current.shift();
    setIsSubmitting(false);

    // Process next in queue
    if (pendingQueueRef.current.length > 0) {
      processQueue();
    }
  }, [isSubmitting]);

  // Add a new entry to the pending queue
  const createEntry = useCallback(async (request: QSOEntryRequest): Promise<boolean> => {
    const pendingEntry: PendingLogEntry = {
      ...request,
      _pendingId: generatePendingId(),
      _status: 'pending',
    };

    // Add to pending entries (optimistic update)
    setPendingEntries(prev => [pendingEntry, ...prev]);

    // Add to queue for processing
    pendingQueueRef.current.push(pendingEntry);

    // Trigger queue processing
    processQueue();

    return true;
  }, [processQueue]);

  // Add multiple entries at once
  const createEntries = useCallback(async (requests: QSOEntryRequest[]): Promise<boolean> => {
    const pendingEntriesList: PendingLogEntry[] = requests.map(request => ({
      ...request,
      _pendingId: generatePendingId(),
      _status: 'pending' as const,
    }));

    setPendingEntries(prev => [...pendingEntriesList, ...prev]);
    pendingQueueRef.current.push(...pendingEntriesList);
    processQueue();

    return true;
  }, [processQueue]);

  // Clear all pending entries
  const clearPending = useCallback(() => {
    setPendingEntries([]);
    pendingQueueRef.current = [];
  }, []);

  // Retry a failed entry
  const retryEntry = useCallback((pendingId: string) => {
    const entry = pendingEntries.find(p => p._pendingId === pendingId);
    if (entry && entry._status === 'error') {
      // Reset status and re-add to queue
      setPendingEntries(prev =>
        prev.map(p =>
          p._pendingId === pendingId
            ? { ...p, _status: 'pending', _error: undefined }
            : p
        )
      );
      pendingQueueRef.current.push({ ...entry, _status: 'pending' });
      processQueue();
    }
  }, [pendingEntries, processQueue]);

  return {
    pendingEntries,
    isSubmitting,
    createEntry,
    createEntries,
    clearPending,
    retryEntry,
  };
}

/**
 * Hook for filtering log entries locally
 */
export function useLogFilter(entries: QSOEntry[]) {
  const [filter, setFilter] = useState<LogFilter>({});
  const [filteredEntries, setFilteredEntries] = useState<QSOEntry[]>(entries);

  useEffect(() => {
    let result = [...entries];

    // Filter by callsign (partial match, case-insensitive)
    if (filter.callsign) {
      const search = filter.callsign.toUpperCase();
      result = result.filter(e => e.callsign.toUpperCase().includes(search));
    }

    // Filter by mode
    if (filter.mode) {
      result = result.filter(e => e.mode === filter.mode);
    }

    // Filter by date range
    if (filter.dateFrom) {
      const fromDate = new Date(filter.dateFrom);
      result = result.filter(e => new Date(e.timestamp) >= fromDate);
    }
    if (filter.dateTo) {
      const toDate = new Date(filter.dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(e => new Date(e.timestamp) <= toDate);
    }

    setFilteredEntries(result);
  }, [entries, filter]);

  const updateFilter = useCallback((newFilter: Partial<LogFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  const clearFilter = useCallback(() => {
    setFilter({});
  }, []);

  return { filter, filteredEntries, updateFilter, clearFilter };
}

/**
 * Hook for retention policy management (stored in localStorage)
 * Note: The actual purge is handled by the backend, this is just UI state
 */
export function useRetentionPolicy() {
  const [policy, setPolicy] = useState<RetentionPolicy>(() => {
    const stored = localStorage.getItem(RETENTION_POLICY_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Invalid JSON, use defaults
      }
    }
    return {
      retentionDays: 365,
      autoPurge: false,
    };
  });

  // Save to localStorage whenever policy changes
  useEffect(() => {
    localStorage.setItem(RETENTION_POLICY_KEY, JSON.stringify(policy));
  }, [policy]);

  const updatePolicy = useCallback((updates: Partial<RetentionPolicy>) => {
    setPolicy(prev => ({ ...prev, ...updates }));
  }, []);

  const setRetentionDays = useCallback((days: number) => {
    updatePolicy({ retentionDays: Math.max(1, Math.min(3650, days)) }); // 1 day to 10 years
  }, [updatePolicy]);

  const toggleAutoPurge = useCallback(() => {
    updatePolicy({ autoPurge: !policy.autoPurge });
  }, [policy.autoPurge, updatePolicy]);

  // Manual purge - calls API endpoint (if available)
  const manualPurge = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    // This would call a backend endpoint to trigger purge
    // For now, just update the last purged timestamp
    updatePolicy({ lastPurged: new Date().toISOString() });
    return { success: true };
  }, [updatePolicy]);

  return {
    policy,
    setRetentionDays,
    toggleAutoPurge,
    manualPurge,
  };
}

/**
 * Combined hook for full logs state management
 */
export function useLogsState() {
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);

  const { entries, total, isLoading, error, refetch } = useLogEntries(limit, offset);
  const createHook = useLogEntryCreate();
  const { filter, filteredEntries, updateFilter, clearFilter } = useLogFilter(entries);
  const retentionHook = useRetentionPolicy();

  // Combine pending entries with filtered entries for display
  const displayEntries = [...createHook.pendingEntries.map(p => ({
    id: -1,
    timestamp: new Date().toISOString(),
    callsign: p.callsign,
    frequency_hz: p.frequency_hz,
    mode: p.mode,
    power_watts: p.power_watts,
    notes: p.notes,
    source: p.source || 'web-ui',
    _pending: true as const,
    _pendingId: p._pendingId,
    _status: p._status,
    _error: p._error,
  })), ...filteredEntries];

  // Pagination helpers
  const hasNextPage = offset + limit < total;
  const hasPrevPage = offset > 0;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setOffset(prev => prev + limit);
    }
  }, [hasNextPage, limit]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) {
      setOffset(prev => Math.max(0, prev - limit));
    }
  }, [hasPrevPage, limit]);

  const goToPage = useCallback((page: number) => {
    const newOffset = (page - 1) * limit;
    if (newOffset >= 0 && newOffset < total) {
      setOffset(newOffset);
    }
  }, [limit, total]);

  // Refresh after creating entries
  const createEntryAndRefresh = useCallback(async (request: QSOEntryRequest): Promise<boolean> => {
    const result = await createHook.createEntry(request);
    // Refetch after a short delay to get the new entry from the server
    setTimeout(refetch, 1500);
    return result;
  }, [createHook, refetch]);

  return {
    // Entries
    entries: displayEntries,
    total,
    isLoading,
    error,
    refetch,
    
    // Filtering
    filter,
    updateFilter,
    clearFilter,
    
    // Creation
    ...createHook,
    createEntry: createEntryAndRefresh,
    
    // Retention
    ...retentionHook,
    
    // Pagination
    limit,
    offset,
    setLimit,
    hasNextPage,
    hasPrevPage,
    totalPages,
    currentPage,
    nextPage,
    prevPage,
    goToPage,
  };
}
