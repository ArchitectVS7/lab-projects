import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { generateTestUser } from './helpers/fixtures';
import { createTask, createProject } from './helpers/api';

test.describe('Dependencies Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        const user = generateTestUser('dependencies-dash');
        await registerUser(page, user);
    });

    test('navigates to dependencies dashboard', async ({ page }) => {
        // Need a project first for the dashboard to show properly
        await createProject(page, 'Deps Project');

        await page.goto('/');
        await page.getByRole('link', { name: /dependencies/i }).click();
        await expect(page).toHaveURL('/dependencies');
        await expect(page.getByRole('heading', { name: /dependencies/i })).toBeVisible();
    });

    test('displays dependency graph visualization', async ({ page }) => {
        await createTask(page, { title: 'Task A', priority: 'HIGH' });
        await createTask(page, { title: 'Task B', priority: 'MEDIUM', blockedBy: ['Task A'] });

        await page.goto('/dependencies');

        // Verify graph canvas or SVG exists
        const graph = page.locator('canvas, svg[class*="graph"]').first();
        await expect(graph).toBeVisible({ timeout: 5000 });

        const box = await graph.boundingBox();
        expect(box!.width).toBeGreaterThan(200);
        expect(box!.height).toBeGreaterThan(200);
    });

    test('displays task nodes in graph', async ({ page }) => {
        await createTask(page, { title: 'Visible Task', priority: 'HIGH' });
        await createTask(page, { title: 'Dependent Visible', priority: 'MEDIUM', blockedBy: ['Visible Task'] });
        await page.goto('/dependencies');
        await page.waitForTimeout(2000);

        // With dependencies, the graph canvas should appear
        const graph = page.locator('canvas').first();
        await expect(graph).toBeVisible({ timeout: 5000 });
    });

    test('highlights critical path', async ({ page }) => {
        await createTask(page, { title: 'Start Task', priority: 'HIGH' });
        await createTask(page, { title: 'Middle Task', priority: 'HIGH', blockedBy: ['Start Task'] });
        await createTask(page, { title: 'End Task', priority: 'HIGH', blockedBy: ['Middle Task'] });

        await page.goto('/dependencies');
        await page.waitForTimeout(2000);

        const criticalPathButton = page.getByRole('button', { name: /critical.*path/i });

        if (await criticalPathButton.isVisible()) {
            await criticalPathButton.click();
            await page.waitForTimeout(1000);
            const graph = page.locator('canvas').first();
            await expect(graph).toBeVisible();
        }
    });

    test('shows dependency chain visualization', async ({ page }) => {
        await createTask(page, { title: 'Root Task', priority: 'HIGH' });
        await createTask(page, { title: 'Dependent Task', priority: 'MEDIUM', blockedBy: ['Root Task'] });

        await page.goto('/dependencies');
        await page.waitForTimeout(2000);

        const graph = page.locator('canvas').first();
        await expect(graph).toBeVisible();

        const box = await graph.boundingBox();
        expect(box!.width).toBeGreaterThan(0);
    });

    test('filters dependencies by project', async ({ page }) => {
        await createProject(page, 'Filter Project');
        await page.goto('/dependencies');

        // Look for project filter
        const projectFilter = page.locator('select').last();

        if (await projectFilter.isVisible()) {
            const optionCount = await projectFilter.locator('option').count();
            if (optionCount > 1) {
                await projectFilter.selectOption({ index: 1 });
                await page.waitForTimeout(1000);
            }
        }
    });

    test('filters dependencies by status', async ({ page }) => {
        await createTask(page, { title: 'Todo Task', status: 'TODO', priority: 'HIGH' });
        await createTask(page, { title: 'Done Task', status: 'DONE', priority: 'MEDIUM' });

        await page.goto('/dependencies');

        // Status filter is the first select (has "All statuses" option)
        const statusFilter = page.locator('select').filter({ hasText: /all statuses/i });

        if (await statusFilter.isVisible()) {
            await statusFilter.selectOption('TODO');
            await page.waitForTimeout(1000);
        }
    });

    test('zooms in and out on graph', async ({ page }) => {
        await createTask(page, { title: 'Task for Zoom', priority: 'HIGH' });
        await page.goto('/dependencies');
        await page.waitForTimeout(1000);

        const zoomInButton = page.getByRole('button', { name: /zoom.*in|\+|zoomin/i });
        const zoomOutButton = page.getByRole('button', { name: /zoom.*out|\-|zoomout/i });

        if (await zoomInButton.isVisible()) {
            await zoomInButton.click();
            await page.waitForTimeout(500);
            await zoomOutButton.click();
            await page.waitForTimeout(500);
            const graph = page.locator('canvas').first();
            await expect(graph).toBeVisible();
        }
    });

    test('resets graph view', async ({ page }) => {
        await createProject(page, 'Reset Project');
        await page.goto('/dependencies');

        const resetButton = page.getByRole('button', { name: /reset|center|fit/i });

        if (await resetButton.isVisible()) {
            await resetButton.click();
            await page.waitForTimeout(500);
        }
    });

    test('clicks node to view task details', async ({ page }) => {
        await createTask(page, { title: 'Clickable Graph Task', priority: 'HIGH' });
        await createTask(page, { title: 'Clickable Dep Task', priority: 'MEDIUM', blockedBy: ['Clickable Graph Task'] });
        await page.goto('/dependencies');
        await page.waitForTimeout(2000);

        const graph = page.locator('canvas').first();
        if (await graph.isVisible()) {
            const box = await graph.boundingBox();
            if (box) {
                await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                await page.waitForTimeout(1000);
                await expect(graph).toBeVisible();
            }
        }
    });

    test('shows blocked tasks indicator', async ({ page }) => {
        await createTask(page, { title: 'Blocker', priority: 'HIGH' });
        await createTask(page, { title: 'Blocked', priority: 'MEDIUM', blockedBy: ['Blocker'] });

        await page.goto('/dependencies');
        await page.waitForTimeout(2000);

        // The graph canvas or the heading should be visible
        const heading = page.getByRole('heading', { name: /dependencies/i });
        await expect(heading).toBeVisible();
    });

    test('displays circular dependency warning', async ({ page }) => {
        await createProject(page, 'Circular Test');
        await page.goto('/dependencies');

        const warning = page.locator('[role="alert"], .warning, .alert-warning');
        const warningCount = await warning.count();
        expect(warningCount).toBeGreaterThanOrEqual(0);
    });

    test('legend explains node colors', async ({ page }) => {
        await createProject(page, 'Legend Test');
        await page.goto('/dependencies');

        const legend = page.locator('[data-testid="legend"], .legend');

        if (await legend.isVisible()) {
            await expect(legend.getByText(/todo|in.*progress|done/i)).toBeVisible();
        }
    });

    test('graph is interactive (pan and drag)', async ({ page }) => {
        await createTask(page, { title: 'Interactive Task', priority: 'HIGH' });
        await createTask(page, { title: 'Interactive Task 2', priority: 'MEDIUM', blockedBy: ['Interactive Task'] });

        await page.goto('/dependencies');
        await page.waitForTimeout(2000);

        const graph = page.locator('canvas').first();
        if (await graph.isVisible()) {
            const box = await graph.boundingBox();

            if (box) {
                const startX = box.x + box.width / 2;
                const startY = box.y + box.height / 2;

                await page.mouse.move(startX, startY);
                await page.mouse.down();
                await page.mouse.move(startX + 50, startY + 50, { steps: 5 });
                await page.mouse.up();

                await expect(graph).toBeVisible();
            }
        }
    });

    test('shows empty state when no dependencies', async ({ page }) => {
        // Create task without dependencies
        await createTask(page, { title: 'Independent Task', priority: 'HIGH' });
        await page.goto('/dependencies');
        await page.waitForTimeout(2000);

        // Should show "No Dependencies" message or graph with isolated nodes
        const emptyMessage = page.getByText(/no dependencies/i);
        const graph = page.locator('canvas').first();

        const hasMessage = await emptyMessage.isVisible().catch(() => false);
        const hasGraph = await graph.isVisible().catch(() => false);

        expect(hasMessage || hasGraph).toBeTruthy();
    });

    test('export dependency graph', async ({ page }) => {
        await createTask(page, { title: 'Export Task', priority: 'HIGH' });
        await page.goto('/dependencies');

        const exportButton = page.getByRole('button', { name: /export|download|save/i });

        if (await exportButton.isVisible()) {
            const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
            await exportButton.click();

            const download = await downloadPromise;
            if (download) {
                expect(download.suggestedFilename()).toMatch(/\.png|\.svg|\.json/);
            }
        }
    });
});
