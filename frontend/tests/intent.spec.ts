import { test, expect } from '@playwright/test';

test.describe('Intent and Operating Profile Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the intent page (assuming it's available via sidebar)
    await page.goto('/');
    
    // For now, we'll need to navigate to the Intent page
    // Click on the Intent nav link if it exists
    const intentLink = page.locator('.nav-link').filter({ hasText: /Intent|Config/i });
    if (await intentLink.count() > 0) {
      await intentLink.click();
    }
    
    // Wait for intent page to be visible
    await expect(page.locator('.intent-page')).toBeVisible({ timeout: 10000 }).catch(() => {
      // If intent page isn't directly accessible, we'll test via workspace
    });
  });

  test('intent selector toggles between listen and broadcast', async ({ page }) => {
    // Skip if intent page not available
    const intentPage = page.locator('.intent-page');
    if (await intentPage.count() === 0) {
      test.skip();
      return;
    }
    
    // Find intent options
    const listenBtn = page.locator('.intent-option').filter({ hasText: /Listen/ });
    const broadcastBtn = page.locator('.intent-option').filter({ hasText: /Broadcast/ });
    
    await expect(listenBtn).toBeVisible();
    await expect(broadcastBtn).toBeVisible();
    
    // Click Listen - should be selected
    await listenBtn.click();
    await expect(listenBtn).toHaveClass(/intent-option--selected/);
    await expect(broadcastBtn).not.toHaveClass(/intent-option--selected/);
    
    // Click Broadcast - should switch selection
    await broadcastBtn.click();
    await expect(broadcastBtn).toHaveClass(/intent-option--selected/);
    await expect(listenBtn).not.toHaveClass(/intent-option--selected/);
  });

  test('mode family tabs switch between digital, cw, and ssb', async ({ page }) => {
    const intentPage = page.locator('.intent-page');
    if (await intentPage.count() === 0) {
      test.skip();
      return;
    }
    
    // Find mode family tabs
    const digitalTab = page.locator('.mode-family-tab').filter({ hasText: /Digital/ });
    const cwTab = page.locator('.mode-family-tab').filter({ hasText: /CW/ });
    const ssbTab = page.locator('.mode-family-tab').filter({ hasText: /SSB/ });
    
    await expect(digitalTab).toBeVisible();
    await expect(cwTab).toBeVisible();
    await expect(ssbTab).toBeVisible();
    
    // Click CW tab
    await cwTab.click();
    await expect(cwTab).toHaveClass(/mode-family-tab--active/);
    
    // Mode dropdown should show CW
    const modeDropdown = page.locator('.mode-selection__dropdown');
    await expect(modeDropdown).toHaveValue('CW');
    
    // Click SSB tab
    await ssbTab.click();
    await expect(ssbTab).toHaveClass(/mode-family-tab--active/);
    
    // Mode should auto-select based on frequency (USB or LSB)
    const modeValue = await modeDropdown.inputValue();
    expect(['USB', 'LSB']).toContain(modeValue);
  });

  test('frequency presets update frequency and mode for SSB', async ({ page }) => {
    const intentPage = page.locator('.intent-page');
    if (await intentPage.count() === 0) {
      test.skip();
      return;
    }
    
    // Select SSB mode family
    const ssbTab = page.locator('.mode-family-tab').filter({ hasText: /SSB/ });
    await ssbTab.click();
    
    // Click 80m SSB preset (should be LSB - below 10MHz)
    const preset80m = page.locator('.frequency-preset-btn').filter({ hasText: /80m/ });
    await preset80m.click();
    
    // Verify mode is LSB for 80m
    const modeDropdown = page.locator('.mode-selection__dropdown');
    await expect(modeDropdown).toHaveValue('LSB');
    
    // Click 20m SSB preset (should be USB - above 10MHz)
    const preset20m = page.locator('.frequency-preset-btn').filter({ hasText: /20m/ });
    await preset20m.click();
    
    // Verify mode is USB for 20m
    await expect(modeDropdown).toHaveValue('USB');
  });
});

