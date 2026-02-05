import { Page } from '@playwright/test';

export const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPass123',
  name: 'Test User',
};

export async function registerUser(page: Page, user = TEST_USER) {
  await page.goto('/register');
  await page.fill('input[name="name"]', user.name);
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.fill('input[name="confirmPassword"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

export async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

export async function logout(page: Page) {
  // Click on user menu
  await page.click('button:has-text("Test")');
  await page.waitForTimeout(300);
  // Click sign out
  await page.click('button:has-text("Sign out")');
  await page.waitForURL('/login');
}

export function generateUniqueEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}
