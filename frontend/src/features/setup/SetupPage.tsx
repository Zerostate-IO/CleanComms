/**
 * Setup Page Component
 * Guided wizard for radio configuration
 */

import { useState, useCallback, useMemo } from 'react';
import { RadioSelector } from './RadioSelector';
import { SerialConfig } from './SerialConfig';
import { AudioConfig } from './AudioConfig';
import {
  useRadioCatalog,
  useSetupProfile,
  useSetupSteps,
  useSerialPorts,
  useAudioDevices,
  useRadioCapabilities,
} from './hooks';
import type { 
  RadioCatalogEntry, 
  SetupStep, 
  ValidationErrors,
  SerialPortConfig,
  AudioDeviceConfig,
} from './types';
import '../../styles/Setup.css';

interface SetupPageProps {
  onComplete?: () => void;
}

// Step indicator component
function StepIndicator({ 
  steps, 
  currentStep 
}: { 
  steps: { id: SetupStep; label: string }[];
  currentStep: SetupStep;
}) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);
  
  return (
    <div className="step-indicator">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = index < currentIndex;
        
        return (
          <div 
            key={step.id} 
            className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
          >
            <div className="step-number">
              {isCompleted ? '✓' : index + 1}
            </div>
            <span className="step-label">{step.label}</span>
            {index < steps.length - 1 && <div className="step-connector" />}
          </div>
        );
      })}
    </div>
  );
}

// Review step component
function ReviewStep({
  profile,
  radio,
  capabilities,
  onBack,
  onComplete,
}: {
  profile: ReturnType<typeof useSetupProfile>['profile'];
  radio: RadioCatalogEntry | null;
  capabilities: ReturnType<typeof useRadioCapabilities>;
  onBack: () => void;
  onComplete: () => void;
}) {
  return (
    <div className="review-step">
      <div className="review-header">
        <h2>Review Configuration</h2>
        <p className="help-text">
          Review your settings before saving. You can go back to make changes.
        </p>
      </div>

      <div className="review-sections">
        {/* Radio Section */}
        <div className="review-section">
          <h3>Radio</h3>
          <div className="review-item">
            <span className="review-label">Model:</span>
            <span className="review-value">{profile.radioModel}</span>
          </div>
          <div className="review-item">
            <span className="review-label">Manufacturer:</span>
            <span className="review-value">{profile.radioManufacturer}</span>
          </div>
          <div className="review-item">
            <span className="review-label">Protocol:</span>
            <span className="review-value">{profile.protocolProfile}</span>
          </div>
          <div className="review-item">
            <span className="review-label">Support Tier:</span>
            <span className="review-value">
              {radio?.support_tier === 1 ? 'Primary (Full Support)' : 'Community (Best Effort)'}
            </span>
          </div>
        </div>

        {/* Serial Section */}
        <div className="review-section">
          <h3>Serial Port</h3>
          <div className="review-item">
            <span className="review-label">Port:</span>
            <span className="review-value">{profile.serialConfig.path || 'Not configured'}</span>
          </div>
          <div className="review-item">
            <span className="review-label">Baud Rate:</span>
            <span className="review-value">{profile.serialConfig.baudRate}</span>
          </div>
          <div className="review-item">
            <span className="review-label">Data/Stop/Parity:</span>
            <span className="review-value">
              {profile.serialConfig.dataBits}/{profile.serialConfig.stopBits}/{profile.serialConfig.parity}
            </span>
          </div>
        </div>

        {/* Audio & PTT Section */}
        <div className="review-section">
          <h3>Audio & PTT</h3>
          <div className="review-item">
            <span className="review-label">PTT Method:</span>
            <span className="review-value">{profile.pttMethod.toUpperCase()}</span>
          </div>
          {capabilities?.supportsUSBAudio && (
            <>
              <div className="review-item">
                <span className="review-label">Audio Input:</span>
                <span className="review-value">
                  {profile.audioConfig.inputDeviceId || 'Not configured'}
                </span>
              </div>
              <div className="review-item">
                <span className="review-label">Audio Output:</span>
                <span className="review-value">
                  {profile.audioConfig.outputDeviceId || 'Not configured'}
                </span>
              </div>
            </>
          )}
          {!capabilities?.supportsUSBAudio && (
            <div className="review-note">
              USB audio not supported by this radio
            </div>
          )}
        </div>
      </div>

      <div className="review-actions">
        <button type="button" className="btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button type="button" className="btn-primary" onClick={onComplete}>
          Save & Complete Setup
        </button>
      </div>
    </div>
  );
}

