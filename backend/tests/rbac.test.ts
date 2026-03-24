/**
 * Unit tests for requireProjectRole middleware
 *
 * Uses jest.unstable_mockModule + dynamic imports (required for ESM + ts-jest).
 * No real database is needed — prisma.projectMember.findUnique is mocked.
 */

import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import { ProjectRole } from '@prisma/client';

// ─── Mock prisma (must happen before dynamic import of rbac) ──────────────────

const mockFindUnique = jest.fn();

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: {
    projectMember: {
      findUnique: mockFindUnique,
    },
  },
}));

// ─── Dynamically import after mock registration ───────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let requireProjectRole: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let AppError: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ProjectRoleRequest: any;

beforeAll(async () => {
  const rbac = await import('../src/middleware/rbac.js');
  requireProjectRole = rbac.requireProjectRole;

  const errorHandler = await import('../src/middleware/errorHandler.js');
  AppError = errorHandler.AppError;
});

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'user-123',
    params: { projectId: 'proj-abc' },
    ...overrides,
  };
}

const makeRes = () => ({} as never);
const makeNext = () => jest.fn();

function membershipOf(role: ProjectRole) {
  return { role };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('requireProjectRole middleware', () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
  });

  // ── Authentication guard ──────────────────────────────────────────────────

  describe('authentication guard', () => {
    it('calls next with 401 AppError when userId is missing', async () => {
      const req = makeReq({ userId: undefined });
      const next = makeNext();

      await requireProjectRole('OWNER')(req, makeRes(), next);

      expect(next).toHaveBeenCalledWith(expect.any(Object));
      const err = next.mock.calls[0][0] as { statusCode: number };
      expect(err.statusCode).toBe(401);
    });
  });

  // ── Parameter validation ──────────────────────────────────────────────────

  describe('project ID resolution', () => {
    it('resolves projectId from req.params.projectId', async () => {
      mockFindUnique.mockResolvedValue(membershipOf('OWNER'));
      const req = makeReq({ params: { projectId: 'proj-1' } });
      const next = makeNext();

      await requireProjectRole('OWNER')(req, makeRes(), next);

      expect(mockFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId_userId: { projectId: 'proj-1', userId: 'user-123' } },
        }),
      );
    });

    it('falls back to req.params.id when projectId is absent', async () => {
      mockFindUnique.mockResolvedValue(membershipOf('ADMIN'));
      const req = makeReq({ params: { id: 'proj-via-id' } });
      const next = makeNext();

      await requireProjectRole('ADMIN')(req, makeRes(), next);

      expect(mockFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId_userId: { projectId: 'proj-via-id', userId: 'user-123' } },
        }),
      );
    });

    it('calls next with 400 AppError when no project param exists', async () => {
      const req = makeReq({ params: {} });
      const next = makeNext();

      await requireProjectRole('OWNER')(req, makeRes(), next);

      expect(next).toHaveBeenCalledWith(expect.any(Object));
      const err = next.mock.calls[0][0] as { statusCode: number };
      expect(err.statusCode).toBe(400);
      expect(mockFindUnique).not.toHaveBeenCalled();
    });
  });

  // ── Non-member ────────────────────────────────────────────────────────────

  describe('non-member rejection', () => {
    it('calls next with 403 when user is not a project member', async () => {
      mockFindUnique.mockResolvedValue(null);
      const next = makeNext();

      await requireProjectRole('OWNER')(makeReq(), makeRes(), next);

      const err = next.mock.calls[0][0] as { statusCode: number };
      expect(err.statusCode).toBe(403);
    });
  });

  // ── Role enforcement ──────────────────────────────────────────────────────

  describe('role enforcement', () => {
    it('calls next() with no error when user has an allowed role', async () => {
      mockFindUnique.mockResolvedValue(membershipOf('OWNER'));
      const next = makeNext();

      await requireProjectRole('OWNER')(makeReq(), makeRes(), next);

      expect(next).toHaveBeenCalledWith();
    });

    it('accepts any role listed in the allowedRoles array', async () => {
      for (const role of ['OWNER', 'ADMIN'] as ProjectRole[]) {
        mockFindUnique.mockResolvedValue(membershipOf(role));
        const next = makeNext();

        await requireProjectRole('OWNER', 'ADMIN')(makeReq(), makeRes(), next);

        expect(next).toHaveBeenCalledWith();
      }
    });

    it('rejects MEMBER when only OWNER or ADMIN is allowed', async () => {
      mockFindUnique.mockResolvedValue(membershipOf('MEMBER'));
      const next = makeNext();

      await requireProjectRole('OWNER', 'ADMIN')(makeReq(), makeRes(), next);

      const err = next.mock.calls[0][0] as { statusCode: number; message: string };
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('MEMBER');
    });

    it('rejects VIEWER when only OWNER or ADMIN is allowed', async () => {
      mockFindUnique.mockResolvedValue(membershipOf('VIEWER'));
      const next = makeNext();

      await requireProjectRole('OWNER', 'ADMIN')(makeReq(), makeRes(), next);

      const err = next.mock.calls[0][0] as { statusCode: number };
      expect(err.statusCode).toBe(403);
    });

    it('allows MEMBER when OWNER, ADMIN, and MEMBER are all permitted', async () => {
      mockFindUnique.mockResolvedValue(membershipOf('MEMBER'));
      const next = makeNext();

      await requireProjectRole('OWNER', 'ADMIN', 'MEMBER')(makeReq(), makeRes(), next);

      expect(next).toHaveBeenCalledWith();
    });

    it('allows VIEWER when all four roles are permitted', async () => {
      mockFindUnique.mockResolvedValue(membershipOf('VIEWER'));
      const next = makeNext();

      await requireProjectRole('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')(makeReq(), makeRes(), next);

      expect(next).toHaveBeenCalledWith();
    });

    it('error message includes the user\'s actual role', async () => {
      mockFindUnique.mockResolvedValue(membershipOf('VIEWER'));
      const next = makeNext();

      await requireProjectRole('OWNER')(makeReq(), makeRes(), next);

      const err = next.mock.calls[0][0] as { message: string };
      expect(err.message).toContain('VIEWER');
    });

    it('error message includes all required roles', async () => {
      mockFindUnique.mockResolvedValue(membershipOf('MEMBER'));
      const next = makeNext();

      await requireProjectRole('OWNER', 'ADMIN')(makeReq(), makeRes(), next);

      const err = next.mock.calls[0][0] as { message: string };
      expect(err.message).toContain('OWNER');
      expect(err.message).toContain('ADMIN');
    });
  });

  // ── Membership attachment ─────────────────────────────────────────────────

  describe('projectMembership attachment', () => {
    it('attaches resolved membership to req.projectMembership on success', async () => {
      mockFindUnique.mockResolvedValue(membershipOf('ADMIN'));
      const req = makeReq();
      const next = makeNext();

      await requireProjectRole('ADMIN')(req, makeRes(), next);

      expect((req as { projectMembership?: unknown }).projectMembership).toEqual({ role: 'ADMIN' });
    });

    it('does not attach membership when role check fails', async () => {
      mockFindUnique.mockResolvedValue(membershipOf('VIEWER'));
      const req = makeReq();
      const next = makeNext();

      await requireProjectRole('OWNER')(req, makeRes(), next);

      expect((req as { projectMembership?: unknown }).projectMembership).toBeUndefined();
    });
  });

  // ── DB error propagation ──────────────────────────────────────────────────

  describe('database error handling', () => {
    it('calls next with the thrown error when prisma throws', async () => {
      const dbError = new Error('Connection refused');
      mockFindUnique.mockRejectedValue(dbError);
      const next = makeNext();

      await requireProjectRole('OWNER')(makeReq(), makeRes(), next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });
});
