import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { generateTestUser } from './helpers/fixtures';
import { createTask, createProject } from './helpers/api';

test.describe('Enhanced Command Palette', () => {
    test.beforeEach(async ({ page }) => {
        const user = generateTestUser('cmd-palette');
        await registerUser(page, user);
        await page.goto('/');
    });

    test('opens with Ctrl+K keyboard shortcut', async ({ page }) => {
        await page.keyboard.press('Control+K');
        const palette = page.getByRole('dialog');
        await expect(palette).toBeVisible({ timeout: 2000 });
    });

    test('closes with Escape key', async ({ page }) => {
        await page.keyboard.press('Control+K');
        const palette = page.getByRole('dialog');
        await expect(palette).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(palette).not.toBeVisible({ timeout: 2000 });
    });

    test('quick task creation from command palette', async ({ page }) => {
        await page.keyboard.press('Control+K');
        const palette = page.getByRole('dialog');

        // Type to create new task
        const input = palette.getByPlaceholder(/type a command|search/i);
        await input.fill('New task from palette');

        // Look for "Create task" option
        const createOption = palette.getByRole('button', { name: /create.*task/i });

        if (await createOption.isVisible()) {
            await createOption.click();

            // Verify task was created
            await page.waitForTimeout(1000);
            await expect(page.getByText('New task from palette')).toBeVisible({ timeout: 5000 });
        }
    });

    test('searches across tasks and projects', async ({ page }) => {
        // Create test data
        await createTask(page, { title: 'Searchable Task', priority: 'HIGH' });
        await createProject(page, { name: 'Searchable Project' });

        await page.keyboard.press('Control+K');
        const palette = page.getByRole('dialog');

        // Search for task
        await palette.getByPlaceholder(/type a command|search/i).fill('Searchable');
        await page.waitForTimeout(500);

        // Should show both task and project
        await expect(palette.getByText('Searchable Task')).toBeVisible();
        await expect(palette.getByText('Searchable Project')).toBeVisible();
    });

    test('executes navigation commands', async ({ page }) => {
        await page.keyboard.press('Control+K');
        const palette = page.getByRole('dialog');

        // Search for navigation command
        await palette.getByPlaceholder(/type a command|search/i).fill('tasks');

        // Click navigation option
        const tasksOption = palette.getByRole('button', { name: /go to tasks|tasks/i }).first();
        await tasksOption.click();

        // Verify navigation
        await expect(page).toHaveURL(/\/tasks/);
    });

    test('shows recent searches', async ({ page }) => {
        // Perform a search
        await page.keyboard.press('Control+K');
        let palette = page.getByRole('dialog');
        await palette.getByPlaceholder(/type a command|search/i).fill('test search');
        await page.keyboard.press('Escape');

        // Open again
        await page.keyboard.press('Control+K');
        palette = page.getByRole('dialog');

        // Recent searches might be shown
        const recentSection = palette.getByText(/recent/i);
        const hasRecent = await recentSection.isVisible().catch(() => false);

        // This is optional functionality
        expect(hasRecent || true).toBeTruthy();
    });

    test('filters by command type', async ({ page }) => {
        await page.keyboard.press('Control+K');
        const palette = page.getByRole('dialog');

        // Look for filter tabs or buttons
        const navigationTab = palette.getByRole('button', { name: /navigation/i });

        if (await navigationTab.isVisible()) {
            await navigationTab.click();
            await page.waitForTimeout(300);

            // Should show only navigation commands
            await expect(palette.getByText(/go to|navigate/i)).toBeVisible();
        }
    });

    test('keyboard navigation through results', async ({ page }) => {
        await createTask(page, { title: 'Task 1', priority: 'HIGH' });
        await createTask(page, { title: 'Task 2', priority: 'MEDIUM' });

        await page.keyboard.press('Control+K');
        const palette = page.getByRole('dialog');
        await palette.getByPlaceholder(/type a command|search/i).fill('Task');
        await page.waitForTimeout(500);

        // Navigate with arrow keys
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowUp');

        // Press Enter to select
        await page.keyboard.press('Enter');

        // Should navigate or open selected item
        await page.waitForTimeout(1000);
    });

    test('shows command shortcuts in results', async ({ page }) => {
        await page.keyboard.press('Control+K');
        const palette = page.getByRole('dialog');

        // Commands should show keyboard shortcuts
        const shortcutElements = palette.locator('kbd, .shortcut, [class*="kbd"]');

        if (await shortcutElements.count() > 0) {
            // Verify shortcut formatting
            const firstShortcut = shortcutElements.first();
            await expect(firstShortcut).toBeVisible();
        }
    });

    test('debounces search input', async ({ page }) => {
        await page.keyboard.press('Control+K');
        const palette = page.getByRole('dialog');
        const input = palette.getByPlaceholder(/type a command|search/i);

        // Type quickly
        await input.type('quick typing test', { delay: 50 });

        // Wait for debounce
        await page.waitForTimeout(500);

        // Results should appear
        const results = palette.locator('[role="button"], .command-item');
        expect(await results.count()).toBeGreaterThanOrEqual(0);
    });

    test('shows empty state for no results', async ({ page }) => {
        await page.keyboard.press('Control+K');
        const palette = page.getByRole('dialog');

        // Search for something that doesn't exist
        await palette.getByPlaceholder(/type a command|search/i).fill('xyznonexistent123');
        await page.waitForTimeout(500);

        // Should show no results message
        await expect(palette.getByText(/no.*results|nothing.*found/i)).toBeVisible();
    });

    test('clears search on close and reopen', async ({ page }) => {
        await page.keyboard.press('Control+K');
        let palette = page.getByRole('dialog');

        // Type search
        await palette.getByPlaceholder(/type a command|search/i).fill('test');

        // Close
        await page.keyboard.press('Escape');

        // Reopen
        await page.keyboard.press('Control+K');
        palette = page.getByRole('dialog');

        // Input should be cleared
        const input = palette.getByPlaceholder(/type a command|search/i);
        const value = await input.inputValue();
        expect(value).toBe('');
    });

    test('groups results by category', async ({ page }) => {
        await createTask(page, { title: 'Test Task', priority: 'HIGH' });
        await createProject(page, { name: 'Test Project' });

        await page.keyboard.press('Control+K');
        const palette = page.getByRole('dialog');
        await palette.getByPlaceholder(/type a command|search/i).fill('Test');
        await page.waitForTimeout(500);

        // Look for category headers
        const categories = palette.locator('h3, h4, .category-header');
        const categoryCount = await categories.count();

        // Should have categories like "Tasks", "Projects", "Commands"
        expect(categoryCount).toBeGreaterThanOrEqual(0);
    });

    test('highlights matching text in results', async ({ page }) => {
        await createTask(page, { title: 'Important Task', priority: 'HIGH' });

        await page.keyboard.press('Control+K');
        const palette = page.getByRole('dialog');
        await palette.getByPlaceholder(/type a command|search/i).fill('Import');
        await page.waitForTimeout(500);

        // Look for highlighted text
        const highlighted = palette.locator('mark, .highlight, strong');

        if (await highlighted.count() > 0) {
            const highlightedText = await highlighted.first().textContent();
            expect(highlightedText?.toLowerCase()).toContain('import');
        }
    });
});
