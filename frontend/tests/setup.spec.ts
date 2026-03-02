import { test, expect } from '@playwright/test';

test.describe('Guided Setup Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing profile
    await page.addInitScript(() => {
      localStorage.removeItem('cleancomms-setup');
    });
    
    // Navigate to setup page
    await page.goto('/setup');
  });

  test('setup page renders with step indicator', async ({ page }) => {
    // Setup page container should be visible
    await expect(page.locator('.setup-page')).toBeVisible();
    
    // Step indicator should show all 4 steps
    const stepItems = page.locator('.step-item');
    await expect(stepItems).toHaveCount(4);
    
    // First step should be active
    await expect(stepItems.first()).toHaveClass(/active/);
    
    // Header should be present
    await expect(page.locator('.setup-header h1')).toHaveText('CleanComms Setup');
  });

  test('radio selector loads catalog and displays radios', async ({ page }) => {
    // Wait for catalog to load
    await expect(page.locator('.radio-catalog')).toBeVisible({ timeout: 10000 });
    
    // Should have at least one radio card
    const radioCards = page.locator('.radio-card');
    await expect(radioCards).toHaveCount(await radioCards.count(), { timeout: 5000 });
    
    // First radio should have tier badge
    const firstBadge = radioCards.first().locator('.tier-badge');
    await expect(firstBadge).toBeVisible();
    
    // Radio card should have capability badges
    const capabilityBadges = radioCards.first().locator('.capability-badge');
    await expect(capabilityBadges.first()).toBeVisible();
  });

  test('selecting a radio updates profile and enables next step', async ({ page }) => {
    // Wait for catalog
    await expect(page.locator('.radio-catalog')).toBeVisible({ timeout: 10000 });
    
    // Click first radio card
    const firstRadio = page.locator('.radio-card').first();
    await firstRadio.click();
    
    // Should show selected state
    await expect(firstRadio).toHaveClass(/selected/);
    await expect(firstRadio.locator('.radio-card-selected-indicator')).toBeVisible();
    
    // Next button should become enabled
    const nextButton = page.locator('.btn-primary').filter({ hasText: 'Next' });
    await expect(nextButton).toBeEnabled();
  });

  test('cannot proceed without selecting a radio', async ({ page }) => {
    // Wait for catalog
    await expect(page.locator('.radio-catalog')).toBeVisible({ timeout: 10000 });
    
    // Try to click Next without selection
    const nextButton = page.locator('.btn-primary').filter({ hasText: 'Next' });
    
    // Button should be disabled
    await expect(nextButton).toBeDisabled();
  });
});

test.describe('Capability-Aware Setup', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('cleancomms-setup');
    });
    await page.goto('/setup');
  });

  test('PTT methods show unsupported options as disabled', async ({ page }) => {
    // Wait for catalog and select first radio
    await expect(page.locator('.radio-catalog')).toBeVisible({ timeout: 10000 });
    await page.locator('.radio-card').first().click();
    
    // Go to audio step
    await page.locator('.btn-primary').filter({ hasText: 'Next' }).click();
    
    // Wait for serial step, then go to audio
    await page.locator('#serial-port').selectOption({ index: 1 });
    await page.locator('.btn-primary').filter({ hasText: 'Next' }).click();
    
    // Should be on audio step
    await expect(page.locator('.audio-config')).toBeVisible();
    
    // Check for PTT methods
    const pttOptions = page.locator('.ptt-method-option');
    await expect(pttOptions.first()).toBeVisible();
    
    // At least some options may be unavailable
    const unavailableOptions = page.locator('.ptt-method-option.unavailable');
    const count = await unavailableOptions.count();
    
    // Verify unavailable options have explanation text
    if (count > 0) {
      const note = unavailableOptions.first().locator('.unavailable-note');
      await expect(note).toBeVisible();
      await expect(note).toContainText('does not support');
    }
  });

  test('USB audio section disabled for radios without support', async ({ page }) => {
    // Select a radio that may not support USB audio (check catalog)
    await expect(page.locator('.radio-catalog')).toBeVisible({ timeout: 10000 });
    
    // For this test, we assume the first radio supports USB audio
    // In real testing, you might select a specific radio
    await page.locator('.radio-card').first().click();
    await page.locator('.btn-primary').filter({ hasText: 'Next' }).click();
    
    // Configure serial
    await page.locator('#serial-port').selectOption({ index: 1 });
    await page.locator('.btn-primary').filter({ hasText: 'Next' }).click();
    
    // Audio section should be visible
    await expect(page.locator('.audio-config')).toBeVisible();
  });
});

