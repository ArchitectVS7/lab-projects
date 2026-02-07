import { Command } from 'commander';
import chalk from 'chalk';
import { api } from '../api/client.js';
import { createProjectTable } from '../utils/formatting.js';

export const projectsCommand = new Command('projects')
    .description('List projects')
    .action(async () => {
        try {
            const projects = await api.get<any[]>('/projects');

            if (!Array.isArray(projects) || projects.length === 0) {
                console.log(chalk.yellow('No projects found'));
                return;
            }

            // Fetch member counts for each project
            const projectsWithCounts = await Promise.all(
                projects.map(async (project) => {
                    try {
                        const details = await api.get(`/projects/${project.id}`);
                        return {
                            ...project,
                            _count: {
                                members: details.members?.length || 0,
                            },
                        };
                    } catch {
                        return { ...project, _count: { members: 0 } };
                    }
                })
            );

            const table = createProjectTable(projectsWithCounts);
            console.log('\n' + table.toString() + '\n');
            console.log(chalk.gray(`Showing ${projectsWithCounts.length} projects`));
        } catch (error: any) {
            console.error(chalk.red('Error fetching projects'));
            process.exit(1);
        }
    });
