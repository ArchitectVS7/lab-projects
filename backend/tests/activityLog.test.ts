/**
 * Unit tests for src/lib/activityLog.ts
 *
 * Uses jest.unstable_mockModule + dynamic imports (ESM + ts-jest pattern).
 * No real database or socket server required.
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

// ─── Mock prisma ──────────────────────────────────────────────────────────────

const mockCreate = jest.fn();
const mockDeleteMany = jest.fn();
const mockTransaction = jest.fn();

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: {
    activityLog: {
      create: mockCreate,
      deleteMany: mockDeleteMany,
    },
    $transaction: mockTransaction,
  },
}));

// ─── Mock socket (getIO) ──────────────────────────────────────────────────────

const mockEmit = jest.fn();
const mockTo = jest.fn();
const mockGetIO = jest.fn();

jest.unstable_mockModule('../src/lib/socket.js', () => ({
  getIO: mockGetIO,
}));

// ─── Dynamic imports after mocks registered ───────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let logTaskCreated: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let logTaskChanges: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let logTaskDeleted: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let logDependencyAdded: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let logDependencyRemoved: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let logCommentAction: any;

beforeAll(async () => {
  const mod = await import('../src/lib/activityLog.js');
  logTaskCreated = mod.logTaskCreated;
  logTaskChanges = mod.logTaskChanges;
  logTaskDeleted = mod.logTaskDeleted;
  logDependencyAdded = mod.logDependencyAdded;
  logDependencyRemoved = mod.logDependencyRemoved;
  logCommentAction = mod.logCommentAction;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeActivity(overrides = {}) {
  return { id: 'act-1', taskId: 'task-1', userId: 'user-1', action: 'CREATED', ...overrides };
}

function enableIO() {
  mockTo.mockReturnValue({ emit: mockEmit });
  mockGetIO.mockReturnValue({ to: mockTo });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Reset ALL mock state including implementations — prevents leaked mock
  // implementations from one test affecting the next.
  mockCreate.mockReset();
  mockDeleteMany.mockReset();
  mockTransaction.mockReset();
  mockGetIO.mockReset();
  mockTo.mockReset();
  mockEmit.mockReset();

  // Defaults
  mockGetIO.mockReturnValue(null);                     // no socket by default
  mockDeleteMany.mockResolvedValue({ count: 0 });       // fire-and-forget cleanup
  mockTo.mockReturnValue({ emit: mockEmit });           // safe default for enableIO()
});

// ─── logTaskCreated ───────────────────────────────────────────────────────────

describe('logTaskCreated', () => {
  it('calls activityLog.create with action CREATED', async () => {
    mockCreate.mockResolvedValue(makeActivity());
    await logTaskCreated('task-1', 'user-1');
    expect(mockCreate).toHaveBeenCalledWith({
      data: { action: 'CREATED', taskId: 'task-1', userId: 'user-1' },
    });
  });

  it('emits task:updated and activity:new to the task room when IO is available', async () => {
    const activity = makeActivity();
    mockCreate.mockResolvedValue(activity);
    enableIO();

    await logTaskCreated('task-1', 'user-1');

    expect(mockTo).toHaveBeenCalledWith('task:task-1');
    expect(mockEmit).toHaveBeenCalledWith('task:updated', { taskId: 'task-1' });
    expect(mockEmit).toHaveBeenCalledWith('activity:new', activity);
  });

  it('does not emit when IO returns null', async () => {
    mockCreate.mockResolvedValue(makeActivity());
    // mockGetIO already returns null by default

    await logTaskCreated('task-1', 'user-1');

    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('swallows errors when called without a transaction', async () => {
    mockCreate.mockRejectedValue(new Error('DB failure'));
    await expect(logTaskCreated('task-1', 'user-1')).resolves.toBeUndefined();
  });

  it('rethrows errors when called inside a transaction', async () => {
    const txCreate = jest.fn<() => Promise<never>>().mockRejectedValue(new Error('TX failure'));
    const txClient = { activityLog: { create: txCreate } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(logTaskCreated('task-1', 'user-1', txClient as any)).rejects.toThrow('TX failure');
  });

  it('uses the provided transaction client instead of the global prisma', async () => {
    const txCreate = jest.fn<() => Promise<object>>().mockResolvedValue(makeActivity());
    const txClient = { activityLog: { create: txCreate } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await logTaskCreated('task-1', 'user-1', txClient as any);
    expect(txCreate).toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// ─── logTaskChanges ───────────────────────────────────────────────────────────

describe('logTaskChanges', () => {
  const TASK_ID = 'task-2';
  const USER_ID = 'user-2';

  it('does nothing when no tracked fields changed', async () => {
    const task = { title: 'Same', status: 'TODO', priority: 'LOW' };
    await logTaskChanges({ taskId: TASK_ID, userId: USER_ID, oldTask: task, newTask: task });
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('uses $transaction for multiple changed fields outside a tx', async () => {
    const oldTask = { title: 'Old', status: 'TODO' };
    const newTask = { title: 'New', status: 'IN_PROGRESS' };
    // mockCreate is called to build the array for $transaction — make it resolve
    mockCreate.mockResolvedValue(makeActivity({ action: 'UPDATED' }));
    mockTransaction.mockResolvedValue([]);

    await logTaskChanges({ taskId: TASK_ID, userId: USER_ID, oldTask, newTask });

    expect(mockTransaction).toHaveBeenCalled();
    // Two fields changed → create called twice to build the $transaction argument
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('passes UPDATED action and correct field name to create', async () => {
    const oldTask = { title: 'Alpha' };
    const newTask = { title: 'Beta' };
    mockCreate.mockResolvedValue(makeActivity({ action: 'UPDATED' }));
    mockTransaction.mockResolvedValue([]);

    await logTaskChanges({ taskId: TASK_ID, userId: USER_ID, oldTask, newTask });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'UPDATED',
        field: 'title',
        oldValue: 'Alpha',
        newValue: 'Beta',
        taskId: TASK_ID,
        userId: USER_ID,
      }),
    });
  });

  it('normalises null field values to null (not "null" string)', async () => {
    const oldTask = { description: 'old desc' };
    const newTask = { description: null };
    mockCreate.mockResolvedValue(makeActivity({ action: 'UPDATED' }));
    mockTransaction.mockResolvedValue([]);

    await logTaskChanges({ taskId: TASK_ID, userId: USER_ID, oldTask, newTask });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ oldValue: 'old desc', newValue: null }),
    });
  });

  it('uses Promise.all (not $transaction) when a transaction client is provided', async () => {
    const txCreate = jest.fn<() => Promise<object>>().mockResolvedValue(makeActivity({ action: 'UPDATED' }));
    const txClient = { activityLog: { create: txCreate } };
    const oldTask = { title: 'X' };
    const newTask = { title: 'Y' };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await logTaskChanges({ taskId: TASK_ID, userId: USER_ID, oldTask, newTask }, txClient as any);

    expect(txCreate).toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('emits task:updated and activity:new for each log when IO is available', async () => {
    const createdLog = makeActivity({ action: 'UPDATED' });
    mockCreate.mockResolvedValue(createdLog);
    mockTransaction.mockResolvedValue([createdLog]);
    enableIO();

    await logTaskChanges({ taskId: TASK_ID, userId: USER_ID, oldTask: { title: 'A' }, newTask: { title: 'B' } });

    expect(mockEmit).toHaveBeenCalledWith('task:updated', { taskId: TASK_ID });
    expect(mockEmit).toHaveBeenCalledWith('activity:new', createdLog);
  });

  it('swallows $transaction errors when called without a transaction', async () => {
    // mockCreate must resolve (it's called during argument construction)
    mockCreate.mockResolvedValue(makeActivity({ action: 'UPDATED' }));
    mockTransaction.mockRejectedValue(new Error('TX exploded'));
    const oldTask = { title: 'A' };
    const newTask = { title: 'B' };
    await expect(
      logTaskChanges({ taskId: TASK_ID, userId: USER_ID, oldTask, newTask }),
    ).resolves.toBeUndefined();
  });
});

// ─── logTaskDeleted ───────────────────────────────────────────────────────────

describe('logTaskDeleted', () => {
  it('creates a DELETED log entry with taskTitle as oldValue', async () => {
    mockCreate.mockResolvedValue(makeActivity({ action: 'DELETED' }));
    await logTaskDeleted('task-3', 'user-3', 'My Task');
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'DELETED', taskId: 'task-3', oldValue: 'My Task' }),
    });
  });

  it('emits task:deleted and task:updated when IO is available', async () => {
    mockCreate.mockResolvedValue(makeActivity({ action: 'DELETED' }));
    enableIO();

    await logTaskDeleted('task-3', 'user-3', 'My Task');

    expect(mockEmit).toHaveBeenCalledWith('task:deleted', { taskId: 'task-3' });
    expect(mockEmit).toHaveBeenCalledWith('task:updated', { taskId: 'task-3' });
  });

  it('swallows errors when called without a transaction', async () => {
    mockCreate.mockRejectedValue(new Error('fail'));
    await expect(logTaskDeleted('task-3', 'user-3', 'My Task')).resolves.toBeUndefined();
  });

  it('rethrows errors when called inside a transaction', async () => {
    const txCreate = jest.fn<() => Promise<never>>().mockRejectedValue(new Error('TX fail'));
    const txClient = { activityLog: { create: txCreate } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(logTaskDeleted('task-3', 'user-3', 'My Task', txClient as any)).rejects.toThrow('TX fail');
  });
});

// ─── logDependencyAdded ───────────────────────────────────────────────────────

describe('logDependencyAdded', () => {
  it('creates a DEPENDENCY_ADDED log entry with newValue = dependsOnTitle', async () => {
    mockCreate.mockResolvedValue(makeActivity({ action: 'DEPENDENCY_ADDED' }));
    await logDependencyAdded('task-4', 'user-4', 'Blocker Task');
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'DEPENDENCY_ADDED', newValue: 'Blocker Task' }),
    });
  });

  it('emits task:updated and activity:new when IO is available', async () => {
    const activity = makeActivity({ action: 'DEPENDENCY_ADDED' });
    mockCreate.mockResolvedValue(activity);
    enableIO();

    await logDependencyAdded('task-4', 'user-4', 'Blocker Task');

    expect(mockEmit).toHaveBeenCalledWith('task:updated', { taskId: 'task-4' });
    expect(mockEmit).toHaveBeenCalledWith('activity:new', activity);
  });

  it('swallows errors silently', async () => {
    mockCreate.mockRejectedValue(new Error('fail'));
    await expect(logDependencyAdded('task-4', 'user-4', 'Blocker')).resolves.toBeUndefined();
  });
});

// ─── logDependencyRemoved ─────────────────────────────────────────────────────

describe('logDependencyRemoved', () => {
  it('creates a DEPENDENCY_REMOVED log entry with oldValue = dependsOnTitle', async () => {
    mockCreate.mockResolvedValue(makeActivity({ action: 'DEPENDENCY_REMOVED' }));
    await logDependencyRemoved('task-5', 'user-5', 'Unblocked Task');
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'DEPENDENCY_REMOVED', oldValue: 'Unblocked Task' }),
    });
  });

  it('emits task:updated and activity:new when IO is available', async () => {
    const activity = makeActivity({ action: 'DEPENDENCY_REMOVED' });
    mockCreate.mockResolvedValue(activity);
    enableIO();

    await logDependencyRemoved('task-5', 'user-5', 'Unblocked Task');

    expect(mockEmit).toHaveBeenCalledWith('task:updated', { taskId: 'task-5' });
    expect(mockEmit).toHaveBeenCalledWith('activity:new', activity);
  });

  it('swallows errors silently', async () => {
    mockCreate.mockRejectedValue(new Error('fail'));
    await expect(logDependencyRemoved('task-5', 'user-5', 'X')).resolves.toBeUndefined();
  });
});

// ─── logCommentAction ─────────────────────────────────────────────────────────

describe('logCommentAction', () => {
  it.each(['COMMENT_ADDED', 'COMMENT_EDITED', 'COMMENT_DELETED'] as const)(
    'creates a log entry for action "%s"',
    async (action) => {
      mockCreate.mockResolvedValue(makeActivity({ action }));
      await logCommentAction(action, 'task-6', 'user-6');
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ action, taskId: 'task-6', userId: 'user-6' }),
      });
    },
  );

  it('emits activity:new (not task:updated) when IO is available', async () => {
    const activity = makeActivity({ action: 'COMMENT_ADDED' });
    mockCreate.mockResolvedValue(activity);
    enableIO();

    await logCommentAction('COMMENT_ADDED', 'task-6', 'user-6');

    expect(mockEmit).toHaveBeenCalledWith('activity:new', activity);
    expect(mockEmit).not.toHaveBeenCalledWith('task:updated', expect.anything());
  });

  it('swallows errors silently', async () => {
    mockCreate.mockRejectedValue(new Error('fail'));
    await expect(logCommentAction('COMMENT_ADDED', 'task-6', 'user-6')).resolves.toBeUndefined();
  });
});
