/**
 * Custom hooks for the Phonebook feature
 * 
 * Handles callsign lookup API, caching, and notes storage
 */
import { useState, useCallback, useEffect } from 'react';
import type {
  LookupResult,
  ContactNote,
  CacheEntry,
  CacheFreshness,
  CacheConfig,
  PhonebookProfileSettings,
} from './types';
import { DEFAULT_CACHE_CONFIG, DEFAULT_PHONEBOOK_SETTINGS } from './types';

const API_BASE = '/api/v1';

// LocalStorage keys
const NOTES_KEY = 'cleancomms-phonebook-notes';
const CACHE_KEY = 'cleancomms-phonebook-cache';
const SETTINGS_KEY = 'cleancomms-phonebook-settings';

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
        const errorData = await response.json();
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
 * Calculate cache freshness
 */
export function getCacheFreshness(
  cachedAt: string | undefined,
  config: CacheConfig = DEFAULT_CACHE_CONFIG
): CacheFreshness {
  if (!cachedAt) return 'unknown';
  
  const cachedTime = new Date(cachedAt).getTime();
  const now = Date.now();
  const ageHours = (now - cachedTime) / (1000 * 60 * 60);
  
  if (ageHours < config.staleAfterHours) return 'fresh';
  if (ageHours < config.expireAfterHours) return 'stale';
  return 'expired';
}

/**
 * Format cache age for display
 */
