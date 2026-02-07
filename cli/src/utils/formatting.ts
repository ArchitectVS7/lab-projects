import chalk from 'chalk';
import Table from 'cli-table3';
import { formatDistanceToNow } from 'date-fns';

export function formatPriority(priority: string): string {
    switch (priority) {
        case 'URGENT':
            return chalk.red.bold(priority);
        case 'HIGH':
            return chalk.yellow(priority);
        case 'MEDIUM':
            return chalk.blue(priority);
        case 'LOW':
            return chalk.gray(priority);
        default:
            return priority;
    }
}

export function formatStatus(status: string): string {
    switch (status) {
        case 'DONE':
            return chalk.green('✓ ' + status);
        case 'IN_PROGRESS':
            return chalk.cyan('◐ ' + status);
        case 'IN_REVIEW':
            return chalk.magenta('◎ ' + status);
        case 'TODO':
            return chalk.white('○ ' + status);
        default:
            return status;
    }
}

export function formatDate(date: string | Date | null | undefined): string {
    if (!date) return '-';
    try {
        return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
        return String(date);
    }
}

export function shortId(id: string): string {
    return id.substring(0, 8);
}

export function createTaskTable(tasks: any[]): Table.Table {
    const table = new Table({
        head: ['ID', 'Title', 'Status', 'Priority', 'Due'],
        colWidths: [10, 40, 15, 10, 20],
        wordWrap: true,
    });

    for (const task of tasks) {
        table.push([
            chalk.cyan(shortId(task.id)),
            task.title,
            formatStatus(task.status),
            formatPriority(task.priority),
            formatDate(task.dueDate),
        ]);
    }

    return table;
}

export function createProjectTable(projects: any[]): Table.Table {
    const table = new Table({
        head: ['ID', 'Name', 'Color', 'Members'],
        colWidths: [10, 30, 10, 10],
    });

    for (const project of projects) {
        table.push([
            chalk.cyan(shortId(project.id)),
            project.name,
            chalk.hex(project.color)('●'),
            project._count?.members || '-',
        ]);
    }

    return table;
}

export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}
