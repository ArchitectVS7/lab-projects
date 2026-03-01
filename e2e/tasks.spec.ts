import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { generateTestUser, generateProjectName, generateTaskTitle } from './helpers/fixtures';

async function createProjectViaUI(page: import('@playwright/test').Page, projectName: string) {
  await page.getByRole('link', { name: 'Projects' }).click();
  await page.getByRole('button', { name: 'New Project' }).click();
  await page.getByPlaceholder('Project name').fill(projectName);
  const createBtn = page.getByRole('button', { name: 'Create', exact: true });
  await expect(createBtn).toBeEnabled({ timeout: 10000 });
  await createBtn.click();
  await expect(page.getByText(projectName)).toBeVisible({ timeout: 10000 });
}

test.describe('Tasks', () => {
  let projectName: string;

  test.beforeEach(async ({ page }) => {
    const user = generateTestUser('tasks');
    projectName = generateProjectName('TaskTest');
    await registerUser(page, user);
    await createProjectViaUI(page, projectName);
  });

  test('user can create a task', async ({ page }) => {
    const taskTitle = generateTaskTitle();

    await page.getByRole('link', { name: 'Tasks' }).click();
    await page.getByRole('button', { name: 'New Task' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Task title').fill(taskTitle);

    // Select project inside the modal (target the project select specifically)
    const projectSelect = dialog.locator('select').filter({ hasText: 'Select a project' });
    await projectSelect.selectOption({ label: projectName });

    await dialog.getByRole('button', { name: 'Create' }).click();

    // Task visible in list
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10_000 });
  });

  test('user can change task status', async ({ page }) => {
    const taskTitle = generateTaskTitle('StatusChange');

    await page.getByRole('link', { name: 'Tasks' }).click();
    await page.getByRole('button', { name: 'New Task' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Task title').fill(taskTitle);
    await dialog.locator('select').filter({ hasText: 'Select a project' }).selectOption({ label: projectName });
    await dialog.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10_000 });

    // Find task row and change status via the Edit modal
    const taskRow = page.locator('tr').filter({ hasText: taskTitle });
    await expect(taskRow).toBeVisible({ timeout: 10000 });

    // Open task detail modal
    await taskRow.getByRole('button', { name: 'Edit' }).click();
    const statusDialog = page.getByRole('dialog');
    await expect(statusDialog).toBeVisible({ timeout: 5000 });

    // Change status in the modal
    const modalStatusSelect = statusDialog.locator('select').filter({ hasText: 'To Do' });
    await modalStatusSelect.selectOption('DONE');

    // Save the change
    await statusDialog.getByRole('button', { name: /update/i }).click();

    // Verify task status changed in the table after modal closes
    await page.waitForTimeout(2000);
    const updatedRow = page.locator('tr').filter({ hasText: taskTitle });
    const updatedStatus = updatedRow.locator('select');
    await expect(updatedStatus).toHaveValue('DONE', { timeout: 10000 });
  });

  test('user can switch between table and kanban views', async ({ page }) => {
    const taskTitle = generateTaskTitle('ViewSwitch');

    await page.getByRole('link', { name: 'Tasks' }).click();
    await page.getByRole('button', { name: 'New Task' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Task title').fill(taskTitle);
    await dialog.locator('select').filter({ hasText: 'Select a project' }).selectOption({ label: projectName });
    await dialog.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10_000 });

    // Switch to Kanban
    await page.getByRole('button', { name: 'Kanban' }).click();
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 5_000 });

    // Switch back to Table
    await page.getByRole('button', { name: 'Table' }).click();
    await expect(page.getByText(taskTitle)).toBeVisible();
  });

  test('user can manage task dependencies', async ({ page }) => {
    const taskA = generateTaskTitle('TaskA');
    const taskB = generateTaskTitle('TaskB');

    await page.getByRole('link', { name: 'Tasks' }).click();

    // Create Task A
    await page.getByRole('button', { name: 'New Task' }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Task title').fill(taskA);
    await dialog.locator('select').filter({ hasText: 'Select a project' }).selectOption({ label: projectName });
    const taskCreateBtn = dialog.getByRole('button', { name: 'Create', exact: true });
    await expect(taskCreateBtn).toBeEnabled({ timeout: 10000 });
    await taskCreateBtn.click();
    await expect(page.getByText(taskA)).toBeVisible({ timeout: 10000 });

    // Create Task B
    await page.getByRole('button', { name: 'New Task' }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Task title').fill(taskB);
    await dialog.locator('select').filter({ hasText: 'Select a project' }).selectOption({ label: projectName });
    const taskBCreateBtn = dialog.getByRole('button', { name: 'Create', exact: true });
    await expect(taskBCreateBtn).toBeEnabled({ timeout: 10000 });
    await taskBCreateBtn.click();
    await expect(page.getByText(taskB)).toBeVisible({ timeout: 10000 });

    // Open Task A detail modal via Edit button
    const taskARow = page.locator('tr').filter({ hasText: taskA });
    await taskARow.getByRole('button', { name: 'Edit' }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Click "Add dependency" button inside the modal
    await dialog.getByText('Add dependency').click();

    // Select Task B from the dependency dropdown
    const depSelect = dialog.locator('select').filter({ hasText: 'Select a task...' });
    await depSelect.selectOption({ label: taskB });

    // Wait for dependency to be added and dropdown to close
    await page.waitForTimeout(1000);

    // Close modal
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Reload to see dependency indicators
    await page.reload();
    await page.waitForTimeout(2000);

    // Verify blocked indicator in table
    const taskARowAfter = page.locator('tr').filter({ hasText: taskA });
    await expect(taskARowAfter.locator('[title*="Blocked by"]')).toBeVisible({ timeout: 10000 });
  });

  test('empty state shown when no tasks exist', async ({ page }) => {
    await page.getByRole('link', { name: 'Tasks' }).click();
    await expect(page.getByText('No tasks yet')).toBeVisible({ timeout: 10_000 });
  });
});
