import { describe, it, expect, beforeEach } from 'vitest';
import { useCelebrationStore } from '../celebration';

beforeEach(() => {
  useCelebrationStore.setState({ queue: [], current: null });
});

describe('CelebrationStore — initial state', () => {
  it('has empty queue', () => {
    expect(useCelebrationStore.getState().queue).toEqual([]);
  });

  it('has null current', () => {
    expect(useCelebrationStore.getState().current).toBeNull();
  });
});

describe('CelebrationStore — addCelebration', () => {
  it('adds a TASK celebration to the queue', () => {
    useCelebrationStore.getState().addCelebration('TASK', { taskId: 't1' });
    const { queue, current } = useCelebrationStore.getState();
    // First celebration is immediately promoted to current, queue is empty
    expect(current).not.toBeNull();
    expect(current?.type).toBe('TASK');
    expect(queue).toHaveLength(0);
  });

  it('sets the data on the celebration', () => {
    useCelebrationStore.getState().addCelebration('XP', { amount: 50 });
    expect(useCelebrationStore.getState().current?.data).toEqual({ amount: 50 });
  });

  it('assigns an id to the celebration', () => {
    useCelebrationStore.getState().addCelebration('LEVEL_UP', { level: 5 });
    const { current } = useCelebrationStore.getState();
    expect(current?.id).toBeTruthy();
    expect(typeof current?.id).toBe('string');
  });

  it('id starts with the type prefix', () => {
    useCelebrationStore.getState().addCelebration('STREAK', { days: 7 });
    expect(useCelebrationStore.getState().current?.id).toMatch(/^STREAK_/);
  });

  it('second celebration is queued while first is current', () => {
    useCelebrationStore.getState().addCelebration('TASK', { taskId: 't1' });
    useCelebrationStore.getState().addCelebration('XP', { amount: 100 });
    const { queue, current } = useCelebrationStore.getState();
    expect(current?.type).toBe('TASK');
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe('XP');
  });

  it('three celebrations: first is current, two in queue', () => {
    useCelebrationStore.getState().addCelebration('TASK', {});
    useCelebrationStore.getState().addCelebration('XP', {});
    useCelebrationStore.getState().addCelebration('LEVEL_UP', {});
    const { queue, current } = useCelebrationStore.getState();
    expect(current?.type).toBe('TASK');
    expect(queue).toHaveLength(2);
  });

  it('supports all celebration types', () => {
    const types = ['TASK', 'XP', 'LEVEL_UP', 'ACHIEVEMENT', 'STREAK', 'QUEST'] as const;
    for (const type of types) {
      useCelebrationStore.setState({ queue: [], current: null });
      useCelebrationStore.getState().addCelebration(type, {});
      expect(useCelebrationStore.getState().current?.type).toBe(type);
    }
  });
});

describe('CelebrationStore — nextCelebration', () => {
  it('promotes the next queued celebration to current', () => {
    useCelebrationStore.getState().addCelebration('TASK', {});
    useCelebrationStore.getState().addCelebration('XP', {});
    useCelebrationStore.getState().nextCelebration();
    expect(useCelebrationStore.getState().current?.type).toBe('XP');
  });

  it('removes the promoted item from the queue', () => {
    useCelebrationStore.getState().addCelebration('TASK', {});
    useCelebrationStore.getState().addCelebration('XP', {});
    useCelebrationStore.getState().addCelebration('LEVEL_UP', {});
    // current=TASK, queue=[XP, LEVEL_UP]
    useCelebrationStore.getState().nextCelebration();
    // current=XP, queue=[LEVEL_UP]
    expect(useCelebrationStore.getState().queue).toHaveLength(1);
    expect(useCelebrationStore.getState().current?.type).toBe('XP');
  });

  it('sets current to null when queue is empty', () => {
    useCelebrationStore.setState({ queue: [], current: { type: 'TASK', data: {}, id: 'x' } });
    useCelebrationStore.getState().nextCelebration();
    expect(useCelebrationStore.getState().current).toBeNull();
  });

  it('processes queue in FIFO order', () => {
    useCelebrationStore.getState().addCelebration('TASK', {});
    useCelebrationStore.getState().addCelebration('XP', {});
    useCelebrationStore.getState().addCelebration('LEVEL_UP', {});
    useCelebrationStore.getState().nextCelebration(); // consume TASK
    useCelebrationStore.getState().nextCelebration(); // consume XP
    expect(useCelebrationStore.getState().current?.type).toBe('LEVEL_UP');
    expect(useCelebrationStore.getState().queue).toHaveLength(0);
  });
});

describe('CelebrationStore — clearQueue', () => {
  it('empties the queue', () => {
    useCelebrationStore.getState().addCelebration('TASK', {});
    useCelebrationStore.getState().addCelebration('XP', {});
    useCelebrationStore.getState().clearQueue();
    expect(useCelebrationStore.getState().queue).toEqual([]);
  });

  it('clears current', () => {
    useCelebrationStore.getState().addCelebration('TASK', {});
    useCelebrationStore.getState().clearQueue();
    expect(useCelebrationStore.getState().current).toBeNull();
  });

  it('is idempotent on empty store', () => {
    useCelebrationStore.getState().clearQueue();
    expect(useCelebrationStore.getState().queue).toEqual([]);
    expect(useCelebrationStore.getState().current).toBeNull();
  });
});
