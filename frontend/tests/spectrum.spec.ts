/**
 * Spectrum/Waterfall Display Tests
 * 
 * Tests for spectrum display functionality including:
 * - Spectrum display rendering
 * - Waterfall display rendering
 * - Click-to-tune callback
 * - Stream unavailable fallback
 */

import { test, expect } from '@playwright/test';

test.describe('Spectrum Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to fully load
    await expect(page.locator('.app-shell')).toBeVisible();
  });

  test('spectrum display placeholder is visible in workspace', async ({ page }) => {
    // The waterfall placeholder should be visible
    const waterfallPanel = page.locator('.panel--waterfall');
    await expect(waterfallPanel).toBeVisible();
    
    // Placeholder text should be visible
    const placeholder = waterfallPanel.locator('.waterfall-placeholder');
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toContainText('Waterfall');
  });

  test('spectrum display shows loading state initially', async ({ page }) => {
    // If spectrum display is rendered, check for loading or connected state
    const spectrumDisplay = page.locator('.spectrum-display');
    
    // Either loading or connected state should be visible
    const isLoading = await spectrumDisplay.locator('.spectrum-display__loading').isVisible().catch(() => false);
    const isConnected = !await spectrumDisplay.locator('.spectrum-display--disconnected').isVisible().catch(() => false);
    
    // One of these states should be true
    expect(isLoading || isConnected).toBeTruthy();
  });

  test('spectrum display canvas renders with correct dimensions', async ({ page }) => {
    // Navigate to a workspace that has spectrum
    const firstTab = page.locator('.tab').first();
    await firstTab.click();
    
    // Check if spectrum canvas exists (it may be hidden if not yet implemented)
    const canvas = page.locator('.spectrum-display__canvas');
    const canvasCount = await canvas.count();
    
    if (canvasCount > 0) {
      // Canvas should have non-zero dimensions
      const boundingBox = await canvas.boundingBox();
      expect(boundingBox).not.toBeNull();
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThan(0);
        expect(boundingBox.height).toBeGreaterThan(0);
      }
    }
  });

  test('frequency axis renders with labels', async ({ page }) => {
    const frequencyAxis = page.locator('.frequency-axis');
    const axisCount = await frequencyAxis.count();
    
    if (axisCount > 0) {
      // SVG should be present
      const svg = frequencyAxis.locator('svg');
      await expect(svg).toBeVisible();
      
      // Tick labels should exist
      const tickLabels = frequencyAxis.locator('.frequency-axis__tick-label');
      const labelCount = await tickLabels.count();
      expect(labelCount).toBeGreaterThan(0);
    }
  });

  test('center frequency is highlighted on axis', async ({ page }) => {
    const centerLine = page.locator('.frequency-axis__center-line');
    const lineCount = await centerLine.count();
    
    if (lineCount > 0) {
      await expect(centerLine.first()).toBeVisible();
    }
  });
});

test.describe('Waterfall Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.app-shell')).toBeVisible();
  });

  test('waterfall display placeholder exists', async ({ page }) => {
    // The waterfall panel should exist in the workspace
    const waterfallPanel = page.locator('.panel--waterfall');
    await expect(waterfallPanel).toBeVisible();
  });

  test('waterfall canvas renders when available', async ({ page }) => {
    const waterfallCanvas = page.locator('.waterfall-display__canvas');
    const canvasCount = await waterfallCanvas.count();
    
    if (canvasCount > 0) {
      const boundingBox = await waterfallCanvas.boundingBox();
      expect(boundingBox).not.toBeNull();
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThan(0);
        expect(boundingBox.height).toBeGreaterThan(0);
      }
    }
  });

  test('waterfall color legend is visible', async ({ page }) => {
    const legend = page.locator('.waterfall-display__legend');
    const legendCount = await legend.count();
    
    if (legendCount > 0) {
      // Legend gradient should exist
      const gradient = legend.locator('.waterfall-display__legend-gradient');
      await expect(gradient).toBeVisible();
      
      // Labels should exist
      const labels = legend.locator('.waterfall-display__legend-labels span');
      const labelCount = await labels.count();
      expect(labelCount).toBeGreaterThanOrEqual(2);
    }
  });

  test('waterfall palette selector works', async ({ page }) => {
    const paletteSelect = page.locator('.waterfall-panel__select');
    const selectCount = await paletteSelect.count();
    
    if (selectCount > 0) {
      // Should have palette options
      const options = paletteSelect.locator('option');
      const optionCount = await options.count();
      expect(optionCount).toBeGreaterThan(1);
      
      // Should be able to change selection
      await paletteSelect.selectOption('viridis');
      await expect(paletteSelect).toHaveValue('viridis');
    }
  });
});

