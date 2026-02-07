import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const exportQuerySchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  projectId: z.string().uuid().optional(),
});

// --- Helpers ---

function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function tasksToCSV(tasks: Array<Record<string, unknown>>): string {
  const headers = [
    'Title',
    'Description',
    'Status',
    'Priority',
    'Due Date',
    'Project',
    'Assignee',
    'Creator',
    'Created At',
    'Updated At',
  ];

  const rows = tasks.map((task) => [
    escapeCSVField(String(task.title || '')),
    escapeCSVField(String(task.description || '')),
    escapeCSVField(String(task.status || '')),
    escapeCSVField(String(task.priority || '')),
    escapeCSVField(task.dueDate ? new Date(task.dueDate as string).toISOString().split('T')[0] : ''),
    escapeCSVField(String((task.project as { name?: string })?.name || '')),
    escapeCSVField(String((task.assignee as { name?: string })?.name || '')),
    escapeCSVField(String((task.creator as { name?: string })?.name || '')),
    escapeCSVField(new Date(task.createdAt as string).toISOString()),
    escapeCSVField(new Date(task.updatedAt as string).toISOString()),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

// GET /api/export/tasks - Export tasks as CSV or JSON
router.get('/tasks', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query = exportQuerySchema.parse(req.query);

    // Get all projects where user is a member
    const userProjects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: req.userId },
          { members: { some: { userId: req.userId } } },
        ],
      },
      select: { id: true },
    });

    const projectIds = userProjects.map((p) => p.id);

    const where: Record<string, unknown> = {
      projectId: { in: projectIds },
    };

    // Filter by specific project if requested
    if (query.projectId) {
      if (!projectIds.includes(query.projectId)) {
        res.status(403).json({ error: 'Not a member of this project' });
        return;
      }
      where.projectId = query.projectId;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (query.format === 'json') {
      const exportData = tasks.map((t) => ({
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        project: t.project.name,
        assignee: t.assignee?.name || null,
        creator: t.creator.name,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="tasks-export.json"');
      res.json(exportData);
      return;
    }

    // CSV format
    const csv = tasksToCSV(tasks as unknown as Array<Record<string, unknown>>);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="tasks-export.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

export default router;
