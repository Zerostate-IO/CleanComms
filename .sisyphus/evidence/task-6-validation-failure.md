# Task 6: Invalid Profile Rejection

## Scenario
Submit setup with missing required values and verify inline validation blocks progression with highlighted fields.

## Implementation Details

### Validation Hook
The `useSetupSteps` hook provides step-by-step validation:

```tsx
const validateStep = useCallback(
  (step: SetupStep): ValidationErrors => {
    const errors: ValidationErrors = {};

    switch (step) {
      case 'radio':
        if (!profile.radioModelCode) {
          errors.radioModelCode = 'Please select a radio model';
        }
        break;

      case 'serial':
        if (!profile.serialConfig.path) {
          errors['serialConfig.path'] = 'Serial port path is required';
        }
        if (!profile.serialConfig.baudRate) {
          errors['serialConfig.baudRate'] = 'Baud rate is required';
        }
        break;

      case 'audio':
        // Audio validation depends on radio capabilities
        if (selectedRadio && capabilities?.supportsUSBAudio) {
          if (!profile.audioConfig.inputDeviceId) {
            errors['audioConfig.inputDeviceId'] = 'Audio input device is required';
          }
          if (!profile.audioConfig.outputDeviceId) {
            errors['audioConfig.outputDeviceId'] = 'Audio output device is required';
          }
        }
        break;
    }

    return errors;
  },
  [profile, selectedRadio]
);
```

### Navigation Blocking
The "Next" button is disabled when validation fails:

```tsx
const canProceed = useCallback(
  (step: SetupStep): boolean => {
    const errors = validateStep(step);
    return Object.keys(errors).length === 0;
  },
  [validateStep]
);

// In render:
<button
  type="button"
  className="btn-primary"
  onClick={handleNextStep}
  disabled={!canProceed(currentStep)}
>
  Next →
</button>
```

### Error Display
Validation errors are displayed inline with CSS highlighting:

```tsx
{validationErrors.radioModelCode && (
  <div className="step-validation-error">
    {validationErrors.radioModelCode}
  </div>
)}
```

```css
.step-validation-error {
  margin-top: var(--space-lg);
  padding: var(--space-md);
  background: rgba(248, 81, 73, 0.1);
  border: 1px solid var(--accent-danger);
  border-radius: var(--radius-md);
  color: var(--accent-danger);
  font-weight: 500;
}

.config-field select.error,
.config-field input.error {
  border-color: var(--accent-danger);
}

.field-error {
  font-size: 0.75rem;
  color: var(--accent-danger);
  font-weight: 500;
}
```

## Required Fields Per Step

### Step 1: Radio Selection
- `radioModelCode` - Must select a radio from the catalog

### Step 2: Serial Port
- `serialConfig.path` - Serial port path is required
- `serialConfig.baudRate` - Baud rate must be selected

### Step 3: Audio (conditional)
- `audioConfig.inputDeviceId` - Required if radio supports USB audio
- `audioConfig.outputDeviceId` - Required if radio supports USB audio

### Step 4: Review
- All above fields validated before allowing completion

## Verification
Run Playwright tests:
```bash
npm --prefix frontend run test -- --grep "Setup Validation"
```
