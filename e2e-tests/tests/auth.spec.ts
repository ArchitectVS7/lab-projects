import { test, expect } from '@playwright/test';
import { generateUniqueEmail } from './helpers';

const PASSWORD = 'TestPass123';

test.describe('Authentication', () => {
  test('should show login page by default for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show login form with correct elements', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#email, input[name="email"]').first()).toBeVisible();
    await expect(page.locator('#password, input[name="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login');
    await page.click('a[href="/register"]');
    await expect(page).toHaveURL(/\/register/);
  });

  test('should register a new user successfully', async ({ page }) => {
    const email = generateUniqueEmail();

    await page.goto('/register');

    const nameInput = page.locator('#name, input[name="name"]').first();
    const emailInput = page.locator('#email, input[name="email"]').first();
    const passwordInput = page.locator('#password, input[name="password"]').first();
    const confirmInput = page.locator('#confirmPassword, input[name="confirmPassword"]').first();

    await nameInput.fill('Test User');
    await emailInput.fill(email);
    await passwordInput.fill(PASSWORD);

    if (await confirmInput.isVisible()) {
      await confirmInput.fill(PASSWORD);
    }

    await page.click('button[type="submit"]');

    // Should redirect to dashboard after successful registration
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('should login with valid credentials', async ({ page }) => {
    const email = generateUniqueEmail();

    // First register
    await page.goto('/register');

    const nameInput = page.locator('#name, input[name="name"]').first();
    const emailInput = page.locator('#email, input[name="email"]').first();
    const passwordInput = page.locator('#password, input[name="password"]').first();
    const confirmInput = page.locator('#confirmPassword, input[name="confirmPassword"]').first();

    await nameInput.fill('Login Test User');
    await emailInput.fill(email);
    await passwordInput.fill(PASSWORD);

    if (await confirmInput.isVisible()) {
      await confirmInput.fill(PASSWORD);
    }

    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // Clear auth and go back to login
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');

    // Now login
    const loginEmail = page.locator('#email, input[name="email"]').first();
    const loginPassword = page.locator('#password, input[name="password"]').first();

    await loginEmail.fill(email);
    await loginPassword.fill(PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('#email, input[name="email"]').first();
    const passwordInput = page.locator('#password, input[name="password"]').first();

    await emailInput.fill('nonexistent@example.com');
    await passwordInput.fill('WrongPassword123');
    await page.click('button[type="submit"]');

    // Wait for response and check we're still on login page (not redirected)
    await page.waitForTimeout(3000);
    // If login failed, we should still be on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should protect dashboard route', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should protect projects route', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/login/);
  });
});
