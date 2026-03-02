import { useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { TabStrip } from './components/TabStrip';
import { WorkspaceContent } from './components/WorkspaceContent';
import type { WorkspaceTab } from './types';
import './styles/App.css';

// Demo workspace tabs
const initialTabs: WorkspaceTab[] = [
  { id: 'ws-1', label: '20m Digital', mode: 'USB', frequency: 14074000, isActive: true },
  { id: 'ws-2', label: '40m CW', mode: 'CW', frequency: 7024000, isActive: false },
  { id: 'ws-3', label: '80m SSB', mode: 'LSB', frequency: 3750000, isActive: false },
];

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tabs, setTabs] = useState<WorkspaceTab[]>(initialTabs);
  const [focusedTabId, setFocusedTabId] = useState<string>('ws-1');
  const [activeTabId, setActiveTabId] = useState<string>('ws-1');

  const focusedTab = tabs.find(t => t.id === focusedTabId);
  const activeTab = tabs.find(t => t.id === activeTabId);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const handleTabFocus = useCallback((tabId: string) => {
    // Tab focus only changes UI highlight, NOT live radio state
    setFocusedTabId(tabId);
  }, []);

  const handleActivate = useCallback(() => {
    // Explicit activation - this is the ONLY way to change live radio state
    setTabs(prev => prev.map(tab => ({
      ...tab,
      isActive: tab.id === focusedTabId,
    })));
    setActiveTabId(focusedTabId);
  }, [focusedTabId]);

  return (
    <div className="app-shell">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={handleToggleSidebar}
      />
      
      <main className="main-content">
        <TabStrip
          tabs={tabs}
          focusedTabId={focusedTabId}
          activeTabId={activeTabId}
          onTabFocus={handleTabFocus}
          onActivate={handleActivate}
        />
        
        <WorkspaceContent 
          focusedTab={focusedTab}
          activeTab={activeTab}
        />
      </main>
    </div>
  );
}

export default App;
