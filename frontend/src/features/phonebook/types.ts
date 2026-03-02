/**
 * Types for the Phonebook feature
 * 
 * Callsign lookup with notes and source attribution
 */

/** Data source for lookup results */
export type LookupSource = 'hamqth' | 'fcc' | 'qrz' | 'local';

/** Cache freshness status */
export type CacheFreshness = 'fresh' | 'stale' | 'expired' | 'unknown';

/** License class types */
export type LicenseClass = 'Extra' | 'Advanced' | 'General' | 'Technician' | 'Novice' | 'Unknown';

/**
 * Contact lookup result from API
 */
export interface LookupResult {
  callsign: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  grid?: string;
  license_class?: LicenseClass;
  source: LookupSource;
  cached_at?: string;  // ISO timestamp
  expires_at?: string; // ISO timestamp for cache expiration
}

/**
 * Contact note stored locally
 */
export interface ContactNote {
  id: string;
  callsign: string;
  content: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

/**
 * Full contact card with lookup + notes
 */
export interface Contact {
  lookup: LookupResult | null;
  notes: ContactNote[];
  lastAccessed?: string;
}

/**
 * Phonebook search state
 */
export interface PhonebookSearchState {
  query: string;
  isSearching: boolean;
  error: string | null;
  result: LookupResult | null;
}

/**
 * Cache entry for stored lookups
 */
export interface CacheEntry {
  callsign: string;
  result: LookupResult;
  cached_at: string;
  expires_at: string;
}

/**
 * Cache freshness configuration
 */
export interface CacheConfig {
  /** Time in hours before cache is considered stale */
  staleAfterHours: number;
  /** Time in hours before cache expires */
  expireAfterHours: number;
}

/** Default cache configuration */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  staleAfterHours: 24,
  expireAfterHours: 168, // 7 days
};

/**
 * Lookup policy for profile configuration
 */
export type LookupPolicy = 'always-fresh' | 'prefer-cache' | 'offline-only';

/**
 * Profile-specific phonebook settings
 */
export interface PhonebookProfileSettings {
  lookupPolicy: LookupPolicy;
  autoLookup: boolean;
  showNotesByDefault: boolean;
  cacheConfig: CacheConfig;
}

/** Default profile settings */
export const DEFAULT_PHONEBOOK_SETTINGS: PhonebookProfileSettings = {
  lookupPolicy: 'prefer-cache',
  autoLookup: true,
  showNotesByDefault: false,
  cacheConfig: DEFAULT_CACHE_CONFIG,
};
