/**
 * ContactCard - Display contact information with source attribution
 * 
 * Features:
 * - Source badge (HamQTH, FCC, etc.)
 * - Cache freshness indicator
 * - Grid locator display
 * - License class badge
 */
import { useState, useCallback } from 'react';
import type { LookupResult, ContactNote, CacheFreshness } from './types';
import { getCacheFreshness, formatCacheAge } from './hooks';
import { ContactNotes } from './ContactNotes';
import '../../styles/Phonebook.css';

interface ContactCardProps {
  result: LookupResult;
  notes: ContactNote[];
  onAddNote: (content: string) => void;
  onUpdateNote: (noteId: string, content: string) => void;
  onDeleteNote: (noteId: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

// Source display configuration
const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  hamqth: { label: 'HamQTH', color: 'blue' },
  fcc: { label: 'FCC', color: 'purple' },
  qrz: { label: 'QRZ', color: 'orange' },
  local: { label: 'Local', color: 'gray' },
};

// Cache freshness display
const FRESHNESS_CONFIG: Record<CacheFreshness, { label: string; color: string }> = {
  fresh: { label: 'Fresh', color: 'green' },
  stale: { label: 'Stale', color: 'yellow' },
  expired: { label: 'Expired', color: 'red' },
  unknown: { label: 'Unknown', color: 'gray' },
};

// License class colors
const LICENSE_COLORS: Record<string, string> = {
  Extra: 'gold',
  Advanced: 'silver',
  General: 'blue',
  Technician: 'green',
  Novice: 'gray',
  Unknown: 'gray',
};

export function ContactCard({
  result,
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onRefresh,
  isLoading,
}: ContactCardProps) {
  const [showNotes, setShowNotes] = useState(false);

  const sourceConfig = SOURCE_CONFIG[result.source] || SOURCE_CONFIG.local;
  const freshness = getCacheFreshness(result.cached_at);
  const freshnessConfig = FRESHNESS_CONFIG[freshness];

  const handleToggleNotes = useCallback(() => {
    setShowNotes(prev => !prev);
  }, []);

  const formatLocation = (): string => {
    const parts: string[] = [];
    if (result.city) parts.push(result.city);
    if (result.state) parts.push(result.state);
    if (result.country && result.country !== 'USA') parts.push(result.country);
    return parts.join(', ') || 'Location unknown';
  };

  const formatGrid = (): string | null => {
    if (!result.grid) return null;
    return result.grid.toUpperCase();
  };

  return (
    <div className="contact-card">
      {/* Header with callsign and source */}
      <div className="contact-card__header">
        <div className="contact-card__callsign">
          {result.callsign}
        </div>
        <div className="contact-card__badges">
          {/* Source badge */}
          <span className={`contact-card__badge contact-card__badge--${sourceConfig.color}`}>
            {sourceConfig.label}
          </span>
          
          {/* License class badge */}
          {result.license_class && (
            <span 
              className={`contact-card__badge contact-card__badge--${LICENSE_COLORS[result.license_class] || 'gray'}`}
            >
              {result.license_class}
            </span>
          )}
        </div>
      </div>

      {/* Cache freshness bar */}
      <div className={`contact-card__freshness contact-card__freshness--${freshnessConfig.color}`}>
        <span className="contact-card__freshness-indicator" />
        <span className="contact-card__freshness-text">
          Cached: {formatCacheAge(result.cached_at)}
        </span>
        {freshness !== 'fresh' && onRefresh && (
          <button
            className="contact-card__refresh-btn"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh from source"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </button>
        )}
      </div>

      {/* Contact details */}
      <div className="contact-card__details">
        <div className="contact-card__name">
          {result.name || 'Name not available'}
        </div>
        
        <div className="contact-card__location">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{formatLocation()}</span>
        </div>

        {formatGrid() && (
          <div className="contact-card__grid">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M3 15h18" />
              <path d="M9 3v18" />
              <path d="M15 3v18" />
            </svg>
            <span>Grid: {formatGrid()}</span>
          </div>
        )}
      </div>

      {/* Notes section */}
      <div className="contact-card__notes-section">
        <button
          className="contact-card__notes-toggle"
          onClick={handleToggleNotes}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14,2 14,8 20,8" />
          </svg>
          <span>Notes ({notes.length})</span>
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            className={`contact-card__notes-chevron ${showNotes ? 'contact-card__notes-chevron--open' : ''}`}
          >
            <polyline points="6,9 12,15 18,9" />
          </svg>
        </button>

        {showNotes && (
          <ContactNotes
            notes={notes}
            onAddNote={onAddNote}
            onUpdateNote={onUpdateNote}
            onDeleteNote={onDeleteNote}
          />
        )}
      </div>
    </div>
  );
}
