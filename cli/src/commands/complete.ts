import { Command } from 'commander';
import chalk from 'chalk';
import { api } from '../api/client.js';

export const completeCommand = new Command('complete')
    .description('Mark task as completed')
    .argument('<id>', 'Task ID (short or full)')
    .action(async (id) => {
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

            // Update task status to DONE
            const task = await api.put(`/tasks/${taskId}`, { status: 'DONE' });

            console.log(chalk.green('✓ Task marked as completed!'));
            console.log(chalk.gray(`${task.title}`));
        } catch (error: any) {
            console.error(chalk.red('Error completing task'));
            process.exit(1);
        }
    });
