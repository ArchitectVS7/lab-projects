import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useToastStore } from '../toast';

beforeEach(() => {
  vi.useFakeTimers();
  useToastStore.setState({ toasts: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ToastStore — initial state', () => {
  it('starts with empty toasts array', () => {
    expect(useToastStore.getState().toasts).toEqual([]);
  });
});

describe('ToastStore — addToast', () => {
  it('adds a success toast', () => {
    useToastStore.getState().addToast('Saved!', 'success');
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Saved!');
    expect(toasts[0].type).toBe('success');
  });

  it('adds an error toast', () => {
    useToastStore.getState().addToast('Something failed', 'error');
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].message).toBe('Something failed');
  });

  it('assigns an id to each toast', () => {
    useToastStore.getState().addToast('Hello', 'success');
    const toast = useToastStore.getState().toasts[0];
    expect(toast.id).toBeTruthy();
    expect(typeof toast.id).toBe('string');
  });

  it('adds multiple toasts', () => {
    useToastStore.getState().addToast('First', 'success');
    useToastStore.getState().addToast('Second', 'error');
    expect(useToastStore.getState().toasts).toHaveLength(2);
  });

  it('preserves order of multiple toasts', () => {
    useToastStore.getState().addToast('First', 'success');
    useToastStore.getState().addToast('Second', 'error');
    const toasts = useToastStore.getState().toasts;
    expect(toasts[0].message).toBe('First');
    expect(toasts[1].message).toBe('Second');
  });

  it('assigns unique ids to separate toasts', () => {
    useToastStore.getState().addToast('A', 'success');
    useToastStore.getState().addToast('B', 'error');
    const [a, b] = useToastStore.getState().toasts;
    expect(a.id).not.toBe(b.id);
  });

  it('auto-removes toast after 4000ms', () => {
    useToastStore.getState().addToast('Temp', 'success');
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(4000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('does not remove toast before 4000ms', () => {
    useToastStore.getState().addToast('Still here', 'success');
    vi.advanceTimersByTime(3999);
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it('auto-removes only the correct toast when multiple exist', () => {
    useToastStore.getState().addToast('First', 'success');
    vi.advanceTimersByTime(2000);
    useToastStore.getState().addToast('Second', 'error');
    vi.advanceTimersByTime(2000); // First timer fires at 4000ms from its creation
    // First toast should be gone, second (added at 2000ms) still has 2000ms left
    const remaining = useToastStore.getState().toasts;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].message).toBe('Second');
  });
});

describe('ToastStore — removeToast', () => {
  it('removes toast by id', () => {
    useToastStore.getState().addToast('Remove me', 'success');
    const id = useToastStore.getState().toasts[0].id;
    useToastStore.getState().removeToast(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('only removes the toast with the matching id', () => {
    useToastStore.getState().addToast('Keep', 'success');
    useToastStore.getState().addToast('Remove', 'error');
    const removeId = useToastStore.getState().toasts[1].id;
    useToastStore.getState().removeToast(removeId);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].message).toBe('Keep');
  });

  it('does nothing for unknown id', () => {
    useToastStore.getState().addToast('Toast', 'success');
    useToastStore.getState().removeToast('nonexistent-id');
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it('is idempotent — removing same id twice is safe', () => {
    useToastStore.getState().addToast('Once', 'success');
    const id = useToastStore.getState().toasts[0].id;
    useToastStore.getState().removeToast(id);
    useToastStore.getState().removeToast(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
