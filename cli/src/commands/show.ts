import { Command } from 'commander';
import chalk from 'chalk';
import { api } from '../api/client.js';
import { formatPriority, formatStatus, formatDate } from '../utils/formatting.js';

export const showCommand = new Command('show')
    .description('Show task details')
    .argument('<id>', 'Task ID (short or full)')
    .action(async (id) => {
        try {
            // If short ID provided, we need to search for it
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

            const task = await api.get(`/tasks/${taskId}`);

            console.log('\n' + chalk.bold(task.title));
            console.log(chalk.gray('─'.repeat(50)));
            console.log(chalk.cyan('ID:         ') + task.id);
            console.log(chalk.cyan('Status:     ') + formatStatus(task.status));
            console.log(chalk.cyan('Priority:   ') + formatPriority(task.priority));

            if (task.description) {
                console.log(chalk.cyan('Description:'));
                console.log(chalk.white('  ' + task.description));
            }

            if (task.project) {
                console.log(chalk.cyan('Project:    ') + task.project.name);
            }

            if (task.assignee) {
                console.log(chalk.cyan('Assignee:   ') + task.assignee.name);
            }

            if (task.creator) {
                console.log(chalk.cyan('Creator:    ') + task.creator.name);
            }

            if (task.dueDate) {
                console.log(chalk.cyan('Due:        ') + formatDate(task.dueDate));
            }

            console.log(chalk.cyan('Created:    ') + formatDate(task.createdAt));
            console.log(chalk.cyan('Updated:    ') + formatDate(task.updatedAt));
            console.log('');
        } catch (error: any) {
            console.error(chalk.red('Error fetching task'));
            process.exit(1);
        }
    });