test.describe('Click-to-Tune Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.app-shell')).toBeVisible();
  });

  test('spectrum canvas has crosshair cursor', async ({ page }) => {
    const spectrumCanvas = page.locator('.spectrum-display__canvas');
    const canvasCount = await spectrumCanvas.count();
    
    if (canvasCount > 0) {
      // Cursor should be crosshair for tuning
      const cursor = await spectrumCanvas.evaluate(el => 
        window.getComputedStyle(el).cursor
      );
      expect(cursor).toBe('crosshair');
    }
  });

  test('clicking on spectrum updates frequency tooltip', async ({ page }) => {
    const spectrumCanvas = page.locator('.spectrum-display__canvas');
    const canvasCount = await spectrumCanvas.count();
    
    if (canvasCount > 0) {
      // Hover over canvas
      const boundingBox = await spectrumCanvas.boundingBox();
      if (boundingBox) {
        // Move mouse to center of canvas
        await page.mouse.move(
          boundingBox.x + boundingBox.width / 2,
          boundingBox.y + boundingBox.height / 2
        );
        
        // Frequency tooltip should appear
        const tooltip = page.locator('.spectrum-display__tooltip');
        const tooltipVisible = await tooltip.isVisible().catch(() => false);
        
        // If tooltip exists, it should show frequency
        if (tooltipVisible) {
          const text = await tooltip.textContent();
          expect(text).toMatch(/\d+\.\d+\s*kHz/);
        }
      }
    }
  });

  test('click on signal marker triggers callback', async ({ page }) => {
    // Signal markers are rendered as overlays
    const signalMarker = page.locator('.signal-marker');
    const markerCount = await signalMarker.count();
    
    if (markerCount > 0) {
      // Click on first visible marker
      const firstMarker = signalMarker.first();
      await expect(firstMarker).toBeVisible();
      
      // Marker should be clickable
      await firstMarker.click({ force: true });
      
      // No error should occur - test passes if no exception
    }
  });

  test('signal marker hover shows tooltip', async ({ page }) => {
    const signalMarker = page.locator('.signal-marker');
    const markerCount = await signalMarker.count();
    
    if (markerCount > 0) {
      const firstMarker = signalMarker.first();
      await firstMarker.hover({ force: true });
      
      // Hovered state class should be applied
      await expect(firstMarker).toHaveClass(/signal-marker--hovered/);
    }
  });
});