export function SetupPage({ onComplete }: SetupPageProps) {
  // Hooks
  const { catalog, loading: catalogLoading, error: catalogError } = useRadioCatalog();
  const { profile, saveProfile } = useSetupProfile();
  const { ports, loading: portsLoading, error: portsError, refreshPorts } = useSerialPorts();
  const { inputDevices, outputDevices, loading: devicesLoading, error: devicesError, refreshDevices } = useAudioDevices();
  
  // Local state for selected radio
  const [selectedRadio, setSelectedRadio] = useState<RadioCatalogEntry | null>(null);
  
  // Get capabilities for selected radio
  const capabilities = useRadioCapabilities(selectedRadio, profile.protocolProfile);
  
  // Setup steps
  const { currentStep, steps, validateStep, canProceed, goToNextStep, goToPreviousStep } = useSetupSteps(profile, selectedRadio);


  // Validation errors for current step
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Handle radio selection
  const handleRadioSelect = useCallback((radio: RadioCatalogEntry, profileName: string) => {
    setSelectedRadio(radio);
    saveProfile({
      radioModelCode: radio.identity.model_code,
      radioModel: radio.identity.model,
      radioManufacturer: radio.identity.manufacturer,
      protocolProfile: profileName,
    });
    setValidationErrors(prev => ({ ...prev, radioModelCode: undefined }));
  }, [saveProfile]);

  // Handle serial config change
  const handleSerialConfigChange = useCallback((config: SerialPortConfig) => {
    saveProfile({ serialConfig: config });
    setValidationErrors(prev => ({ 
      ...prev, 
      'serialConfig.path': undefined,
      'serialConfig.baudRate': undefined,
    }));
  }, [saveProfile]);

  // Handle audio config change
  const handleAudioConfigChange = useCallback((config: AudioDeviceConfig) => {
    saveProfile({ audioConfig: config });
    setValidationErrors(prev => ({ 
      ...prev, 
      'audioConfig.inputDeviceId': undefined,
      'audioConfig.outputDeviceId': undefined,
    }));
  }, [saveProfile]);

  // Handle PTT method change
  const handlePttMethodChange = useCallback((method: 'cat' | 'rts' | 'dtr' | 'hardware' | 'vox') => {
    saveProfile({ pttMethod: method });
    setValidationErrors(prev => ({ ...prev, pttMethod: undefined }));
  }, [saveProfile]);

  // Handle next step with validation
  const handleNextStep = useCallback(() => {
    const errors = validateStep(currentStep);
    setValidationErrors(errors);
    
    if (Object.keys(errors).length === 0) {
      goToNextStep();
    }
  }, [currentStep, validateStep, goToNextStep]);

  // Handle setup completion
  const handleComplete = useCallback(() => {
    const errors = validateStep('review');
    setValidationErrors(errors);
    
    if (Object.keys(errors).length === 0) {
      onComplete?.();
    }
  }, [validateStep, onComplete]);

  // Render current step content
  const renderStepContent = useMemo(() => {
    switch (currentStep) {
      case 'radio':
        return (
          <div className="setup-step-content">
            <RadioSelector
              catalog={catalog}
              selectedModelCode={profile.radioModelCode}
              onSelect={handleRadioSelect}
              loading={catalogLoading}
              error={catalogError}
            />
            {validationErrors.radioModelCode && (
              <div className="step-validation-error">
                {validationErrors.radioModelCode}
              </div>
            )}
          </div>
        );

      case 'serial':
        return (
          <div className="setup-step-content">
            <SerialConfig
              config={profile.serialConfig}
              onChange={handleSerialConfigChange}
              detectedPorts={ports}
              portsLoading={portsLoading}
              portsError={portsError}
              onRefreshPorts={refreshPorts}
              radio={selectedRadio}
              selectedProfile={profile.protocolProfile}
              validationError={validationErrors['serialConfig.path']}
            />
          </div>
        );

      case 'audio':
        return (
          <div className="setup-step-content">
            <AudioConfig
              config={profile.audioConfig}
              onConfigChange={handleAudioConfigChange}
              pttMethod={profile.pttMethod}
              onPttMethodChange={handlePttMethodChange}
              inputDevices={inputDevices}
              outputDevices={outputDevices}
              devicesLoading={devicesLoading}
              devicesError={devicesError}
              onRefreshDevices={refreshDevices}
              radio={selectedRadio}
              selectedProfile={profile.protocolProfile}
              validationErrors={{
                inputDeviceId: validationErrors['audioConfig.inputDeviceId'],
                outputDeviceId: validationErrors['audioConfig.outputDeviceId'],
              }}
            />
          </div>
        );

      case 'review':
        return (
          <ReviewStep
            profile={profile}
            radio={selectedRadio}
            capabilities={capabilities}
            onBack={goToPreviousStep}
            onComplete={handleComplete}
          />
        );

      default:
        return null;
    }
  }, [
    currentStep,
    catalog,
    catalogLoading,
    catalogError,
    profile,
    selectedRadio,
    capabilities,
    ports,
    portsLoading,
    portsError,
    refreshPorts,
    inputDevices,
    outputDevices,
    devicesLoading,
    devicesError,
    refreshDevices,
    validationErrors,
    handleRadioSelect,
    handleSerialConfigChange,
    handleAudioConfigChange,
    handlePttMethodChange,
    goToPreviousStep,
    handleComplete,
  ]);

  // Hide navigation on review step (has its own buttons)
  const showNavigation = currentStep !== 'review';

  return (
    <div className="setup-page">
      <div className="setup-container">
        <header className="setup-header">
          <h1>CleanComms Setup</h1>
          <p>Configure your radio for digital mode operation</p>
        </header>

        <StepIndicator steps={steps} currentStep={currentStep} />

        <main className="setup-content">
          {renderStepContent}
        </main>

        {showNavigation && (
          <footer className="setup-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={goToPreviousStep}
              disabled={currentStep === 'radio'}
            >
              ← Back
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleNextStep}
              disabled={!canProceed(currentStep)}
            >
              {currentStep === 'audio' ? 'Review →' : 'Next →'}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

export default SetupPage;
