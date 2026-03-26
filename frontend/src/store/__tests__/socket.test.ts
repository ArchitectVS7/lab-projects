import { describe, it, expect, beforeEach } from 'vitest';
import { useSocketStore } from '../socket';

beforeEach(() => {
  useSocketStore.setState({ connected: false, onlineUsers: [] });
});

describe('SocketStore — initial state', () => {
  it('starts disconnected', () => {
    expect(useSocketStore.getState().connected).toBe(false);
  });

  it('starts with empty online users', () => {
    expect(useSocketStore.getState().onlineUsers).toEqual([]);
  });
});

describe('SocketStore — setConnected', () => {
  it('sets connected to true', () => {
    useSocketStore.getState().setConnected(true);
    expect(useSocketStore.getState().connected).toBe(true);
  });

  it('sets connected to false', () => {
    useSocketStore.getState().setConnected(true);
    useSocketStore.getState().setConnected(false);
    expect(useSocketStore.getState().connected).toBe(false);
  });

  it('is idempotent when already true', () => {
    useSocketStore.getState().setConnected(true);
    useSocketStore.getState().setConnected(true);
    expect(useSocketStore.getState().connected).toBe(true);
  });

  it('is idempotent when already false', () => {
    useSocketStore.getState().setConnected(false);
    useSocketStore.getState().setConnected(false);
    expect(useSocketStore.getState().connected).toBe(false);
  });

  it('does not affect onlineUsers', () => {
    useSocketStore.setState({ onlineUsers: ['user1', 'user2'] });
    useSocketStore.getState().setConnected(true);
    expect(useSocketStore.getState().onlineUsers).toEqual(['user1', 'user2']);
  });
});

describe('SocketStore — setOnlineUsers', () => {
  it('sets a list of online users', () => {
    useSocketStore.getState().setOnlineUsers(['alice', 'bob']);
    expect(useSocketStore.getState().onlineUsers).toEqual(['alice', 'bob']);
  });

  it('replaces the previous list', () => {
    useSocketStore.getState().setOnlineUsers(['alice', 'bob']);
    useSocketStore.getState().setOnlineUsers(['carol']);
    expect(useSocketStore.getState().onlineUsers).toEqual(['carol']);
  });

  it('accepts an empty list', () => {
    useSocketStore.getState().setOnlineUsers(['alice']);
    useSocketStore.getState().setOnlineUsers([]);
    expect(useSocketStore.getState().onlineUsers).toEqual([]);
  });

  it('accepts a single user', () => {
    useSocketStore.getState().setOnlineUsers(['alice']);
    expect(useSocketStore.getState().onlineUsers).toHaveLength(1);
    expect(useSocketStore.getState().onlineUsers[0]).toBe('alice');
  });

  it('preserves order of users', () => {
    const users = ['charlie', 'alice', 'bob'];
    useSocketStore.getState().setOnlineUsers(users);
    expect(useSocketStore.getState().onlineUsers).toEqual(['charlie', 'alice', 'bob']);
  });

  it('does not affect connected state', () => {
    useSocketStore.setState({ connected: true });
    useSocketStore.getState().setOnlineUsers(['alice']);
    expect(useSocketStore.getState().connected).toBe(true);
  });
});

describe('SocketStore — combined state', () => {
  it('connected and onlineUsers update independently', () => {
    useSocketStore.getState().setConnected(true);
    useSocketStore.getState().setOnlineUsers(['alice', 'bob', 'carol']);
    const state = useSocketStore.getState();
    expect(state.connected).toBe(true);
    expect(state.onlineUsers).toHaveLength(3);
  });

  it('reset restores initial state', () => {
    useSocketStore.getState().setConnected(true);
    useSocketStore.getState().setOnlineUsers(['alice']);
    useSocketStore.setState({ connected: false, onlineUsers: [] });
    expect(useSocketStore.getState().connected).toBe(false);
    expect(useSocketStore.getState().onlineUsers).toEqual([]);
  });
});
