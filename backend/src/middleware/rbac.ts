import { Response, NextFunction } from 'express';
import { ProjectRole } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { AuthRequest } from './auth.js';
import { AppError } from './errorHandler.js';

// ─── Extended request type ────────────────────────────────────────────────────

export interface ProjectRoleRequest extends AuthRequest {
  /** Resolved project membership — attached by requireProjectRole() for downstream use. */
  projectMembership?: { role: ProjectRole };
}

// ─── Middleware factory ───────────────────────────────────────────────────────

/**
 * Factory: creates middleware that enforces project-level RBAC.
 *
 * Reads the project ID from `req.params.projectId` (falling back to `req.params.id`),
 * looks up the current user's membership, and rejects with 403 if their role is not
 * in the allowed set.
 *
 * On success, attaches `req.projectMembership` so downstream handlers can read the
 * resolved role without an additional DB query.
 *
 * Usage:
 *   router.patch('/:projectId/settings', authenticate, requireProjectRole('OWNER', 'ADMIN'), handler)
 *   router.delete('/:id',               authenticate, requireProjectRole('OWNER'),            handler)
 */
export const requireProjectRole = (...allowedRoles: ProjectRole[]) => {
  return async (
    req: ProjectRoleRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!req.userId) {
      return next(new AppError('Authentication required', 401));
    }

    // Accept projectId from either `:projectId` or `:id` param
    const projectId = req.params.projectId ?? req.params.id;
    if (!projectId) {
      return next(new AppError('Project ID is required', 400));
    }

    try {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: req.userId } },
        select: { role: true },
      });

      if (!membership) {
        return next(new AppError('You are not a member of this project', 403));
      }

      if (!allowedRoles.includes(membership.role)) {
        return next(
          new AppError(
            `This action requires ${allowedRoles.join(' or ')} role. ` +
              `Your role is ${membership.role}.`,
            403,
          ),
        );
      }

      // Attach for downstream use (avoids a second DB hit in route handlers)
      req.projectMembership = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
};
