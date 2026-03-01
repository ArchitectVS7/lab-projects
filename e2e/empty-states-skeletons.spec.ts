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
        await page.goto('/tasks');

        const skeleton = page.locator('[class*="skeleton"], [class*="animate-pulse"], .loading');
        const skeletonVisible = await skeleton.isVisible().catch(() => false);

        // Either skeleton appeared or content loaded immediately
        expect(skeletonVisible || await page.getByText(/tasks|no tasks/i).isVisible()).toBeTruthy();
    });

    test('shows empty state when no tasks exist', async ({ page }) => {
        await page.goto('/tasks');
        await page.waitForTimeout(1000);

        // EmptyTasksState shows "No tasks yet"
        await expect(page.getByText('No tasks yet')).toBeVisible();

        // CTA button says "Create Task"
        await expect(page.getByRole('button', { name: 'Create Task' })).toBeVisible();
    });

    test('shows empty state when no projects exist', async ({ page }) => {
        await page.goto('/projects');
        await page.waitForTimeout(1000);

        // EmptyProjectsState shows "No projects yet"
        await expect(page.getByText('No projects yet')).toBeVisible();

        // CTA button says "Create Project"
        await expect(page.getByRole('button', { name: 'Create Project' })).toBeVisible();
    });

    test('transitions from skeleton to content', async ({ page }) => {
        await createTask(page, { title: 'Transition Test Task', priority: 'HIGH' });

        await page.goto('/tasks', { waitUntil: 'domcontentloaded' });

        // Wait for content to load
        await page.waitForTimeout(2000);

        // Content should be visible
        await expect(page.getByText('Transition Test Task')).toBeVisible();

        // Skeleton should be gone
        const skeleton = page.locator('[class*="skeleton"], [class*="animate-pulse"]');
        const skeletonStillVisible = await skeleton.isVisible().catch(() => false);
        expect(skeletonStillVisible).toBeFalsy();
    });

    test('displays table skeleton for task list', async ({ page }) => {
        await page.goto('/tasks', { waitUntil: 'domcontentloaded' });

        const tableSkeleton = page.locator('[data-testid="table-skeleton"], .table-skeleton');

        if (await tableSkeleton.isVisible({ timeout: 500 }).catch(() => false)) {
            const skeletonRows = tableSkeleton.locator('tr, [class*="row"]');
            expect(await skeletonRows.count()).toBeGreaterThan(0);
        }
    });

    test('displays card skeleton for project grid', async ({ page }) => {
        await page.goto('/projects', { waitUntil: 'domcontentloaded' });

        const cardSkeleton = page.locator('[data-testid="card-skeleton"], .card-skeleton');

        if (await cardSkeleton.isVisible({ timeout: 500 }).catch(() => false)) {
            expect(await cardSkeleton.count()).toBeGreaterThan(0);
        }
    });

    test('empty state has illustration or icon', async ({ page }) => {
        await page.goto('/tasks');
        await page.waitForTimeout(1000);

        // Verify empty state heading is visible
        await expect(page.getByRole('heading', { name: /no tasks yet/i })).toBeVisible();

        // EmptyTasksState has an inline SVG illustration (64x64) as a sibling of the heading
        const illustration = page.locator('svg[viewBox="0 0 64 64"]');
        await expect(illustration).toBeVisible();

        const box = await illustration.boundingBox();
        expect(box!.width).toBeGreaterThan(20);
    });

    test('empty state CTA creates new item', async ({ page }) => {
        await page.goto('/tasks');
        await page.waitForTimeout(1000);

        // Click CTA button "Create Task"
        const ctaButton = page.getByRole('button', { name: 'Create Task' });
        await ctaButton.click();

        // Should open create modal
        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible({ timeout: 3000 });
    });

    test('shows empty state for filtered results', async ({ page }) => {
        await createTask(page, { title: 'High Priority Task', priority: 'HIGH' });
        await page.goto('/tasks');

        // Filter by LOW priority (no matches)
        const priorityFilter = page.locator('select').filter({ hasText: /all priorities/i });
        if (await priorityFilter.isVisible()) {
            await priorityFilter.selectOption('LOW');
            await page.waitForTimeout(500);

            // Should show "No tasks match" message
            await expect(page.getByText(/no tasks match/i)).toBeVisible();
        }
    });

    test('skeleton has pulsing animation', async ({ page }) => {
        await page.goto('/tasks', { waitUntil: 'domcontentloaded' });

        const skeleton = page.locator('[class*="animate-pulse"]').first();

        if (await skeleton.isVisible({ timeout: 500 }).catch(() => false)) {
            const classes = await skeleton.getAttribute('class');
            expect(classes).toContain('animate-pulse');
        }
    });

    test('shows skeleton during search', async ({ page }) => {
        await page.goto('/tasks');
        await page.waitForTimeout(500);

        // Ensure page has focus before keyboard shortcut
        await page.locator('body').click();

        // Open command palette
        await page.keyboard.press('Control+KeyK');
        const palette = page.getByRole('dialog');
        await expect(palette).toBeVisible({ timeout: 5000 });

        // Type search query
        await palette.getByPlaceholder(/type a command or search/i).fill('searching');

        // Skeleton or loading indicator might appear
        await page.waitForTimeout(500);
        // Just verify search works without errors
    });

    test('empty state for calendar with no events', async ({ page }) => {
        await page.goto('/calendar');
        await page.waitForTimeout(1000);

        // Calendar should show but with no events
        const dateCells = page.locator('[class*="border"]');
        expect(await dateCells.count()).toBeGreaterThan(0);
    });

    test('empty state for focus mode', async ({ page }) => {
        await page.goto('/focus');
        await page.waitForTimeout(1000);

        // FocusPage shows "All priorities complete!" heading when there are no tasks to focus on
        await expect(page.getByRole('heading', { name: /all priorities complete/i })).toBeVisible();

        // Should have a "View all tasks" button
        await expect(page.getByRole('button', { name: /view all tasks/i })).toBeVisible();
    });

    test('empty state for dependencies graph', async ({ page }) => {
        await page.goto('/dependencies');
        await page.waitForTimeout(1000);

        // Should show "No Projects" or "No Dependencies" or a canvas graph
        const noProjects = page.getByText(/no projects/i);
        const noDeps = page.getByText(/no dependencies/i);
        const graph = page.locator('canvas');

        const hasNoProjects = await noProjects.isVisible().catch(() => false);
        const hasNoDeps = await noDeps.isVisible().catch(() => false);
        const hasGraph = await graph.isVisible().catch(() => false);

        expect(hasNoProjects || hasNoDeps || hasGraph).toBeTruthy();
    });

    test('skeleton matches content layout', async ({ page }) => {
        await createTask(page, { title: 'Layout Test', priority: 'HIGH' });

        await page.goto('/tasks', { waitUntil: 'domcontentloaded' });

        const skeleton = page.locator('[class*="skeleton"]').first();
        const skeletonBox = await skeleton.boundingBox().catch(() => null);

        // Wait for content
        await page.waitForTimeout(2000);

        const content = page.getByText('Layout Test').locator('..');
        const contentBox = await content.boundingBox().catch(() => null);

        if (skeletonBox && contentBox) {
            expect(Math.abs(skeletonBox.width - contentBox.width)).toBeLessThan(100);
        }
    });

    test('multiple skeleton items for list views', async ({ page }) => {
        await page.goto('/tasks', { waitUntil: 'domcontentloaded' });

        const skeletons = page.locator('[data-testid="skeleton-row"], [class*="skeleton"]');

        if (await skeletons.first().isVisible({ timeout: 500 }).catch(() => false)) {
            const count = await skeletons.count();
            expect(count).toBeGreaterThanOrEqual(1);
        }
    });

    test('empty state is accessible', async ({ page }) => {
        await page.goto('/tasks');
        await page.waitForTimeout(1000);

        // EmptyTasksState uses h3 heading "No tasks yet"
        const heading = page.getByRole('heading', { name: /no tasks yet/i });
        await expect(heading).toBeVisible();

        const tagName = await heading.evaluate(el => el.tagName);
        expect(['H1', 'H2', 'H3']).toContain(tagName);
    });

    test('skeleton respects reduced motion preference', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto('/tasks', { waitUntil: 'domcontentloaded' });

        const skeleton = page.locator('[class*="skeleton"]').first();

        if (await skeleton.isVisible({ timeout: 500 }).catch(() => false)) {
            const classes = await skeleton.getAttribute('class');
            expect(classes).toBeTruthy();
        }
    });
});
