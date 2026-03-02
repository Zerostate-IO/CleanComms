/**
 * ContactNotes - Notes editor with privacy controls
 * 
 * Features:
 * - Notes hidden by default (click to reveal)
 * - Add/edit/delete notes
 * - Sensitive content protection
 */
import { useState, useCallback } from 'react';
import type { ContactNote } from './types';
import '../../styles/Phonebook.css';

interface ContactNotesProps {
  notes: ContactNote[];
  onAddNote: (content: string) => void;
  onUpdateNote: (noteId: string, content: string) => void;
  onDeleteNote: (noteId: string) => void;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ContactNotes({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: ContactNotesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [revealedNotes, setRevealedNotes] = useState<Set<string>>(new Set());

  const handleStartAdd = useCallback(() => {
    setIsAdding(true);
    setContent('');
  }, []);

  const handleCancel = useCallback(() => {
    setIsAdding(false);
    setEditingId(null);
    setContent('');
  }, []);

  const handleSave = useCallback(() => {
    if (!content.trim()) return;
    
    if (editingId) {
      onUpdateNote(editingId, content.trim());
    } else {
      onAddNote(content.trim());
    }
    
    setIsAdding(false);
    setEditingId(null);
    setContent('');
  }, [content, editingId, onAddNote, onUpdateNote]);

  const handleStartEdit = useCallback((note: ContactNote) => {
    setEditingId(note.id);
    setContent(note.content);
    setIsAdding(false);
  }, []);

  const handleDelete = useCallback((noteId: string) => {
    if (confirm('Delete this note?')) {
      onDeleteNote(noteId);
    }
  }, [onDeleteNote]);

  const handleToggleReveal = useCallback((noteId: string) => {
    setRevealedNotes(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  }, []);

  return (
    <div className="contact-notes">
      {/* Existing notes */}
      {notes.length > 0 && (
        <div className="contact-notes__list">
          {notes.map(note => {
            const isRevealed = revealedNotes.has(note.id);
            const isEditing = editingId === note.id;

            return (
              <div key={note.id} className="contact-notes__item">
                {isEditing ? (
                  /* Edit mode */
                  <div className="contact-notes__edit">
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="contact-notes__textarea"
                      placeholder="Enter note content..."
                      rows={3}
                      autoFocus
                    />
                    <div className="contact-notes__edit-actions">
                      <button
                        className="contact-notes__btn contact-notes__btn--cancel"
                        onClick={handleCancel}
                      >
                        Cancel
                      </button>
                      <button
                        className="contact-notes__btn contact-notes__btn--save"
                        onClick={handleSave}
                        disabled={!content.trim()}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode with privacy */
                  <>
                    <div 
                      className={`contact-notes__content ${!isRevealed ? 'contact-notes__content--hidden' : ''}`}
                      onClick={() => !isRevealed && handleToggleReveal(note.id)}
                    >
                      {!isRevealed ? (
                        <div className="contact-notes__reveal">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                          <span>Click to reveal note</span>
                        </div>
                      ) : (
                        note.content
                      )}
                    </div>
                    
                    <div className="contact-notes__meta">
                      <span className="contact-notes__date">
                        {formatDate(note.updated_at)}
                      </span>
                      <div className="contact-notes__actions">
                        {isRevealed && (
                          <>
                            <button
                              className="contact-notes__action-btn"
                              onClick={() => handleToggleReveal(note.id)}
                              title="Hide note"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                              </svg>
                            </button>
                            <button
                              className="contact-notes__action-btn"
                              onClick={() => handleStartEdit(note)}
                              title="Edit note"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              className="contact-notes__action-btn contact-notes__action-btn--danger"
                              onClick={() => handleDelete(note.id)}
                              title="Delete note"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3,6 5,6 21,6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add new note */}
      {isAdding ? (
        <div className="contact-notes__add">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="contact-notes__textarea"
            placeholder="Enter note content..."
            rows={3}
            autoFocus
          />
          <div className="contact-notes__add-actions">
            <button
              className="contact-notes__btn contact-notes__btn--cancel"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              className="contact-notes__btn contact-notes__btn--save"
              onClick={handleSave}
              disabled={!content.trim()}
            >
              Add Note
            </button>
          </div>
        </div>
      ) : (
        !editingId && (
          <button className="contact-notes__add-btn" onClick={handleStartAdd}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Note
          </button>
        )
      )}

      {/* Empty state */}
      {notes.length === 0 && !isAdding && (
        <div className="contact-notes__empty">
          No notes yet. Add one to remember details about this contact.
        </div>
      )}
    </div>
  );
}
