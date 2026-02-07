import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logCommentAction } from '../lib/activityLog.js';
import { parseMentions, resolveMentions, notifyMentions } from '../lib/mentions.js';
import { getIO } from '../lib/socket.js';

const router = Router();

// --- Zod Schemas ---

const createCommentSchema = z.object({
  content: z.string().min(1, 'Content is required').max(5000, 'Content must be 5000 characters or less'),
  parentId: z.string().uuid('Invalid parent comment ID').optional(),
});

const updateCommentSchema = z.object({
  content: z.string().min(1, 'Content is required').max(5000, 'Content must be 5000 characters or less'),
});

// --- UUID validation helper ---
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(id: string, label: string): void {
  if (!uuidRegex.test(id)) {
    throw new AppError(`Invalid ${label} format`, 400);
  }
}

// --- Helpers ---

const authorSelect = {
  id: true,
  name: true,
  avatarUrl: true,
} as const;

async function getProjectMembership(userId: string, projectId: string) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

// --- Routes ---

// GET /api/tasks/:taskId/comments - List comments for a task
router.get('/tasks/:taskId/comments', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.taskId, 'task ID');

    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      select: { projectId: true },
    });

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Verify user is member of task's project
    const membership = await getProjectMembership(req.userId!, task.projectId);
    if (!membership) {
      throw new AppError('Task not found', 404);
    }

    // Get top-level comments with replies
    const comments = await prisma.comment.findMany({
      where: {
        taskId: req.params.taskId,
        parentId: null,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: authorSelect },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: authorSelect },
          },
        },
      },
    });

    res.json(comments);
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks/:taskId/comments - Create a comment
router.post('/tasks/:taskId/comments', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.taskId, 'task ID');
    const data = createCommentSchema.parse(req.body);

    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      select: { id: true, title: true, projectId: true },
    });

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const membership = await getProjectMembership(req.userId!, task.projectId);
    if (!membership) {
      throw new AppError('Task not found', 404);
    }

    // VIEWER cannot comment
    if (membership.role === 'VIEWER') {
      throw new AppError('VIEWER role cannot add comments', 403);
    }

    // If parentId provided, verify it exists and belongs to this task
    if (data.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: data.parentId },
      });
      if (!parentComment || parentComment.taskId !== req.params.taskId) {
        throw new AppError('Parent comment not found', 404);
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        taskId: req.params.taskId,
        authorId: req.userId!,
        parentId: data.parentId,
      },
      include: {
        author: { select: authorSelect },
      },
    });

    // Log activity
    await logCommentAction('COMMENT_ADDED', req.params.taskId, req.userId!);

    // Process @mentions
    const mentionNames = parseMentions(data.content);
    if (mentionNames.length > 0) {
      const author = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { name: true },
      });
      const mentionedUsers = await resolveMentions(mentionNames, task.projectId);
      await notifyMentions(
        mentionedUsers,
        req.userId!,
        author?.name || 'Someone',
        task.id,
        task.title,
        task.projectId,
      );
    }

    // Emit socket events
    const io = getIO();
    if (io) {
      io.to(`task:${req.params.taskId}`).emit('comment:new', comment);
      io.to(`task:${req.params.taskId}`).emit('activity:new', { taskId: req.params.taskId });
    }

    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
});

// PUT /api/comments/:id - Edit a comment
router.put('/comments/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'comment ID');
    const data = updateCommentSchema.parse(req.body);

    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id },
      include: {
        task: { select: { projectId: true } },
      },
    });

    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    const membership = await getProjectMembership(req.userId!, comment.task.projectId);
    if (!membership) {
      throw new AppError('Comment not found', 404);
    }

    // Only author or OWNER/ADMIN can edit
    const isAuthor = comment.authorId === req.userId;
    const isAdmin = ['OWNER', 'ADMIN'].includes(membership.role);
    if (!isAuthor && !isAdmin) {
      throw new AppError('You cannot edit this comment', 403);
    }

    const updated = await prisma.comment.update({
      where: { id: req.params.id },
      data: {
        content: data.content,
        editedAt: new Date(),
      },
      include: {
        author: { select: authorSelect },
      },
    });

    await logCommentAction('COMMENT_EDITED', comment.taskId, req.userId!);

    // Emit socket event
    const io = getIO();
    if (io) {
      io.to(`task:${comment.taskId}`).emit('comment:updated', updated);
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/comments/:id - Delete a comment
router.delete('/comments/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'comment ID');

    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id },
      include: {
        task: { select: { projectId: true } },
      },
    });

    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    const membership = await getProjectMembership(req.userId!, comment.task.projectId);
    if (!membership) {
      throw new AppError('Comment not found', 404);
    }

    // Only author or OWNER/ADMIN can delete
    const isAuthor = comment.authorId === req.userId;
    const isAdmin = ['OWNER', 'ADMIN'].includes(membership.role);
    if (!isAuthor && !isAdmin) {
      throw new AppError('You cannot delete this comment', 403);
    }

    await logCommentAction('COMMENT_DELETED', comment.taskId, req.userId!);

    await prisma.comment.delete({
      where: { id: req.params.id },
    });

    // Emit socket event
    const io = getIO();
    if (io) {
      io.to(`task:${comment.taskId}`).emit('comment:deleted', { id: req.params.id, taskId: comment.taskId });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
