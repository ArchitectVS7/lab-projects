import { test, expect } from '@playwright/test';
import { generateUniqueEmail } from './helpers';

const PASSWORD = 'TestPass123';

test.describe('Projects', () => {
  test.beforeEach(async ({ page }) => {
    const email = generateUniqueEmail();
    await page.goto('/register');

    const nameInput = page.locator('#name, input[name="name"]').first();
    const emailInput = page.locator('#email, input[name="email"]').first();
    const passwordInput = page.locator('#password, input[name="password"]').first();
    const confirmInput = page.locator('#confirmPassword, input[name="confirmPassword"]').first();

    await nameInput.fill('Project Test User');
    await emailInput.fill(email);
    await passwordInput.fill(PASSWORD);

    if (await confirmInput.isVisible()) {
      await confirmInput.fill(PASSWORD);
    }

    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should navigate to projects page', async ({ page }) => {
    await page.click('a:has-text("Projects")');
    await expect(page).toHaveURL('/projects');
  });

  test('should show projects page content', async ({ page }) => {
    await page.goto('/projects');
    // Should show either projects heading or main content
    const hasContent = await page.locator('h1').first().isVisible() ||
                       await page.locator('main').first().isVisible();
    expect(hasContent).toBe(true);
  });

  test('should have new project button', async ({ page }) => {
    await page.goto('/projects');
    const newButton = page.locator('button').filter({ hasText: /new|create|add/i });
    await expect(newButton.first()).toBeVisible();
  });

  test('should open create project modal', async ({ page }) => {
    await page.goto('/projects');
    const newButton = page.locator('button').filter({ hasText: /new|create/i }).first();
    await newButton.click();
    await page.waitForTimeout(500);

    // Should show form with input
    const hasModal = await page.locator('input').first().isVisible();
    expect(hasModal).toBe(true);
  });

  test('should create a new project', async ({ page }) => {
    await page.goto('/projects');

    const newButton = page.locator('button').filter({ hasText: /new|create/i }).first();
    await newButton.click();
    await page.waitForTimeout(500);

    // Fill project name - find first text input in modal/form
    const nameInput = page.locator('input[type="text"], input:not([type])').first();
    await nameInput.fill('Test Project');

    // Submit - find the create/save button in the form
    const submitBtn = page.locator('button').filter({ hasText: /create|save|submit/i }).last();
    await submitBtn.click();

    // Should show the new project
    await expect(page.locator('text=Test Project')).toBeVisible({ timeout: 10000 });
  });
});
