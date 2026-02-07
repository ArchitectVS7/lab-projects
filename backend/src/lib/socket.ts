import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

let io: Server | null = null;

interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

const onlineUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>

export function initializeSocket(httpServer: HttpServer) {
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // Auth middleware - extract JWT from cookie in handshake
  io.use((socket: Socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error('Authentication required'));
      }

      const cookies = cookie.parse(cookieHeader);
      const token = cookies.auth_token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
      (socket as any).userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;

    // Auto-join personal room
    socket.join(`user:${userId}`);

    // Track online users
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Broadcast presence
    io!.emit('presence:update', {
      onlineUsers: Array.from(onlineUsers.keys()),
    });

    // Join/leave task rooms
    socket.on('task:join', (taskId: string) => {
      socket.join(`task:${taskId}`);
    });

    socket.on('task:leave', (taskId: string) => {
      socket.leave(`task:${taskId}`);
    });

    // Typing indicators for comments
    socket.on('comment:typing', (data: { taskId: string; userName: string }) => {
      socket.to(`task:${data.taskId}`).emit('comment:typing', {
        userId,
        userName: data.userName,
      });
    });

    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
        }
      }

      io!.emit('presence:update', {
        onlineUsers: Array.from(onlineUsers.keys()),
      });
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}
