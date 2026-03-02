/**
 * Phonebook Feature - Callsign lookup and contact management
 * 
 * Features:
 * - Callsign lookup with source attribution (HamQTH, FCC)
 * - Cache management with freshness indicators
 * - Private notes with reveal controls
 * - Profile-configurable lookup policies
 */

// Components
export { PhonebookPage } from './PhonebookPage';
export { CallsignSearch } from './CallsignSearch';
export { ContactCard } from './ContactCard';
export { ContactNotes } from './ContactNotes';

// Hooks
export {
  useCallsignLookup,
  useContactNotes,
  usePhonebookSettings,
  usePhonebook,
  getCacheFreshness,
  formatCacheAge,
} from './hooks';

// Types
export type {
  LookupResult,
  ContactNote,
  Contact,
  PhonebookSearchState,
  CacheEntry,
  CacheConfig,
  CacheFreshness,
  LookupSource,
  LicenseClass,
  LookupPolicy,
  PhonebookProfileSettings,
} from './types';

// Constants
export {
  DEFAULT_CACHE_CONFIG,
  DEFAULT_PHONEBOOK_SETTINGS,
} from './types';
