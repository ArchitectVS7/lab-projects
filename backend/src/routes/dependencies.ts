import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logDependencyAdded, logDependencyRemoved } from '../lib/activityLog.js';

// Let's stick to the generated file structure but fix the fields.
// Also "dependsOnId" in the request body is fine (client side terminology), but maps to "blockingId".

import { getIO } from '../lib/socket.js';

const router = Router();

// --- Zod Schemas ---

const addDependencySchema = z.object({
  blockingTaskId: z.string().uuid('Invalid dependency task ID'), // User provides ID of the blocking task
});

// --- UUID validation helper ---
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(id: string, label: string): void {
  if (!uuidRegex.test(id)) {
    throw new AppError(`Invalid ${label} format`, 400);
  }
}

// --- Helpers ---

async function getProjectMembership(userId: string, projectId: string) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

function canModifyTask(
  membership: { role: string } | null,
  task: { creatorId: string },
  userId: string
): boolean {
  if (!membership) return false;
  if (['OWNER', 'ADMIN'].includes(membership.role)) return true;
  if (membership.role === 'MEMBER' && task.creatorId === userId) return true;
  return false;
}

/**
 * DFS cycle detection: Is 'target' already blocking 'start'? (Indirectly or directly)
 * We want to add: start depends on target (target blocks start).
 * Cycle exists if start already blocks target.
 * 
 * Graph direction: Blocking -> Blocked.
 * We are adding edge: target -> start.
 * Check if path start -> ... -> target exists.
 */
async function wouldCreateCycle(blockingId: string, blockedId: string): Promise<boolean> {
  // We want to add blockingId -> blockedId.
  // Check if there is already a path from blockedId to blockingId.
  // If so, adding the edge would close the cycle.

  const visited = new Set<string>();
  const stack = [blockedId]; // Start searching from the task that is being inhibited

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === blockingId) return true; // Found path to the proposed blocker
    if (visited.has(current)) continue;
    visited.add(current);

    // Find what 'current' blocks.
    // current is blocking X, Y, Z.
    // relations: blockingId=current, blockedId=X
    const downstream = await prisma.taskDependency.findMany({
      where: { blockingId: current },
      select: { blockedId: true },
    });

    for (const dep of downstream) {
      stack.push(dep.blockedId);
    }
  }

  return false;
}

const taskSelect = {
  id: true,
  title: true,
  status: true,
  priority: true,
  dueDate: true,
  projectId: true,
  creatorId: true,
} as const;

// --- Routes ---

