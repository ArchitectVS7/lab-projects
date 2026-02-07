import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { initializeSocket } from '../src/lib/socket';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

describe('WebSocket Infrastructure', () => {
  let httpServer: ReturnType<typeof createServer>;
  let ioServer: Server;
  let port: number;

  beforeAll((done) => {
    httpServer = createServer(app);
    ioServer = initializeSocket(httpServer) as Server;
    httpServer.listen(0, () => {
      const addr = httpServer.address();
      port = typeof addr === 'object' && addr ? addr.port : 0;
      done();
    });
  });

  afterAll((done) => {
    ioServer.close();
    httpServer.close(done);
  });

  function createAuthCookie(userId: string): string {
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
    return `auth_token=${token}`;
  }

  function connectClient(cookie: string): ClientSocket {
    return ioClient(`http://localhost:${port}`, {
      extraHeaders: { cookie },
      transports: ['websocket'],
      autoConnect: true,
    });
  }

  it('should reject connection without auth cookie', (done) => {
    const client = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      autoConnect: true,
    });

    client.on('connect_error', (err) => {
      expect(err.message).toContain('Authentication required');
      client.disconnect();
      done();
    });
  });

  it('should accept connection with valid auth cookie', (done) => {
    const cookie = createAuthCookie('user-123');
    const client = connectClient(cookie);

    client.on('connect', () => {
      expect(client.connected).toBe(true);
      client.disconnect();
      done();
    });
  });

  it('should join and leave task rooms', (done) => {
    const cookie = createAuthCookie('user-456');
    const client = connectClient(cookie);

    client.on('connect', () => {
      // Join a task room
      client.emit('task:join', 'task-abc');

      // Leave the room
      client.emit('task:leave', 'task-abc');

      client.disconnect();
      done();
    });
  });

  it('should receive presence updates', (done) => {
    const cookie1 = createAuthCookie('user-pres-1');
    const client1 = connectClient(cookie1);

    client1.on('presence:update', (data: { onlineUsers: string[] }) => {
      if (data.onlineUsers.includes('user-pres-1')) {
        client1.disconnect();
        done();
      }
    });
  });

  it('should reject connection with invalid token', (done) => {
    const client = ioClient(`http://localhost:${port}`, {
      extraHeaders: { cookie: 'auth_token=invalid-jwt-token' },
      transports: ['websocket'],
      autoConnect: true,
    });

    client.on('connect_error', (err) => {
      expect(err.message).toContain('Invalid or expired token');
      client.disconnect();
      done();
    });
  });
});
