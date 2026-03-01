import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { generateTestUser } from './helpers/fixtures';

test.describe('Settings & Profile', () => {
    let user: { email: string; password: string; name: string };

    test.beforeEach(async ({ page }) => {
        user = generateTestUser('settings');
        await registerUser(page, user);
    });

    test('profile page allows updating user details', async ({ page }) => {
        // Navigate to Profile
        await page.goto('/profile');
        await expect(page.getByText('Profile Information')).toBeVisible();

        // Update name
        const newName = 'Updated Name ' + Date.now();
        await page.locator('#name').clear();
        await page.locator('#name').fill(newName);

        await page.getByRole('button', { name: 'Save Changes' }).click();

        // Verify toast
        await expect(page.getByText(/profile updated|success/i)).toBeVisible({ timeout: 5000 });
    });

    test('api keys page loads correctly', async ({ page }) => {
        await page.goto('/api-keys');

        // API Keys page should render with heading and create button
        await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Create Key' })).toBeVisible();

        // Should show security warning
        await expect(page.getByText(/keep your api keys secure/i)).toBeVisible();
    });

    test('webhooks page loads correctly', async ({ page }) => {
        await page.goto('/webhooks');

        // Webhooks page should render with heading and add button
        await expect(page.getByRole('heading', { name: 'Webhooks' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Add Webhook' })).toBeVisible();

        // Should show empty state
        await expect(page.getByText('No webhooks')).toBeVisible();
    });
});
