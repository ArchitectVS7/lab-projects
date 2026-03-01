import { test, expect, type Page } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { generateTestUser } from './helpers/fixtures';

// Scope nav link lookups to the sidebar to avoid ambiguity with dashboard content links
function navLink(page: Page, name: string) {
  return page.locator('nav, [role="navigation"]').getByRole('link', { name }).first();
}

test.describe('Navigation', () => {

  test.beforeEach(async ({ page }) => {
    const user = generateTestUser('nav');
    await registerUser(page, user);
  });

  test('sidebar shows all navigation links', async ({ page }) => {
    await expect(navLink(page, 'Dashboard')).toBeVisible();
    await expect(navLink(page, 'Tasks')).toBeVisible();
    await expect(navLink(page, 'Projects')).toBeVisible();
    await expect(navLink(page, 'Calendar')).toBeVisible();
    await expect(navLink(page, 'Focus')).toBeVisible();
    await expect(navLink(page, 'Creators')).toBeVisible();
  });

  test('can navigate to Tasks page', async ({ page }) => {
    await navLink(page, 'Tasks').click();
    expect(page.url()).toContain('/tasks');
  });

  test('can navigate to Projects page', async ({ page }) => {
    await navLink(page, 'Projects').click();
    expect(page.url()).toContain('/projects');
  });

  test('can navigate to Calendar page', async ({ page }) => {
    await navLink(page, 'Calendar').click();
    expect(page.url()).toContain('/calendar');
  });

  test('can navigate back to Dashboard', async ({ page }) => {
    await navLink(page, 'Tasks').click();
    await navLink(page, 'Dashboard').click();
    expect(page.url()).toMatch(/\/$/);
  });
});
