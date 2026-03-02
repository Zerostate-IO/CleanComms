/**
 * ProfileManager Component
 * 
 * CRUD operations for operating profiles with localStorage persistence.
 * Allows saving, loading, and deleting operating configurations.
 */

import { useState, useCallback } from 'react';
import type { ProfileManagerProps, OperatingProfile } from './types';

// Format frequency for display
function formatFrequency(hz: number): string {
  const mhz = hz / 1000000;
  return `${mhz.toFixed(3)} MHz`;
}

// Format date for display
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ProfileManager({
  profiles,
  currentConfig,
  onLoadProfile,
  onSaveProfile,
  onDeleteProfile,
  disabled = false,
}: ProfileManagerProps) {
  // State for save dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveForm, setSaveForm] = useState({
    name: '',
    notes: '',
    tags: '',
  });
  
  // State for expanded profile
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);
  
  // Handle save form submission
  const handleSave = useCallback(() => {
    if (!saveForm.name.trim()) return;
    
    onSaveProfile({
      name: saveForm.name.trim(),
      intent: currentConfig.intent,
      modeFamily: currentConfig.modeFamily,
      mode: currentConfig.mode,
      frequency: currentConfig.frequency,
      notes: saveForm.notes.trim() || undefined,
      tags: saveForm.tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    
    // Reset form and close dialog
    setSaveForm({ name: '', notes: '', tags: '' });
    setShowSaveDialog(false);
  }, [saveForm, currentConfig, onSaveProfile]);
  
  // Handle load profile click
  const handleLoad = useCallback((profile: OperatingProfile) => {
    onLoadProfile(profile);
    setExpandedProfileId(null);
  }, [onLoadProfile]);
  
  // Handle delete with confirmation
  const handleDelete = useCallback((profileId: string, profileName: string) => {
    if (window.confirm(`Delete profile "${profileName}"? This cannot be undone.`)) {
      onDeleteProfile(profileId);
      if (expandedProfileId === profileId) {
        setExpandedProfileId(null);
      }
    }
  }, [onDeleteProfile, expandedProfileId]);

  return (
    <div className="profile-manager">
      <div className="profile-manager__header">
        <h3>Operating Profiles</h3>
        <button
          type="button"
          className="profile-save-btn"
          onClick={() => setShowSaveDialog(true)}
          disabled={disabled}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          Save Current
        </button>
      </div>
      
      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="profile-save-dialog">
          <div className="profile-save-dialog__content">
            <h4>Save Operating Profile</h4>
            
            <div className="profile-save-dialog__preview">
              <span className="preview-item">{currentConfig.intent}</span>
              <span className="preview-item">{currentConfig.mode}</span>
              <span className="preview-item">{formatFrequency(currentConfig.frequency)}</span>
            </div>
            
            <div className="profile-save-dialog__form">
              <label>
                <span>Profile Name *</span>
                <input
                  type="text"
                  value={saveForm.name}
                  onChange={(e) => setSaveForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., 20m FT8 Evening"
                  autoFocus
                />
              </label>
              
              <label>
                <span>Notes</span>
                <textarea
                  value={saveForm.notes}
                  onChange={(e) => setSaveForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes about this profile..."
                  rows={2}
                />
              </label>
              
              <label>
                <span>Tags (comma-separated)</span>
                <input
                  type="text"
                  value={saveForm.tags}
                  onChange={(e) => setSaveForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="e.g., ft8, evening, dx"
                />
              </label>
            </div>
            
            <div className="profile-save-dialog__actions">
              <button
                type="button"
                className="dialog-btn dialog-btn--cancel"
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveForm({ name: '', notes: '', tags: '' });
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dialog-btn dialog-btn--save"
                onClick={handleSave}
                disabled={!saveForm.name.trim()}
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Profile List */}
      <div className="profile-list">
        {profiles.length === 0 ? (
          <div className="profile-list__empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p>No saved profiles</p>
            <span>Save your current configuration for quick recall</span>
          </div>
        ) : (
          profiles.map((profile) => (
            <div
              key={profile.id}
              className={`profile-card ${expandedProfileId === profile.id ? 'profile-card--expanded' : ''}`}
            >
              <div
                className="profile-card__header"
                onClick={() => setExpandedProfileId(
                  expandedProfileId === profile.id ? null : profile.id
                )}
              >
                <div className="profile-card__info">
                  <span className="profile-card__name">{profile.name}</span>
                  <div className="profile-card__summary">
                    <span className="summary-badge summary-badge--intent">
                      {profile.intent}
                    </span>
                    <span className="summary-badge summary-badge--mode">
                      {profile.mode}
                    </span>
                    <span className="summary-badge summary-badge--freq">
                      {formatFrequency(profile.frequency)}
                    </span>
                  </div>
                </div>
                <svg 
                  className="profile-card__chevron" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              
              {expandedProfileId === profile.id && (
                <div className="profile-card__details">
                  {profile.notes && (
                    <div className="profile-detail">
                      <span className="profile-detail__label">Notes</span>
                      <span className="profile-detail__value">{profile.notes}</span>
                    </div>
                  )}
                  
                  {profile.tags && profile.tags.length > 0 && (
                    <div className="profile-detail">
                      <span className="profile-detail__label">Tags</span>
                      <div className="profile-tags">
                        {profile.tags.map((tag, i) => (
                          <span key={i} className="profile-tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="profile-detail">
                    <span className="profile-detail__label">Created</span>
                    <span className="profile-detail__value">{formatDate(profile.createdAt)}</span>
                  </div>
                  
                  <div className="profile-card__actions">
                    <button
                      type="button"
                      className="profile-action-btn profile-action-btn--load"
                      onClick={() => handleLoad(profile)}
                      disabled={disabled}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                      </svg>
                      Load Profile
                    </button>
                    <button
                      type="button"
                      className="profile-action-btn profile-action-btn--delete"
                      onClick={() => handleDelete(profile.id, profile.name)}
                      disabled={disabled}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
