import type { WorkspaceTab } from '../types';
import '../styles/WorkspaceContent.css';

interface WorkspaceContentProps {
  focusedTab?: WorkspaceTab;
  activeTab?: WorkspaceTab;
}

export function WorkspaceContent({ focusedTab, activeTab }: WorkspaceContentProps) {
  if (!focusedTab) {
    return (
      <div className="workspace-content workspace-content--empty">
        <p>No workspace selected</p>
      </div>
    );
  }

  const formatFrequency = (hz: number): string => {
    const mhz = hz / 1000000;
    return `${mhz.toFixed(3)} MHz`;
  };

  return (
    <div className="workspace-content">
      <div className="workspace-header">
        <div className="workspace-info">
          <h1 className="workspace-title">{focusedTab.label}</h1>
          <div className="workspace-meta">
            <span className="meta-item meta-item--mode">{focusedTab.mode}</span>
            <span className="meta-item meta-item--freq">
              {formatFrequency(focusedTab.frequency)}
            </span>
          </div>
        </div>
        
        {focusedTab.id !== activeTab?.id && (
          <div className="workspace-notice">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>
              Preview mode — Click <strong>Activate</strong> to control radio
            </span>
          </div>
        )}
        
        {focusedTab.id === activeTab?.id && (
          <div className="workspace-notice workspace-notice--active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>
              <strong>LIVE</strong> — This workspace is controlling the radio
            </span>
          </div>
        )}
      </div>
      
      <div className="workspace-grid">
        <div className="panel panel--radio">
          <div className="panel-header">
            <h2>Radio Status</h2>
            <span className="panel-status panel-status--connected">Connected</span>
          </div>
          <div className="panel-content">
            <div className="status-row">
              <span className="status-label">Frequency</span>
              <span className="status-value">{formatFrequency(focusedTab.frequency)}</span>
            </div>
            <div className="status-row">
              <span className="status-label">Mode</span>
              <span className="status-value">{focusedTab.mode}</span>
            </div>
            <div className="status-row">
              <span className="status-label">PTT</span>
              <span className="status-value status-value--rx">RX</span>
            </div>
          </div>
        </div>
        
        <div className="panel panel--modem">
          <div className="panel-header">
            <h2>Modem Status</h2>
            <span className="panel-status panel-status--connected">Connected</span>
          </div>
          <div className="panel-content">
            <div className="status-row">
              <span className="status-label">Mode</span>
              <span className="status-value">PSK31</span>
            </div>
            <div className="status-row">
              <span className="status-label">TX</span>
              <span className="status-value status-value--rx">Idle</span>
            </div>
          </div>
        </div>
        
        <div className="panel panel--waterfall">
          <div className="panel-header">
            <h2>Waterfall</h2>
          </div>
          <div className="panel-content panel-content--waterfall">
            <div className="waterfall-placeholder">
              <span>Waterfall display</span>
              <span className="waterfall-note">(coming soon)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
