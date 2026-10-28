import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../config/prisma';
import { finalizeMatchResult } from '../services/elo.service';

let io: SocketServer | null = null;

// Map of active match timers: matchCode -> NodeJS.Timeout
const matchTimers = new Map<string, NodeJS.Timeout>();

export function getSocketServer(): SocketServer | null {
  return io;
}

export function initSocketServer(server: HttpServer): SocketServer {
  io = new SocketServer(server, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.on('connection', (socket: Socket) => {
    logger.debug(`[Socket] Client connected: ${socket.id}`);

    // Join user channel for direct notifications (e.g. matchmaking queue)
    socket.on('user:join', (data: { userId: string }) => {
      if (data?.userId) {
        socket.join(`user:${data.userId}`);
        logger.debug(`[Socket] Socket ${socket.id} joined user:${data.userId}`);
      }
    });

    // Join match room
    socket.on('match:join-room', (data: { matchCode: string; username?: string }) => {
      if (data?.matchCode) {
        const room = `match:${data.matchCode}`;
        socket.join(room);
        logger.debug(`[Socket] User ${data.username || socket.id} joined room ${room}`);

        socket.to(room).emit('match:user-joined', {
          username: data.username,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Leave match room
    socket.on('match:leave-room', (data: { matchCode: string }) => {
      if (data?.matchCode) {
        const room = `match:${data.matchCode}`;
        socket.leave(room);
        logger.debug(`[Socket] Socket ${socket.id} left room ${room}`);
      }
    });

    // In-match real-time chat
    socket.on('match:chat-message', (data: { matchCode: string; senderUsername: string; text: string }) => {
      if (data?.matchCode && data?.text) {
        const room = `match:${data.matchCode}`;
        const messagePayload = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          senderUsername: data.senderUsername,
          text: data.text.trim().substring(0, 500),
          createdAt: new Date().toISOString(),
        };

        io?.to(room).emit('match:chat-broadcast', messagePayload);
      }
    });

    socket.on('disconnect', () => {
      logger.debug(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Starts a server-authoritative timer for a match.
 * Automatically finalizes the match as a DRAW if no player solves it before time expires.
 */
export function startServerMatchTimer(matchId: string, matchCode: string, durationSeconds: number) {
  // Clear any existing timer for this match
  if (matchTimers.has(matchCode)) {
    clearTimeout(matchTimers.get(matchCode)!);
    matchTimers.delete(matchCode);
  }

  const room = `match:${matchCode}`;
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + durationSeconds * 1000);

  // Broadcast match start to all connected clients in the match room
  if (io) {
    io.to(room).emit('match:started', {
      matchCode,
      startedAt: startedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      durationSeconds,
    });
  }

  // Schedule auto-finalization on timeout
  const timer = setTimeout(async () => {
    try {
      logger.info(`[MatchTimer] Duration expired for match ${matchCode}. Auto-finalizing as DRAW.`);

      const result = await finalizeMatchResult({
        matchId,
        isDraw: true,
      });

      if (!result.alreadyFinalized && io) {
        io.to(room).emit('match:concluded', {
          matchCode,
          outcome: 'DRAW',
          reason: 'TIME_EXPIRED',
          match: result.match,
          eloDeltas: result.eloDeltas,
        });
      }
    } catch (err: any) {
      logger.error(`[MatchTimer] Error finalizing expired match ${matchCode}: ${err.message}`);
    } finally {
      matchTimers.delete(matchCode);
    }
  }, durationSeconds * 1000);

  matchTimers.set(matchCode, timer);
}

/**
 * Clears active match timer when match completes early.
 */
export function clearMatchTimer(matchCode: string) {
  if (matchTimers.has(matchCode)) {
    clearTimeout(matchTimers.get(matchCode)!);
    matchTimers.delete(matchCode);
  }
}

