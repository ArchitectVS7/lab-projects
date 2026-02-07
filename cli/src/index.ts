#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { loginCommand } from './commands/login.js';
import { createCommand } from './commands/create.js';
import { listCommand } from './commands/list.js';
import { updateCommand } from './commands/update.js';
import { completeCommand } from './commands/complete.js';
import { showCommand } from './commands/show.js';
import { projectsCommand } from './commands/projects.js';

const program = new Command();

program
    .name('taskman')
    .description(chalk.cyan('TaskMan CLI - Manage tasks from your terminal'))
    .version('1.0.0');

// Register commands
program.addCommand(loginCommand);
program.addCommand(createCommand);
program.addCommand(listCommand);
program.addCommand(updateCommand);
program.addCommand(completeCommand);
program.addCommand(showCommand);
program.addCommand(projectsCommand);

// Parse arguments
program.parse();
