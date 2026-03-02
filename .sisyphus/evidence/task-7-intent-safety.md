# Task 7 Evidence: Intent Safety

## Scenario
Intent change without activation - pending badge updates; live state unchanged until Activate

## Test Steps
1. Navigate to Intent page
2. Observe initial active state in summary (e.g., "listen")
3. Click Broadcast intent button
4. Verify pending badge appears on IntentSelector
5. Verify pending alert appears at top of page
6. Verify active summary still shows "listen" (unchanged)
7. Click Activate button
8. Verify pending alert disappears
9. Verify active summary now shows "broadcast"

## Expected Result
- Intent change shows "PENDING" badge
- Pending alert lists all pending changes
- Active state summary does NOT change until Activate is clicked
- After Activate, active state reflects focused state

## Implementation Pattern

### Explicit Activation Pattern (from Task 2)
```typescript
// Focused state = UI selection only
const [focused, setFocused] = useState(initialState);

// Active state = live radio control
const [active, setActive] = useState(initialState);

// Pending = difference between focused and active
const pending = useMemo(() => ({
  hasChanges: focused !== active,
  changes: getChangedFields(focused, active),
}), [focused, active]);

// Activate = move focused to active
const handleActivate = () => {
  setActive(focused);
};
```

## Implementation Files
- `frontend/src/features/intent/hooks.ts` - useIntentState, usePendingChanges
- `frontend/src/features/intent/IntentPage.tsx` - Pending alert with Activate button
- `frontend/tests/intent.spec.ts` - Test: "intent change shows pending badge but does not change live state"

## Test Code Location
File: `frontend/tests/intent.spec.ts`
Test suite: `test.describe('Intent Safety - Pending State', ...)`
Tests:
- `test('intent change shows pending badge but does not change live state', ...)`
- `test('mode change without activation shows pending state', ...)`
- `test('frequency change shows pending state with SSB mode recommendation', ...)`
- `test('multiple changes tracked in pending alert', ...)`

## Status
✅ Implemented - Tests written, awaiting integration with app navigation
