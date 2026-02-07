import { Command } from 'commander';
import chalk from 'chalk';
import { api } from '../api/client.js';

export const updateCommand = new Command('update')
    .description('Update a task')
    .argument('<id>', 'Task ID (short or full)')
    .option('-t, --title <text>', 'New title')
    .option('-d, --description <text>', 'New description')
    .option('-s, --status <status>', 'New status (TODO, IN_PROGRESS, IN_REVIEW, DONE)')
    .option('-p, --priority <priority>', 'New priority (LOW, MEDIUM, HIGH, URGENT)')
    .option('-a, --assignee <id>', 'New assignee ID')
    .option('--due <date>', 'New due date (YYYY-MM-DD)')
    .action(async (id, options) => {
        try {
            // If short ID provided, search for full ID
            let taskId = id;
            if (id.length < 36) {
                const tasks = await api.get<any[]>('/tasks');
                const found = tasks.find(t => t.id.startsWith(id));
                if (!found) {
                    console.error(chalk.red(`Task not found with ID starting with: ${id}`));
                    process.exit(1);
                }
                taskId = found.id;
            }

            // Build update data
            const updateData: any = {};
            if (options.title) updateData.title = options.title;
            if (options.description) updateData.description = options.description;
            if (options.status) updateData.status = options.status;
            if (options.priority) updateData.priority = options.priority;
            if (options.assignee) updateData.assigneeId = options.assignee;
            if (options.due) updateData.dueDate = new Date(options.due).toISOString();

            if (Object.keys(updateData).length === 0) {
                console.log(chalk.yellow('No updates specified. Use --help to see available options.'));
                return;
            }

            // Update task
            const task = await api.put(`/tasks/${taskId}`, updateData);

            console.log(chalk.green('✓ Task updated successfully!'));
            console.log(chalk.gray(`Title: ${task.title}`));
            console.log(chalk.gray(`Status: ${task.status}`));
            console.log(chalk.gray(`Priority: ${task.priority}`));
        } catch (error: any) {
            console.error(chalk.red('Error updating task'));
            process.exit(1);
        }
    });
