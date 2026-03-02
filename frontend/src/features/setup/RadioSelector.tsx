/**
 * Radio Selector Component
 * Displays radio catalog as selectable cards with capability badges
 */

import { useMemo } from 'react';
import type { RadioCatalogEntry, CATCapabilities } from './types';

interface RadioSelectorProps {
  catalog: RadioCatalogEntry[];
  selectedModelCode: string | null;
  onSelect: (radio: RadioCatalogEntry, profileName: string) => void;
  loading?: boolean;
  error?: string | null;
}

// Radio icon component
function RadioIcon({ modelCode }: { modelCode: string }) {
  // Different icons based on radio type
  const iconMap: Record<string, string> = {
    'tx-500': '📡',
    'tx-500mp': '📡',
    'x6100': '📻',
    'trusdx': '📻',
    'fx-4cr': '📻',
  };
  
  return (
    <div className="radio-card-icon">
      <span className="radio-icon-emoji">{iconMap[modelCode] || '📻'}</span>
    </div>
  );
}

// Capability badge component
function CapabilityBadge({ 
  label, 
  supported, 
  variant = 'default' 
}: { 
  label: string; 
  supported: boolean; 
  variant?: 'success' | 'warning' | 'default' 
}) {
  const className = `capability-badge ${supported ? 'supported' : 'unsupported'} ${variant}`;
  return (
    <span className={className} title={supported ? 'Supported' : 'Not supported'}>
      {supported ? '✓' : '✗'} {label}
    </span>
  );
}

// Support tier badge
function TierBadge({ tier }: { tier: 1 | 2 }) {
  return (
    <span className={`tier-badge tier-${tier}`}>
      {tier === 1 ? 'Primary' : 'Community'}
    </span>
  );
}

export function RadioSelector({ 
  catalog, 
  selectedModelCode, 
  onSelect, 
  loading, 
  error 
}: RadioSelectorProps) {
  // Sort catalog: Tier 1 first, then by manufacturer
  const sortedCatalog = useMemo(() => {
    return [...catalog].sort((a, b) => {
      if (a.support_tier !== b.support_tier) {
        return a.support_tier - b.support_tier;
      }
      return a.identity.manufacturer.localeCompare(b.identity.manufacturer);
    });
  }, [catalog]);

  // Get primary capabilities for display
  function getCapabilities(radio: RadioCatalogEntry) {
    const profileKey = radio.recommendations?.preferred_profile || 
      Object.keys(radio.protocol_profiles)[0];
    const profile = radio.protocol_profiles[profileKey];
    
    if (!profile) return null;

    return {
      cat: profile.cat,
      ptt: profile.ptt,
      audio: profile.audio,
      modes: getSupportedModes(profile.cat),
    };
  }

  function getSupportedModes(cat?: CATCapabilities): string[] {
    if (!cat) return [];
    const modes: string[] = [];
    if (cat.frequency_control) modes.push('VFO');
    if (cat.mode_control) modes.push('Mode');
    if (cat.vfo_control) modes.push('VFO-A/B');
    if (cat.split_control) modes.push('Split');
    return modes;
  }

  if (loading) {
    return (
      <div className="radio-selector loading">
        <div className="loading-spinner" />
        <p>Loading radio catalog...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="radio-selector error">
        <p className="error-message">⚠️ {error}</p>
      </div>
    );
  }

  if (catalog.length === 0) {
    return (
      <div className="radio-selector empty">
        <p>No radios found in catalog.</p>
      </div>
    );
  }

  return (
    <div className="radio-selector">
      <div className="radio-selector-header">
        <h2>Select Your Radio</h2>
        <p className="help-text">
          Choose your transceiver model. CleanComms will configure capabilities based on your selection.
        </p>
      </div>

      <div className="radio-catalog">
        {sortedCatalog.map((radio) => {
          const capabilities = getCapabilities(radio);
          const profileName = radio.recommendations?.preferred_profile || 
            Object.keys(radio.protocol_profiles)[0];
          const isSelected = selectedModelCode === radio.identity.model_code;
          
          return (
            <div
              key={radio.identity.model_code}
              className={`radio-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(radio, profileName)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(radio, profileName);
                }
              }}
              aria-pressed={isSelected}
            >
              <div className="radio-card-header">
                <RadioIcon modelCode={radio.identity.model_code} />
                <div className="radio-card-info">
                  <h3 className="radio-model">{radio.identity.model}</h3>
                  <p className="radio-manufacturer">{radio.identity.manufacturer}</p>
                </div>
                <TierBadge tier={radio.support_tier} />
              </div>

              {capabilities && (
                <div className="radio-card-capabilities">
                  <div className="capability-group">
                    <span className="capability-label">CAT Control</span>
                    <div className="capability-badges">
                      <CapabilityBadge 
                        label="Frequency" 
                        supported={!!capabilities.cat?.frequency_control} 
                      />
                      <CapabilityBadge 
                        label="Mode" 
                        supported={!!capabilities.cat?.mode_control} 
                      />
                      <CapabilityBadge 
                        label="Power" 
                        supported={!!capabilities.cat?.power_control} 
                      />
                    </div>
                  </div>

                  <div className="capability-group">
                    <span className="capability-label">PTT Methods</span>
                    <div className="capability-badges">
                      <CapabilityBadge 
                        label="CAT" 
                        supported={!!capabilities.ptt?.cat_ptt} 
                      />
                      <CapabilityBadge 
                        label="RTS" 
                        supported={!!capabilities.ptt?.rts_ptt} 
                      />
                      <CapabilityBadge 
                        label="VOX" 
                        supported={!!capabilities.ptt?.vox} 
                      />
                    </div>
                  </div>

                  <div className="capability-group">
                    <span className="capability-label">Audio</span>
                    <div className="capability-badges">
                      <CapabilityBadge 
                        label="USB Audio" 
                        supported={!!capabilities.audio?.usb_audio}
                        variant={capabilities.audio?.usb_audio ? 'success' : 'warning'}
                      />
                      <CapabilityBadge 
                        label="ACC Port" 
                        supported={!!capabilities.audio?.acc_port} 
                      />
                    </div>
                  </div>
                </div>
              )}

              {isSelected && (
                <div className="radio-card-selected-indicator">
                  <span>✓ Selected</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
