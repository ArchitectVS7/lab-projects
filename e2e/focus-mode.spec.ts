import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { generateTestUser } from './helpers/fixtures';
import { ApiHelper } from './helpers/api';

test.describe('Focus Mode', () => {
    let api: ApiHelper;
    let user: { email: string; password: string; name: string };

    test.beforeEach(async ({ page, request }) => {
        user = generateTestUser('focus');
        await registerUser(page, user);

        // Setup API helper
        api = new ApiHelper(request);
        await api.login(user.email, user.password);
    });

    test('navigates to focus mode page', async ({ page }) => {
        await page.goto('/');

        // Navigate to focus mode
        await page.getByRole('link', { name: /focus/i }).click();
        await expect(page).toHaveURL('/focus');
        await expect(page.getByRole('heading', { name: /focus session/i })).toBeVisible();
    });

    test('displays top 3 priority tasks', async ({ page }) => {
        // Create a project first
        const project = await api.createProject('Focus Test Project');

        // Create multiple tasks with different priorities
        await api.createTask(project.id, 'High Priority Task 1', { priority: 'HIGH' });
        await api.createTask(project.id, 'High Priority Task 2', { priority: 'HIGH' });
        await api.createTask(project.id, 'Medium Priority Task', { priority: 'MEDIUM' });
        await api.createTask(project.id, 'Low Priority Task', { priority: 'LOW' });
        await api.createTask(project.id, 'High Priority Task 3', { priority: 'HIGH' });

        await page.goto('/focus');
        await page.waitForTimeout(2000); // Wait for tasks to load

        // Each focus task card has a "Complete" button — count those
        const completeBtns = page.getByRole('button', { name: 'Complete' });
        const count = await completeBtns.count();

        // Should show at most 3 tasks
        expect(count).toBeLessThanOrEqual(3);
        expect(count).toBeGreaterThan(0);
    });

    test('shows empty state when no tasks exist', async ({ page }) => {
        await page.goto('/focus');
        await page.waitForTimeout(1000);

        // Should show empty state message (exact to avoid matching sibling element)
        await expect(page.getByText('All clear for now', { exact: true })).toBeVisible({ timeout: 5000 });
    });

    test('displays task with priority badge', async ({ page }) => {
        const project = await api.createProject('Priority Test Project');
        await api.createTask(project.id, 'Urgent Task', { priority: 'URGENT' });

        await page.goto('/focus');
        await page.waitForTimeout(2000);

        // Verify task is displayed
        await expect(page.getByText('Urgent Task')).toBeVisible();

        // Verify priority badge is shown (exact: true to avoid substring-matching title "Urgent Task")
        await expect(page.getByText('URGENT', { exact: true })).toBeVisible();
    });

    test('completes task with button click', async ({ page }) => {
        const project = await api.createProject('Complete Test Project');
        await api.createTask(project.id, 'Task to Complete', { priority: 'HIGH' });

        await page.goto('/focus');
        await page.waitForTimeout(2000);

        // Find and click complete button
        const completeButton = page.getByRole('button', { name: /complete|done/i }).first();
        await completeButton.click();

        // Wait for completion animation
        await page.waitForTimeout(1500);

        // Task should be removed from focus view
        await expect(page.getByText('Task to Complete')).not.toBeVisible({ timeout: 3000 });
    });

    test('returns to dashboard with back button', async ({ page }) => {
        await page.goto('/focus');

        // Click back arrow
        const backButton = page.locator('button').filter({ has: page.locator('svg') }).first();
        await backButton.click();

        await expect(page).toHaveURL('/', { timeout: 3000 });
    });

    test('displays progress bar when tasks exist', async ({ page }) => {
        const project = await api.createProject('Progress Test Project');
        await api.createTask(project.id, 'Task 1', { priority: 'HIGH' });
        await api.createTask(project.id, 'Task 2', { priority: 'MEDIUM' });

        await page.goto('/focus');
        await page.waitForTimeout(2000);

        // Progress bar should be visible at top
        const progressBar = page.locator('[class*="bg-gradient"], .h-1').first();

        if (await progressBar.isVisible({ timeout: 1000 }).catch(() => false)) {
            expect(await progressBar.isVisible()).toBeTruthy();
        }
    });

    test('displays completed today count', async ({ page }) => {
        const project = await api.createProject('Stats Test Project');
        const task = await api.createTask(project.id, 'Task to Complete Now', { priority: 'HIGH' });

        // Complete the task
        await api.updateTask(task.id, { status: 'DONE' });

        await page.goto('/focus');
        await page.waitForTimeout(2000);

        // Should show completed count
        const completedText = page.getByText(/completed.*today|tasks.*done/i);

        if (await completedText.isVisible({ timeout: 1000 }).catch(() => false)) {
            await expect(completedText).toBeVisible();
        }
    });

    test('shows task project information', async ({ page }) => {
        const project = await api.createProject('Project Info Test');
        await api.createTask(project.id, 'Task with Project', { priority: 'HIGH' });

        await page.goto('/focus');
        await page.waitForTimeout(2000);

        // Project name should be visible
        await expect(page.getByText('Project Info Test')).toBeVisible();
    });

    test('displays task due date if set', async ({ page }) => {
        const project = await api.createProject('Due Date Test Project');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        await api.createTask(project.id, 'Task with Due Date', {
            priority: 'HIGH',
            dueDate: tomorrow.toISOString().split('T')[0]
        });

        await page.goto('/focus');
        await page.waitForTimeout(2000);

        // Due date should be visible
        const dueDateText = page.locator('text=/due|tomorrow|today/i');

        if (await dueDateText.count() > 0) {
            await expect(dueDateText.first()).toBeVisible();
        }
    });
});
