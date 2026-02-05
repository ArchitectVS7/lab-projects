import { test, expect } from '@playwright/test';
import { generateUniqueEmail } from './helpers';

const PASSWORD = 'TestPass123';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    const email = generateUniqueEmail();
    await page.goto('/register');

    const nameInput = page.locator('#name, input[name="name"]').first();
    const emailInput = page.locator('#email, input[name="email"]').first();
    const passwordInput = page.locator('#password, input[name="password"]').first();
    const confirmInput = page.locator('#confirmPassword, input[name="confirmPassword"]').first();

    await nameInput.fill('Dashboard Test User');
    await emailInput.fill(email);
    await passwordInput.fill(PASSWORD);

    if (await confirmInput.isVisible()) {
      await confirmInput.fill(PASSWORD);
    }

    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should show dashboard after login', async ({ page }) => {
    // Look for dashboard heading or main content
    const hasDashboard = await page.locator('h1').first().isVisible() ||
                         await page.locator('main').first().isVisible();
    expect(hasDashboard).toBe(true);
  });

  test('should show main content area', async ({ page }) => {
    await expect(page.locator('main, [class*="container"], div[class*="mx-auto"]').first()).toBeVisible();
  });

  test('should navigate to projects from nav', async ({ page }) => {
    await page.click('a:has-text("Projects")');
    await expect(page).toHaveURL('/projects');
  });

  test('should show navbar', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible();
  });
});
