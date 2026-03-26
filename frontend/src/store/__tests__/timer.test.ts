import { describe, it, expect, beforeEach } from 'vitest';
import { useTimerStore } from '../timer';

const DEFAULT_POMODORO = 25 * 60; // 1500 seconds

beforeEach(() => {
  localStorage.clear();
  useTimerStore.setState({
    activeEntry: null,
    isPomodoro: false,
    pomodoroSeconds: DEFAULT_POMODORO,
  });
});

describe('TimerStore — initial state', () => {
  it('has null activeEntry', () => {
    expect(useTimerStore.getState().activeEntry).toBeNull();
  });

  it('has isPomodoro false', () => {
    expect(useTimerStore.getState().isPomodoro).toBe(false);
  });

  it('has pomodoroSeconds equal to 25 minutes', () => {
    expect(useTimerStore.getState().pomodoroSeconds).toBe(DEFAULT_POMODORO);
  });
});

describe('TimerStore — setActiveEntry', () => {
  it('sets an active entry', () => {
    const entry = { id: 'e1', taskId: 't1', startTime: '2026-01-01T09:00:00Z' } as any;
    useTimerStore.getState().setActiveEntry(entry);
    expect(useTimerStore.getState().activeEntry).toEqual(entry);
  });

  it('clears active entry with null', () => {
    const entry = { id: 'e2', taskId: 't2', startTime: '2026-01-01T10:00:00Z' } as any;
    useTimerStore.getState().setActiveEntry(entry);
    useTimerStore.getState().setActiveEntry(null);
    expect(useTimerStore.getState().activeEntry).toBeNull();
  });

  it('replaces an existing entry', () => {
    const a = { id: 'a', taskId: 't1', startTime: '2026-01-01T09:00:00Z' } as any;
    const b = { id: 'b', taskId: 't2', startTime: '2026-01-01T10:00:00Z' } as any;
    useTimerStore.getState().setActiveEntry(a);
    useTimerStore.getState().setActiveEntry(b);
    expect(useTimerStore.getState().activeEntry?.id).toBe('b');
  });
});

describe('TimerStore — clearActiveEntry', () => {
  it('sets activeEntry to null', () => {
    const entry = { id: 'e1', taskId: 't1', startTime: '2026-01-01T09:00:00Z' } as any;
    useTimerStore.getState().setActiveEntry(entry);
    useTimerStore.getState().clearActiveEntry();
    expect(useTimerStore.getState().activeEntry).toBeNull();
  });

  it('resets isPomodoro to false', () => {
    useTimerStore.getState().startPomodoro();
    useTimerStore.getState().clearActiveEntry();
    expect(useTimerStore.getState().isPomodoro).toBe(false);
  });

  it('resets pomodoroSeconds to default', () => {
    useTimerStore.getState().startPomodoro(600);
    useTimerStore.getState().clearActiveEntry();
    expect(useTimerStore.getState().pomodoroSeconds).toBe(DEFAULT_POMODORO);
  });
});

describe('TimerStore — startPomodoro', () => {
  it('sets isPomodoro to true', () => {
    useTimerStore.getState().startPomodoro();
    expect(useTimerStore.getState().isPomodoro).toBe(true);
  });

  it('uses default 25 minutes when no arg given', () => {
    useTimerStore.getState().startPomodoro();
    expect(useTimerStore.getState().pomodoroSeconds).toBe(DEFAULT_POMODORO);
  });

  it('uses custom seconds when provided', () => {
    useTimerStore.getState().startPomodoro(10 * 60);
    expect(useTimerStore.getState().pomodoroSeconds).toBe(600);
  });

  it('uses custom 5 minute value', () => {
    useTimerStore.getState().startPomodoro(5 * 60);
    expect(useTimerStore.getState().pomodoroSeconds).toBe(300);
  });

  it('is callable multiple times — resets seconds each time', () => {
    useTimerStore.getState().startPomodoro(300);
    useTimerStore.getState().startPomodoro(600);
    expect(useTimerStore.getState().pomodoroSeconds).toBe(600);
  });
});

describe('TimerStore — stopPomodoro', () => {
  it('sets isPomodoro to false', () => {
    useTimerStore.getState().startPomodoro();
    useTimerStore.getState().stopPomodoro();
    expect(useTimerStore.getState().isPomodoro).toBe(false);
  });

  it('resets pomodoroSeconds to default', () => {
    useTimerStore.getState().startPomodoro(300);
    useTimerStore.getState().tickPomodoro(); // consume 1 second
    useTimerStore.getState().stopPomodoro();
    expect(useTimerStore.getState().pomodoroSeconds).toBe(DEFAULT_POMODORO);
  });

  it('does not affect activeEntry', () => {
    const entry = { id: 'e1', taskId: 't1', startTime: '2026-01-01T09:00:00Z' } as any;
    useTimerStore.getState().setActiveEntry(entry);
    useTimerStore.getState().startPomodoro();
    useTimerStore.getState().stopPomodoro();
    expect(useTimerStore.getState().activeEntry).toEqual(entry);
  });
});

describe('TimerStore — tickPomodoro', () => {
  it('decrements pomodoroSeconds by 1', () => {
    useTimerStore.getState().startPomodoro(60);
    useTimerStore.getState().tickPomodoro();
    expect(useTimerStore.getState().pomodoroSeconds).toBe(59);
  });

  it('clamps at 0 — does not go negative', () => {
    useTimerStore.getState().startPomodoro(1);
    useTimerStore.getState().tickPomodoro(); // → 0
    useTimerStore.getState().tickPomodoro(); // → still 0
    expect(useTimerStore.getState().pomodoroSeconds).toBe(0);
  });

  it('decrements correctly over multiple ticks', () => {
    useTimerStore.getState().startPomodoro(5);
    for (let i = 0; i < 5; i++) useTimerStore.getState().tickPomodoro();
    expect(useTimerStore.getState().pomodoroSeconds).toBe(0);
  });

  it('exactly reaches 0 without going negative', () => {
    useTimerStore.getState().startPomodoro(3);
    useTimerStore.getState().tickPomodoro();
    useTimerStore.getState().tickPomodoro();
    useTimerStore.getState().tickPomodoro();
    expect(useTimerStore.getState().pomodoroSeconds).toBe(0);
    useTimerStore.getState().tickPomodoro(); // extra tick
    expect(useTimerStore.getState().pomodoroSeconds).toBe(0);
  });
});
