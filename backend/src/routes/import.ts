import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { logTaskCreated } from '../lib/activityLog.js';

const router = Router();

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const milestoneSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  tags: z.array(z.string().min(1).max(50)).optional().default([]),
  domains: z.array(z.string().min(1).max(100)).optional().default([]),
  dependsOn: z.array(z.string().min(1).max(200)).optional().default([]),
});

const importMilestonesSchema = z.object({
  project: z.string().min(1),
  source: z.string().max(200).optional(),
  milestones: z.array(milestoneSchema).min(1).max(100),
});

// ---------------------------------------------------------------------------
// POST /api/import/milestones
// ---------------------------------------------------------------------------

router.post('/milestones', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
  const userId = req.userId!;
  const body = importMilestonesSchema.parse(req.body);
  const warnings: string[] = [];

  // ---- Resolve project ----
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.project);

  let project: { id: string; name: string } | null = null;

  if (isUuid) {
    project = await prisma.project.findUnique({
      where: { id: body.project },
      select: { id: true, name: true },
    });
  }

  if (!project) {
    // Case-insensitive name match across user's memberships
    const membership = await prisma.projectMember.findFirst({
      where: {
        userId,
        project: { name: { equals: body.project, mode: 'insensitive' } },
      },
      include: { project: { select: { id: true, name: true } } },
    });
    if (membership) {
      project = membership.project;
    }
  }

  if (!project) {
    throw new AppError('Project not found or you are not a member', 404);
  }

  // ---- Check permission (OWNER, ADMIN, MEMBER — not VIEWER) ----
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: project.id, userId } },
  });

  if (!member || member.role === 'VIEWER') {
    throw new AppError('Insufficient permissions — VIEWER cannot import milestones', 403);
  }

  // ---- Upsert tags ----
  const allTagNames = [...new Set(body.milestones.flatMap((m) => m.tags))];
  const tagMap = new Map<string, string>(); // lowercase name → tag id

  for (const tagName of allTagNames) {
    const tag = await prisma.tag.upsert({
      where: { projectId_name: { projectId: project.id, name: tagName } },
      update: {},
      create: { projectId: project.id, name: tagName },
    });
    tagMap.set(tagName.toLowerCase(), tag.id);
  }

  // ---- Match domains ----
  const userDomains = await prisma.domain.findMany({ where: { userId } });
  const domainMap = new Map<string, string>(); // lowercase name → domain id
  for (const d of userDomains) {
    domainMap.set(d.name.toLowerCase(), d.id);
  }

  // ---- Create tasks in transaction ----
  const taskCreateInputs = body.milestones.map((m) => {
    // Resolve tag ids
    const tagIds: string[] = [];
    for (const t of m.tags) {
      const id = tagMap.get(t.toLowerCase());
      if (id) tagIds.push(id);
    }

    // Resolve domain ids
    const domainIds: string[] = [];
    for (const d of m.domains) {
      const id = domainMap.get(d.toLowerCase());
      if (id) {
        domainIds.push(id);
      } else {
        warnings.push(`Domain "${d}" not found for milestone "${m.title}" — skipped`);
      }
    }

    return { milestone: m, tagIds, domainIds };
  });

  const createdTasks = await prisma.$transaction(
    taskCreateInputs.map(({ milestone, tagIds, domainIds }) =>
      prisma.task.create({
        data: {
          title: milestone.title,
          description: milestone.description ?? null,
          priority: milestone.priority ?? 'MEDIUM',
          status: milestone.status ?? 'TODO',
          dueDate: milestone.dueDate ? new Date(milestone.dueDate) : null,
          projectId: project!.id,
          creatorId: userId,
          tags: tagIds.length > 0
            ? { create: tagIds.map((tagId) => ({ tagId })) }
            : undefined,
          domains: domainIds.length > 0
            ? { create: domainIds.map((domainId) => ({ domainId })) }
            : undefined,
        },
        select: { id: true, title: true, status: true, priority: true },
      }),
    ),
  );

  // ---- Wire dependencies (post-transaction) ----
  const titleToId = new Map<string, string>();
  for (const t of createdTasks) {
    titleToId.set(t.title.toLowerCase(), t.id);
  }

  for (let i = 0; i < body.milestones.length; i++) {
    const deps = body.milestones[i].dependsOn;
    if (deps.length === 0) continue;
    const taskId = createdTasks[i].id;

    for (const depTitle of deps) {
      const depId = titleToId.get(depTitle.toLowerCase());
      if (!depId) {
        warnings.push(`Dependency "${depTitle}" not found in batch for "${createdTasks[i].title}" — skipped`);
        continue;
      }
      if (depId === taskId) {
        warnings.push(`Self-dependency skipped for "${createdTasks[i].title}"`);
        continue;
      }
      try {
        await prisma.taskDependency.create({
          data: { taskId, dependsOnId: depId },
        });
      } catch {
        warnings.push(`Failed to create dependency "${depTitle}" → "${createdTasks[i].title}"`);
      }
    }
  }

  // ---- Activity logs (fire-and-forget) ----
  for (const task of createdTasks) {
    logTaskCreated(task.id, userId).catch((err) => console.error('[import] Failed to log task creation:', err));
  }

  res.status(201).json({
    imported: createdTasks.length,
    project: { id: project.id, name: project.name },
    tasks: createdTasks,
    warnings,
    ...(body.source ? { source: body.source } : {}),
  });
  } catch (err) {
    next(err);
  }
});

export default router;
