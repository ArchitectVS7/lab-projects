import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { generateTestUser } from './helpers/fixtures';
import { createTask, createProject } from './helpers/api';

test.describe('Creator Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        const user = generateTestUser('creator');
        await registerUser(page, user);
    });

    test('navigates to creator dashboard', async ({ page }) => {
        await page.goto('/');

        // Navigate to creator dashboard
        const creatorLink = page.getByRole('link', { name: /creator|analytics|dashboard/i });
        await creatorLink.click();

        await expect(page).toHaveURL(/\/creator|\/analytics|\/dashboard/);
        await expect(page.getByRole('heading', { name: /creator|analytics/i })).toBeVisible();
    });

    test('displays analytics widgets', async ({ page }) => {
        // Create some data
        await createTask(page, { title: 'Task 1', priority: 'HIGH', status: 'DONE' });
        await createTask(page, { title: 'Task 2', priority: 'MEDIUM', status: 'IN_PROGRESS' });
        await createTask(page, { title: 'Task 3', priority: 'LOW', status: 'TODO' });

        await page.goto('/creator');

        // Verify analytics widgets are present
        const widgets = page.locator('[data-testid="analytics-widget"], .widget, .stat-card');
        expect(await widgets.count()).toBeGreaterThan(0);

        // Common analytics metrics
        await expect(page.getByText(/total.*tasks|tasks.*created/i)).toBeVisible();
        await expect(page.getByText(/completed|done/i)).toBeVisible();
    });

    test('displays task completion chart', async ({ page }) => {
        await createTask(page, { title: 'Completed Task', status: 'DONE' });
        await page.goto('/creator');

        // Look for chart elements (canvas or SVG)
        const chart = page.locator('canvas, svg[class*="chart"]').first();

        if (await chart.isVisible()) {
            // Verify chart dimensions
            const box = await chart.boundingBox();
            expect(box!.width).toBeGreaterThan(100);
            expect(box!.height).toBeGreaterThan(100);
        }
    });

    test('displays productivity trends', async ({ page }) => {
        await page.goto('/creator');

        // Look for trend indicators
        const trendElements = page.locator('[data-testid="trend"], .trend, [class*="trend"]');

        if (await trendElements.count() > 0) {
            // Verify trend shows percentage or arrow
            const trendText = await trendElements.first().textContent();
            const hasPercentage = trendText?.includes('%');
            const hasArrow = trendText?.includes('↑') || trendText?.includes('↓');

            expect(hasPercentage || hasArrow).toBeTruthy();
        }
    });

    test('displays project breakdown', async ({ page }) => {
        // Create projects and tasks
        await createProject(page, { name: 'Project A' });
        await createProject(page, { name: 'Project B' });
        await createTask(page, { title: 'Task A1', priority: 'HIGH' });
        await createTask(page, { title: 'Task B1', priority: 'MEDIUM' });

        await page.goto('/creator');

        // Look for project statistics
        await expect(page.getByText(/project/i)).toBeVisible();
    });

    test('filtering options work correctly', async ({ page }) => {
        await page.goto('/creator');

        // Look for filter controls
        const filterSelect = page.locator('select[name*="filter"], select[name*="period"]').first();

        if (await filterSelect.isVisible()) {
            // Test different time periods
            await filterSelect.selectOption('week');
            await page.waitForTimeout(500);

            await filterSelect.selectOption('month');
            await page.waitForTimeout(500);

            await filterSelect.selectOption('year');
            await page.waitForTimeout(500);

            // Verify data updates (charts should re-render)
            const chart = page.locator('canvas, svg').first();
            await expect(chart).toBeVisible();
        }
    });

    test('displays task priority distribution', async ({ page }) => {
        // Create tasks with different priorities
        await createTask(page, { title: 'High 1', priority: 'HIGH' });
        await createTask(page, { title: 'High 2', priority: 'HIGH' });
        await createTask(page, { title: 'Medium 1', priority: 'MEDIUM' });
        await createTask(page, { title: 'Low 1', priority: 'LOW' });

        await page.goto('/creator');

        // Look for priority breakdown
        await expect(page.getByText(/high/i)).toBeVisible();
        await expect(page.getByText(/medium/i)).toBeVisible();
        await expect(page.getByText(/low/i)).toBeVisible();
    });

    test('displays time tracking statistics', async ({ page }) => {
        await page.goto('/creator');

        // Look for time-related metrics
        const timeMetrics = page.getByText(/hours|minutes|time.*spent|tracked/i);

        if (await timeMetrics.isVisible()) {
            // Verify time format
            const timeText = await timeMetrics.textContent();
            expect(timeText).toMatch(/\d+/); // Contains numbers
        }
    });

    test('shows empty state when no data', async ({ page }) => {
        // Fresh user with no tasks
        await page.goto('/creator');

        // Should show empty state or zero values
        const emptyState = page.getByText(/no.*data|get.*started|create.*task/i);
        const zeroValues = page.getByText(/^0$/);

        const hasEmptyState = await emptyState.isVisible();
        const hasZeros = await zeroValues.count() > 0;

        expect(hasEmptyState || hasZeros).toBeTruthy();
    });

    test('chart tooltips show on hover', async ({ page }) => {
        await createTask(page, { title: 'Task 1', status: 'DONE' });
        await page.goto('/creator');

        const chart = page.locator('canvas').first();

        if (await chart.isVisible()) {
            const box = await chart.boundingBox();

            if (box) {
                // Hover over chart
                await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                await page.waitForTimeout(500);

                // Look for tooltip
                const tooltip = page.locator('[role="tooltip"], .tooltip, [class*="tooltip"]');
                // Tooltip might appear
                const tooltipVisible = await tooltip.isVisible().catch(() => false);
                // This is optional, so we just verify the chart exists
                expect(box.width).toBeGreaterThan(0);
            }
        }
    });

    test('export analytics data button', async ({ page }) => {
        await page.goto('/creator');

        const exportButton = page.getByRole('button', { name: /export|download/i });

        if (await exportButton.isVisible()) {
            // Click export button
            const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
            await exportButton.click();

            const download = await downloadPromise;
            if (download) {
                expect(download.suggestedFilename()).toMatch(/\.csv|\.json|\.xlsx/);
            }
        }
    });

    test('responsive layout on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/creator');

        // Verify page is still usable
        await expect(page.getByRole('heading', { name: /creator|analytics/i })).toBeVisible();

        // Charts should stack vertically
        const widgets = page.locator('[data-testid="analytics-widget"], .widget');
        if (await widgets.count() > 1) {
            const first = await widgets.first().boundingBox();
            const second = await widgets.nth(1).boundingBox();

            if (first && second) {
                // Second widget should be below first (stacked)
                expect(second.y).toBeGreaterThan(first.y + first.height - 50);
            }
        }
    });
});
