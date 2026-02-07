import { test, expect } from '@playwright/test';
import { registerUser, loginUser } from './helpers/auth';
import { generateTestUser } from './helpers/fixtures';
import { createTask } from './helpers/api';

test.describe('Focus Mode', () => {
    test.beforeEach(async ({ page }) => {
        const user = generateTestUser('focus');
        await registerUser(page, user);
    });

    test('navigates to focus mode page', async ({ page }) => {
        await page.goto('/');

        // Navigate to focus mode
        await page.getByRole('link', { name: /focus/i }).click();
        await expect(page).toHaveURL('/focus');
        await expect(page.getByRole('heading', { name: /focus mode/i })).toBeVisible();
    });

    test('displays top 3 priority tasks', async ({ page }) => {
        // Create multiple tasks with different priorities
        const tasks = [
            { title: 'High Priority Task 1', priority: 'HIGH' },
            { title: 'High Priority Task 2', priority: 'HIGH' },
            { title: 'Medium Priority Task', priority: 'MEDIUM' },
            { title: 'Low Priority Task', priority: 'LOW' },
            { title: 'High Priority Task 3', priority: 'HIGH' },
        ];

        for (const task of tasks) {
            await createTask(page, task);
        }

        await page.goto('/focus');

        // Should display only top 3 tasks
        const taskCards = page.locator('[data-testid="focus-task-card"]');
        await expect(taskCards).toHaveCount(3);

        // Verify they are high priority tasks
        await expect(taskCards.first()).toContainText('HIGH');
    });

    test('completes task with celebration animation', async ({ page }) => {
        await createTask(page, { title: 'Task to Complete', priority: 'HIGH' });
        await page.goto('/focus');

        // Complete the task
        const completeButton = page.getByRole('button', { name: /complete/i }).first();
        await completeButton.click();

        // Verify celebration animation appears
        await expect(page.locator('canvas')).toBeVisible({ timeout: 2000 }); // confetti canvas

        // Task should be marked as done or removed from focus view
        await expect(page.getByText('Task to Complete')).not.toBeVisible({ timeout: 5000 });
    });

    test('shows empty state when no tasks exist', async ({ page }) => {
        await page.goto('/focus');

        await expect(page.getByText(/no tasks to focus on/i)).toBeVisible();
        await expect(page.getByRole('link', { name: /create.*task/i })).toBeVisible();
    });

    test('returns to dashboard with Escape key', async ({ page }) => {
        await page.goto('/focus');

        await page.keyboard.press('Escape');
        await expect(page).toHaveURL('/', { timeout: 3000 });
    });

    test('displays progress bar for task completion', async ({ page }) => {
        // Create 3 tasks
        for (let i = 1; i <= 3; i++) {
            await createTask(page, { title: `Task ${i}`, priority: 'HIGH' });
        }

        await page.goto('/focus');

        // Verify progress bar exists
        const progressBar = page.locator('[role="progressbar"], .progress-bar');
        await expect(progressBar).toBeVisible();

        // Complete one task
        await page.getByRole('button', { name: /complete/i }).first().click();

        // Progress should update (wait for animation)
        await page.waitForTimeout(1000);

        // Verify progress increased
        const progressValue = await progressBar.getAttribute('aria-valuenow');
        expect(parseInt(progressValue || '0')).toBeGreaterThan(0);
    });

    test('keyboard navigation between tasks', async ({ page }) => {
        // Create multiple tasks
        for (let i = 1; i <= 3; i++) {
            await createTask(page, { title: `Task ${i}`, priority: 'HIGH' });
        }

        await page.goto('/focus');

        // Focus on first task
        await page.keyboard.press('Tab');

        // Navigate with arrow keys
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowUp');

        // Should be able to complete with Enter
        await page.keyboard.press('Enter');

        // Verify task completion
        await expect(page.locator('canvas')).toBeVisible({ timeout: 2000 });
    });
});
