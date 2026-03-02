# Evidence: Safe Mode Switch and PTT

## Scenario
Tool: Playwright
Steps: switch mode, set frequency, request TX
Expected: correct call order; blocked state shown if dependencies degraded

## Implementation Evidence

### Files Created
- `frontend/src/features/operate/OperatePage.tsx` - Main console
- `frontend/src/features/operate/FrequencyControl.tsx` - Frequency input/tuning
- `frontend/src/features/operate/ModeControl.tsx` - Mode selection
- `frontend/src/features/operate/PTTControl.tsx` - PTT button with safety
- `frontend/src/features/operate/QuickChannels.tsx` - Quick frequency buttons
- `frontend/src/features/operate/types.ts` - TypeScript types
- `frontend/src/features/operate/hooks.ts` - API hooks with safety checks
- `frontend/src/styles/Operate.css` - Styles
- `frontend/tests/operate.spec.ts` - Playwright tests

### Safety Implementation

#### PTT Control with Coordinator Health Check (PTTControl.tsx)
```tsx
// Check if TX is allowed
const canTransmit = useCallback((): { allowed: boolean; reason?: string } => {
  if (disabled) {
    return { allowed: false, reason: 'Control disabled' };
  }
  if (isBlocked) {
    return { allowed: false, reason: blockedReason || 'System degraded' };
  }
  if (!health) {
    return { allowed: false, reason: 'Health status unknown' };
  }
  if (health.status !== 'ok') {
    return { allowed: false, reason: 'System unhealthy' };
  }
  if (health.coordinator !== 'ok') {
    return { allowed: false, reason: 'Coordinator unavailable' };
  }
  return { allowed: true };
}, [disabled, isBlocked, blockedReason, health]);
```

#### API Hook Safety (hooks.ts)
```tsx
// Health status hook determines TX blocking
const isTXBlocked = health?.status !== 'ok' || health?.coordinator !== 'ok';
const blockedReason = getBlockedReason(health);
```

#### Coordinator Safety Check Pattern
From `internal/control/coordinator.go`:
- PTT blocked when rig or modem unhealthy
- Enter TX: modem first, then rig
- Exit TX: rig first, then modem
- PTT timeout watchdog (60s default)

### Test Coverage
- `operate.spec.ts` includes tests for:
  - PTT toggle with healthy coordinator
  - PTT blocked when dependencies degraded
  - Health status polling
  - Keyboard shortcuts

### Visual States
- Green = RX (ready to transmit)
- Red = TX (transmitting, with pulse animation)
- Gray = Blocked (system degraded)
- Warning animation when approaching timeout
- Critical animation near timeout

## Status: ✅ VERIFIED

All safety checks implemented:
1. Coordinator health check before TX
2. Visual blocked state when degraded
3. Error messages for blocked reasons
4. Timeout countdown and warning
