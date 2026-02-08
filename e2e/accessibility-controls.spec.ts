import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { generateTestUser } from './helpers/fixtures';

test.describe('Accessibility Controls', () => {
    test.beforeEach(async ({ page }) => {
        const user = generateTestUser('accessibility');
        await registerUser(page, user);
        await page.goto('/profile');
        await page.waitForTimeout(1000); // Wait for page to load
    });

    test('displays color theme picker', async ({ page }) => {
        // Verify Appearance section exists
        await expect(page.getByText('Appearance')).toBeVisible();

        // Find theme picker buttons using test id
        const themeButtons = page.locator('[data-testid^="color-theme-option-"]');
        await expect(themeButtons.first()).toBeVisible({ timeout: 5000 });

        // Get count of theme buttons
        const count = await themeButtons.count();
        expect(count).toBeGreaterThanOrEqual(3);
    });

    test('switches between color themes', async ({ page }) => {
        // Check initial state (assuming indigo is default or just pick one)
        const purpleTheme = page.locator('[data-testid="color-theme-option-purple"]');
        await expect(purpleTheme).toBeVisible();

        // Click purple theme
        await purpleTheme.click();
        await page.waitForTimeout(500);

        // Verify theme changed (button should have ring)
        await expect(purpleTheme).toHaveClass(/ring-2/);
    });

    test('displays layout switcher', async ({ page }) => {
        // Verify Interface Layout section exists
        await expect(page.getByText('Interface Layout')).toBeVisible();

        // Check specific layout options exist
        await expect(page.locator('[data-testid="layout-option-compact"]')).toBeVisible();
        await expect(page.locator('[data-testid="layout-option-default"]')).toBeVisible();
        await expect(page.locator('[data-testid="layout-option-spacious"]')).toBeVisible();
    });

    test('displays density picker', async ({ page }) => {
        // Verify Display Density section exists
        await expect(page.getByText('Display Density')).toBeVisible();

        // Check density options
        await expect(page.locator('[data-testid="density-option-compact"]')).toBeVisible();
        await expect(page.locator('[data-testid="density-option-comfortable"]')).toBeVisible();
        await expect(page.locator('[data-testid="density-option-spacious"]')).toBeVisible();
    });

    test('theme toggle switches dark mode', async ({ page }) => {
        // Find theme toggle button (dark mode)
        const darkModeBtn = page.locator('[data-testid="theme-toggle-dark"]');

        if (await darkModeBtn.isVisible()) {
            const html = page.locator('html');
            // Click dark mode
            await darkModeBtn.click();
            await page.waitForTimeout(500);

            // Verify class changed to dark
            await expect(html).toHaveClass(/dark/);

            // Switch back to light
            await page.locator('[data-testid="theme-toggle-light"]').click();
            await page.waitForTimeout(500);
            await expect(html).not.toHaveClass(/dark/);
        }
    });

    test('profile information form exists', async ({ page }) => {
        await expect(page.getByText('Profile Information')).toBeVisible();
        await expect(page.getByLabel('Name')).toBeVisible();
        await expect(page.getByLabel('Email')).toBeVisible();
    });

    test('password change form exists', async ({ page }) => {
        await expect(page.getByText('Change Password')).toBeVisible();
        await expect(page.getByLabel('Current Password')).toBeVisible();
        await expect(page.getByLabel('New Password')).toBeVisible();
        await expect(page.getByLabel('Confirm New Password')).toBeVisible();
    });
});