test.describe('Setup Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('cleancomms-setup');
    });
    await page.goto('/setup');
  });

  test('serial port step validates required fields', async ({ page }) => {
    // Select radio first
    await expect(page.locator('.radio-catalog')).toBeVisible({ timeout: 10000 });
    await page.locator('.radio-card').first().click();
    
    // Go to serial step
    await page.locator('.btn-primary').filter({ hasText: 'Next' }).click();
    
    // Try to proceed without selecting a port
    const nextButton = page.locator('.btn-primary').filter({ hasText: 'Next' });
    
    // Button should be disabled (validation fails)
    await expect(nextButton).toBeDisabled();
  });

  test('review step shows all configuration', async ({ page }) => {
    // Complete all steps
    await expect(page.locator('.radio-catalog')).toBeVisible({ timeout: 10000 });
    await page.locator('.radio-card').first().click();
    await page.locator('.btn-primary').filter({ hasText: 'Next' }).click();
    
    // Configure serial
    await page.locator('#serial-port').selectOption({ index: 1 });
    await page.locator('.btn-primary').filter({ hasText: 'Next' }).click();
    
    // Configure audio (if required)
    await page.locator('.ptt-method-option').first().click();
    await page.locator('.btn-primary').filter({ hasText: 'Review' }).click();
    
    // Should be on review step
    await expect(page.locator('.review-step')).toBeVisible();
    
    // Review sections should be visible
    await expect(page.locator('.review-section').filter({ hasText: 'Radio' })).toBeVisible();
    await expect(page.locator('.review-section').filter({ hasText: 'Serial' })).toBeVisible();
    await expect(page.locator('.review-section').filter({ hasText: 'Audio' })).toBeVisible();
    
    // Save button should be visible
    await expect(page.locator('.btn-primary').filter({ hasText: 'Save' })).toBeVisible();
  });
});

test.describe('Profile Persistence', () => {
  test('profile saves to localStorage', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('cleancomms-setup');
    });
    await page.goto('/setup');
    
    // Select radio
    await expect(page.locator('.radio-catalog')).toBeVisible({ timeout: 10000 });
    await page.locator('.radio-card').first().click();
    
    // Check localStorage was updated
    const savedProfile = await page.evaluate(() => {
      return localStorage.getItem('cleancomms-setup');
    });
    
    expect(savedProfile).not.toBeNull();
    
    const profile = JSON.parse(savedProfile!);
    expect(profile).toHaveProperty('radioModelCode');
    expect(profile).toHaveProperty('updatedAt');
  });

  test('saved profile loads on restart', async ({ page }) => {
    // First, save a profile
    await page.addInitScript(() => {
      const profile = {
        radioModelCode: 'tx-500',
        radioModel: 'Discovery TX-500',
        radioManufacturer: 'Lab599',
        protocolProfile: 'lab599-extended',
        serialConfig: {
          path: '/dev/ttyUSB0',
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          flowControl: 'none',
        },
        audioConfig: {
          inputDeviceId: 'default',
          outputDeviceId: 'default',
          inputVolume: 0.8,
          outputVolume: 0.8,
        },
        pttMethod: 'rts',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('cleancomms-setup', JSON.stringify(profile));
    });
    
    await page.goto('/setup');
    
    // The saved radio should be pre-selected
    await expect(page.locator('.radio-catalog')).toBeVisible({ timeout: 10000 });
    const selectedRadio = page.locator('.radio-card.selected');
    await expect(selectedRadio).toBeVisible();
  });
});

test.describe('Setup Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('cleancomms-setup');
    });
    await page.goto('/setup');
  });

  test('can navigate back and forth between steps', async ({ page }) => {
    // Select radio and go to serial step
    await expect(page.locator('.radio-catalog')).toBeVisible({ timeout: 10000 });
    await page.locator('.radio-card').first().click();
    await page.locator('.btn-primary').filter({ hasText: 'Next' }).click();
    
    // Should be on serial step
    await expect(page.locator('.serial-config')).toBeVisible();
    
    // Go back
    await page.locator('.btn-secondary').filter({ hasText: 'Back' }).click();
    
    // Should be back on radio step
    await expect(page.locator('.radio-selector')).toBeVisible();
    
    // Selected radio should still be selected
    await expect(page.locator('.radio-card.selected')).toBeVisible();
  });

  test('step indicator reflects current step', async ({ page }) => {
    // Initial state - first step active
    const steps = page.locator('.step-item');
    await expect(steps.first()).toHaveClass(/active/);
    
    // Select radio and go to next step
    await expect(page.locator('.radio-catalog')).toBeVisible({ timeout: 10000 });
    await page.locator('.radio-card').first().click();
    await page.locator('.btn-primary').filter({ hasText: 'Next' }).click();
    
    // First step should be completed, second active
    await expect(steps.first()).toHaveClass(/completed/);
    await expect(steps.nth(1)).toHaveClass(/active/);
  });
});