export function formatCacheAge(cachedAt: string | undefined): string {
  if (!cachedAt) return 'Unknown';
  
  const cachedTime = new Date(cachedAt).getTime();
  const now = Date.now();
  const ageMs = now - cachedTime;
  
  const minutes = Math.floor(ageMs / (1000 * 60));
  const hours = Math.floor(ageMs / (1000 * 60 * 60));
  const days = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  
  if (days > 0) return `${days}d ${hours % 24}h ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

/**
 * Load notes from localStorage
 */
function loadNotes(): ContactNote[] {
  try {
    const stored = localStorage.getItem(NOTES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save notes to localStorage
 */
function saveNotes(notes: ContactNote[]): void {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

/**
 * Load cache from localStorage
 */
function loadCache(): Map<string, CacheEntry> {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) return new Map();
    const entries = JSON.parse(stored) as CacheEntry[];
    return new Map(entries.map(e => [e.callsign.toUpperCase(), e]));
  } catch {
    return new Map();
  }
}

/**
 * Save cache to localStorage
 */
function saveCache(cache: Map<string, CacheEntry>): void {
  const entries = Array.from(cache.values());
  localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
}

/**
 * Load settings from localStorage
 */
function loadSettings(): PhonebookProfileSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...DEFAULT_PHONEBOOK_SETTINGS, ...JSON.parse(stored) } : DEFAULT_PHONEBOOK_SETTINGS;
  } catch {
    return DEFAULT_PHONEBOOK_SETTINGS;
  }
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: PhonebookProfileSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Hook for callsign lookup with caching
 */
export function useCallsignLookup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<Map<string, CacheEntry>>(() => loadCache());
  const [settings] = useState<PhonebookProfileSettings>(() => loadSettings());

  // Persist cache on changes
  useEffect(() => {
    saveCache(cache);
  }, [cache]);

  const lookup = useCallback(async (callsign: string, forceFresh = false): Promise<LookupResult | null> => {
    const normalizedCallsign = callsign.toUpperCase().trim();
    
    // Check cache first unless forcing fresh lookup
    if (!forceFresh && settings.lookupPolicy !== 'always-fresh') {
      const cached = cache.get(normalizedCallsign);
      if (cached) {
        const freshness = getCacheFreshness(cached.cached_at, settings.cacheConfig);
        if (freshness !== 'expired') {
          return cached.result;
        }
      }
    }

    // If offline-only, return cached or null
    if (settings.lookupPolicy === 'offline-only') {
      const cached = cache.get(normalizedCallsign);
      return cached?.result ?? null;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: err } = await apiFetch<LookupResult>(
      `${API_BASE}/lookup/${encodeURIComponent(normalizedCallsign)}`
    );

    setIsLoading(false);

    if (err) {
      setError(err);
      return null;
    }

    if (data) {
      // Update cache
      const now = new Date();
      const expiresAt = new Date(now.getTime() + settings.cacheConfig.expireAfterHours * 60 * 60 * 1000);
      
      const entry: CacheEntry = {
        callsign: normalizedCallsign,
        result: { ...data, cached_at: now.toISOString(), expires_at: expiresAt.toISOString() },
        cached_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      };
      
      setCache(prev => new Map(prev).set(normalizedCallsign, entry));
    }

    return data;
  }, [cache, settings]);

  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  const removeFromCache = useCallback((callsign: string) => {
    setCache(prev => {
      const next = new Map(prev);
      next.delete(callsign.toUpperCase());
      return next;
    });
  }, []);

  return {
    lookup,
    isLoading,
    error,
    cache,
    clearCache,
    removeFromCache,
    settings,
  };
}

/**
 * Hook for contact notes management
 */
export function useContactNotes(callsign: string) {
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  // Load notes on mount and when callsign changes
  useEffect(() => {
    const allNotes = loadNotes();
    const contactNotes = allNotes.filter(n => n.callsign.toUpperCase() === callsign.toUpperCase());
    setNotes(contactNotes);
  }, [callsign]);

  const addNote = useCallback((content: string, tags?: string[]) => {
    const allNotes = loadNotes();
    const newNote: ContactNote = {
      id: `note-${Date.now()}`,
      callsign: callsign.toUpperCase(),
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags,
    };
    
    const updated = [...allNotes, newNote];
    saveNotes(updated);
    setNotes(updated.filter(n => n.callsign.toUpperCase() === callsign.toUpperCase()));
    return newNote;
  }, [callsign]);

  const updateNote = useCallback((noteId: string, content: string, tags?: string[]) => {
    const allNotes = loadNotes();
    const updated = allNotes.map(n => 
      n.id === noteId 
        ? { ...n, content, tags, updated_at: new Date().toISOString() }
        : n
    );
    saveNotes(updated);
    setNotes(updated.filter(n => n.callsign.toUpperCase() === callsign.toUpperCase()));
  }, [callsign]);

  const deleteNote = useCallback((noteId: string) => {
    const allNotes = loadNotes();
    const updated = allNotes.filter(n => n.id !== noteId);
    saveNotes(updated);
    setNotes(updated.filter(n => n.callsign.toUpperCase() === callsign.toUpperCase()));
  }, [callsign]);

  const startEditing = useCallback((noteId?: string) => {
    if (noteId) {
      const note = notes.find(n => n.id === noteId);
      if (note) {
        setEditContent(note.content);
      }
    } else {
      setEditContent('');
    }
    setIsEditing(true);
  }, [notes]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditContent('');
  }, []);

  const saveEdit = useCallback((noteId?: string) => {
    if (!editContent.trim()) return;
    
    if (noteId) {
      updateNote(noteId, editContent.trim());
    } else {
      addNote(editContent.trim());
    }
    
    setIsEditing(false);
    setEditContent('');
  }, [editContent, updateNote, addNote]);

  return {
    notes,
    isEditing,
    editContent,
    setEditContent,
    addNote,
    updateNote,
    deleteNote,
    startEditing,
    cancelEditing,
    saveEdit,
  };
}

/**
 * Hook for phonebook profile settings
 */
export function usePhonebookSettings() {
  const [settings, setSettingsState] = useState<PhonebookProfileSettings>(() => loadSettings());

  const updateSettings = useCallback((updates: Partial<PhonebookProfileSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...updates };
      saveSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULT_PHONEBOOK_SETTINGS);
    saveSettings(DEFAULT_PHONEBOOK_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}

/**
 * Combined hook for phonebook state
 */
export function usePhonebook() {
  const lookup = useCallsignLookup();
  const settings = usePhonebookSettings();

  return {
    ...lookup,
    ...settings,
  };
}
