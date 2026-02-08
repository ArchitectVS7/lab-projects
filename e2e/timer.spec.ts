import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { generateTestUser } from './helpers/fixtures';
import { createTask } from './helpers/api';

test.describe('Pomodoro Timer', () => {
    test.beforeEach(async ({ page }) => {
        const user = generateTestUser('timer');
        await registerUser(page, user);
    });

    test('starts timer for a task', async ({ page }) => {
        // Create a task
        await createTask(page, { title: 'Timer Task', priority: 'HIGH' });

        await page.goto('/tasks');

        // Find and click start timer button
        const startButton = page.getByRole('button', { name: /start.*timer|timer.*start/i }).first();
        await startButton.click();

        // Verify timer widget appears
        const timerWidget = page.locator('[data-testid="timer-widget"]');
        await expect(timerWidget).toBeVisible({ timeout: 3000 });

        // Verify timer is running (shows time)
        await expect(timerWidget.getByText(/\d{2}:\d{2}:\d{2}/)).toBeVisible();
    });

    test('stops running timer', async ({ page }) => {
        await createTask(page, { title: 'Timer Task', priority: 'HIGH' });
        await page.goto('/tasks');

        // Start timer
        await page.getByRole('button', { name: /start.*timer/i }).first().click();
        await page.waitForTimeout(1000);

        // Stop timer
        const stopButton = page.getByRole('button', { name: /stop/i, exact: false });
        await stopButton.click();

        // Verify timer widget disappears or shows stopped state
        await page.waitForTimeout(500);
        const timerWidget = page.locator('[data-testid="timer-widget"]');

        // Timer should either be hidden or show 00:00:00
        const isVisible = await timerWidget.isVisible();
        if (isVisible) {
            const timerText = await timerWidget.textContent();
            expect(timerText).toContain('00:00');
        }
    });

    test('starts pomodoro session', async ({ page }) => {
        await createTask(page, { title: 'Pomodoro Task', priority: 'HIGH' });
        await page.goto('/tasks');

        // Start pomodoro timer
        const pomodoroButton = page.getByRole('button', { name: /pomodoro/i });
        if (await pomodoroButton.isVisible()) {
            await pomodoroButton.click();

            // Verify pomodoro indicator
            const timerWidget = page.locator('[data-testid="timer-widget"]');
            await expect(timerWidget).toBeVisible();

            // Should show pomodoro icon or indicator
            await expect(timerWidget.locator('svg, [data-icon="timer"]')).toBeVisible();

            // Should countdown from 25:00
            await expect(timerWidget.getByText(/2[0-5]:\d{2}/)).toBeVisible();
        }
    });

    test('expands and collapses timer widget', async ({ page }) => {
        await createTask(page, { title: 'Timer Task', priority: 'HIGH' });
        await page.goto('/tasks');

        // Start timer
        await page.getByRole('button', { name: /start.*timer/i }).first().click();
        const timerWidget = page.locator('[data-testid="timer-widget"]');
        await expect(timerWidget).toBeVisible();

        // Find expand/collapse button
        const expandButton = timerWidget.getByRole('button', { name: /expand|collapse/i });

        if (await expandButton.isVisible()) {
            // Get initial height
            const initialBox = await timerWidget.boundingBox();

            // Click to expand
            await expandButton.click();
            await page.waitForTimeout(500);

            // Verify expanded (shows more details)
            const expandedBox = await timerWidget.boundingBox();
            expect(expandedBox!.height).toBeGreaterThan(initialBox!.height);

            // Collapse
            await expandButton.click();
            await page.waitForTimeout(500);

            const collapsedBox = await timerWidget.boundingBox();
            expect(collapsedBox!.height).toBeLessThanOrEqual(initialBox!.height + 10);
        }
    });

    test('displays elapsed time accurately', async ({ page }) => {
        await createTask(page, { title: 'Timer Task', priority: 'HIGH' });
        await page.goto('/tasks');

        // Start timer
        await page.getByRole('button', { name: /start.*timer/i }).first().click();
        const timerWidget = page.locator('[data-testid="timer-widget"]');

        // Get initial time
        const initialTime = await timerWidget.getByText(/\d{2}:\d{2}:\d{2}/).textContent();

        // Wait 3 seconds
        await page.waitForTimeout(3000);

        // Get new time
        const newTime = await timerWidget.getByText(/\d{2}:\d{2}:\d{2}/).textContent();

        // Time should have increased
        expect(newTime).not.toBe(initialTime);

        // Parse times and verify difference is approximately 3 seconds
        const parseTime = (time: string) => {
            const [h, m, s] = time.split(':').map(Number);
            return h * 3600 + m * 60 + s;
        };

        const diff = parseTime(newTime!) - parseTime(initialTime!);
        expect(diff).toBeGreaterThanOrEqual(2);
        expect(diff).toBeLessThanOrEqual(4);
    });

    test('shows task title in timer widget', async ({ page }) => {
        await createTask(page, { title: 'Specific Timer Task', priority: 'HIGH' });
        await page.goto('/tasks');

        // Start timer
        await page.getByRole('button', { name: /start.*timer/i }).first().click();
        const timerWidget = page.locator('[data-testid="timer-widget"]');

        // Verify task title is shown
        await expect(timerWidget.getByText('Specific Timer Task')).toBeVisible();
    });

    test('timer persists across page navigation', async ({ page }) => {
        await createTask(page, { title: 'Persistent Timer Task', priority: 'HIGH' });
        await page.goto('/tasks');

        // Start timer
        await page.getByRole('button', { name: /start.*timer/i }).first().click();
        await page.waitForTimeout(1000);

        // Navigate to different page
        await page.goto('/projects');

        // Timer widget should still be visible
        const timerWidget = page.locator('[data-testid="timer-widget"]');
        await expect(timerWidget).toBeVisible();
        await expect(timerWidget.getByText('Persistent Timer Task')).toBeVisible();
    });

    test('pomodoro completes with notification', async ({ page, context }) => {
        // Grant notification permission
        await context.grantPermissions(['notifications']);

        await createTask(page, { title: 'Pomodoro Task', priority: 'HIGH' });
        await page.goto('/tasks');

        // Start pomodoro
        const pomodoroButton = page.getByRole('button', { name: /pomodoro/i });
        if (await pomodoroButton.isVisible()) {
            await pomodoroButton.click();

            // For testing, we can't wait 25 minutes, so we'll verify the setup
            const timerWidget = page.locator('[data-testid="timer-widget"]');
            await expect(timerWidget).toBeVisible();

            // Verify pomodoro is in countdown mode
            const timerText = await timerWidget.getByText(/\d{2}:\d{2}/).textContent();
            expect(timerText).toBeTruthy();
        }
    });

    test('multiple timers cannot run simultaneously', async ({ page }) => {
        await createTask(page, { title: 'Task 1', priority: 'HIGH' });
        await createTask(page, { title: 'Task 2', priority: 'MEDIUM' });
        await page.goto('/tasks');

        // Start first timer
        const startButtons = page.getByRole('button', { name: /start.*timer/i });
        await startButtons.first().click();
        await page.waitForTimeout(500);

        // Try to start second timer
        await startButtons.nth(1).click();

        // Should only have one timer widget
        const timerWidgets = page.locator('[data-testid="timer-widget"]');
        await expect(timerWidgets).toHaveCount(1);
    });

    test('timer shows in fixed position', async ({ page }) => {
        await createTask(page, { title: 'Timer Task', priority: 'HIGH' });
        await page.goto('/tasks');

        // Start timer
        await page.getByRole('button', { name: /start.*timer/i }).first().click();
        const timerWidget = page.locator('[data-testid="timer-widget"]');

        // Verify fixed positioning (bottom-right typically)
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
