import { Command } from 'commander';
import chalk from 'chalk';
import { api } from '../api/client.js';
import { parseISO, addDays, addWeeks, addMonths, format } from 'date-fns';

export const createCommand = new Command('create')
    .description('Create a new task')
    .argument('[title]', 'Task title')
    .option('-p, --project <id>', 'Project ID')
    .option('-d, --description <text>', 'Task description')
    .option('--priority <level>', 'Priority (LOW, MEDIUM, HIGH, URGENT)', 'MEDIUM')
    .option('--due <date>', 'Due date (YYYY-MM-DD, or "tomorrow", "next week", etc.)')
    .option('-a, --assignee <id>', 'Assignee user ID')
    .action(async (title, options) => {
        try {
            if (!title) {
                console.error(chalk.red('Task title is required'));
                console.log(chalk.gray('Usage: taskman create "Task title" [options]'));
                process.exit(1);
            }

            // Parse due date if provided
            let dueDate: string | undefined;
            if (options.due) {
                dueDate = parseDueDate(options.due);
            }

            // Build task data
            const taskData: any = {
                title,
                priority: options.priority,
            };

            if (options.description) taskData.description = options.description;
            if (options.project) taskData.projectId = options.project;
            if (options.assignee) taskData.assigneeId = options.assignee;
            if (dueDate) taskData.dueDate = dueDate;

            // Create task
            const task = await api.post('/tasks', taskData);

            console.log(chalk.green('✓ Task created successfully!'));
            console.log(chalk.gray(`ID: ${task.id.substring(0, 8)}`));
            console.log(chalk.gray(`Title: ${task.title}`));
            console.log(chalk.gray(`Status: ${task.status}`));
            console.log(chalk.gray(`Priority: ${task.priority}`));
            if (task.dueDate) {
                console.log(chalk.gray(`Due: ${new Date(task.dueDate).toLocaleDateString()}`));
            }
        } catch (error: any) {
            console.error(chalk.red('Error creating task'));
            process.exit(1);
        }
    });

function parseDueDate(input: string): string {
    const normalized = input.toLowerCase().trim();
    const now = new Date();

    // Handle relative dates
    if (normalized === 'today') {
        return now.toISOString();
    } else if (normalized === 'tomorrow') {
        return addDays(now, 1).toISOString();
    } else if (normalized === 'next week' || normalized === 'nextweek') {
        return addWeeks(now, 1).toISOString();
    } else if (normalized === 'next month' || normalized === 'nextmonth') {
        return addMonths(now, 1).toISOString();
    }

    // Try to parse as ISO date or common formats
    try {
        // Try YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
            return parseISO(input).toISOString();
        }
        // Try parsing as Date
        const parsed = new Date(input);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString();
        }
    } catch {
        // Fall through
    }

    console.warn(chalk.yellow(`Warning: Could not parse date "${input}", using current date`));
    return now.toISOString();
}
