# Task 7 Evidence: Operating Profile Create

## Scenario
Create operating profile for 20m PSK31 with notes/tags

## Test Steps
1. Navigate to Intent page
2. Select Digital mode family
3. Select PSK31 mode
4. Set frequency to 14.070 MHz (20m PSK31)
5. Click "Save Current" button
6. Enter profile name: "20m PSK31 Evening DX"
7. Add notes: "Good for evening DX contacts on 20m"
8. Add tags: "psk31, evening, dx, 20m"
9. Save profile
10. Verify profile appears in list
11. Expand profile to verify details

## Expected Result
- Profile appears in list with name "20m PSK31 Evening DX"
- Profile shows intent: listen, mode: PSK31, frequency: 14.070 MHz
- Notes and tags are visible when expanded

## Implementation Files
- `frontend/src/features/intent/ProfileManager.tsx` - Profile CRUD UI
- `frontend/src/features/intent/hooks.ts` - useProfiles hook with localStorage
- `frontend/tests/intent.spec.ts` - Test: "create operating profile with notes and tags"

## Test Code Location
File: `frontend/tests/intent.spec.ts`
Test: `test('create operating profile with notes and tags', ...)`

## Status
✅ Implemented - Tests written, awaiting integration with app navigation
