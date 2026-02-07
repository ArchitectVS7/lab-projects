import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logDependencyAdded, logDependencyRemoved } from '../lib/activityLog.js';
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
 * 
 * In DB: 'dependsOnId' is the BLOCKER. 'taskId' is the BLOCKED.
 * We want to add: taskId=blockedId, dependsOnId=blockingId.
 * Cycle if blockingId depends on ... -> blockedId.
 */
async function wouldCreateCycle(blockingId: string, blockedId: string): Promise<boolean> {
  // We want to add blockingId -> blockedId.
  // Check if there is already a path from blockedId to blockingId.
  // If so, adding the edge would close the cycle.
  // In schema terms: blockedId will have dependsOnId=blockingId
  // We check if blockingId has a chain that leads to blockedId

  const visited = new Set<string>();
  const stack = [blockedId]; // Start searching from the task that is being inhibited

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === blockingId) return true; // Found path to the proposed blocker
    if (visited.has(current)) continue;
    visited.add(current);

    // Find what 'current' blocks (tasks that depend on current)
    // In schema: find TaskDependency where dependsOnId = current
    // Those taskIds are blocked by current
    const downstream = await prisma.taskDependency.findMany({
      where: { dependsOnId: current },
      select: { taskId: true },
    });

    for (const dep of downstream) {
      stack.push(dep.taskId);
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

    const blockedId = req.params.id; // This maps to 'taskId' in TaskDependency
    const blockingId = data.blockingTaskId; // This maps to 'dependsOnId' in TaskDependency

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
      where: { taskId_dependsOnId: { taskId: blockedId, dependsOnId: blockingId } },
    });
    if (existing) {
      throw new AppError('This dependency already exists', 409);
    }

    // Cycle detection
    const hasCycle = await wouldCreateCycle(blockingId, blockedId);
    if (hasCycle) {
      throw new AppError('Adding this dependency would create a circular dependency', 400);
    }

    const dependency = await prisma.taskDependency.create({
      data: {
        taskId: blockedId,
        dependsOnId: blockingId,
      },
      include: {
        dependsOn: { select: taskSelect }, // Return the blocking task details
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
        where: { taskId: req.params.id }, // I am blocked by...
        include: {
          dependsOn: { select: taskSelect },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.taskDependency.findMany({
        where: { dependsOnId: req.params.id }, // I am blocking...
        include: {
          task: { select: taskSelect },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    res.json({
      dependsOn: blocking.map((d) => ({
        id: d.id,
        task: d.dependsOn, // The task that blocks me
        createdAt: d.createdAt,
      })),
      blocks: blockedBy.map((d) => ({
        id: d.id,
        task: d.task, // The task I block
        createdAt: d.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tasks/:id/dependencies/:depId
router.delete('/tasks/:id/dependencies/:depId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'task ID');
    validateUUID(req.params.depId, 'dependency ID');

    const dependency = await prisma.taskDependency.findUnique({
      where: { id: req.params.depId },
      include: {
        task: { select: { projectId: true, id: true } }, // Blocked task
        dependsOn: { select: { title: true } } // Blocking task
      },
    });

    // Ensure consistency
    // Let's enforce that :id must be one of the parties.
    if (!dependency || (dependency.taskId !== req.params.id && dependency.dependsOnId !== req.params.id)) {
      throw new AppError('Dependency not found or not related to this task', 404);
    }

    if (!dependency) { // TypeScript check
      throw new AppError('Dependency not found', 404);
    }

    // Auth check on the PROJECT
    // Simplified: Check standard modify permission on the blocked task.
    // We need creatorId to check MEMBER role.
    const blockedTask = await prisma.task.findUnique({ where: { id: dependency.taskId }, select: { creatorId: true } });

    const membership = await getProjectMembership(req.userId!, dependency.task.projectId);
    if (!blockedTask || !canModifyTask(membership, blockedTask, req.userId!)) {
      throw new AppError('You cannot modify this task', 403);
    }

    await prisma.taskDependency.delete({
      where: { id: req.params.depId },
    });

    // Log activity
    await logDependencyRemoved(dependency.taskId, req.userId!, dependency.dependsOn.title);

    const io = getIO();
    if (io) {
      io.to(`task:${dependency.taskId}`).emit('dependency:removed', { id: req.params.depId });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
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
            dependsOnId: true, // ID of the blocking task
          },
        },
      },
    });

    if (tasks.length === 0) {
      return res.json({ path: [], length: 0 });
    }

    // Build adjacency list: task -> list of tasks it blocks (downstream)
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
        const blockingId = dep.dependsOnId;
        // Only consider if blocking task is also in our task set (non-DONE)
        if (taskMap.has(blockingId)) {
          // blockingId BLOCKS task.id
          // Edge: blockingId -> task.id
          graph.get(blockingId)!.push(task.id);
          inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
        }
      }
    }

    // Kahn's algorithm + longest path
    const queue: string[] = [];
    const distance = new Map<string, number>();
    const parent = new Map<string, string | null>();

    // Start with nodes that have no incoming edges (no blockers within this set)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const path: any[] = [];
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
