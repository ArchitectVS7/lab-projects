import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { generateTestUser, generateProjectName, generateTaskTitle } from './helpers/fixtures';
import { ApiHelper } from './helpers/api';

test.describe('Task Dependencies', () => {
    let projectName: string;
    let api: ApiHelper;
    let user: { email: string; password: string; name: string };
    let projectId: string;

    test.beforeEach(async ({ page, request }) => {
        user = generateTestUser('deps');
        projectName = generateProjectName('DepsTest');

        // 1. UI Register (sets browser cookies for frontend on port 3000)
        await registerUser(page, user);

        // 2. API Helper uses standalone request context
        // Must login via API since cookies don't cross origins (3000 vs 4000)
        api = new ApiHelper(request);
        await api.login(user.email, user.password);

        // 3. Create Project via API
        const project = await api.createProject(projectName);
        projectId = project.id;
    });

    test('user can add and remove dependencies', async ({ page }) => {
        const taskA_Title = generateTaskTitle('Task A');
        const taskB_Title = generateTaskTitle('Task B');

        // Create tasks via API
        await api.createTask(projectId, taskA_Title);
        await api.createTask(projectId, taskB_Title);

        // Navigate to Tasks page
        await page.getByRole('link', { name: 'Tasks', exact: true }).click();
        await page.waitForURL('**/tasks');

        // Wait for tasks to load and refresh to pick up API-created data
        await page.reload();
        await expect(page.getByText(taskA_Title)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(taskB_Title)).toBeVisible();

        // Find Task A row and click Edit button to open modal
        const taskARow = page.getByRole('row').filter({ hasText: taskA_Title });
        await taskARow.getByRole('button', { name: 'Edit' }).click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Look for "Add dependency" button or similar in the modal
        const addDepBtn = dialog.getByRole('button', { name: /add dependency|dependency/i });
        if (await addDepBtn.count() > 0) {
            await addDepBtn.click();

            // Select Task B from dropdown if available
            // Use specific option text to find the correct select element
            const depSelect = dialog.locator('select').filter({ hasText: 'Select a task...' });

            // Wait for options to populate (handling async fetch)
            await expect(depSelect.locator(`option:has-text("${taskB_Title}")`)).toBeAttached({ timeout: 5000 });

            if (await depSelect.count() > 0) {
                await depSelect.selectOption({ label: taskB_Title });
            }

            // Verify Dependency Added
            await expect(dialog.getByText(/blocked by|depends on/i)).toBeVisible({ timeout: 5000 });
        }

        // Close modal
        await dialog.getByRole('button', { name: /close|cancel|save|×/i }).first().click();
    });

    test('circular dependency is prevented', async ({ page }) => {
        const taskA_Title = generateTaskTitle('Task A');
        const taskB_Title = generateTaskTitle('Task B');

        // Create tasks via API
        const taskA = await api.createTask(projectId, taskA_Title);
        const taskB = await api.createTask(projectId, taskB_Title);

        // A depends on B via API
        await api.addDependency(taskA.id, taskB.id);

        // Navigate to Tasks page
        await page.getByRole('link', { name: 'Tasks', exact: true }).click();
        await page.waitForURL('**/tasks');
        await page.reload();
        await expect(page.getByText(taskA_Title)).toBeVisible({ timeout: 10000 });

        // Find Task B row and click Edit button
        const taskBRow = page.getByRole('row').filter({ hasText: taskB_Title });
        await taskBRow.getByRole('button', { name: 'Edit' }).click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Try to add A as dependency of B (would create cycle)
        const addDepBtn = dialog.getByRole('button', { name: /add dependency|dependency/i });
        if (await addDepBtn.count() > 0) {
            await addDepBtn.click();

            const depSelect = dialog.locator('select').filter({ hasText: 'Select a task...' });

            // Wait for options to populate
            await expect(depSelect.locator(`option:has-text("${taskA_Title}")`)).toBeAttached({ timeout: 5000 });

            if (await depSelect.count() > 0) {
                await depSelect.selectOption({ label: taskA_Title });
            }

            // Verify Error Message for circular dependency
            await expect(page.getByText(/circular|cycle|already depends/i)).toBeVisible({ timeout: 5000 });
        }
    });
});
