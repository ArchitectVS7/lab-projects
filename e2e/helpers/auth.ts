import { type Page, expect } from '@playwright/test';

interface UserCredentials {
  email: string;
  password: string;
  name?: string;
}

const ALL_FEATURE_IDS = ['dashboard', 'checkin', 'tasks', 'projects', 'calendar', 'focus', 'agents'];

async function suppressInAppTutorials(page: Page): Promise<void> {
  // addInitScript runs before React on every full page load, so HelpContext
  // initializes seenFeatures with all IDs already present.
  await page.addInitScript((ids) => {
    localStorage.setItem('tm_seenFeatures', JSON.stringify(ids));
    localStorage.setItem('hasSeenOnboarding', 'true');
  }, ALL_FEATURE_IDS);
  // Also set for the currently-loaded page (already mounted).
  await page.evaluate((ids) => {
    localStorage.setItem('tm_seenFeatures', JSON.stringify(ids));
    localStorage.setItem('hasSeenOnboarding', 'true');
  }, ALL_FEATURE_IDS);

  // Also dismiss the onboarding modal if it still appeared (race condition guard)
  const skipButton = page.getByRole('button', { name: 'Skip' });
  if (await skipButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skipButton.click();
    await expect(skipButton).not.toBeVisible({ timeout: 3000 }).catch(() => {});
  }
}

export async function registerUser(page: Page, user: UserCredentials): Promise<void> {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();

  await page.getByLabel('Name').fill(user.name || 'Test User');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByLabel('Confirm password').fill(user.password);

  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL('/', { timeout: 15_000 });
  await suppressInAppTutorials(page);
}

export async function loginUser(page: Page, user: UserCredentials): Promise<void> {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);

  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL('/', { timeout: 15_000 });
  await suppressInAppTutorials(page);
}

export async function logout(page: Page): Promise<void> {
  await suppressInAppTutorials(page);
  await page.getByTitle('Logout').click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({
    timeout: 10_000,
  });
}
