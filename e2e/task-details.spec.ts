import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { generateTestUser, generateProjectName, generateTaskTitle } from './helpers/fixtures';
import { ApiHelper } from './helpers/api';
import path from 'path';
import fs from 'fs';

test.describe('Task Details (Comments & Attachments)', () => {
    let api: ApiHelper;
    let user: { email: string; password: string; name: string };
    let projectId: string;
    let taskId: string;
    let taskTitle: string;

    test.beforeEach(async ({ page, request }) => {
        // Log browser console
        page.on('console', msg => console.log('BROWSER:', msg.text()));
        page.on('response', resp => {
            if (resp.status() >= 400) console.log('API ERROR:', resp.url(), resp.status());
        });

        user = generateTestUser('details');
        const projectName = generateProjectName('DetailsTest');
        taskTitle = generateTaskTitle('Detail Task');

        // 1. UI Register
        await registerUser(page, user);

        // 2. API Helper Login
        api = new ApiHelper(request);
        await api.login(user.email, user.password);

        // 3. Setup Project and Task via API
        const project = await api.createProject(projectName);
        projectId = project.id;
        const task = await api.createTask(projectId, taskTitle);
        taskId = task.id;

        // Navigate to Tasks page and open the task
        await page.getByRole('link', { name: 'Tasks', exact: true }).click();
        await page.waitForURL('**/tasks');
        await page.reload();

        // Open task detail modal
        const taskRow = page.getByRole('row').filter({ hasText: taskTitle });
        await expect(taskRow).toBeVisible({ timeout: 10000 });
        await taskRow.getByRole('button', { name: 'Edit' }).click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    });

    test('user can add, edit, and delete comments', async ({ page }) => {
        const commentText = `Test comment ${Date.now()}`;
        const updatedText = `${commentText} (edited)`;

        const dialog = page.getByRole('dialog');

        // Switch to Comments tab (it's the default, but let's be sure)
        await dialog.getByRole('button', { name: 'Comments' }).click();

        // Add Comment
        const editor = dialog.getByPlaceholder(/write a comment/i);
        await editor.fill(commentText);
        await dialog.getByRole('button', { name: 'Send' }).click();

        // Verify Comment Visible
        await expect(dialog.getByText(commentText)).toBeVisible();

        // Edit Comment
        // Targeted selector for the comment text container
        const commentItem = dialog.locator('div.group', { hasText: commentText }).last();
        await expect(commentItem).toBeVisible();
        await commentItem.hover();

        await commentItem.getByRole('button', { name: /edit/i }).click();

        // Fill updated text in the editor that appears
        const editArea = commentItem.locator('textarea');
        await editArea.fill(updatedText);
        await commentItem.getByRole('button', { name: /send|save/i }).click();

        // Verify Updated Text
        await expect(dialog.getByText(updatedText)).toBeVisible();

        // Delete Comment
        await dialog.getByText(updatedText).hover();

        // Listen for confirm dialog
        page.once('dialog', d => d.accept());
        await commentItem.getByRole('button', { name: /delete/i }).click();

        // Verify Gone
        await expect(dialog.getByText(updatedText)).not.toBeVisible();
    });

    test('user can upload and delete attachments', async ({ page }) => {
        const dialog = page.getByRole('dialog');

        // Switch to Files tab
        await dialog.getByRole('button', { name: 'Files' }).click();

        // Create a dummy file
        const filePath = path.join(__dirname, 'temp-upload.txt');
        fs.writeFileSync(filePath, 'This is a test upload file.');

        try {
            // Upload file
            const fileInput = dialog.locator('input[type="file"]');
            await fileInput.setInputFiles(filePath);

            // Wait for upload to complete (it shows the filename)
            await expect(dialog.getByText('temp-upload.txt')).toBeVisible({ timeout: 10000 });

            // Delete Attachment
            const attachmentItem = dialog.locator('li', { hasText: 'temp-upload.txt' });
            await attachmentItem.getByRole('button', { name: /delete/i }).click();

            // Verify Gone
            await expect(dialog.getByText('temp-upload.txt')).not.toBeVisible();

        } finally {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    });

    test('activity log tracks changes', async ({ page }) => {
        const dialog = page.getByRole('dialog');

        // Change status to IN_PROGRESS
        const statusSelect = dialog.locator('select').filter({ hasText: /to do/i });
        await statusSelect.selectOption('IN_PROGRESS');

        // Update description to trigger update
        await dialog.getByPlaceholder(/optional description/i).fill('New description for activity log');
        await dialog.getByRole('button', { name: 'Update' }).click();

        // Wait for modal to close or toast to appear (Update usually closes or stays open depending on implementation)
        // Based on TaskDetailModal, it calls onSubmit. ProjectDetailPage likely handles it.
        // Let's re-open if it closed
        if (!await dialog.isVisible()) {
            const taskRow = page.getByRole('row').filter({ hasText: taskTitle });
            await taskRow.getByRole('button', { name: 'Edit' }).click();
            await expect(page.getByRole('dialog')).toBeVisible();
        }

        // Switch to Activity tab
        await dialog.getByRole('button', { name: 'Activity' }).click();

        // Verify Log Entry
        // Use regex for flexible match on names/actions
        await expect(dialog.getByText(/changed status/i)).toBeVisible();
        await expect(dialog.getByText(/changed description/i)).toBeVisible();
    });
});
