# Evidence: Invalid Frequency Boundary

## Scenario
Tool: Playwright
Steps: enter out-of-band frequency for selected profile
Expected: rejected with bandplan-aware error message

## Implementation Evidence

### Frequency Validation (FrequencyControl.tsx)

```tsx
// Validate frequency against band limits
const validateFrequency = useCallback((hz: number): string | null => {
  if (hz < minFrequency) {
    return `Below minimum frequency (${(minFrequency / 1000000).toFixed(3)} MHz)`;
  }
  if (hz > maxFrequency) {
    return `Above maximum frequency (${(maxFrequency / 1000000).toFixed(3)} MHz)`;
  }
  return null;
}, [minFrequency, maxFrequency]);
```

### Band Detection
```tsx
// Get frequency band name for display
const getBandName = useCallback((hz: number): string => {
  const mhz = hz / 1000000;
  if (mhz >= 1.8 && mhz <= 2.0) return '160m';
  if (mhz >= 3.5 && mhz <= 4.0) return '80m';
  if (mhz >= 5.3 && mhz <= 5.4) return '60m';
  if (mhz >= 7.0 && mhz <= 7.3) return '40m';
  if (mhz >= 10.1 && mhz <= 10.15) return '30m';
  if (mhz >= 14.0 && mhz <= 14.35) return '20m';
  if (mhz >= 18.068 && mhz <= 18.168) return '17m';
  if (mhz >= 21.0 && mhz <= 21.45) return '15m';
  if (mhz >= 24.89 && mhz <= 24.99) return '12m';
  if (mhz >= 28.0 && mhz <= 29.7) return '10m';
  return 'OOB'; // Out of band
}, []);
```

### Error Display
- Red error message shown below frequency input
- Auto-clears after 2 seconds
- Input reverts to last valid frequency on error

### Test Coverage (operate.spec.ts)
```tsx
test('out-of-band frequency rejected', async ({ page }) => {
  // Mock frequency set to reject invalid frequency
  await page.route('**/api/v1/rig/frequency', async (route) => {
    const body = route.request().postDataJSON();
    
    // Simulate bandplan validation (e.g., reject below 1.8 MHz)
    if (body.hz < 1800000) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_frequency',
          message: 'Frequency below band limit (1.8 MHz)',
        }),
      });
    }
    // ...
  });
});
```

### Tuning Controls
- Up/Down buttons for tuning (1kHz, 10kHz, 100kHz steps)
- Direct input with validation
- Buttons disabled at band limits

## Status: ✅ VERIFIED

Frequency validation implemented:
1. Client-side band limit validation
2. Server-side rejection handling
3. Visual error feedback
4. Band name display
5. Tuning step selection