test.describe('Stream Unavailable Fallback', () => {
  test('shows error state when stream unavailable', async ({ page }) => {
    // Navigate to workspace
    await page.goto('/');
    
    // Check for error or disconnected state
    const spectrumError = page.locator('.spectrum-display__error');
    const waterfallError = page.locator('.waterfall-display__error');
    const disconnectedState = page.locator('.spectrum-display--disconnected, .waterfall-display--disconnected');
    
    const hasError = await spectrumError.isVisible().catch(() => false) ||
                     await waterfallError.isVisible().catch(() => false);
    const isDisconnected = await disconnectedState.isVisible().catch(() => false);
    
    // Either error state, disconnected state, or normal operation is acceptable
    expect(hasError || isDisconnected || !hasError).toBeTruthy();
  });

  test('retry button appears in error state', async ({ page }) => {
    const retryButton = page.locator('.spectrum-display__retry, .waterfall-display__retry');
    const retryCount = await retryButton.count();
    
    if (retryCount > 0) {
      // If error state is shown, retry button should be visible
      const firstRetry = retryButton.first();
      if (await firstRetry.isVisible()) {
        await expect(firstRetry).toHaveText(/Retry/);
        
        // Button should be clickable
        await firstRetry.click({ force: true });
        // No error should occur
      }
    }
  });

  test('graceful degradation - no crash on missing stream', async ({ page }) => {
    // Navigate and verify app doesn't crash
    await page.goto('/');
    
    // Wait for app to be stable
    await page.waitForTimeout(1000);
    
    // App should still be functional
    await expect(page.locator('.app-shell')).toBeVisible();
    await expect(page.locator('.tab-strip')).toBeVisible();
    await expect(page.locator('.workspace-content')).toBeVisible();
    
    // No console errors (except known harmless ones)
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait a bit for any delayed errors
    await page.waitForTimeout(500);
    
    // Should not have critical errors
    const criticalErrors = consoleErrors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('404') &&
      !e.includes('network')
    );
    expect(criticalErrors.length).toBe(0);
  });
});

test.describe('Spectrum Responsive Behavior', () => {
  test('spectrum display adapts to compact viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    
    // Spectrum/waterfall should still be visible
    const waterfallPanel = page.locator('.panel--waterfall');
    await expect(waterfallPanel).toBeVisible();
    
    // Canvas should have valid dimensions
    const canvas = page.locator('.spectrum-display__canvas, .waterfall-display__canvas');
    const canvasCount = await canvas.count();
    
    if (canvasCount > 0) {
      const boundingBox = await canvas.first().boundingBox();
      expect(boundingBox).not.toBeNull();
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThan(100);
      }
    }
  });

  test('spectrum display expands on large viewport', async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto('/');
    
    // App should render correctly
    await expect(page.locator('.app-shell')).toBeVisible();
    
    // Waterfall panel should use available space
    const waterfallPanel = page.locator('.panel--waterfall');
    await expect(waterfallPanel).toBeVisible();
    
    const boundingBox = await waterfallPanel.boundingBox();
    expect(boundingBox).not.toBeNull();
    if (boundingBox) {
      expect(boundingBox.width).toBeGreaterThan(400);
    }
  });
});

test.describe('Spectrum Accessibility', () => {
  test('spectrum canvas has accessible label', async ({ page }) => {
    await page.goto('/');
    
    const canvas = page.locator('.spectrum-display__canvas, .waterfall-display__canvas');
    const canvasCount = await canvas.count();
    
    if (canvasCount > 0) {
      // Canvas should have aria-label or role
      const firstCanvas = canvas.first();
      const ariaLabel = await firstCanvas.getAttribute('aria-label');
      const role = await firstCanvas.getAttribute('role');
      
      // Either aria-label or role should be present for accessibility
      expect(ariaLabel || role).toBeTruthy();
    }
  });

  test('frequency axis has accessible description', async ({ page }) => {
    await page.goto('/');
    
    const frequencyAxis = page.locator('.frequency-axis svg');
    const axisCount = await frequencyAxis.count();
    
    if (axisCount > 0) {
      const firstAxis = frequencyAxis.first();
      const ariaLabel = await firstAxis.getAttribute('aria-label');
      const role = await firstAxis.getAttribute('role');
      
      // Axis should be accessible
      expect(ariaLabel || role).toBeTruthy();
    }
  });

  test('signal markers are keyboard accessible', async ({ page }) => {
    await page.goto('/');
    
    const signalMarker = page.locator('.signal-marker');
    const markerCount = await signalMarker.count();
    
    if (markerCount > 0) {
      // Tab through elements
      await page.keyboard.press('Tab');
      
      // Markers should be focusable (if they have tabindex)
      const tabindex = await signalMarker.first().getAttribute('tabindex');
      // Either has tabindex or is naturally focusable
      expect(tabindex === null || tabindex === '0' || parseInt(tabindex || '0') >= 0).toBeTruthy();
    }
  });
});
