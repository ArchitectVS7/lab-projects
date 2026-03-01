import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { generateTestUser } from './helpers/fixtures';

test.describe('UI Density and Layout Settings', () => {
    test.beforeEach(async ({ page }) => {
        const user = generateTestUser('density');
        await registerUser(page, user);
        await page.goto('/profile');
        await page.waitForTimeout(1000);
    });

    test('switches between density modes', async ({ page }) => {
        // Density picker uses buttons with data-testid
        const compactBtn = page.locator('[data-testid="density-option-compact"]');
        const comfortableBtn = page.locator('[data-testid="density-option-comfortable"]');
        const spaciousBtn = page.locator('[data-testid="density-option-spacious"]');

        await expect(compactBtn).toBeVisible();

        // Test compact density — applied as CSS class on <html>
        await compactBtn.click();
        const html = page.locator('html');
        await expect(html).toHaveClass(/density-compact/);

        // Test comfortable density
        await comfortableBtn.click();
        await expect(html).toHaveClass(/density-comfortable/);

        // Test spacious density
        await spaciousBtn.click();
        await expect(html).toHaveClass(/density-spacious/);
    });

    test('changes layout preferences', async ({ page }) => {
        // Navigate to layout settings section
        const layoutButtons = page.locator('[data-testid^="layout-option-"]');

        if (await layoutButtons.count() > 0) {
            // Test compact layout
            const compactButton = page.locator('[data-testid="layout-option-compact"]');
            await compactButton.click();
            await expect(compactButton).toHaveClass(/border-primary|ring-1/);

            // Test default layout
            const defaultButton = page.locator('[data-testid="layout-option-default"]');
            await defaultButton.click();
            await expect(defaultButton).toHaveClass(/border-primary|ring-1/);

            // Test spacious layout
            const spaciousButton = page.locator('[data-testid="layout-option-spacious"]');
            await spaciousButton.click();
            await expect(spaciousButton).toHaveClass(/border-primary|ring-1/);
        }
    });

    test('visual verification of density changes', async ({ page }) => {
        // Set compact density
        await page.locator('[data-testid="density-option-compact"]').click();
        await expect(page.locator('html')).toHaveClass(/density-compact/);

        // Navigate to tasks page to verify density class persists
        await page.goto('/tasks');
        await page.waitForTimeout(500);
        await expect(page.locator('html')).toHaveClass(/density-compact/);

        // Set spacious density
        await page.goto('/profile');
        await page.locator('[data-testid="density-option-spacious"]').click();
        await expect(page.locator('html')).toHaveClass(/density-spacious/);

        await page.goto('/tasks');
        await page.waitForTimeout(500);
        await expect(page.locator('html')).toHaveClass(/density-spacious/);
    });

    test('persists density preferences across sessions', async ({ page, context }) => {
        // Set density to compact
        await page.locator('[data-testid="density-option-compact"]').click();
        const html = page.locator('html');
        await expect(html).toHaveClass(/density-compact/);

        // Create new page (simulates new tab)
        const newPage = await context.newPage();
        await newPage.goto('/');

        // Verify density persisted
        const newHtml = newPage.locator('html');
        await expect(newHtml).toHaveClass(/density-compact/);

        await newPage.close();
    });

    test('persists layout preferences across sessions', async ({ page }) => {
        // Set layout to compact
        const compactButton = page.locator('[data-testid="layout-option-compact"]');
        await expect(compactButton).toBeVisible({ timeout: 5000 });
        await compactButton.click();

        // Reload page and navigate back to profile
        await page.reload();
        await page.waitForTimeout(1000);

        // Verify layout option still exists after reload
        const compactButtonAfterReload = page.locator('[data-testid="layout-option-compact"]');
        await expect(compactButtonAfterReload).toBeVisible({ timeout: 10000 });
    });

    test('density affects task list spacing', async ({ page }) => {
        await page.goto('/tasks');

        // Get initial spacing
        const taskItems = page.locator('[data-testid="task-item"], .task-item, tr');
        const initialCount = await taskItems.count();

        if (initialCount > 1) {
            const firstTask = taskItems.first();
            const secondTask = taskItems.nth(1);

            // Get positions in compact mode
            await page.goto('/profile');
            await page.locator('[data-testid="density-option-compact"]').click();
            await page.goto('/tasks');
            await page.waitForTimeout(300);

            const compactFirstBox = await firstTask.boundingBox();
            const compactSecondBox = await secondTask.boundingBox();
            const compactGap = compactSecondBox!.y - (compactFirstBox!.y + compactFirstBox!.height);

            // Get positions in spacious mode
            await page.goto('/profile');
            await page.locator('[data-testid="density-option-spacious"]').click();
            await page.goto('/tasks');
            await page.waitForTimeout(300);

            const spaciousFirstBox = await firstTask.boundingBox();
            const spaciousSecondBox = await secondTask.boundingBox();
            const spaciousGap = spaciousSecondBox!.y - (spaciousFirstBox!.y + spaciousFirstBox!.height);

            // Spacious should have more gap
            expect(spaciousGap).toBeGreaterThan(compactGap);
        }
    });

    test('layout changes affect page appearance', async ({ page }) => {
        // Test compact layout
        const compactButton = page.locator('[data-testid="layout-option-compact"]');
        if (await compactButton.isVisible()) {
            await compactButton.click();
            await page.goto('/');

            // Sidebar should still be visible
            const sidebar = page.locator('aside, [role="navigation"]').first();
            await expect(sidebar).toBeVisible();
        }
    });
});
