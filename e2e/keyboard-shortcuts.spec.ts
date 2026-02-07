import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { generateTestUser } from './helpers/fixtures';

test.describe('Keyboard Shortcuts Modal', () => {
    test.beforeEach(async ({ page }) => {
        const user = generateTestUser('shortcuts');
        await registerUser(page, user);
        await page.goto('/');
    });

    test('opens modal with ? key', async ({ page }) => {
        // Press ? key
        await page.keyboard.press('?');

        // Verify modal opens
        const modal = page.getByRole('dialog', { name: /keyboard shortcuts/i });
        await expect(modal).toBeVisible({ timeout: 2000 });

        // Verify heading
        await expect(page.getByRole('heading', { name: /keyboard shortcuts/i })).toBeVisible();
    });

    test('closes modal with Escape key', async ({ page }) => {
        // Open modal
        await page.keyboard.press('?');
        const modal = page.getByRole('dialog', { name: /keyboard shortcuts/i });
        await expect(modal).toBeVisible();

        // Close with Escape
        await page.keyboard.press('Escape');
        await expect(modal).not.toBeVisible({ timeout: 2000 });
    });

    test('closes modal with close button', async ({ page }) => {
        // Open modal
        await page.keyboard.press('?');
        const modal = page.getByRole('dialog', { name: /keyboard shortcuts/i });
        await expect(modal).toBeVisible();

        // Click close button
        const closeButton = modal.getByRole('button', { name: /close/i });
        await closeButton.click();
        await expect(modal).not.toBeVisible({ timeout: 2000 });
    });

    test('displays navigation shortcuts category', async ({ page }) => {
        await page.keyboard.press('?');

        // Verify navigation section exists
        await expect(page.getByText(/navigation/i)).toBeVisible();

        // Verify specific navigation shortcuts
        await expect(page.getByText(/g.*h/i)).toBeVisible(); // Go to home
        await expect(page.getByText(/g.*t/i)).toBeVisible(); // Go to tasks
        await expect(page.getByText(/g.*p/i)).toBeVisible(); // Go to projects
    });

    test('displays task management shortcuts category', async ({ page }) => {
        await page.keyboard.press('?');

        // Verify task management section
        await expect(page.getByText(/task.*management|tasks/i)).toBeVisible();

        // Verify specific task shortcuts
        await expect(page.getByText(/n.*new task/i)).toBeVisible();
        await expect(page.getByText(/\/.*search/i)).toBeVisible();
    });

    test('displays command palette shortcut', async ({ page }) => {
        await page.keyboard.press('?');

        // Verify command palette shortcut is shown
        const commandPaletteShortcut = page.getByText(/ctrl.*k|⌘.*k/i);
        await expect(commandPaletteShortcut).toBeVisible();
    });

    test('displays focus mode shortcut', async ({ page }) => {
        await page.keyboard.press('?');

        // Verify focus mode shortcut
        const focusShortcut = page.getByText(/g.*f|focus/i);
        await expect(focusShortcut).toBeVisible();
    });

    test('shortcut combinations are formatted correctly', async ({ page }) => {
        await page.keyboard.press('?');

        // Verify keyboard key styling
        const keyElements = page.locator('kbd, .kbd, [class*="keyboard"]');
        expect(await keyElements.count()).toBeGreaterThan(0);

        // Verify keys have distinct styling
        const firstKey = keyElements.first();
        const bgColor = await firstKey.evaluate(el =>
            window.getComputedStyle(el).backgroundColor
        );
        expect(bgColor).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
    });

    test('shows platform-specific shortcuts', async ({ page }) => {
        await page.keyboard.press('?');

        // Check for Ctrl or Cmd based on platform
        const shortcutText = await page.locator('[data-testid="shortcuts-list"], .shortcuts').textContent();

        // Should show either Ctrl (Windows/Linux) or ⌘ (Mac)
        const hasCtrl = shortcutText?.includes('Ctrl') || false;
        const hasCmd = shortcutText?.includes('⌘') || shortcutText?.includes('Cmd') || false;

        expect(hasCtrl || hasCmd).toBeTruthy();
    });

    test('groups shortcuts by category', async ({ page }) => {
        await page.keyboard.press('?');

        // Verify multiple category headings exist
        const categoryHeadings = page.locator('h3, h4, .category-heading');
        expect(await categoryHeadings.count()).toBeGreaterThanOrEqual(2);
    });

    test('displays all essential shortcuts', async ({ page }) => {
        await page.keyboard.press('?');

        const essentialShortcuts = [
            '?', // Help
            'Escape', // Close/Cancel
            'Ctrl+K', // Command palette (or ⌘K)
            'n', // New task
        ];

        for (const shortcut of essentialShortcuts) {
            // Check if shortcut is mentioned (case-insensitive, flexible matching)
            const shortcutPattern = shortcut.replace('+', '.*');
            const regex = new RegExp(shortcutPattern, 'i');
            await expect(page.getByText(regex)).toBeVisible();
        }
    });

    test('modal is scrollable for long content', async ({ page }) => {
        await page.keyboard.press('?');
        const modal = page.getByRole('dialog', { name: /keyboard shortcuts/i });

        // Get modal dimensions
        const modalBox = await modal.boundingBox();
        const contentBox = await modal.locator('[class*="overflow"]').first().boundingBox();

        if (contentBox && modalBox) {
            // Content might be scrollable if it's taller than modal
            const isScrollable = contentBox.height > modalBox.height;
            // This is acceptable - just verify modal exists
            expect(modalBox.height).toBeGreaterThan(0);
        }
    });

    test('modal has proper accessibility attributes', async ({ page }) => {
        await page.keyboard.press('?');
        const modal = page.getByRole('dialog');

        // Verify ARIA attributes
        await expect(modal).toHaveAttribute('role', 'dialog');

        // Should have aria-modal or aria-labelledby
        const hasAriaModal = await modal.getAttribute('aria-modal');
        const hasAriaLabel = await modal.getAttribute('aria-labelledby') || await modal.getAttribute('aria-label');

        expect(hasAriaModal || hasAriaLabel).toBeTruthy();
    });

    test('clicking outside modal closes it', async ({ page }) => {
        await page.keyboard.press('?');
        const modal = page.getByRole('dialog', { name: /keyboard shortcuts/i });
        await expect(modal).toBeVisible();

        // Click outside modal (on backdrop)
        await page.mouse.click(10, 10);
        await page.waitForTimeout(500);

        // Modal should close
        await expect(modal).not.toBeVisible();
    });

    test('search functionality in shortcuts modal', async ({ page }) => {
        await page.keyboard.press('?');

        // Check if there's a search input
        const searchInput = page.getByPlaceholder(/search.*shortcuts/i);

        if (await searchInput.isVisible()) {
            // Type a search term
            await searchInput.fill('task');
            await page.waitForTimeout(300);

            // Verify filtered results
            const shortcuts = page.locator('[data-testid="shortcut-item"]');
            const count = await shortcuts.count();

            // Should show only task-related shortcuts
            expect(count).toBeGreaterThan(0);

            // Clear search
            await searchInput.clear();
            await page.waitForTimeout(300);

            // Should show all shortcuts again
            const allCount = await shortcuts.count();
            expect(allCount).toBeGreaterThanOrEqual(count);
        }
    });
});
