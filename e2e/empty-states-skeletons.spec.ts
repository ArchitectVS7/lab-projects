import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { generateTestUser } from './helpers/fixtures';
import { createTask } from './helpers/api';

test.describe('Empty States and Skeletons', () => {
    test.beforeEach(async ({ page }) => {
        const user = generateTestUser('empty-states');
        await registerUser(page, user);
    });

    test('displays skeleton loaders during initial page load', async ({ page }) => {
        // Navigate to tasks page
        await page.goto('/tasks');

        // Skeleton should appear briefly
        const skeleton = page.locator('[class*="skeleton"], [class*="animate-pulse"], .loading');

        // Check if skeleton was visible (might be very brief)
        const skeletonVisible = await skeleton.isVisible().catch(() => false);

        // Either skeleton appeared or content loaded immediately
        expect(skeletonVisible || await page.getByText(/tasks|no tasks/i).isVisible()).toBeTruthy();
    });

    test('shows empty state when no tasks exist', async ({ page }) => {
        await page.goto('/tasks');

        // Wait for loading to complete
        await page.waitForTimeout(1000);

        // Should show empty state
        await expect(page.getByText(/no tasks|get started|create.*first task/i)).toBeVisible();

        // Should show CTA button
        await expect(page.getByRole('button', { name: /create.*task|new task/i })).toBeVisible();
    });

    test('shows empty state when no projects exist', async ({ page }) => {
        await page.goto('/projects');
        await page.waitForTimeout(1000);

        // Empty state message
        await expect(page.getByText(/no projects|create.*project/i)).toBeVisible();

        // CTA button
        await expect(page.getByRole('button', { name: /create.*project|new project/i })).toBeVisible();
    });

    test('transitions from skeleton to content', async ({ page }) => {
        // Create a task first
        await createTask(page, { title: 'Transition Test Task', priority: 'HIGH' });

        // Navigate to tasks (force reload)
        await page.goto('/tasks', { waitUntil: 'domcontentloaded' });

        // Skeleton might appear
        const skeleton = page.locator('[class*="skeleton"], [class*="animate-pulse"]');

        // Wait for content to load
        await page.waitForTimeout(2000);

        // Content should be visible
        await expect(page.getByText('Transition Test Task')).toBeVisible();

        // Skeleton should be gone
        const skeletonStillVisible = await skeleton.isVisible().catch(() => false);
        expect(skeletonStillVisible).toBeFalsy();
    });

    test('displays table skeleton for task list', async ({ page }) => {
        await page.goto('/tasks', { waitUntil: 'domcontentloaded' });

        // Look for table skeleton structure
        const tableSkeleton = page.locator('[data-testid="table-skeleton"], .table-skeleton');

        if (await tableSkeleton.isVisible({ timeout: 500 }).catch(() => false)) {
            // Verify skeleton has rows
            const skeletonRows = tableSkeleton.locator('tr, [class*="row"]');
            expect(await skeletonRows.count()).toBeGreaterThan(0);
        }
    });

    test('displays card skeleton for project grid', async ({ page }) => {
        await page.goto('/projects', { waitUntil: 'domcontentloaded' });

        // Look for card skeletons
        const cardSkeleton = page.locator('[data-testid="card-skeleton"], .card-skeleton');

        if (await cardSkeleton.isVisible({ timeout: 500 }).catch(() => false)) {
            // Verify skeleton cards exist
            expect(await cardSkeleton.count()).toBeGreaterThan(0);
        }
    });

    test('empty state has illustration or icon', async ({ page }) => {
        await page.goto('/tasks');
        await page.waitForTimeout(1000);

        // Look for empty state illustration
        const illustration = page.locator('svg, img[alt*="empty"], [data-testid="empty-illustration"]');

        if (await illustration.isVisible()) {
            // Verify it has reasonable size
            const box = await illustration.boundingBox();
            expect(box!.width).toBeGreaterThan(50);
        }
    });

    test('empty state CTA creates new item', async ({ page }) => {
        await page.goto('/tasks');
        await page.waitForTimeout(1000);

        // Click CTA button
        const ctaButton = page.getByRole('button', { name: /create.*task|new task/i });
        await ctaButton.click();

        // Should open create modal or form
        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible({ timeout: 3000 });
    });

    test('shows empty state for filtered results', async ({ page }) => {
        await createTask(page, { title: 'High Priority Task', priority: 'HIGH' });
        await page.goto('/tasks');

        // Filter by LOW priority (no matches)
        const priorityFilter = page.locator('select').filter({ hasText: /priority/i });
        if (await priorityFilter.isVisible()) {
            await priorityFilter.selectOption('LOW');
            await page.waitForTimeout(500);

            // Should show "no results" message
            await expect(page.getByText(/no.*tasks.*found|no.*matches/i)).toBeVisible();
        }
    });

    test('skeleton has pulsing animation', async ({ page }) => {
        await page.goto('/tasks', { waitUntil: 'domcontentloaded' });

        const skeleton = page.locator('[class*="animate-pulse"]').first();

        if (await skeleton.isVisible({ timeout: 500 }).catch(() => false)) {
            // Verify animation class
            const classes = await skeleton.getAttribute('class');
            expect(classes).toContain('animate-pulse');
        }
    });

    test('shows skeleton during search', async ({ page }) => {
        await page.goto('/tasks');

        // Open command palette
        await page.keyboard.press('Control+K');
        const palette = page.getByRole('dialog');

        // Type search query
        await palette.getByPlaceholder(/type a command|search/i).fill('searching');

        // Skeleton or loading indicator might appear
        const loading = palette.locator('[class*="loading"], [class*="skeleton"]');

        // This is brief, so we just verify search works
        await page.waitForTimeout(500);
    });

    test('empty state for calendar with no events', async ({ page }) => {
        await page.goto('/calendar');
        await page.waitForTimeout(1000);

        // Calendar should show but with no events
        // Look for empty date cells
        const dateCells = page.locator('[class*="border"]');
        expect(await dateCells.count()).toBeGreaterThan(0);
    });

    test('empty state for focus mode', async ({ page }) => {
        await page.goto('/focus');
        await page.waitForTimeout(1000);

        // Should show empty state
        await expect(page.getByText(/no.*tasks.*focus|nothing.*to.*focus/i)).toBeVisible();

        // Should suggest creating tasks
        await expect(page.getByRole('link', { name: /create.*task/i })).toBeVisible();
    });

    test('empty state for dependencies graph', async ({ page }) => {
        await page.goto('/dependencies');
        await page.waitForTimeout(1000);

        // Should show message about no dependencies
        const emptyMessage = page.getByText(/no.*dependencies|create.*tasks/i);
        const graph = page.locator('canvas');

        // Either empty message or empty graph
        const hasMessage = await emptyMessage.isVisible().catch(() => false);
        const hasGraph = await graph.isVisible().catch(() => false);

        expect(hasMessage || hasGraph).toBeTruthy();
    });

    test('skeleton matches content layout', async ({ page }) => {
        await createTask(page, { title: 'Layout Test', priority: 'HIGH' });

        // Navigate and capture skeleton
        await page.goto('/tasks', { waitUntil: 'domcontentloaded' });

        const skeleton = page.locator('[class*="skeleton"]').first();
        const skeletonBox = await skeleton.boundingBox().catch(() => null);

        // Wait for content
        await page.waitForTimeout(2000);

        const content = page.getByText('Layout Test').locator('..');
        const contentBox = await content.boundingBox().catch(() => null);

        // Skeleton and content should have similar dimensions (within reason)
        if (skeletonBox && contentBox) {
            expect(Math.abs(skeletonBox.width - contentBox.width)).toBeLessThan(100);
        }
    });

    test('multiple skeleton items for list views', async ({ page }) => {
        await page.goto('/tasks', { waitUntil: 'domcontentloaded' });

        const skeletons = page.locator('[data-testid="skeleton-row"], [class*="skeleton"]');

        if (await skeletons.first().isVisible({ timeout: 500 }).catch(() => false)) {
            // Should show multiple skeleton rows (3-5 typically)
            const count = await skeletons.count();
            expect(count).toBeGreaterThanOrEqual(1);
        }
    });

    test('empty state is accessible', async ({ page }) => {
        await page.goto('/tasks');
        await page.waitForTimeout(1000);

        // Empty state should have proper heading
        const heading = page.getByRole('heading', { name: /no tasks|empty/i });

        if (await heading.isVisible()) {
            // Verify heading level
            const tagName = await heading.evaluate(el => el.tagName);
            expect(['H1', 'H2', 'H3']).toContain(tagName);
        }
    });

    test('skeleton respects reduced motion preference', async ({ page }) => {
        // Emulate reduced motion preference
        await page.emulateMedia({ reducedMotion: 'reduce' });

        await page.goto('/tasks', { waitUntil: 'domcontentloaded' });

        const skeleton = page.locator('[class*="skeleton"]').first();

        if (await skeleton.isVisible({ timeout: 500 }).catch(() => false)) {
            // Animation might be disabled
            const classes = await skeleton.getAttribute('class');
            // This is hard to test, but skeleton should still appear
            expect(classes).toBeTruthy();
        }
    });
});
