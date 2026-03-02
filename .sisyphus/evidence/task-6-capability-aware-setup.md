# Task 6: Capability-Aware Setup

## Scenario
Choose a radio with limited features and verify that unsupported controls are disabled with explanation text.

## Implementation Details

### Component: `AudioConfig.tsx`
The PTT method selection displays all available PTT methods but disables those not supported by the selected radio:

```tsx
const availablePttMethods = useMemo((): { method: PTTMethod; label: string; available: boolean }[] => {
  const ptt = capabilities?.ptt;
  
  return [
    { method: 'rts', label: 'RTS Serial Line', available: !!ptt?.rts_ptt },
    { method: 'cat', label: 'CAT Command', available: !!ptt?.cat_ptt },
    { method: 'dtr', label: 'DTR Serial Line', available: !!ptt?.dtr_ptt },
    { method: 'hardware', label: 'Hardware PTT', available: !!ptt?.hardware_ptt },
    { method: 'vox', label: 'VOX (Voice)', available: !!ptt?.vox },
  ];
}, [capabilities]);
```

### CSS Styling for Unavailable Options
```css
.ptt-method-option.unavailable {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--bg-tertiary);
}

.unavailable-note {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-style: italic;
}
```

### Radio Capabilities Hook
The `useRadioCapabilities` hook extracts capabilities from the radio catalog:

```tsx
export function useRadioCapabilities(
  radio: RadioCatalogEntry | null,
  profileName: string | null
) {
  return useMemo(() => {
    // ... extract capabilities from radio.protocol_profiles
    return {
      serial: protocolProfile.serial || null,
      cat: protocolProfile.cat || null,
      ptt: protocolProfile.ptt || null,
      audio: protocolProfile.audio || null,
      availablePTTMethods: {
        cat: !!protocolProfile.ptt?.cat_ptt,
        rts: !!protocolProfile.ptt?.rts_ptt,
        dtr: !!protocolProfile.ptt?.dtr_ptt,
        hardware: !!protocolProfile.ptt?.hardware_ptt,
        vox: !!protocolProfile.ptt?.vox,
      } as Record<PTTMethod, boolean>,
    };
  }, [radio, profileName]);
}
```

## Example: Xiegu X6100
The X6100 does not support DTR PTT (see `data/radios/catalog/x6100.json`):
```json
"ptt": {
  "cat_ptt": true,
  "rts_ptt": true,
  "dtr_ptt": false,  // NOT SUPPORTED
  ...
}
```

When this radio is selected, the DTR PTT option will be:
- Grayed out (opacity: 0.5)
- Disabled (input disabled={true})
- Show explanation text: "This radio does not support DTR Serial Line"

## Verification
Run Playwright tests:
```bash
npm --prefix frontend run test -- --grep "Capability-Aware"
```
