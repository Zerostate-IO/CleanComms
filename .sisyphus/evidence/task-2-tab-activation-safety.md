# Task 2 Evidence: Tab Activation Safety

**Date**: 2026-03-02
**Test Tool**: Playwright
**Test File**: `frontend/tests/shell.spec.ts`

## Scenario

> Tab focus vs activation safety: Create two tabs; select tab B without pressing Activate

## Steps Executed

1. Navigate to application root `/`
2. Verify first tab is both focused and active (has LIVE badge)
3. Click second tab (index 1)
4. Verify second tab gains focus class
5. Verify first tab still has active class and LIVE badge
6. Verify second tab does NOT have LIVE badge

## Expected Result

> UI focus changes, live-state badge remains on tab A

## Actual Result

✅ **PASS** - All assertions succeeded:

```
[chromium] › tests/shell.spec.ts:44:3 › Operator Workspace Shell › tab focus changes without activation

  ✓ First tab should be focused initially
  ✓ First tab should be active
  ✓ First tab should have LIVE badge
  ✓ Second tab should be focused after click
  ✓ First tab should still be active
  ✓ First tab still has LIVE badge visible
  ✓ Second tab does NOT have LIVE badge
```

## Code Reference

```tsx
// App.tsx - State separation
const [focusedTabId, setFocusedTabId] = useState<string>('ws-1');
const [activeTabId, setActiveTabId] = useState<string>('ws-1');

// Tab focus only changes UI highlight
const handleTabFocus = useCallback((tabId: string) => {
  setFocusedTabId(tabId);  // Does NOT change activeTabId
}, []);

// Explicit activation required to change live state
const handleActivate = useCallback(() => {
  setTabs(prev => prev.map(tab => ({
    ...tab,
    isActive: tab.id === focusedTabId,
  })));
  setActiveTabId(focusedTabId);  // Only here does active change
}, [focusedTabId]);
```

## Conclusion

The explicit activation pattern is working correctly. Selecting a tab only changes UI focus; the user must click "Activate" to apply changes to the live radio state.
