import { TabStripProps } from '../types/components';
import { ActivateButton } from './ActivateButton';
import '../styles/TabStrip.css';

export function TabStrip({ 
  tabs, 
  focusedTabId, 
  activeTabId, 
  onTabFocus, 
  onActivate 
}: TabStripProps) {
  const needsActivation = focusedTabId !== activeTabId;

  return (
    <div className="tab-strip">
      <div className="tab-strip__tabs" role="tablist">
        {tabs.map((tab) => {
          const isFocused = tab.id === focusedTabId;
          const isActive = tab.id === activeTabId;
          
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isFocused}
              className={`tab ${isFocused ? 'tab--focused' : ''} ${isActive ? 'tab--active' : ''}`}
              onClick={() => onTabFocus(tab.id)}
            >
              <span className="tab__mode">{tab.mode}</span>
              <span className="tab__label">{tab.label}</span>
              {isActive && (
                <span className="tab__live-badge" aria-label="Currently controlling radio">
                  LIVE
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      <div className="tab-strip__actions">
        {needsActivation && (
          <ActivateButton onClick={onActivate} />
        )}
      </div>
    </div>
  );
}