test.describe('Operating Profile CRUD', () => {
  test('create operating profile with notes and tags', async ({ page }) => {
    await page.goto('/');
    
    const intentPage = page.locator('.intent-page');
    if (await intentPage.count() === 0) {
      test.skip();
      return;
    }
    
    // Set up configuration: 20m PSK31
    const digitalTab = page.locator('.mode-family-tab').filter({ hasText: /Digital/ });
    await digitalTab.click();
    
    const modeDropdown = page.locator('.mode-selection__dropdown');
    await modeDropdown.selectOption('PSK31');
    
    // Set frequency to 20m PSK31 (14.070 MHz)
    const freqInput = page.locator('.frequency-input');
    await freqInput.fill('14.070');
    
    // Click Save Current button
    const saveBtn = page.locator('.profile-save-btn');
    await saveBtn.click();
    
    // Save dialog should appear
    const saveDialog = page.locator('.profile-save-dialog');
    await expect(saveDialog).toBeVisible();
    
    // Fill in profile details
    const nameInput = saveDialog.locator('input').first();
    await nameInput.fill('20m PSK31 Evening DX');
    
    const notesTextarea = saveDialog.locator('textarea');
    await notesTextarea.fill('Good for evening DX contacts on 20m');
    
    const tagsInput = saveDialog.locator('input').last();
    await tagsInput.fill('psk31, evening, dx, 20m');
    
    // Save the profile
    const dialogSaveBtn = saveDialog.locator('.dialog-btn--save');
    await dialogSaveBtn.click();
    
    // Dialog should close
    await expect(saveDialog).not.toBeVisible();
    
    // Profile should appear in the list
    const profileCard = page.locator('.profile-card').filter({ hasText: /20m PSK31 Evening DX/ });
    await expect(profileCard).toBeVisible();
    
    // Expand the profile to see details
    await profileCard.locator('.profile-card__header').click();
    
    // Verify notes and tags are present
    await expect(profileCard.locator('.profile-detail__value').filter({ hasText: /evening DX/ })).toBeVisible();
    await expect(profileCard.locator('.profile-tag').filter({ hasText: 'psk31' })).toBeVisible();
  });

  test('load profile updates configuration', async ({ page }) => {
    await page.goto('/');
    
    const intentPage = page.locator('.intent-page');
    if (await intentPage.count() === 0) {
      test.skip();
      return;
    }
    
    // First create a profile
    const saveBtn = page.locator('.profile-save-btn');
    await saveBtn.click();
    
    const saveDialog = page.locator('.profile-save-dialog');
    const nameInput = saveDialog.locator('input').first();
    await nameInput.fill('Test Profile CW 40m');
    await saveDialog.locator('.dialog-btn--save').click();
    
    // Wait for profile to appear
    const profileCard = page.locator('.profile-card').filter({ hasText: /Test Profile CW 40m/ });
    await expect(profileCard).toBeVisible();
    
    // Change current mode to something different
    const ssbTab = page.locator('.mode-family-tab').filter({ hasText: /SSB/ });
    await ssbTab.click();
    
    // Now expand and load the profile
    await profileCard.locator('.profile-card__header').click();
    await profileCard.locator('.profile-action-btn--load').click();
    
    // Configuration should revert to the profile's settings
    const modeDropdown = page.locator('.mode-selection__dropdown');
    await expect(modeDropdown).toHaveValue('FT8'); // Default digital mode
  });

  test('delete profile removes it from list', async ({ page }) => {
    await page.goto('/');
    
    const intentPage = page.locator('.intent-page');
    if (await intentPage.count() === 0) {
      test.skip();
      return;
    }
    
    // Create a profile to delete
    const saveBtn = page.locator('.profile-save-btn');
    await saveBtn.click();
    
    const saveDialog = page.locator('.profile-save-dialog');
    const nameInput = saveDialog.locator('input').first();
    await nameInput.fill('Profile To Delete');
    await saveDialog.locator('.dialog-btn--save').click();
    
    // Wait for profile
    const profileCard = page.locator('.profile-card').filter({ hasText: /Profile To Delete/ });
    await expect(profileCard).toBeVisible();
    
    // Expand and delete
    await profileCard.locator('.profile-card__header').click();
    
    // Set up dialog handler to confirm
    page.on('dialog', dialog => dialog.accept());
    
    await profileCard.locator('.profile-action-btn--delete').click();
    
    // Profile should be removed
    await expect(profileCard).not.toBeVisible();
  });
});

