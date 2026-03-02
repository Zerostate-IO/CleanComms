/**
 * QuickChannels - Quick frequency selection buttons
 * 
 * Pre-defined buttons for popular frequencies
 * One-click sets frequency and mode
 * Groups channels by band
 */
import { useState, useCallback, useMemo } from 'react';
import { COMMON_CHANNELS, type QuickChannel, type RadioMode } from './types';

interface QuickChannelsProps {
  currentFrequency: number;
  currentMode: RadioMode;
  onChannelSelect: (frequency: number, mode: RadioMode) => Promise<boolean>;
  disabled?: boolean;
  pttActive?: boolean;  // Block channel changes while transmitting
  channels?: QuickChannel[];  // Custom channel list, defaults to COMMON_CHANNELS
}

export function QuickChannels({
  currentFrequency,
  currentMode,
  onChannelSelect,
  disabled = false,
  pttActive = false,
  channels = COMMON_CHANNELS,
}: QuickChannelsProps) {
  const [isChanging, setIsChanging] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Group channels by band
  const channelsByBand = useMemo(() => {
    const groups: Record<string, QuickChannel[]> = {};
    
    for (const channel of channels) {
      if (!groups[channel.band]) {
        groups[channel.band] = [];
      }
      groups[channel.band].push(channel);
    }
    
    // Sort bands (lower frequency first)
    const bandOrder = ['80m', '60m', '40m', '30m', '20m', '17m', '15m', '12m', '10m'];
    const sortedGroups: Record<string, QuickChannel[]> = {};
    
    for (const band of bandOrder) {
      if (groups[band]) {
        sortedGroups[band] = groups[band].sort((a, b) => a.frequency - b.frequency);
      }
    }
    
    return sortedGroups;
  }, [channels]);

  // Check if a channel is currently active
  const isChannelActive = useCallback((channel: QuickChannel): boolean => {
    return channel.frequency === currentFrequency && channel.mode === currentMode;
  }, [currentFrequency, currentMode]);

  // Handle channel selection
  const handleChannelClick = useCallback(async (channel: QuickChannel) => {
    if (disabled || pttActive) return;
    if (isChannelActive(channel)) return;

    setIsChanging(channel.id);
    setError(null);

    const success = await onChannelSelect(channel.frequency, channel.mode);

    setIsChanging(null);

    if (!success) {
      setError(`Failed to tune to ${channel.label}`);
      setTimeout(() => setError(null), 2000);
    }
  }, [disabled, pttActive, isChannelActive, onChannelSelect]);

  // Get mode icon
  const getModeIcon = (mode: RadioMode): string => {
    switch (mode) {
      case 'USB':
      case 'LSB':
        return '🎙️';
      case 'CW':
        return '•—•';
      case 'RTTY':
      case 'PKT':
        return '📡';
      default:
        return '';
    }
  };

  // Get mode category class
  const getModeCategoryClass = (mode: RadioMode): string => {
    switch (mode) {
      case 'USB':
      case 'LSB':
        return 'quick-channel--voice';
      case 'CW':
        return 'quick-channel--cw';
      case 'RTTY':
      case 'PKT':
        return 'quick-channel--digital';
      default:
        return '';
    }
  };

  return (
    <div className="quick-channels">
      <div className="quick-channels__header">
        <label className="quick-channels__label">Quick Channels</label>
      </div>

      {error && (
        <div className="quick-channels__error" role="alert">
          {error}
        </div>
      )}

      {pttActive && (
        <div className="quick-channels__warning">
          Channel changes blocked while transmitting
        </div>
      )}

      <div className="quick-channels__bands">
        {Object.entries(channelsByBand).map(([band, bandChannels]) => (
          <div key={band} className="quick-channels__band">
            <span className="quick-channels__band-label">{band}</span>
            <div className="quick-channels__band-channels">
              {bandChannels.map((channel) => {
                const isActive = isChannelActive(channel);
                const isDisabled = disabled || pttActive;
                const isChangingThis = isChanging === channel.id;

                return (
                  <button
                    key={channel.id}
                    className={`quick-channel ${isActive ? 'quick-channel--active' : ''} ${getModeCategoryClass(channel.mode)} ${isChangingThis ? 'quick-channel--changing' : ''}`}
                    onClick={() => handleChannelClick(channel)}
                    disabled={isDisabled || isChangingThis}
                    title={`${channel.label}\n${channel.description}\nMode: ${channel.mode}`}
                    aria-pressed={isActive}
                  >
                    <span className="quick-channel__icon">{getModeIcon(channel.mode)}</span>
                    <span className="quick-channel__label">{channel.label}</span>
                    <span className="quick-channel__freq">{channel.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="quick-channels__legend">
        <span className="quick-channels__legend-item quick-channels__legend-item--voice">
          🎙️ Voice
        </span>
        <span className="quick-channels__legend-item quick-channels__legend-item--cw">
          •—• CW
        </span>
        <span className="quick-channels__legend-item quick-channels__legend-item--digital">
          📡 Digital
        </span>
      </div>
    </div>
  );
}
