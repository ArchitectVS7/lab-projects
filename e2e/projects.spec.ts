import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { generateTestUser, generateProjectName } from './helpers/fixtures';

test.describe('Projects', () => {
  test.beforeEach(async ({ page }) => {
    const user = generateTestUser('projects');
    await registerUser(page, user);
  });

  test('user can create a new project', async ({ page }) => {
    const projectName = generateProjectName();

    await page.getByRole('link', { name: 'Projects' }).click();

    await page.getByRole('button', { name: 'New Project' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Project name').fill(projectName);
    await dialog.getByPlaceholder('Optional description').fill('E2E test project');
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();

    // Modal closes, project visible in list
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 10_000 });
  });

  test('project appears in list after creation', async ({ page }) => {
    const projectName = generateProjectName('Listed');

    await page.getByRole('link', { name: 'Projects' }).click();
    await page.getByRole('button', { name: 'New Project' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Project name').fill(projectName);
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.getByText(projectName)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('0 tasks').first()).toBeVisible();
  });

  test('user can navigate to project detail', async ({ page }) => {
    const projectName = generateProjectName('Detail');

    await page.getByRole('link', { name: 'Projects' }).click();
    await page.getByRole('button', { name: 'New Project' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Project name').fill(projectName);
    await dialog.getByPlaceholder('Optional description').fill('Detail view test');
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 10_000 });

    // Click project to go to detail
    await page.getByText(projectName).click();

    await expect(page.getByRole('heading', { name: projectName })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Detail view test')).toBeVisible();
  });

  test('empty state shown when no projects exist', async ({ page }) => {
    await page.getByRole('link', { name: 'Projects' }).click();
    await expect(page.getByText('No projects yet')).toBeVisible({ timeout: 10_000 });
  });
});
