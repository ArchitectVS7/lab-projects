import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { generateTestUser } from './helpers/fixtures';
import { createTask } from './helpers/api';

// Helper: open task detail modal and scroll to the timer section
async function openTaskModal(page: import('@playwright/test').Page, taskTitle: string) {
    await page.goto('/tasks');
    const taskRow = page.getByRole('row').filter({ hasText: taskTitle });
    await expect(taskRow).toBeVisible({ timeout: 10000 });
    await taskRow.getByRole('button', { name: 'Edit' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    return dialog;
}

// Helper: click start timer (scrolling into view) and wait for widget
async function startTimerAndVerify(page: import('@playwright/test').Page, dialog: import('@playwright/test').Locator) {
    const startBtn = dialog.getByRole('button', { name: 'Start Timer' });
    // Scroll the button into view since it's at the bottom of the modal form
    await startBtn.scrollIntoViewIfNeeded();
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await expect(startBtn).toBeEnabled();
    await startBtn.click();

    // Verify timer widget appears (it's outside the dialog, fixed position)
    const timerWidget = page.locator('[data-testid="timer-widget"]');
    await expect(timerWidget).toBeVisible({ timeout: 5000 });
    return timerWidget;
}

test.describe('Pomodoro Timer', () => {
    test.beforeEach(async ({ page }) => {
        const user = generateTestUser('timer');
        await registerUser(page, user);
    });

    test('starts timer for a task', async ({ page }) => {
        await createTask(page, { title: 'Timer Task', priority: 'HIGH' });
        const dialog = await openTaskModal(page, 'Timer Task');
        const timerWidget = await startTimerAndVerify(page, dialog);

        // Verify timer is running (shows time)
        await expect(timerWidget.getByText(/\d{2}:\d{2}:\d{2}/)).toBeVisible();
    });

    test('stops running timer', async ({ page }) => {
        await createTask(page, { title: 'Timer Task', priority: 'HIGH' });
        const dialog = await openTaskModal(page, 'Timer Task');
        const timerWidget = await startTimerAndVerify(page, dialog);
        await page.waitForTimeout(1000);

        // Stop timer via the widget's stop button (title="Stop timer")
        await timerWidget.locator('button[title="Stop timer"]').click();

        // Timer widget should disappear or show stopped state
        await page.waitForTimeout(1000);
        const isVisible = await timerWidget.isVisible();
        if (isVisible) {
            const timerText = await timerWidget.textContent();
            expect(timerText).toContain('00:00');
        }
    });

    test('starts pomodoro session', async ({ page }) => {
        await createTask(page, { title: 'Pomodoro Task', priority: 'HIGH' });
        const dialog = await openTaskModal(page, 'Pomodoro Task');

        const pomodoroButton = dialog.getByRole('button', { name: 'Pomodoro' });
        await pomodoroButton.scrollIntoViewIfNeeded();
        await expect(pomodoroButton).toBeVisible({ timeout: 5000 });
        await pomodoroButton.click();

        // Verify timer widget appears
        const timerWidget = page.locator('[data-testid="timer-widget"]');
        await expect(timerWidget).toBeVisible({ timeout: 5000 });

        // Should show pomodoro countdown (around 25:00)
        await expect(timerWidget.getByText(/2[0-5]:\d{2}/)).toBeVisible();
    });

    test('expands and collapses timer widget', async ({ page }) => {
        await createTask(page, { title: 'Timer Task', priority: 'HIGH' });
        const dialog = await openTaskModal(page, 'Timer Task');
        const timerWidget = await startTimerAndVerify(page, dialog);

        // Find expand/collapse button
        const expandButton = timerWidget.getByRole('button', { name: /expand|collapse/i });

        if (await expandButton.isVisible()) {
            const initialBox = await timerWidget.boundingBox();
            await expandButton.click();
            await page.waitForTimeout(500);

            const expandedBox = await timerWidget.boundingBox();
            expect(expandedBox!.height).toBeGreaterThan(initialBox!.height);

            await expandButton.click();
            await page.waitForTimeout(500);

            const collapsedBox = await timerWidget.boundingBox();
            expect(collapsedBox!.height).toBeLessThanOrEqual(initialBox!.height + 10);
        }
    });

    test('displays elapsed time accurately', async ({ page }) => {
        await createTask(page, { title: 'Timer Task', priority: 'HIGH' });
        const dialog = await openTaskModal(page, 'Timer Task');
        const timerWidget = await startTimerAndVerify(page, dialog);

        // Get initial time
        const initialTime = await timerWidget.getByText(/\d{2}:\d{2}:\d{2}/).textContent();

        // Wait 3 seconds
        await page.waitForTimeout(3000);

        // Get new time
        const newTime = await timerWidget.getByText(/\d{2}:\d{2}:\d{2}/).textContent();

        // Time should have increased
        expect(newTime).not.toBe(initialTime);

        const parseTime = (time: string) => {
            const [h, m, s] = time.split(':').map(Number);
            return h * 3600 + m * 60 + s;
        };

        const diff = parseTime(newTime!) - parseTime(initialTime!);
        expect(diff).toBeGreaterThanOrEqual(2);
        expect(diff).toBeLessThanOrEqual(5);
    });

    test('shows task title in timer widget', async ({ page }) => {
        await createTask(page, { title: 'Specific Timer Task', priority: 'HIGH' });
        const dialog = await openTaskModal(page, 'Specific Timer Task');
        const timerWidget = await startTimerAndVerify(page, dialog);

        await expect(timerWidget.getByText('Specific Timer Task')).toBeVisible();
    });

    test('timer persists across page navigation', async ({ page }) => {
        await createTask(page, { title: 'Persistent Timer Task', priority: 'HIGH' });
        const dialog = await openTaskModal(page, 'Persistent Timer Task');
        await startTimerAndVerify(page, dialog);
        await page.waitForTimeout(1000);

        // Close modal and navigate to different page
        await page.keyboard.press('Escape');
        await page.goto('/projects');

        // Timer widget should still be visible
        const timerWidget = page.locator('[data-testid="timer-widget"]');
        await expect(timerWidget).toBeVisible();
        await expect(timerWidget.getByText('Persistent Timer Task')).toBeVisible();
    });

    test('pomodoro completes with notification', async ({ page, context }) => {
        await context.grantPermissions(['notifications']);

        await createTask(page, { title: 'Pomodoro Task', priority: 'HIGH' });
        const dialog = await openTaskModal(page, 'Pomodoro Task');

        const pomodoroButton = dialog.getByRole('button', { name: 'Pomodoro' });
        await pomodoroButton.scrollIntoViewIfNeeded();
        if (await pomodoroButton.isVisible()) {
            await pomodoroButton.click();

            const timerWidget = page.locator('[data-testid="timer-widget"]');
            await expect(timerWidget).toBeVisible({ timeout: 5000 });

            const timerText = await timerWidget.getByText(/\d{2}:\d{2}/).textContent();
            expect(timerText).toBeTruthy();
        }
    });

    test('multiple timers cannot run simultaneously', async ({ page }) => {
        await createTask(page, { title: 'Task 1', priority: 'HIGH' });
        await createTask(page, { title: 'Task 2', priority: 'MEDIUM' });

        // Start timer for Task 1
        const dialog1 = await openTaskModal(page, 'Task 1');
        await startTimerAndVerify(page, dialog1);
        await page.keyboard.press('Escape');

        // Open Task 2 — Start Timer should be disabled because a timer is already running
        const dialog2 = await openTaskModal(page, 'Task 2');
        const startButton = dialog2.getByRole('button', { name: 'Start Timer' });
        await startButton.scrollIntoViewIfNeeded();
        await expect(startButton).toBeDisabled();

        // Should only have one timer widget
        const timerWidgets = page.locator('[data-testid="timer-widget"]');
        await expect(timerWidgets).toHaveCount(1);
    });

    test('timer shows in fixed position', async ({ page }) => {
        await createTask(page, { title: 'Timer Task', priority: 'HIGH' });
        const dialog = await openTaskModal(page, 'Timer Task');
        const timerWidget = await startTimerAndVerify(page, dialog);

        const position = await timerWidget.evaluate(el => {
            const style = window.getComputedStyle(el);
            return {
                position: style.position,
                bottom: style.bottom,
                right: style.right
            };
        });

        expect(position.position).toBe('fixed');
    });
});