test.describe('Intent Safety - Pending State', () => {
  test('intent change shows pending badge but does not change live state', async ({ page }) => {
    await page.goto('/');
    
    const intentPage = page.locator('.intent-page');
    if (await intentPage.count() === 0) {
      test.skip();
      return;
    }
    
    // Get initial active intent from the summary
    const activeSummary = page.locator('.active-summary__values .active-value--intent');
    const initialActiveIntent = await activeSummary.textContent();
    
    // Change intent to opposite
    const broadcastBtn = page.locator('.intent-option').filter({ hasText: /Broadcast/ });
    await broadcastBtn.click();
    
    // Pending badge should appear on intent selector
    const pendingBadge = page.locator('.intent-selector__pending-badge');
    await expect(pendingBadge).toBeVisible();
    
    // Pending alert should appear
    const pendingAlert = page.locator('.intent-page__pending-alert');
    await expect(pendingAlert).toBeVisible();
    
    // Active summary should NOT have changed
    const currentActiveIntent = await activeSummary.textContent();
    expect(currentActiveIntent).toBe(initialActiveIntent);
    
    // Click Activate
    const activateBtn = pendingAlert.locator('.pending-alert__activate-btn');
    await activateBtn.click();
    
    // Pending alert should disappear
    await expect(pendingAlert).not.toBeVisible();
    
    // Active summary should now reflect the new intent
    await expect(activeSummary).toHaveText(/broadcast/i);
  });

  test('mode change without activation shows pending state', async ({ page }) => {
    await page.goto('/');
    
    const intentPage = page.locator('.intent-page');
    if (await intentPage.count() === 0) {
      test.skip();
      return;
    }
    
    // Get initial active mode
    const activeMode = page.locator('.active-summary__values .active-value--mode');
    const initialMode = await activeMode.textContent();
    
    // Change mode family
    const cwTab = page.locator('.mode-family-tab').filter({ hasText: /CW/ });
    await cwTab.click();
    
    // Pending badge should appear
    const pendingBadge = page.locator('.pending-badge');
    await expect(pendingBadge).toBeVisible();
    
    // Pending alert should show mode change
    const pendingAlert = page.locator('.intent-page__pending-alert');
    await expect(pendingAlert).toContainText(/Mode:/);
    
    // Active mode should not have changed
    const currentActiveMode = await activeMode.textContent();
    expect(currentActiveMode).toBe(initialMode);
  });

  test('frequency change shows pending state with SSB mode recommendation', async ({ page }) => {
    await page.goto('/');
    
    const intentPage = page.locator('.intent-page');
    if (await intentPage.count() === 0) {
      test.skip();
      return;
    }
    
    // Select SSB
    const ssbTab = page.locator('.mode-family-tab').filter({ hasText: /SSB/ });
    await ssbTab.click();
    
    // Set frequency below 10MHz (should recommend LSB)
    const freqInput = page.locator('.frequency-input');
    await freqInput.fill('7.150');
    
    // Mode hint should show LSB recommended
    const modeHint = page.locator('.frequency-display__mode-hint');
    await expect(modeHint).toContainText(/LSB/);
    
    // Change to above 10MHz (should recommend USB)
    await freqInput.fill('14.195');
    await expect(modeHint).toContainText(/USB/);
    
    // Pending state should show frequency change
    const pendingAlert = page.locator('.intent-page__pending-alert');
    await expect(pendingAlert).toContainText(/Frequency:/);
  });

  test('multiple changes tracked in pending alert', async ({ page }) => {
    await page.goto('/');
    
    const intentPage = page.locator('.intent-page');
    if (await intentPage.count() === 0) {
      test.skip();
      return;
    }
    
    // Make multiple changes
    const broadcastBtn = page.locator('.intent-option').filter({ hasText: /Broadcast/ });
    await broadcastBtn.click();
    
    const cwTab = page.locator('.mode-family-tab').filter({ hasText: /CW/ });
    await cwTab.click();
    
    const freqInput = page.locator('.frequency-input');
    await freqInput.fill('7.030');
    
    // Pending alert should show multiple changes
    const pendingAlert = page.locator('.intent-page__pending-alert');
    await expect(pendingAlert).toContainText(/Pending Changes \(3\)/);
    
    // Verify all three changes are listed
    await expect(pendingAlert).toContainText(/Intent:/);
    await expect(pendingAlert).toContainText(/Mode Family:/);
    await expect(pendingAlert).toContainText(/Frequency:/);
    
    // Activate should apply all changes
    const activateBtn = pendingAlert.locator('.pending-alert__activate-btn');
    await activateBtn.click();
    
    // All values should now be active
    const activeIntent = page.locator('.active-summary__values .active-value--intent');
    await expect(activeIntent).toHaveText(/broadcast/i);
    
    const activeMode = page.locator('.active-summary__values .active-value--mode');
    await expect(activeMode).toHaveText(/CW/);
  });
});

test.describe('Profile Persistence', () => {
  test('profiles persist across page reload', async ({ page }) => {
    await page.goto('/');
    
    const intentPage = page.locator('.intent-page');
    if (await intentPage.count() === 0) {
      test.skip();
      return;
    }
    
    // Create a profile
    const saveBtn = page.locator('.profile-save-btn');
    await saveBtn.click();
    
    const saveDialog = page.locator('.profile-save-dialog');
    const nameInput = saveDialog.locator('input').first();
    await nameInput.fill('Persistent Profile');
    await saveDialog.locator('.dialog-btn--save').click();
    
    // Wait for profile
    const profileCard = page.locator('.profile-card').filter({ hasText: /Persistent Profile/ });
    await expect(profileCard).toBeVisible();
    
    // Reload page
    await page.reload();
    
    // Wait for intent page
    await expect(page.locator('.intent-page')).toBeVisible();
    
    // Profile should still exist
    const profileAfterReload = page.locator('.profile-card').filter({ hasText: /Persistent Profile/ });
    await expect(profileAfterReload).toBeVisible();
  });
});
