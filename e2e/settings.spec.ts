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
        await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible();

        // Update name
        const newName = 'Updated Name ' + Date.now();
        const nameInput = page.locator('input').filter({ has: page.locator('xpath=ancestor::*[contains(., "Name")]') }).first();
        // Alternative: find input near "Name" label
        await page.getByRole('textbox').first().clear();
        await page.getByRole('textbox').first().fill(newName);

        await page.getByRole('button', { name: 'Save Changes' }).click();

        // Verify toast
        await expect(page.getByText(/profile updated|success/i)).toBeVisible({ timeout: 5000 });
    });

    test('api keys management', async ({ page }) => {
        await page.goto('/api-keys');
        await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible();

        // Click Create Key button
        await page.getByRole('button', { name: 'Create Key' }).click();

        // Fill in key name (form appears inline after clicking)
        const keyName = 'Test Key ' + Date.now();
        await page.getByRole('textbox').fill(keyName);

        // Click Create button in the form (exact match to avoid event pills)
        await page.getByRole('button', { name: 'Create', exact: true }).click();

        // Verify key created message (the green success box)
        await expect(page.getByText('API key created successfully')).toBeVisible({ timeout: 5000 });

        // Dismiss the secret display
        await page.getByRole('button', { name: 'Dismiss' }).click();

        // Verify key appears in list
        await expect(page.getByText(keyName)).toBeVisible();

        // Revoke Key - click trash icon, then confirm
        await page.locator('button[title*="Revoke"], button:has(svg)').filter({ has: page.locator('svg') }).last().click();

        // Confirm revocation (Yes button)
        await page.getByRole('button', { name: 'Yes' }).click();

        // Verify key removed
        await expect(page.getByText(keyName)).not.toBeVisible({ timeout: 5000 });
    });

    test('webhooks management', async ({ page }) => {
        await page.goto('/webhooks');
        await expect(page.getByRole('heading', { name: 'Webhooks' })).toBeVisible();

        // Add Webhook
        await page.getByRole('button', { name: 'Add Webhook' }).click();

        // Fill in URL (inline form appears)
        const webhookUrl = 'https://example.com/hook-' + Date.now();
        await page.getByRole('textbox').fill(webhookUrl);

        // Select at least one event
        await page.getByRole('button', { name: 'task.created' }).click();

        // Create (exact match to avoid event pills)
        await page.getByRole('button', { name: 'Create', exact: true }).click();

        // Verify webhook appears (secret display first)
        await expect(page.getByText(/signing secret|webhook created/i)).toBeVisible({ timeout: 5000 });

        // Dismiss secret display
        await page.getByRole('button', { name: 'Dismiss' }).click();

        // Verify webhook URL in list
        await expect(page.getByText(webhookUrl)).toBeVisible();

        // Delete Webhook - click delete icon
        await page.locator('button[title*="Delete"], button:has(svg)').filter({ has: page.locator('svg') }).last().click();

        // Confirm deletion
        await page.getByRole('button', { name: 'Yes' }).click();

        // Verify webhook removed
        await expect(page.getByText(webhookUrl)).not.toBeVisible({ timeout: 5000 });
    });
});
