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

    await page.getByPlaceholder('Task title').fill(taskTitle);

    // Select project
    const projectSelect = page.locator('select').filter({
      has: page.locator(`option:text("${projectName}")`),
    });
    await projectSelect.selectOption({ label: projectName });

    await page.getByRole('button', { name: 'Create' }).click();

    // Task visible in list
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10_000 });
  });

  test('user can change task status', async ({ page }) => {
    const taskTitle = generateTaskTitle('StatusChange');

    await page.getByRole('link', { name: 'Tasks' }).click();
    await page.getByRole('button', { name: 'New Task' }).click();
    await page.getByPlaceholder('Task title').fill(taskTitle);

    const projectSelect = page.locator('select').filter({
      has: page.locator(`option:text("${projectName}")`),
    });
    await projectSelect.selectOption({ label: projectName });
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10_000 });

    // Find task row and change status
    const taskRow = page.locator('tr').filter({ hasText: taskTitle });
    const statusSelect = taskRow.locator('select');
    await expect(statusSelect).toHaveValue('TODO');

    await statusSelect.selectOption('DONE');
    await page.waitForTimeout(1_000);
    await expect(statusSelect).toHaveValue('DONE');
  });

  test('user can switch between table and kanban views', async ({ page }) => {
    const taskTitle = generateTaskTitle('ViewSwitch');

    await page.getByRole('link', { name: 'Tasks' }).click();
    await page.getByRole('button', { name: 'New Task' }).click();
    await page.getByPlaceholder('Task title').fill(taskTitle);
    const projectSelect = page.locator('select').filter({
      has: page.locator(`option:text("${projectName}")`),
    });
    await projectSelect.selectOption({ label: projectName });
    await page.getByRole('button', { name: 'Create' }).click();
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
    await page.getByPlaceholder('Task title').fill(taskA);

    // Select project
    await page.getByLabel('Project *').selectOption({ label: projectName });

    // Wait for the button to be enabled
    const taskCreateBtn = page.getByRole('button', { name: 'Create', exact: true });
    await expect(taskCreateBtn).toBeEnabled({ timeout: 10000 });
    await taskCreateBtn.click();
    await expect(page.getByText(taskA)).toBeVisible({ timeout: 10000 });

    // Create Task B
    await page.getByRole('button', { name: 'New Task' }).click();
    await page.getByPlaceholder('Task title').fill(taskB);
    await page.getByLabel('Project *').selectOption({ label: projectName });

    const taskBCreateBtn = page.getByRole('button', { name: 'Create', exact: true });
    await expect(taskBCreateBtn).toBeEnabled({ timeout: 10000 });
    await taskBCreateBtn.click();
    await expect(page.getByText(taskB)).toBeVisible({ timeout: 10000 });

    // Open Task A and add Task B as dependency
    await page.getByText(taskA).click();
    await page.getByRole('button', { name: 'Add dependency' }).click();
    await page.locator('select').last().selectOption({ label: taskB });

    // Verify dependency in list
    await expect(page.getByText(taskB)).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');

    // Verify blocked indicator in table
    const taskARow = page.locator('tr').filter({ hasText: taskA });
    await expect(taskARow.locator('[title*="Blocked by"]')).toBeVisible();

    const taskBRow = page.locator('tr').filter({ hasText: taskB });
    await expect(taskBRow.locator('[title*="Blocking"]')).toBeVisible();

    // Remove dependency
    await page.getByText(taskA).click();
    // Select the remove button specifically inside the dependency list
    await page.locator('button').filter({ has: page.locator('svg') }).last().click();
    await expect(page.getByText(taskB)).not.toBeVisible();
  });

  test('empty state shown when no tasks exist', async ({ page }) => {
    await page.getByRole('link', { name: 'Tasks' }).click();
    await expect(page.getByText('No tasks yet')).toBeVisible({ timeout: 10_000 });
  });
});
