import type { WorkspaceTab } from './index';

export interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export interface TabStripProps {
  tabs: WorkspaceTab[];
  focusedTabId: string;
  activeTabId: string;
  onTabFocus: (tabId: string) => void;
  onActivate: () => void;
}

export interface ActivateButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export interface WorkspaceContentProps {
  focusedTab?: WorkspaceTab;
  activeTab?: WorkspaceTab;
}
