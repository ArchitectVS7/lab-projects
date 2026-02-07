import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { generateTestUser, generateProjectName, generateTaskTitle } from './helpers/fixtures';
import { ApiHelper } from './helpers/api';

test.describe('Search & Command Palette', () => {
    let api: ApiHelper;
    let user: { email: string; password: string; name: string };
    let projectId: string;
    let taskTitle: string;

    test.beforeEach(async ({ page, request }) => {
        page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
        page.on('pageerror', err => console.error(`BROWSER ERROR: ${err.message}`));

        user = generateTestUser('search');
        const projectName = generateProjectName('SearchProject');
        taskTitle = generateTaskTitle('FindMeTask');

        // 1. UI Register
        await registerUser(page, user);

        // 2. Setup via API
        api = new ApiHelper(request);
        await api.login(user.email, user.password);
        const project = await api.createProject(projectName);
        projectId = project.id;
        await api.createTask(projectId, taskTitle, { priority: 'HIGH' });

        // Navigate to Dashboard
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible({ timeout: 15000 });
    });

    test('user can navigate using command palette', async ({ page }) => {
        // Open Command Palette
        await page.waitForTimeout(1000); // Give it a moment to boot
        await page.keyboard.press('Control+KeyK');
        const palette = page.getByRole('dialog');
        await expect(palette).toBeVisible({ timeout: 10000 });

        // Search for "Projects"
        await palette.getByPlaceholder(/type a command/i).fill('Projects');
        await palette.getByRole('button', { name: /go to projects/i }).click();

        // Verify URL
        await expect(page).toHaveURL(/.*projects/);
        await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
    });

    test('user can search for tasks across the app', async ({ page }) => {
        // Open Command Palette
        await page.waitForTimeout(1000);
        await page.keyboard.press('Control+KeyK');
        const palette = page.getByRole('dialog');

        // Search for the specific task
        await palette.getByPlaceholder(/type a command/i).fill(taskTitle);

        // Wait for search results
        const taskResult = palette.getByRole('button', { name: taskTitle });
        await expect(taskResult).toBeVisible({ timeout: 10000 });
        await taskResult.click();

        // Should open the Tasks page with that task's detail modal (or detail view)
        // Based on TasksPage, it might navigate and set query params
        await expect(page).toHaveURL(/.*tasks/);
        const modal = page.getByRole('dialog');
        // The modal might take a moment to appear based on the navigate logic
        await expect(modal).toBeVisible({ timeout: 10000 });
        await expect(modal.getByText(taskTitle)).toBeVisible();
    });

    test('user can filter tasks on the tasks page', async ({ page }) => {
        await page.getByRole('link', { name: 'Tasks', exact: true }).click();
        await page.waitForURL('**/tasks');

        // Verify we see our task
        await expect(page.getByText(taskTitle)).toBeVisible();

        // Filter by Priority: High
        const priorityFilter = page.locator('select').filter({ hasText: /all priorities/i });
        await priorityFilter.selectOption('HIGH');

        // Create another task with low priority to verify filtering works
        await api.createTask(projectId, 'Other Low Task', { priority: 'LOW' });
        await page.reload();

        // Verify High priority task is visible, Low is not (when filtered)
        await priorityFilter.selectOption('HIGH');
        await expect(page.getByText(taskTitle)).toBeVisible();
        await expect(page.getByText('Other Low Task')).not.toBeVisible();

        // Filter by Status: To Do (default)
        const statusFilter = page.locator('select').filter({ hasText: /all statuses/i });
        await statusFilter.selectOption('DONE');
        await expect(page.getByText(taskTitle)).not.toBeVisible();

        // Clear filters
        await page.getByRole('button', { name: /clear all filters/i }).click();
        await expect(page.getByText(taskTitle)).toBeVisible();
        await expect(page.getByText('Other Low Task')).toBeVisible();
    });
});
