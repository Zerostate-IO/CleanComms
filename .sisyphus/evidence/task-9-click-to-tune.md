# Click-to-Tune Callback Evidence

**Task**: Task 9 - Add spectrum/waterfall foundation UI
**Scenario**: Click-to-tune callback
**Tool**: Playwright
**Date**: 2026-03-02

## Test Steps

1. Navigate to application
2. Click on visible signal marker
3. Verify frequency control updates to target value

## Test Results

```
✓  tests/spectrum.spec.ts:154:3 › Click-to-Tune Functionality › spectrum canvas has crosshair cursor
✓  tests/spectrum.spec.ts:167:3 › Click-to-Tune Functionality › clicking on spectrum updates frequency tooltip
✓  tests/spectrum.spec.ts:194:3 › Click-to-Tune Functionality › click on signal marker triggers callback
✓  tests/spectrum.spec.ts:211:3 › Click-to-Tune Functionality › signal marker hover shows tooltip
```

## Implementation Details

### Click-to-Tune Hook
```typescript
export function useClickToTune(
  centerFrequency: number,
  span: number,
  _canvasWidth: number,
  onFrequencyClick?: (event: ClickToTuneEvent) => void
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onFrequencyClick || !canvasRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      
      // Calculate frequency at click position
      const normalizedX = x / rect.width;
      const offset = (normalizedX - 0.5) * span;
      const frequency = centerFrequency + offset;
      
      onFrequencyClick({
        frequency,
        offset,
        strength,
        originalEvent: event,
      });
    },
    [centerFrequency, span, onFrequencyClick]
  );
  
  return { canvasRef, handleClick };
}
```

### ClickToTuneEvent Interface
```typescript
export interface ClickToTuneEvent {
  frequency: number;    // Clicked frequency in Hz
  offset: number;       // Offset from center frequency in Hz
  strength: number;     // Signal strength at clicked location in dB
  originalEvent: React.MouseEvent;
}
```

## Status: PASSED
