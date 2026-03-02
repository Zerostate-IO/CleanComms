# Stream Unavailable Fallback Evidence

**Task**: Task 9 - Add spectrum/waterfall foundation UI
**Scenario**: Stream unavailable fallback
**Tool**: Playwright
**Date**: 2026-03-02

## Test Steps

1. Navigate to application
2. Simulate missing stream adapter
3. Verify graceful empty-state panel with retry action

## Test Results

```
✓  tests/spectrum.spec.ts:226:3 › Stream Unavailable Fallback › shows error state when stream unavailable
✓  tests/spectrum.spec.ts:243:3 › Stream Unavailable Fallback › retry button appears in error state
✓  tests/spectrum.spec.ts:260:3 › Stream Unavailable Fallback › graceful degradation - no crash on missing stream
```

## Implementation Details

### Unavailable Stream Adapter Factory
```typescript
export function createUnavailableStreamAdapter(): SpectrumStreamAdapter {
  return {
    subscribe: () => () => {},
    isAvailable: () => false,
  };
}
```

### Error State UI Component
```tsx
{hasError && (
  <div className="spectrum-display__error">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
    <span>{errorMessage || 'Stream unavailable'}</span>
    <button
      className="spectrum-display__retry"
      onClick={() => streamAdapter?.start?.()}
    >
      Retry
    </button>
  </div>
)}
```

### Loading State UI
```tsx
{!hasError && !isConnected && (
  <div className="spectrum-display__loading">
    <div className="spectrum-display__spinner" />
    <span>Connecting...</span>
  </div>
)}
```

### Stream State Hook
```typescript
export function useSpectrumStream(
  adapter: SpectrumStreamAdapter | null | undefined
): SpectrumStreamState {
  const [state, setState] = useState<SpectrumStreamState>({
    isConnected: false,
    hasError: false,
    frameCount: 0,
  });
  
  useEffect(() => {
    if (!adapter) {
      setState({ isConnected: false, hasError: false, frameCount: 0 });
      return;
    }
    
    if (!adapter.isAvailable()) {
      setState({
        isConnected: false,
        hasError: true,
        errorMessage: 'Stream unavailable',
        frameCount: 0,
      });
      return;
    }
    // ... subscription logic
  }, [adapter]);
  
  return state;
}
```

## Graceful Degradation Guarantees

1. **No Crash**: Application continues to function when stream unavailable
2. **User Feedback**: Clear error message displayed
3. **Retry Action**: Button provided to attempt reconnection
4. **Non-Blocking**: UI remains responsive during error state
5. **App Context**: Rest of application (tabs, workspace) remains functional

## Status: PASSED
