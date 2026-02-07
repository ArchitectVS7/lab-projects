import { Command } from 'commander';
import chalk from 'chalk';
import { api } from '../api/client.js';
import { createTaskTable } from '../utils/formatting.js';

export const listCommand = new Command('list')
    .description('List tasks')
    .option('-p, --project <name>', 'Filter by project name')
    .option('-s, --status <status>', 'Filter by status (TODO, IN_PROGRESS, IN_REVIEW, DONE)')
    .option('-a, --assignee <email>', 'Filter by assignee email')
    .option('--priority <priority>', 'Filter by priority (LOW, MEDIUM, HIGH, URGENT)')
    .option('--limit <number>', 'Limit number of results', '20')
    .action(async (options) => {
        try {
            const params: any = {};

            // Build query params
            if (options.status) params.status = options.status;
            if (options.priority) params.priority = options.priority;
            if (options.limit) params.limit = options.limit;

            // Get tasks
            const tasks = await api.get<any[]>('/tasks', params);

            if (!Array.isArray(tasks) || tasks.length === 0) {
                console.log(chalk.yellow('No tasks found'));
                return;
            }

            // Filter by project name if provided (client-side)
            let filteredTasks = tasks;
            if (options.project) {
                filteredTasks = tasks.filter(task =>
                    task.project?.name?.toLowerCase().includes(options.project.toLowerCase())
                );
            }

            // Filter by assignee email if provided (client-side)
            if (options.assignee) {
                filteredTasks = filteredTasks.filter(task =>
                    task.assignee?.email?.toLowerCase().includes(options.assignee.toLowerCase())
                );
            }

            if (filteredTasks.length === 0) {
                console.log(chalk.yellow('No tasks match your filters'));
                return;
            }

            // Display table
            const table = createTaskTable(filteredTasks);
            console.log('\n' + table.toString() + '\n');
            console.log(chalk.gray(`Showing ${filteredTasks.length} tasks`));
        } catch (error: any) {
            console.error(chalk.red('Error fetching tasks'));
            process.exit(1);
        }
    });
