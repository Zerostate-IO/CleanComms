/**
 * IntentPage Component
 * 
 * Main page for Step 2 workflow: Intent + Operating Profile configuration.
 * Implements the explicit activation pattern - changes show "pending" badge
 * until Activate button is clicked.
 */

import '../../styles/Intent.css';

import { useIntentState, useProfiles, usePendingChanges } from './hooks';
import { IntentSelector } from './IntentSelector';
import { ModeFamilySelector } from './ModeFamilySelector';
import { ProfileManager } from './ProfileManager';
import type { IntentPageProps, OperatingProfile } from './types';

// Format frequency for display
function formatFrequency(hz: number): string {
  const mhz = hz / 1000000;
  return `${mhz.toFixed(3)} MHz`;
}

export function IntentPage({ initialState }: IntentPageProps) {
  // Use custom hooks for state management
  const {
    state,
    pending,
    setFocusedIntent,
    setFocusedModeFamily,
    setFocusedMode,
    setFocusedFrequency,
    loadProfile,
    activate,
  } = useIntentState(initialState);
  
  const { profiles, createProfile, deleteProfile } = useProfiles();
  
  // Calculate pending changes for display
  const pendingChanges = usePendingChanges(state.focused, state.active);
  
  // Handle profile load
  const handleLoadProfile = (profile: OperatingProfile) => {
    loadProfile(profile);
  };
  
  // Handle profile save
  const handleSaveProfile = (profileData: Omit<OperatingProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
    createProfile(profileData);
  };
  
  // Handle profile delete
  const handleDeleteProfile = (profileId: string) => {
    deleteProfile(profileId);
  };
  
  // Handle activate button click
  const handleActivate = () => {
    activate();
  };

  return (
    <div className="intent-page">
      {/* Header with status */}
      <div className="intent-page__header">
        <div className="intent-page__title-section">
          <h1 className="intent-page__title">Operating Configuration</h1>
          <p className="intent-page__subtitle">
            Set your intent and operating parameters
          </p>
        </div>
        
        {/* Active State Summary */}
        <div className="intent-page__active-summary">
          <div className="active-summary__label">Currently Active:</div>
          <div className="active-summary__values">
            <span className="active-value active-value--intent">
              {state.active.intent}
            </span>
            <span className="active-value active-value--mode">
              {state.active.mode}
            </span>
            <span className="active-value active-value--freq">
              {formatFrequency(state.active.frequency)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Pending Changes Alert */}
      {pendingChanges.hasChanges && (
        <div className="intent-page__pending-alert">
          <div className="pending-alert__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="pending-alert__content">
            <h4>Pending Changes ({pendingChanges.changeCount})</h4>
            <ul>
              {pendingChanges.changes.map((change, i) => (
                <li key={i}>{change}</li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            className="pending-alert__activate-btn"
            onClick={handleActivate}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Activate
          </button>
        </div>
      )}
      
      {/* Main Content Grid */}
      <div className="intent-page__content">
        {/* Left Column: Intent & Mode Selection */}
        <div className="intent-page__column intent-page__column--main">
          {/* Intent Selector */}
          <section className="intent-section">
            <IntentSelector
              value={state.focused.intent}
              pending={pending.intent !== undefined}
              onChange={setFocusedIntent}
            />
          </section>
          
          {/* Mode Family Selector */}
          <section className="intent-section">
            <ModeFamilySelector
              modeFamily={state.focused.modeFamily}
              mode={state.focused.mode}
              frequency={state.focused.frequency}
              onModeFamilyChange={setFocusedModeFamily}
              onModeChange={setFocusedMode}
              onFrequencyChange={setFocusedFrequency}
              pending={pending.modeFamily !== undefined || pending.mode !== undefined || pending.frequency !== undefined}
            />
          </section>
        </div>
        
        {/* Right Column: Profile Management */}
        <div className="intent-page__column intent-page__column--sidebar">
          <section className="intent-section intent-section--profiles">
            <ProfileManager
              profiles={profiles}
              currentConfig={{
                intent: state.focused.intent,
                modeFamily: state.focused.modeFamily,
                mode: state.focused.mode,
                frequency: state.focused.frequency,
              }}
              onLoadProfile={handleLoadProfile}
              onSaveProfile={handleSaveProfile}
              onDeleteProfile={handleDeleteProfile}
            />
          </section>
        </div>
      </div>
      
      {/* Footer with safety notice */}
      <div className="intent-page__footer">
        <div className="safety-notice">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>
            Changes remain <strong>pending</strong> until you click <strong>Activate</strong>. 
            This prevents accidental radio configuration changes.
          </span>
        </div>
      </div>
    </div>
  );
}

export default IntentPage;
