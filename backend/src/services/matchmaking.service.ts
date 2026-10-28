import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { getSocketServer, startServerMatchTimer } from '../socket';

export interface QueuedPlayer {
  userId: string;
  username: string;
  rating: number;
  joinedAt: number; // Date.now()
}

// In-memory queue of waiting players
const matchmakingQueue: QueuedPlayer[] = [];
let matchmakingInterval: NodeJS.Timeout | null = null;

/**
 * Calculates dynamic rating window based on elapsed waiting time.
 * - 0 - 15s: +/- 100 rating
 * - 15 - 30s: +/- 250 rating
 * - > 30s: +/- 500 rating
 */
export function getRatingTolerance(elapsedSeconds: number): number {
  if (elapsedSeconds < 15) return 100;
  if (elapsedSeconds < 30) return 250;
  return 500;
}

export function joinQueue(player: { userId: string; username: string; rating: number }): {
  position: number;
  estimatedWaitSeconds: number;
} {
  // Remove if already in queue
  leaveQueue(player.userId);

  matchmakingQueue.push({
    userId: player.userId,
    username: player.username,
    rating: player.rating,
    joinedAt: Date.now(),
  });

  logger.info(`[Matchmaking] User ${player.username} (Rating: ${player.rating}) joined queue. Total in queue: ${matchmakingQueue.length}`);

  ensureMatchmakingLoop();

  return {
    position: matchmakingQueue.length,
    estimatedWaitSeconds: 15,
  };
}

export function leaveQueue(userId: string): boolean {
  const index = matchmakingQueue.findIndex((p) => p.userId === userId);
  if (index !== -1) {
    matchmakingQueue.splice(index, 1);
    logger.info(`[Matchmaking] User ${userId} left queue. Remaining: ${matchmakingQueue.length}`);
    return true;
  }
  return false;
}

export function getQueueStatus(userId: string): {
  inQueue: boolean;
  timeInQueueSeconds: number;
  tolerance: number;
} | null {
  const player = matchmakingQueue.find((p) => p.userId === userId);
  if (!player) return null;

  const elapsed = Math.floor((Date.now() - player.joinedAt) / 1000);
  return {
    inQueue: true,
    timeInQueueSeconds: elapsed,
    tolerance: getRatingTolerance(elapsed),
  };
}

/**
 * Matchmaking tick loop: checks pairwise suitability and forms matches.
 */
async function processMatchmakingTick() {
  if (matchmakingQueue.length < 2) return;

  const now = Date.now();
  const matchedPairs: [QueuedPlayer, QueuedPlayer][] = [];
  const matchedUserIds = new Set<string>();

  for (let i = 0; i < matchmakingQueue.length; i++) {
    const p1 = matchmakingQueue[i];
    if (matchedUserIds.has(p1.userId)) continue;

    const p1Elapsed = (now - p1.joinedAt) / 1000;
    const p1Tolerance = getRatingTolerance(p1Elapsed);

    let bestOpponentIndex = -1;
    let minDifference = Infinity;

    for (let j = i + 1; j < matchmakingQueue.length; j++) {
      const p2 = matchmakingQueue[j];
      if (matchedUserIds.has(p2.userId)) continue;

      const p2Elapsed = (now - p2.joinedAt) / 1000;
      const p2Tolerance = getRatingTolerance(p2Elapsed);

      const maxAllowedDiff = Math.max(p1Tolerance, p2Tolerance);
      const diff = Math.abs(p1.rating - p2.rating);

      if (diff <= maxAllowedDiff && diff < minDifference) {
        minDifference = diff;
        bestOpponentIndex = j;
      }
    }

    if (bestOpponentIndex !== -1) {
      const p2 = matchmakingQueue[bestOpponentIndex];
      matchedPairs.push([p1, p2]);
      matchedUserIds.add(p1.userId);
      matchedUserIds.add(p2.userId);
    }
  }

  // Remove matched players from queue
  for (const [p1, p2] of matchedPairs) {
    leaveQueue(p1.userId);
    leaveQueue(p2.userId);

    try {
      await createMatchedDuel(p1, p2);
    } catch (err: any) {
      logger.error(`[Matchmaking] Failed to create matched duel: ${err.message}`);
    }
  }
}

async function createMatchedDuel(p1: QueuedPlayer, p2: QueuedPlayer) {
  // Select a random problem from catalog
  const problems = await prisma.problem.findMany({ select: { id: true } });
  if (problems.length === 0) {
    logger.error('[Matchmaking] No problems available in catalog');
    return;
  }

  const selectedProblem = problems[Math.floor(Math.random() * problems.length)];
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const roomCode = `ARENA-${randomSuffix}`;
  const durationSeconds = 900;
  const startedAt = new Date();

  const match = await prisma.match.create({
    data: {
      code: roomCode,
      player1Id: p1.userId,
      player2Id: p2.userId,
      problemId: selectedProblem.id,
      status: 'IN_PROGRESS',
      startedAt,
      durationSeconds,
    },
    include: {
      player1: { select: { id: true, username: true, arenaRating: true } },
      player2: { select: { id: true, username: true, arenaRating: true } },
      problem: true,
    },
  });

  logger.info(`[Matchmaking] Matched ${p1.username} vs ${p2.username} in room ${roomCode}`);

  // Start authoritative server timer
  startServerMatchTimer(match.id, match.code, durationSeconds);

  // Notify both players via Socket.IO
  const io = getSocketServer();
  if (io) {
    const payload = {
      matchCode: roomCode,
      problem: match.problem,
      durationSeconds,
      startedAt: startedAt.toISOString(),
      opponent: {
        p1: { username: p1.username, rating: p1.rating },
        p2: { username: p2.username, rating: p2.rating },
      },
    };

    io.to(`user:${p1.userId}`).emit('matchmaking:matched', payload);
    io.to(`user:${p2.userId}`).emit('matchmaking:matched', payload);
  }
}

function ensureMatchmakingLoop() {
  if (!matchmakingInterval) {
    matchmakingInterval = setInterval(() => {
      processMatchmakingTick().catch((err) => {
        logger.error(`[MatchmakingLoop] Error: ${err.message}`);
      });
    }, 2000);
  }
}
