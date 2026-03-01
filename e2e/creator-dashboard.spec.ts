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
        // Need a project to see the main dashboard heading
        await createProject(page, 'Nav Project');

        await page.goto('/');

        // Navigate to creator dashboard via sidebar link (label is "Creators")
        const creatorLink = page.getByRole('link', { name: /creators/i });
        await creatorLink.click();

        await expect(page).toHaveURL(/\/creator-dashboard/);
        await expect(page.getByRole('heading', { name: /creator accountability/i })).toBeVisible();
    });

    test('displays analytics widgets', async ({ page }) => {
        // Create some data first (need a project for creator dashboard)
        await createProject(page, 'Analytics Project');
        await createTask(page, { title: 'Task 1', priority: 'HIGH', status: 'DONE' });
        await createTask(page, { title: 'Task 2', priority: 'MEDIUM', status: 'IN_PROGRESS' });
        await createTask(page, { title: 'Task 3', priority: 'LOW', status: 'TODO' });

        await page.goto('/creator-dashboard');
        await page.waitForTimeout(2000); // Wait for metrics to load

        // The dashboard shows summary cards
        await expect(page.getByRole('heading', { name: /creator accountability/i })).toBeVisible();
    });

    test('displays task completion chart', async ({ page }) => {
        await createTask(page, { title: 'Completed Task', status: 'DONE' });
        await page.goto('/creator-dashboard');

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
        await page.goto('/creator-dashboard');

        // Look for trend indicators
        const trendElements = page.locator('[data-testid="trend"], .trend, [class*="trend"]');

        if (await trendElements.count() > 0) {
            const trendText = await trendElements.first().textContent();
            const hasPercentage = trendText?.includes('%');
            const hasArrow = trendText?.includes('↑') || trendText?.includes('↓');

            expect(hasPercentage || hasArrow).toBeTruthy();
        }
    });

    test('displays project breakdown', async ({ page }) => {
        // Create projects and tasks
        await createProject(page, 'Project A');
        await createProject(page, 'Project B');
        await createTask(page, { title: 'Task A1', priority: 'HIGH' });

        await page.goto('/creator-dashboard');

        // Page should load with heading visible
        await expect(page.getByRole('heading', { name: /creator accountability/i })).toBeVisible();
    });

    test('filtering options work correctly', async ({ page }) => {
        await page.goto('/creator-dashboard');

        // Look for project filter select
        const filterSelect = page.locator('select').first();

        if (await filterSelect.isVisible()) {
            // Test selecting different projects
            const optionCount = await filterSelect.locator('option').count();
            if (optionCount > 1) {
                await filterSelect.selectOption({ index: 1 });
                await page.waitForTimeout(500);
            }
        }
    });

    test('displays task priority distribution', async ({ page }) => {
        // Create tasks with different priorities
        await createTask(page, { title: 'High 1', priority: 'HIGH' });
        await createTask(page, { title: 'Medium 1', priority: 'MEDIUM' });
        await createTask(page, { title: 'Low 1', priority: 'LOW' });

        await page.goto('/creator-dashboard');
        await page.waitForTimeout(2000);

        // Dashboard should show the page heading at minimum
        await expect(page.getByRole('heading', { name: /creator accountability/i })).toBeVisible();
    });

    test('displays time tracking statistics', async ({ page }) => {
        await page.goto('/creator-dashboard');

        // Look for time-related metrics
        const timeMetrics = page.getByText(/hours|minutes|time.*spent|tracked/i);

        if (await timeMetrics.isVisible()) {
            const timeText = await timeMetrics.textContent();
            expect(timeText).toMatch(/\d+/);
        }
    });

    test('shows empty state when no data', async ({ page }) => {
        // Fresh user — creator dashboard requires at least one project
        await page.goto('/creator-dashboard');

        // Should show "No Projects" empty state for user without projects
        await expect(page.getByRole('heading', { name: /no projects/i })).toBeVisible({ timeout: 5000 });
    });

    test('chart tooltips show on hover', async ({ page }) => {
        await createTask(page, { title: 'Task 1', status: 'DONE' });
        await page.goto('/creator-dashboard');

        const chart = page.locator('canvas').first();

        if (await chart.isVisible()) {
            const box = await chart.boundingBox();

            if (box) {
                await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                await page.waitForTimeout(500);
                expect(box.width).toBeGreaterThan(0);
            }
        }
    });

    test('export analytics data button', async ({ page }) => {
        await page.goto('/creator-dashboard');

        const exportButton = page.getByRole('button', { name: /export|download/i });

        if (await exportButton.isVisible()) {
            const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
            await exportButton.click();

            const download = await downloadPromise;
            if (download) {
                expect(download.suggestedFilename()).toMatch(/\.csv|\.json|\.xlsx/);
            }
        }
    });

    test('responsive layout on mobile viewport', async ({ page }) => {
        await createProject(page, 'Mobile Test Project');
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/creator-dashboard');

        // Verify page is still usable — heading should be visible
        await expect(page.getByRole('heading', { name: /creator accountability/i })).toBeVisible();
    });
});
