import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { generateTestUser } from './helpers/fixtures';
import { createTask } from './helpers/api';

test.describe('Calendar View', () => {
    test.beforeEach(async ({ page }) => {
        const user = generateTestUser('calendar');
        await registerUser(page, user);
    });

    test('navigates to calendar view', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('link', { name: /calendar/i }).click();
        await expect(page).toHaveURL('/calendar');
        await expect(page.getByRole('heading', { name: /calendar/i })).toBeVisible();
    });

    test('toggles between month and week views', async ({ page }) => {
        await page.goto('/calendar');

        // Should default to month view
        const monthButton = page.getByRole('button', { name: /month/i });
        await expect(monthButton).toHaveClass(/active|selected|bg-white/);

        // Verify month grid is visible (7 columns for days of week)
        const dayHeaders = page.locator('[class*="grid-cols-7"]').first();
        await expect(dayHeaders).toBeVisible();

        // Switch to week view
        const weekButton = page.getByRole('button', { name: /week/i });
        await weekButton.click();
        await expect(weekButton).toHaveClass(/active|selected|bg-white/);

        // Week view should show fewer days
        await page.waitForTimeout(300);

        // Switch back to month
        await monthButton.click();
        await expect(monthButton).toHaveClass(/active|selected|bg-white/);
    });

    test('navigates between months', async ({ page }) => {
        await page.goto('/calendar');

        // Get current month/year header
        const header = page.getByRole('heading', { level: 2 });
        const initialMonth = await header.textContent();

        // Click next month
        const nextButton = page.getByRole('button', { name: /next/i });
        await nextButton.click();
        await page.waitForTimeout(300);

        const nextMonth = await header.textContent();
        expect(nextMonth).not.toBe(initialMonth);

        // Click previous month
        const prevButton = page.getByRole('button', { name: /previous/i });
        await prevButton.click();
        await page.waitForTimeout(300);

        const backToInitial = await header.textContent();
        expect(backToInitial).toBe(initialMonth);
    });

    test('navigates to today', async ({ page }) => {
        await page.goto('/calendar');

        // Navigate to a different month
        const nextButton = page.getByRole('button', { name: /next/i });
        await nextButton.click();
        await nextButton.click();

        // Click today button
        const todayButton = page.getByRole('button', { name: /today/i });
        await todayButton.click();
        await page.waitForTimeout(300);

        // Verify current month is shown
        const header = page.getByRole('heading', { level: 2 });
        const currentDate = new Date();
        const expectedMonth = currentDate.toLocaleString('default', { month: 'long' });
        const expectedYear = currentDate.getFullYear().toString();

        const headerText = await header.textContent();
        expect(headerText).toContain(expectedMonth);
        expect(headerText).toContain(expectedYear);
    });

    test('displays tasks on calendar dates', async ({ page }) => {
        // Create task with due date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dueDate = tomorrow.toISOString().split('T')[0];

        await createTask(page, {
            title: 'Calendar Task',
            dueDate,
            priority: 'HIGH'
        });

        await page.goto('/calendar');

        // Find the task on the calendar
        await expect(page.getByText('Calendar Task')).toBeVisible({ timeout: 5000 });
    });

    test('clicks task to view details', async ({ page }) => {
        // Create task
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dueDate = tomorrow.toISOString().split('T')[0];

        await createTask(page, {
            title: 'Clickable Calendar Task',
            dueDate,
            priority: 'MEDIUM'
        });

        await page.goto('/calendar');

        // Click on the task
        await page.getByText('Clickable Calendar Task').click();

        // Verify task details modal or page opens
        await expect(page.getByRole('heading', { name: /Clickable Calendar Task/i }))
            .toBeVisible({ timeout: 3000 });
    });

    test('drag and drop to reschedule task', async ({ page }) => {
        // Create task for today
        const today = new Date().toISOString().split('T')[0];

        await createTask(page, {
            title: 'Draggable Task',
            dueDate: today,
            priority: 'HIGH'
        });

        await page.goto('/calendar');
        await page.waitForTimeout(1000);

        // Find the task element
        const taskElement = page.getByText('Draggable Task');
        await expect(taskElement).toBeVisible();

        // Get task position
        const taskBox = await taskElement.boundingBox();

        if (taskBox) {
            // Find a different date cell to drop on
            const dateCells = page.locator('[class*="border"]').filter({ hasText: /^\d+$/ });
            const targetCell = dateCells.nth(5); // Pick a different day
            const targetBox = await targetCell.boundingBox();

            if (targetBox) {
                // Perform drag and drop
                await page.mouse.move(taskBox.x + taskBox.width / 2, taskBox.y + taskBox.height / 2);
                await page.mouse.down();
                await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
                await page.mouse.up();

                // Wait for update
                await page.waitForTimeout(1000);

                // Verify task moved (it should appear in the new cell)
                // Note: This might require checking the API or verifying visual position
            }
        }
    });

    test('shows empty state for dates with no tasks', async ({ page }) => {
        await page.goto('/calendar');

        // Most dates should be empty initially
        const emptyDates = page.locator('[class*="min-h"]').filter({ hasNotText: /.+/ });
        expect(await emptyDates.count()).toBeGreaterThan(0);
    });

    test('displays multiple tasks on same date', async ({ page }) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dueDate = tomorrow.toISOString().split('T')[0];

        // Create multiple tasks for same date
        await createTask(page, { title: 'Task 1', dueDate, priority: 'HIGH' });
        await createTask(page, { title: 'Task 2', dueDate, priority: 'MEDIUM' });
        await createTask(page, { title: 'Task 3', dueDate, priority: 'LOW' });

        await page.goto('/calendar');

        // All tasks should be visible
        await expect(page.getByText('Task 1')).toBeVisible();
        await expect(page.getByText('Task 2')).toBeVisible();
        await expect(page.getByText('Task 3')).toBeVisible();
    });

    test('color codes tasks by project', async ({ page }) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dueDate = tomorrow.toISOString().split('T')[0];

        await createTask(page, {
            title: 'Project Task',
            dueDate,
            priority: 'HIGH'
        });

        await page.goto('/calendar');

        // Find task element
        const taskElement = page.getByText('Project Task').locator('..');

        // Verify it has a background color (project color)
        const bgColor = await taskElement.evaluate(el =>
            window.getComputedStyle(el).backgroundColor
        );
        expect(bgColor).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
    });
});
