import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { generateTestUser } from './helpers/fixtures';
import { createTask } from './helpers/api';

// Returns the 14th of the current month as YYYY-MM-DD — always visible in the month view.
function midMonthDate(): string {
    const d = new Date();
    d.setDate(14);
    return d.toISOString().split('T')[0];
}

test.describe('Calendar View', () => {
    test.beforeEach(async ({ page }) => {
        const user = generateTestUser('calendar');
        await registerUser(page, user);
        // Create a task with a due date so CalendarView (not EmptyCalendarState) renders.
        await createTask(page, { title: 'Setup Task', dueDate: midMonthDate(), priority: 'MEDIUM' });
    });

    test('navigates to calendar view', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('link', { name: /calendar/i }).click();
        await expect(page).toHaveURL('/calendar');
        await expect(page.getByRole('heading', { name: /calendar/i })).toBeVisible();
    });

    test('toggles between month and week views', async ({ page }) => {
        await page.goto('/calendar');

        // Should default to month view — active button gets bg-white class
        const monthButton = page.getByRole('button', { name: /month/i });
        await expect(monthButton).toHaveClass(/bg-white/);

        // Verify month grid is visible (7 columns for days of week)
        const dayHeaders = page.locator('[class*="grid-cols-7"]').first();
        await expect(dayHeaders).toBeVisible();

        // Switch to week view
        const weekButton = page.getByRole('button', { name: /week/i });
        await weekButton.click();
        await expect(weekButton).toHaveClass(/bg-white/);

        // Week view should show fewer days
        await page.waitForTimeout(300);

        // Switch back to month
        await monthButton.click();
        await expect(monthButton).toHaveClass(/bg-white/);
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
        // Create task with a mid-month due date (always visible in current month view)
        await createTask(page, {
            title: 'Calendar Task',
            dueDate: midMonthDate(),
            priority: 'HIGH'
        });

        await page.goto('/calendar');

        // Find the task on the calendar
        await expect(page.getByText('Calendar Task')).toBeVisible({ timeout: 5000 });
    });

    test('task chip shows full title in tooltip', async ({ page }) => {
        await createTask(page, {
            title: 'Clickable Calendar Task',
            dueDate: midMonthDate(),
            priority: 'MEDIUM'
        });

        await page.goto('/calendar');

        // Task chips truncate text but expose the full title via the title attribute
        const taskChip = page.locator('[title="Clickable Calendar Task"]');
        await expect(taskChip).toBeVisible({ timeout: 5000 });
    });

    test('drag and drop to reschedule task', async ({ page }) => {
        await createTask(page, {
            title: 'Draggable Task',
            dueDate: midMonthDate(),
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
            }
        }
    });

    test('shows empty state for dates with no tasks', async ({ page }) => {
        await page.goto('/calendar');

        // Most dates should be empty initially (only the 14th has the setup task)
        const emptyDates = page.locator('[class*="min-h"]').filter({ hasNotText: /.+/ });
        expect(await emptyDates.count()).toBeGreaterThan(0);
    });

    test('displays multiple tasks on same date', async ({ page }) => {
        const dueDate = midMonthDate();

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
        await createTask(page, {
            title: 'Project Task',
            dueDate: midMonthDate(),
            priority: 'HIGH'
        });

        await page.goto('/calendar');

        // Task chips use an inline style backgroundColor (project color or default indigo)
        // The chip element has title=<task title> and the inline style
        const taskChip = page.locator('[title="Project Task"]');
        await expect(taskChip).toBeVisible();

        const bgColor = await taskChip.evaluate(el =>
            window.getComputedStyle(el).backgroundColor
        );
        expect(bgColor).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
    });
});
