import { test, expect } from '@playwright/test';

test.describe('Operator Workspace Shell', () => {
  test('shell renders with sidebar and tabs', async ({ page }) => {
    await page.goto('/');
    
    // Wait for app to load
    await expect(page.locator('.app-shell')).toBeVisible();
    
    // Sidebar exists
    await expect(page.locator('.sidebar')).toBeVisible();
    
    // Tab strip exists
    await expect(page.locator('.tab-strip')).toBeVisible();
    
    // At least one tab exists
    const tabs = page.locator('.tab');
    await expect(tabs).toHaveCount(3);
    
    // Workspace content exists
    await expect(page.locator('.workspace-content')).toBeVisible();
  });

  test('sidebar can be collapsed and expanded', async ({ page }) => {
    await page.goto('/');
    
    // Initial state - sidebar expanded
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).not.toHaveClass(/sidebar--collapsed/);
    
    // Click toggle button
    await page.locator('.sidebar__toggle').click();
    
    // Sidebar should be collapsed
    await expect(sidebar).toHaveClass(/sidebar--collapsed/);
    
    // Click again to expand
    await page.locator('.sidebar__toggle').click();
    
    // Sidebar should be expanded again
    await expect(sidebar).not.toHaveClass(/sidebar--collapsed/);
  });

  test('tab focus changes without activation', async ({ page }) => {
    await page.goto('/');
    
    const tabs = page.locator('.tab');
    
    // First tab should be focused initially
    await expect(tabs.first()).toHaveClass(/tab--focused/);
    await expect(tabs.first()).toHaveClass(/tab--active/);
    
    // First tab should have LIVE badge
    await expect(tabs.first().locator('.tab__live-badge')).toBeVisible();
    
    // Click second tab
    await tabs.nth(1).click();
    
    // Second tab should be focused
    await expect(tabs.nth(1)).toHaveClass(/tab--focused/);
    
    // But first tab should still be active (LIVE)
    await expect(tabs.first()).toHaveClass(/tab--active/);
    await expect(tabs.first().locator('.tab__live-badge')).toBeVisible();
    
    // Second tab should NOT have LIVE badge
    await expect(tabs.nth(1).locator('.tab__live-badge')).not.toBeVisible();
  });

  test('activate button exists and is clickable', async ({ page }) => {
    await page.goto('/');
    
    const tabs = page.locator('.tab');
    
    // Click second tab to create activation need
    await tabs.nth(1).click();
    
    // Activate button should appear
    const activateButton = page.locator('.activate-button');
    await expect(activateButton).toBeVisible();
    await expect(activateButton).toHaveText(/Activate/);
    
    // Click activate
    await activateButton.click();
    
    // Second tab should now be active
    await expect(tabs.nth(1)).toHaveClass(/tab--active/);
    
    // LIVE badge should move to second tab
    await expect(tabs.nth(1).locator('.tab__live-badge')).toBeVisible();
    
    // First tab should no longer be active
    await expect(tabs.first()).not.toHaveClass(/tab--active/);
    
    // Activate button should disappear (no longer needed)
    await expect(activateButton).not.toBeVisible();
  });

  test('workspace content shows preview notice when tab not activated', async ({ page }) => {
    await page.goto('/');
    
    const tabs = page.locator('.tab');
    
    // Click second tab
    await tabs.nth(1).click();
    
    // Preview notice should be visible
    const previewNotice = page.locator('.workspace-notice').filter({ hasText: 'Preview mode' });
    await expect(previewNotice).toBeVisible();
  });

  test('workspace content shows live notice when tab is activated', async ({ page }) => {
    await page.goto('/');
    
    // First tab is already active
    const liveNotice = page.locator('.workspace-notice--active').filter({ hasText: 'LIVE' });
    await expect(liveNotice).toBeVisible();
  });
});

test.describe('Responsive Shell', () => {
  test('compact mode on laptop resolution (1366x768)', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    
    // App shell should be visible
    await expect(page.locator('.app-shell')).toBeVisible();
    
    // Sidebar should still be functional
    await expect(page.locator('.sidebar')).toBeVisible();
    
    // Tabs should be visible and scrollable if needed
    await expect(page.locator('.tab-strip__tabs')).toBeVisible();
    
    // Workspace content should be visible
    await expect(page.locator('.workspace-content')).toBeVisible();
  });

  test('expanded mode on desktop resolution (2560x1440)', async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto('/');
    
    // App shell should be visible
    await expect(page.locator('.app-shell')).toBeVisible();
    
    // Sidebar should be expanded with full text
    await expect(page.locator('.sidebar')).toBeVisible();
    
    // Logo text should be visible
    await expect(page.locator('.logo-text')).toBeVisible();
    
    // Nav items should have text
    const navLinks = page.locator('.nav-link span');
    await expect(navLinks.first()).toBeVisible();
  });

  test('tab activation safety - selecting tab does not auto-activate', async ({ page }) => {
    await page.goto('/');
    
    const tabs = page.locator('.tab');
    
    // Get initial active tab
    const initialActiveTab = await tabs.evaluateAll(tabs => 
      tabs.findIndex(t => t.classList.contains('tab--active'))
    );
    
    // Click a different tab
    const targetIndex = initialActiveTab === 0 ? 1 : 0;
    await tabs.nth(targetIndex).click();
    
    // Verify focus changed
    const focusedTab = await tabs.evaluateAll(tabs => 
      tabs.findIndex(t => t.classList.contains('tab--focused'))
    );
    expect(focusedTab).toBe(targetIndex);
    
    // But active tab should NOT change
    const activeTabAfterClick = await tabs.evaluateAll(tabs => 
      tabs.findIndex(t => t.classList.contains('tab--active'))
    );
    expect(activeTabAfterClick).toBe(initialActiveTab);
  });
});
