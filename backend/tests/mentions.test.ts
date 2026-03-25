/**
 * Unit tests for src/lib/mentions.ts
 *
 * parseMentions   — pure function, no mocking required
 * resolveMentions — requires prisma mock (projectMember.findMany)
 * notifyMentions  — requires createNotification mock from notifications.js
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

// ─── Mock prisma ──────────────────────────────────────────────────────────────

const mockFindMany = jest.fn();

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: {
    projectMember: {
      findMany: mockFindMany,
    },
  },
}));

// ─── Mock notifications ───────────────────────────────────────────────────────

const mockCreateNotification = jest.fn();

jest.unstable_mockModule('../src/lib/notifications.js', () => ({
  createNotification: mockCreateNotification,
}));

// ─── Dynamic imports ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let parseMentions: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let resolveMentions: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let notifyMentions: any;

beforeAll(async () => {
  const mod = await import('../src/lib/mentions.js');
  parseMentions   = mod.parseMentions;
  resolveMentions = mod.resolveMentions;
  notifyMentions  = mod.notifyMentions;
});

beforeEach(() => {
  mockFindMany.mockReset();
  mockCreateNotification.mockReset();
  mockCreateNotification.mockResolvedValue({ id: 'notif-1' });
});

// ─── parseMentions (pure) ─────────────────────────────────────────────────────

describe('parseMentions', () => {
  it('returns an empty array for an empty string', () => {
    expect(parseMentions('')).toEqual([]);
  });

  it('returns an empty array when no @mentions are present', () => {
    expect(parseMentions('hello world, no mentions here')).toEqual([]);
  });

  it('extracts a single @mention and strips the @ prefix', () => {
    expect(parseMentions('hey @alice, please review this')).toEqual(['alice']);
  });

  it('extracts multiple distinct @mentions', () => {
    const result = parseMentions('@alice and @bob should look at this');
    expect(result).toContain('alice');
    expect(result).toContain('bob');
    expect(result).toHaveLength(2);
  });

  it('deduplicates repeated @mentions', () => {
    const result = parseMentions('@alice did this but @alice also did that');
    expect(result).toEqual(['alice']);
  });

  it('handles dot-notation mentions (@first.last)', () => {
    expect(parseMentions('thanks @jane.doe for the help')).toEqual(['jane.doe']);
  });

  it('handles a mix of simple and dot-notation mentions', () => {
    const result = parseMentions('@bob and @jane.doe reviewed the PR');
    expect(result).toContain('bob');
    expect(result).toContain('jane.doe');
    expect(result).toHaveLength(2);
  });

  it('ignores a bare @ with no word characters after it', () => {
    expect(parseMentions('send to @ nobody')).toEqual([]);
  });

  it('is case-sensitive in extraction (preserves original casing)', () => {
    // The regex preserves the original case; normalisation happens in resolveMentions
    const result = parseMentions('@Alice @BOB');
    expect(result).toContain('Alice');
    expect(result).toContain('BOB');
  });

  it('deduplication is case-sensitive (Alice ≠ alice)', () => {
    const result = parseMentions('@Alice @alice');
    expect(result).toHaveLength(2);
  });

  it('handles multiple mentions on a single word boundary', () => {
    expect(parseMentions('@a @b @c')).toHaveLength(3);
  });
});

// ─── resolveMentions ──────────────────────────────────────────────────────────

describe('resolveMentions', () => {
  function makeMember(id: string, name: string) {
    return { user: { id, name } };
  }

  it('returns an empty array and does not call prisma when names is empty', async () => {
    const result = await resolveMentions([], 'proj-1');
    expect(result).toEqual([]);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('queries projectMember.findMany with the correct projectId', async () => {
    mockFindMany.mockResolvedValue([]);
    await resolveMentions(['alice'], 'proj-42');
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { projectId: 'proj-42' },
      include: { user: { select: { id: true, name: true } } },
    });
  });

  it('returns an empty array when no member matches the name', async () => {
    mockFindMany.mockResolvedValue([makeMember('u1', 'Alice Smith')]);
    const result = await resolveMentions(['nobody'], 'proj-1');
    expect(result).toEqual([]);
  });

  it('matches a member by exact name (case-insensitive)', async () => {
    mockFindMany.mockResolvedValue([makeMember('u1', 'Alice Smith')]);
    const result = await resolveMentions(['alice smith'], 'proj-1');
    expect(result).toEqual([{ id: 'u1', name: 'Alice Smith' }]);
  });

  it('matches a mention like "Alice.Smith" against user name "Alice Smith"', async () => {
    mockFindMany.mockResolvedValue([makeMember('u1', 'Alice Smith')]);
    // "alice.smith" normalised to "alice smith" matches "Alice Smith"
    const result = await resolveMentions(['Alice.Smith'], 'proj-1');
    expect(result).toEqual([{ id: 'u1', name: 'Alice Smith' }]);
  });

  it('matches a mention like "alice" when user name has no spaces', async () => {
    mockFindMany.mockResolvedValue([makeMember('u2', 'alice')]);
    const result = await resolveMentions(['alice'], 'proj-1');
    expect(result).toEqual([{ id: 'u2', name: 'alice' }]);
  });

  it('returns multiple matched users', async () => {
    mockFindMany.mockResolvedValue([
      makeMember('u1', 'Alice Smith'),
      makeMember('u2', 'Bob Jones'),
    ]);
    const result = await resolveMentions(['alice smith', 'Bob.Jones'], 'proj-1');
    expect(result).toHaveLength(2);
    expect(result.map((u: { id: string }) => u.id)).toContain('u1');
    expect(result.map((u: { id: string }) => u.id)).toContain('u2');
  });

  it('returns only users that are project members (unknown names excluded)', async () => {
    mockFindMany.mockResolvedValue([makeMember('u1', 'Alice Smith')]);
    const result = await resolveMentions(['alice smith', 'unknown person'], 'proj-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('u1');
  });
});

// ─── notifyMentions ───────────────────────────────────────────────────────────

describe('notifyMentions', () => {
  const AUTHOR_ID   = 'author-1';
  const AUTHOR_NAME = 'Jane Doe';
  const TASK_ID     = 'task-1';
  const TASK_TITLE  = 'Fix the bug';
  const PROJECT_ID  = 'proj-1';

  it('does nothing when mentionedUsers is empty', async () => {
    await notifyMentions([], AUTHOR_ID, AUTHOR_NAME, TASK_ID, TASK_TITLE, PROJECT_ID);
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('calls createNotification once per mentioned user', async () => {
    const users = [
      { id: 'u1', name: 'Alice' },
      { id: 'u2', name: 'Bob' },
    ];
    await notifyMentions(users, AUTHOR_ID, AUTHOR_NAME, TASK_ID, TASK_TITLE, PROJECT_ID);
    expect(mockCreateNotification).toHaveBeenCalledTimes(2);
  });

  it('skips self-mentions (mentionedUser.id === authorId)', async () => {
    const users = [
      { id: AUTHOR_ID, name: 'Jane Doe' },  // self
      { id: 'u2', name: 'Bob' },
    ];
    await notifyMentions(users, AUTHOR_ID, AUTHOR_NAME, TASK_ID, TASK_TITLE, PROJECT_ID);
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u2' }),
    );
  });

  it('creates a MENTION type notification', async () => {
    await notifyMentions(
      [{ id: 'u1', name: 'Alice' }],
      AUTHOR_ID, AUTHOR_NAME, TASK_ID, TASK_TITLE, PROJECT_ID,
    );
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'MENTION' }),
    );
  });

  it('sets notification title to "You were mentioned"', async () => {
    await notifyMentions(
      [{ id: 'u1', name: 'Alice' }],
      AUTHOR_ID, AUTHOR_NAME, TASK_ID, TASK_TITLE, PROJECT_ID,
    );
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'You were mentioned' }),
    );
  });

  it('includes the author name and task title in the notification message', async () => {
    await notifyMentions(
      [{ id: 'u1', name: 'Alice' }],
      AUTHOR_ID, AUTHOR_NAME, TASK_ID, TASK_TITLE, PROJECT_ID,
    );
    const call = mockCreateNotification.mock.calls[0][0] as { message: string };
    expect(call.message).toContain(AUTHOR_NAME);
    expect(call.message).toContain(TASK_TITLE);
  });

  it('passes taskId and projectId to createNotification', async () => {
    await notifyMentions(
      [{ id: 'u1', name: 'Alice' }],
      AUTHOR_ID, AUTHOR_NAME, TASK_ID, TASK_TITLE, PROJECT_ID,
    );
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: TASK_ID, projectId: PROJECT_ID }),
    );
  });

  it('does not notify when all mentioned users are the author', async () => {
    const users = [{ id: AUTHOR_ID, name: 'Jane Doe' }];
    await notifyMentions(users, AUTHOR_ID, AUTHOR_NAME, TASK_ID, TASK_TITLE, PROJECT_ID);
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});
