/**
 * CallsignSearch - Search input for callsign lookup
 * 
 * Features:
 * - Callsign validation
 * - Search history
 * - Keyboard shortcuts
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { LookupResult } from './types';
import '../../styles/Phonebook.css';

interface CallsignSearchProps {
  onSearch: (callsign: string) => void;
  isLoading?: boolean;
  error?: string | null;
  result?: LookupResult | null;
}

// Recent searches stored in localStorage
const RECENT_KEY = 'cleancomms-phonebook-recent';
const MAX_RECENT = 10;

function loadRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(callsign: string): void {
  const recent = loadRecentSearches();
  const filtered = recent.filter(c => c.toUpperCase() !== callsign.toUpperCase());
  const updated = [callsign.toUpperCase(), ...filtered].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

// Basic callsign validation
function isValidCallsign(input: string): boolean {
  // Amateur radio callsign pattern
  const pattern = /^[A-Z]{1,2}[0-9][A-Z]{1,3}$/i;
  return pattern.test(input.trim());
}

export function CallsignSearch({ onSearch, isLoading, error, result }: CallsignSearchProps) {
  const [query, setQuery] = useState('');
  const [showRecent, setShowRecent] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecentSearches());
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Update recent searches when a result is found
  useEffect(() => {
    if (result && result.callsign) {
      saveRecentSearch(result.callsign);
      setRecentSearches(loadRecentSearches());
    }
  }, [result]);

  const handleSearch = useCallback((callsign: string) => {
    const trimmed = callsign.trim().toUpperCase();
    
    if (!trimmed) {
      setValidationError('Enter a callsign');
      return;
    }
    
    if (!isValidCallsign(trimmed)) {
      setValidationError('Invalid callsign format');
      return;
    }
    
    setValidationError(null);
    setShowRecent(false);
    onSearch(trimmed);
  }, [onSearch]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  }, [query, handleSearch]);

  const handleRecentClick = useCallback((callsign: string) => {
    setQuery(callsign);
    setShowRecent(false);
    handleSearch(callsign);
  }, [handleSearch]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setQuery(value);
    setValidationError(null);
  }, []);

  const handleFocus = useCallback(() => {
    if (recentSearches.length > 0) {
      setShowRecent(true);
    }
  }, [recentSearches]);

  const handleBlur = useCallback(() => {
    // Delay to allow clicking recent items
    setTimeout(() => setShowRecent(false), 200);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowRecent(false);
    }
  }, []);

  return (
    <div className="callsign-search">
      <form onSubmit={handleSubmit} className="callsign-search__form">
        <div className="callsign-search__input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Enter callsign (e.g., W1AW)"
            className={`callsign-search__input ${validationError ? 'callsign-search__input--error' : ''}`}
            disabled={isLoading}
            maxLength={8}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck="false"
          />
          <button
            type="submit"
            className="callsign-search__button"
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? (
              <span className="callsign-search__spinner" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            )}
          </button>
        </div>
      </form>

      {/* Validation error */}
      {validationError && (
        <div className="callsign-search__error">
          {validationError}
        </div>
      )}

      {/* API error */}
      {error && !validationError && (
        <div className="callsign-search__error">
          {error}
        </div>
      )}

      {/* Recent searches dropdown */}
      {showRecent && recentSearches.length > 0 && (
        <div className="callsign-search__recent">
          <div className="callsign-search__recent-header">Recent</div>
          {recentSearches.map(callsign => (
            <button
              key={callsign}
              className="callsign-search__recent-item"
              onClick={() => handleRecentClick(callsign)}
            >
              {callsign}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
