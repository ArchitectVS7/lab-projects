import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { generateTestUser } from './helpers/fixtures';

test.describe('Accessibility Controls', () => {
    test.beforeEach(async ({ page }) => {
        const user = generateTestUser('accessibility');
        await registerUser(page, user);
        await page.goto('/settings');
    });

    test('switches between light and dark themes', async ({ page }) => {
        // Find theme selector
        const themeSelector = page.getByLabel(/theme/i);
        await expect(themeSelector).toBeVisible();

        // Switch to dark theme
        await themeSelector.selectOption('dark');

        // Verify dark theme is applied
        const html = page.locator('html');
        await expect(html).toHaveClass(/dark/);

        // Switch to light theme
        await themeSelector.selectOption('light');
        await expect(html).not.toHaveClass(/dark/);
    });

    test('toggles high contrast mode', async ({ page }) => {
        // Find high contrast toggle
        const highContrastToggle = page.getByLabel(/high contrast/i);
        await expect(highContrastToggle).toBeVisible();

        // Enable high contrast
        await highContrastToggle.check();

        // Verify high contrast class is applied
        const html = page.locator('html');
        await expect(html).toHaveClass(/high-contrast/);

        // Verify visual changes (check for enhanced contrast in badges)
        const badge = page.locator('.badge, [class*="badge"]').first();
        if (await badge.isVisible()) {
            const borderWidth = await badge.evaluate(el =>
                window.getComputedStyle(el).borderWidth
            );
            expect(borderWidth).not.toBe('0px'); // High contrast adds borders
        }

        // Disable high contrast
        await highContrastToggle.uncheck();
        await expect(html).not.toHaveClass(/high-contrast/);
    });

    test('changes performance mode settings', async ({ page }) => {
        // Find performance mode selector
        const perfModeSelector = page.getByLabel(/performance mode/i);
        await expect(perfModeSelector).toBeVisible();

        // Test performance mode
        await perfModeSelector.selectOption('performance');
        const html = page.locator('html');
        await expect(html).toHaveClass(/performance-mode/);

        // Test quality mode
        await perfModeSelector.selectOption('quality');
        await expect(html).toHaveClass(/quality-mode/);
        await expect(html).not.toHaveClass(/performance-mode/);

        // Test balanced mode (default)
        await perfModeSelector.selectOption('balanced');
        await expect(html).not.toHaveClass(/performance-mode|quality-mode/);
    });

    test('animation intensity controls', async ({ page }) => {
        const animationSelector = page.getByLabel(/animation.*intensity/i);

        if (await animationSelector.isVisible()) {
            // Test reduced animations
            await animationSelector.selectOption('reduced');
            const html = page.locator('html');
            await expect(html).toHaveClass(/anim-reduced/);

            // Test no animations
            await animationSelector.selectOption('none');
            await expect(html).toHaveClass(/anim-none/);

            // Test normal animations
            await animationSelector.selectOption('normal');
            await expect(html).toHaveClass(/anim-normal/);
        }
    });

    test('color theme selection', async ({ page }) => {
        const colorThemeButtons = page.locator('[data-testid="color-theme-button"]');

        if (await colorThemeButtons.count() > 0) {
            // Click on a color theme (e.g., rose)
            const roseTheme = page.getByRole('button', { name: /rose/i });
            if (await roseTheme.isVisible()) {
                await roseTheme.click();

                // Wait for CSS variable to be applied
                await page.waitForTimeout(500);

                // Verify primary color changed
                const primaryColor = await page.evaluate(() => {
                    return getComputedStyle(document.documentElement)
                        .getPropertyValue('--primary-base');
                });
                expect(primaryColor).toContain('hsl');
            }
        }
    });

    test('persists accessibility preferences across sessions', async ({ page, context }) => {
        // Set preferences
        await page.getByLabel(/theme/i).selectOption('dark');
        await page.getByLabel(/high contrast/i).check();

        // Verify applied
        const html = page.locator('html');
        await expect(html).toHaveClass(/dark/);
        await expect(html).toHaveClass(/high-contrast/);

        // Create new page in same context (simulates page reload)
        const newPage = await context.newPage();
        await newPage.goto('/');

        // Verify preferences persisted
        const newHtml = newPage.locator('html');
        await expect(newHtml).toHaveClass(/dark/);
        await expect(newHtml).toHaveClass(/high-contrast/);

        await newPage.close();
    });

    test('respects system theme preference', async ({ page }) => {
        const themeSelector = page.getByLabel(/theme/i);
        await themeSelector.selectOption('system');

        // Emulate dark color scheme
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.waitForTimeout(500);

        const html = page.locator('html');
        await expect(html).toHaveClass(/dark/);

        // Emulate light color scheme
        await page.emulateMedia({ colorScheme: 'light' });
        await page.waitForTimeout(500);
        await expect(html).not.toHaveClass(/dark/);
    });

    test('visual regression for theme changes', async ({ page }) => {
        // Take screenshot in light mode
        await page.getByLabel(/theme/i).selectOption('light');
        await page.waitForTimeout(500);
        await expect(page).toHaveScreenshot('light-theme.png', {
            fullPage: false,
            maxDiffPixels: 100
        });

        // Take screenshot in dark mode
        await page.getByLabel(/theme/i).selectOption('dark');
        await page.waitForTimeout(500);
        await expect(page).toHaveScreenshot('dark-theme.png', {
            fullPage: false,
            maxDiffPixels: 100
        });
    });
});
