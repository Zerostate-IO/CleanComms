/**
 * PhonebookPage - Callsign phonebook and lookup enrichment
 * 
 * Features:
 * - Search by callsign
 * - Display lookup results with source attribution
 * - Show cache freshness
 * - Add/edit notes with privacy controls
 */
import { useState, useCallback, useEffect } from 'react';
import { CallsignSearch } from './CallsignSearch';
import { ContactCard } from './ContactCard';
import { useCallsignLookup, useContactNotes } from './hooks';
import type { LookupResult } from './types';
import '../../styles/Phonebook.css';

interface PhonebookPageProps {
  /** Initial callsign to look up */
  initialCallsign?: string;
}

export function PhonebookPage({ initialCallsign }: PhonebookPageProps) {
  const [currentCallsign, setCurrentCallsign] = useState<string>('');
  const [result, setResult] = useState<LookupResult | null>(null);
  
  const { lookup, isLoading, error, settings } = useCallsignLookup();
  const { 
    notes, 
    addNote, 
    updateNote, 
    deleteNote,
  } = useContactNotes(currentCallsign);

  // Initial lookup if callsign provided
  useEffect(() => {
    if (initialCallsign) {
      handleSearch(initialCallsign);
    }
  }, [initialCallsign]);

  const handleSearch = useCallback(async (callsign: string) => {
    setCurrentCallsign(callsign);
    const lookupResult = await lookup(callsign);
    setResult(lookupResult);
  }, [lookup]);

  const handleRefresh = useCallback(async () => {
    if (currentCallsign) {
      const lookupResult = await lookup(currentCallsign, true);
      setResult(lookupResult);
    }
  }, [currentCallsign, lookup]);

  const handleAddNote = useCallback((content: string) => {
    addNote(content);
  }, [addNote]);

  const handleUpdateNote = useCallback((noteId: string, content: string) => {
    updateNote(noteId, content);
  }, [updateNote]);

  const handleDeleteNote = useCallback((noteId: string) => {
    deleteNote(noteId);
  }, [deleteNote]);

  return (
    <div className="phonebook-page">
      {/* Header */}
      <div className="phonebook-page__header">
        <div className="phonebook-page__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          <h1>Callsign Phonebook</h1>
        </div>
        <div className="phonebook-page__policy">
          <span className="phonebook-page__policy-label">Lookup Policy:</span>
          <span className="phonebook-page__policy-value">
            {settings.lookupPolicy === 'always-fresh' && 'Always Fresh'}
            {settings.lookupPolicy === 'prefer-cache' && 'Prefer Cache'}
            {settings.lookupPolicy === 'offline-only' && 'Offline Only'}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="phonebook-page__search">
        <CallsignSearch
          onSearch={handleSearch}
          isLoading={isLoading}
          error={error}
          result={result}
        />
      </div>

      {/* Results */}
      <div className="phonebook-page__content">
        {result ? (
          <ContactCard
            result={result}
            notes={notes}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onRefresh={handleRefresh}
            isLoading={isLoading}
          />
        ) : (
          <div className="phonebook-page__empty">
            {isLoading ? (
              <div className="phonebook-page__loading">
                <div className="phonebook-page__loading-spinner" />
                <span>Looking up callsign...</span>
              </div>
            ) : currentCallsign && error ? (
              <div className="phonebook-page__error-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <h2>Lookup Failed</h2>
                <p>{error}</p>
              </div>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                <h2>Search for a Callsign</h2>
                <p>Enter an amateur radio callsign to look up operator information.</p>
                <div className="phonebook-page__examples">
                  <span>Examples:</span>
                  <button onClick={() => handleSearch('W1AW')}>W1AW</button>
                  <button onClick={() => handleSearch('K1ABC')}>K1ABC</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="phonebook-page__footer">
        <div className="phonebook-page__footer-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span>Data sourced from HamQTH and FCC databases</span>
        </div>
        <div className="phonebook-page__footer-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Notes stored locally and private by default</span>
        </div>
      </div>
    </div>
  );
}
