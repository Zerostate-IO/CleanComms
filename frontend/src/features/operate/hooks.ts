/**
 * Custom hooks for the Operate workflow API calls
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  RigStatus,
  HealthResponse,
  FrequencyRequest,
  ModeRequest,
  PTTRequest,
  PTTResponse,
  ApiErrorResponse,
  RadioMode,
  PTTState,
} from './types';

const API_BASE = '/api/v1';

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
      // Try to parse error response
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
 * Hook for fetching rig status
 */
export function useRigStatus(pollInterval: number = 1000) {
  const [status, setStatus] = useState<RigStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    const { data, error: err } = await apiFetch<RigStatus>(`${API_BASE}/rig/status`);
    if (err) {
      setError(err);
    } else if (data) {
      setStatus(data);
      setError(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, pollInterval);
    return () => clearInterval(interval);
  }, [fetchStatus, pollInterval]);

  return { status, isLoading, error, refetch: fetchStatus };
}

/**
 * Hook for fetching health status
 */
export function useHealthStatus(pollInterval: number = 2000) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    const { data, error: err } = await apiFetch<HealthResponse>('/health');
    if (err) {
      setError(err);
    } else if (data) {
      setHealth(data);
      setError(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, pollInterval);
    return () => clearInterval(interval);
  }, [fetchHealth, pollInterval]);

  // Check if TX is blocked
  const isTXBlocked = health?.status !== 'ok' || health?.coordinator !== 'ok';
  const blockedReason = getBlockedReason(health);

  return { health, isLoading, error, isTXBlocked, blockedReason, refetch: fetchHealth };
}

/**
 * Determine why TX is blocked
 */
function getBlockedReason(health: HealthResponse | null): string | null {
  if (!health) return 'Health status unknown';
  if (health.rigctld !== 'ok') return 'Rig control unavailable';
  if (health.fldigi !== 'ok') return 'Modem unavailable';
  if (health.coordinator !== 'ok') return 'Coordinator unhealthy';
  return null;
}

/**
 * Hook for setting frequency
 */
export function useSetFrequency() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setFrequency = useCallback(async (hz: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    const { data, error: err } = await apiFetch<{ frequency: number }>(
      `${API_BASE}/rig/frequency`,
      {
        method: 'POST',
        body: JSON.stringify({ hz } as FrequencyRequest),
      }
    );

    setIsLoading(false);

    if (err) {
      setError(err);
      return false;
    }

    return data !== null;
  }, []);

  return { setFrequency, isLoading, error };
}

/**
 * Hook for setting mode
 */
export function useSetMode() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setMode = useCallback(async (mode: RadioMode): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    const { data, error: err } = await apiFetch<{ mode: RadioMode }>(
      `${API_BASE}/rig/mode`,
      {
        method: 'POST',
        body: JSON.stringify({ mode } as ModeRequest),
      }
    );

    setIsLoading(false);

    if (err) {
      setError(err);
      return false;
    }

    return data !== null;
  }, []);

  return { setMode, isLoading, error };
}

/**
 * Hook for PTT control with safety checks
 */
export function usePTTControl() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentState, setCurrentState] = useState<PTTState>('rx');
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const setPTT = useCallback(async (state: PTTState): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setIsBlocked(false);
    setBlockedReason(null);

    const { data, error: err, status } = await apiFetch<PTTResponse>(
      `${API_BASE}/rig/ptt`,
      {
        method: 'POST',
        body: JSON.stringify({ state } as PTTRequest),
      }
    );

    setIsLoading(false);

    if (err) {
      // Check if blocked (503 Service Unavailable)
      if (status === 503) {
        setIsBlocked(true);
        setBlockedReason(err);
      }
      setError(err);
      return false;
    }

    if (data) {
      setCurrentState(data.state);
    }

    return true;
  }, []);

  const togglePTT = useCallback(async (): Promise<boolean> => {
    const newState: PTTState = currentState === 'rx' ? 'tx' : 'rx';
    return setPTT(newState);
  }, [currentState, setPTT]);

  return {
    currentState,
    setPTT,
    togglePTT,
    isLoading,
    error,
    isBlocked,
    blockedReason,
  };
}

/**
 * Hook for combined operate state management
 */
export function useOperateState() {
  const { status: rigStatus, isLoading: rigLoading, error: rigError, refetch: refetchRig } = useRigStatus();
  const { health, isLoading: healthLoading, error: healthError, isTXBlocked, blockedReason, refetch: refetchHealth } = useHealthStatus();
  const { setFrequency, isLoading: freqLoading, error: freqError } = useSetFrequency();
  const { setMode, isLoading: modeLoading, error: modeError } = useSetMode();
  const pttControl = usePTTControl();

  // Update PTT state from rig status
  useEffect(() => {
    if (rigStatus) {
      // Sync PTT state from rig status
    }
  }, [rigStatus]);

  const isLoading = rigLoading || healthLoading || freqLoading || modeLoading || pttControl.isLoading;
  const error = rigError || healthError || freqError || modeError || pttControl.error;

  return {
    rigStatus,
    health,
    isLoading,
    error,
    isTXBlocked,
    blockedReason,
    setFrequency,
    setMode,
    pttControl,
    refetch: () => {
      refetchRig();
      refetchHealth();
    },
  };
}

/**
 * Hook for keyboard shortcuts
 */
export function useKeyboardShortcuts(
  onPTTToggle: () => void,
  onFrequencyUp: () => void,
  onFrequencyDown: () => void,
  enabled: boolean = true
) {
  const pttActive = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Space bar for PTT (hold to transmit)
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        pttActive.current = true;
        onPTTToggle();
      }

      // Arrow keys for frequency
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        onFrequencyUp();
      }
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        onFrequencyDown();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Release PTT on space up
      if (e.code === 'Space' && pttActive.current) {
        e.preventDefault();
        pttActive.current = false;
        onPTTToggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, onPTTToggle, onFrequencyUp, onFrequencyDown]);
}