// POST /api/tasks/:id/dependencies - Add dependency
// URL param :id is the BLOCKED task. Body dependsOnId is the BLOCKING task.
router.post('/tasks/:id/dependencies', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'task ID');
    const data = addDependencySchema.parse(req.body); // data.blockingTaskId is blockingId

    const blockedId = req.params.id;
    const blockingId = data.blockingTaskId;

    // Self-dependency check
    if (blockedId === blockingId) {
      throw new AppError('A task cannot depend on itself', 400);
    }

    // Get both tasks
    const [blockedTask, blockingTask] = await Promise.all([
      prisma.task.findUnique({ where: { id: blockedId }, select: taskSelect }),
      prisma.task.findUnique({ where: { id: blockingId }, select: taskSelect }),
    ]);

    if (!blockedTask) {
      throw new AppError('Task not found', 404);
    }
    if (!blockingTask) {
      throw new AppError('Dependency task not found', 404);
    }

    // Both tasks must be in same project
    if (blockedTask.projectId !== blockingTask.projectId) {
      throw new AppError('Both tasks must be in the same project', 400);
    }

    // Auth: user must be able to modify the BLOCKED task (the one being constrained)
    const membership = await getProjectMembership(req.userId!, blockedTask.projectId);
    if (!canModifyTask(membership, blockedTask, req.userId!)) {
      throw new AppError('You cannot modify this task', 403);
    }

    // Check for duplicate
    const existing = await prisma.taskDependency.findUnique({
      where: { blockingId_blockedId: { blockingId, blockedId } },
    });
    if (existing) {
      // Idempotent success
      return res.status(200).json(existing);
    }

    // Cycle detection
    const hasCycle = await wouldCreateCycle(blockingId, blockedId);
    if (hasCycle) {
      throw new AppError('Adding this dependency would create a circular dependency', 400);
    }

    const dependency = await prisma.taskDependency.create({
      data: {
        blockingId,
        blockedId,
      },
      include: {
        blocking: { select: taskSelect }, // Return the blocking task details
      },
    });

    // Log activity
    await logDependencyAdded(blockedId, req.userId!, blockingTask.title);

    const io = getIO();
    if (io) {
      io.to(`task:${blockedId}`).emit('dependency:added', dependency);
    }

    res.status(201).json(dependency);
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks/:id/dependencies - List dependencies
router.get('/tasks/:id/dependencies', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'task ID');

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      select: { projectId: true },
    });

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const membership = await getProjectMembership(req.userId!, task.projectId);
    if (!membership) {
      throw new AppError('Task not found', 404); // Hide existence if not member
    }

    // dependsOn: Tasks that block THIS task
    // blocks: Tasks that THIS task blocks
    const [blocking, blockedBy] = await Promise.all([
      prisma.taskDependency.findMany({
        where: { blockedId: req.params.id }, // I am blocked by...
        include: {
          blocking: { select: taskSelect },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.taskDependency.findMany({
        where: { blockingId: req.params.id }, // I am blocking...
        include: {
          blocked: { select: taskSelect },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    res.json({
      dependsOn: blocking.map((d) => ({
        id: d.id,
        task: d.blocking, // The task that blocks me
        createdAt: d.createdAt,
      })),
      blocks: blockedBy.map((d) => ({
        id: d.id,
        task: d.blocked, // The task I block
        createdAt: d.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tasks/:id/dependencies/:depId
// Remove dependency. depId is the ID of the Dependency Record, NOT the task ID.
// Wait, my plan said :dependencyId but usually FE prefers sending blockingTaskId.
// But :depId is safer if unique.
// Let's stick to :depId being the Dependency Record ID for REST correctness.
router.delete('/tasks/:id/dependencies/:depId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'task ID');
    validateUUID(req.params.depId, 'dependency ID');

    // Find dependency to check permissions
    // We need to know if it belongs to task :id
    // It could be that task :id is the blocked one, OR the blocking one?
    // Usually "remove dependency FROM task :id" implies :id is the blocked one.

    const dependency = await prisma.taskDependency.findUnique({
      where: { id: req.params.depId },
      include: {
        blocked: { select: { projectId: true, id: true } },
        blocking: { select: { title: true } }
      },
    });

    // Ensure consistency
    if (!dependency || dependency.blockedId !== req.params.id) {
      // If the user tries to delete a dependency where :id is the blocker, maybe allow it?
      // But semantic '/tasks/:id/dependencies' usually implies 'req.params.id' is the "subject".
      // If I am blocked by X, I want to remove X.
      // If I block Y, I might want to unblock Y?
      // Let's enforce that :id must be one of the parties.
      if (!dependency || (dependency.blockedId !== req.params.id && dependency.blockingId !== req.params.id)) {
        throw new AppError('Dependency not found or not related to this task', 404);
      }
    }

    if (!dependency) { // TypeScript check
      throw new AppError('Dependency not found', 404);
    }

    // Auth check on the PROJECT
    const membership = await getProjectMembership(req.userId!, dependency.blocked.projectId);
    // User needs edit rights on the project or the tasks?
    // Let's require project edit rights (Owner/Admin) or being the creator of the blocked task?
    // Simplified: Check standard modify permission on the blocked task.
    // We don't have blocked task full details here, but we have projectID.
    // We need creatorId to check MEMBER role.

    const blockedTask = await prisma.task.findUnique({ where: { id: dependency.blockedId }, select: { creatorId: true } });

    if (!blockedTask || !canModifyTask(membership, blockedTask, req.userId!)) {
      throw new AppError('You cannot modify this task', 403);
    }

    await prisma.taskDependency.delete({
      where: { id: req.params.depId },
    });

    // Log activity
    await logDependencyRemoved(dependency.blockedId, req.userId!, dependency.blocking.title);

    const io = getIO();
    if (io) {
      io.to(`task:${dependency.blockedId}`).emit('dependency:removed', { id: req.params.depId });
    }

    res.status(204).send();
  });

// GET /api/projects/:id/critical-path - Calculate critical path
router.get('/projects/:id/critical-path', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'project ID');

    const projectId = req.params.id;

    // Check membership
    const membership = await getProjectMembership(req.userId!, projectId);
    if (!membership) {
      throw new AppError('Project not found', 404);
    }

    // Get all non-DONE tasks in project with their dependencies
    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        status: { not: 'DONE' },
      },
      select: {
        ...taskSelect,
        dependsOn: {
          select: {
            blockingId: true,
          },
        },
      },
    });

    if (tasks.length === 0) {
      return res.json({ path: [], length: 0 });
    }

    // Build adjacency list: task -> list of tasks it blocks
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    // Initialize
    for (const task of tasks) {
      graph.set(task.id, []);
      inDegree.set(task.id, 0);
    }

    // Build graph from dependencies
    for (const task of tasks) {
      for (const dep of task.dependsOn) {
        const blockingId = dep.blockingId;
        // Only consider if blocking task is also in our task set (non-DONE)
        if (taskMap.has(blockingId)) {
          graph.get(blockingId)!.push(task.id);
          inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
        }
      }
    }

    // Kahn's algorithm + longest path
    const queue: string[] = [];
    const distance = new Map<string, number>();
    const parent = new Map<string, string | null>();

    // Start with nodes that have no dependencies
    for (const [taskId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(taskId);
        distance.set(taskId, 1);
        parent.set(taskId, null);
      }
    }

    // Process queue
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDist = distance.get(current) || 1;

      for (const neighbor of graph.get(current) || []) {
        // Update longest path
        const newDist = currentDist + 1;
        if (!distance.has(neighbor) || newDist > distance.get(neighbor)!) {
          distance.set(neighbor, newDist);
          parent.set(neighbor, current);
        }

        // Decrease in-degree
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);

        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Find the task with maximum distance (end of critical path)
    let maxDist = 0;
    let endTask: string | null = null;

    for (const [taskId, dist] of distance) {
      if (dist > maxDist) {
        maxDist = dist;
        endTask = taskId;
      }
    }

    if (!endTask) {
      return res.json({ path: [], length: 0 });
    }

    // Backtrack to build path
    const path: typeof tasks = [];
    let current: string | null = endTask;

    while (current) {
      const task = taskMap.get(current);
      if (task) {
        path.unshift(task);
      }
      current = parent.get(current) || null;
    }

    res.json({
      path,
      length: maxDist,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
