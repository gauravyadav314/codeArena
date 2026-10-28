import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { rateLimiter } from '../middlewares/rateLimit';
import { validateRequest } from '../middlewares/validate';
import {
  createMatchSchema,
  drawMatchSchema,
  joinMatchSchema,
  matchCodeParamSchema,
  matchMessageSchema,
  submitMatchCodeSchema,
} from '../validators/match.validator';
import { optionalAuth, requireAuth } from '../middlewares/auth';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors/AppError';
import { finalizeMatchResult } from '../services/elo.service';
import { enqueueJudgeJob, getJudgeJobStatus } from '../services/judgeQueue.service';
import { startServerMatchTimer, clearMatchTimer, getSocketServer } from '../socket';
import {
  joinQueue,
  leaveQueue,
  getQueueStatus,
} from '../services/matchmaking.service';
import { TestCase } from '../services/judge.service';

const router = Router();

// In-memory chat storage for active match rooms
interface MatchMessage {
  id: string;
  senderUsername: string;
  text: string;
  createdAt: string;
}
const matchMessagesStore = new Map<string, MatchMessage[]>();

// GET /api/matches - List recent matches
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status && typeof status === 'string' && status !== 'All') {
      where.status = status;
    }

    const matches = await prisma.match.findMany({
      where,
      include: {
        player1: {
          select: { id: true, username: true, name: true, avatarUrl: true, arenaRating: true, ratingTier: true },
        },
        player2: {
          select: { id: true, username: true, name: true, avatarUrl: true, arenaRating: true, ratingTier: true },
        },
        problem: {
          select: { id: true, title: true, slug: true, difficulty: true, category: true },
        },
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    res.status(200).json({ success: true, count: matches.length, data: matches });
  } catch (error) {
    next(error);
  }
});

// GET /api/matches/queue/status - Check matchmaking status
router.get('/queue/status', requireAuth, (req: Request, res: Response) => {
  const status = getQueueStatus(req.user!.id);
  res.status(200).json({ success: true, data: status || { inQueue: false } });
});

// POST /api/matches/queue/join - Join matchmaking queue
router.post('/queue/join', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new NotFoundError('User not found');

    const result = joinQueue({
      userId: user.id,
      username: user.username,
      rating: user.arenaRating,
    });

    res.status(200).json({ success: true, message: 'Joined matchmaking queue', data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/matches/queue/leave - Leave matchmaking queue
router.post('/queue/leave', requireAuth, (req: Request, res: Response) => {
  const left = leaveQueue(req.user!.id);
  res.status(200).json({ success: true, message: left ? 'Left queue' : 'Was not in queue' });
});

// GET /api/matches/submissions/status/:jobId - Poll async execution status
router.get('/submissions/status/:jobId', (req: Request, res: Response) => {
  const status = getJudgeJobStatus(req.params.jobId);
  if (!status) {
    res.status(404).json({ success: false, message: 'Judge job not found' });
    return;
  }
  res.status(200).json({ success: true, data: status });
});

// GET /api/matches/:code - Get single match details
router.get(
  '/:code',
  validateRequest({ params: matchCodeParamSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const match = await prisma.match.findUnique({
        where: { code },
        include: {
          player1: {
            select: { id: true, username: true, name: true, avatarUrl: true, arenaRating: true, ratingTier: true },
          },
          player2: {
            select: { id: true, username: true, name: true, avatarUrl: true, arenaRating: true, ratingTier: true },
          },
          problem: true,
          submissions: {
            include: {
              user: { select: { id: true, username: true, avatarUrl: true } },
            },
            orderBy: { submittedAt: 'desc' },
          },
        },
      });

      if (!match) {
        throw new NotFoundError(`Match '${code}' not found`);
      }

      res.status(200).json({ success: true, data: match });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/matches/create - Create a new 1v1 match room
router.post(
  '/create',
  optionalAuth,
  validateRequest({ body: createMatchSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { problemId, player1Username, durationSeconds } = req.body;
      const effectiveUsername = req.user?.username || player1Username;

      if (!effectiveUsername) {
        throw new BadRequestError('Player 1 username is required (or log in)');
      }

      const host = await prisma.user.findUnique({
        where: { username: effectiveUsername },
      });

      if (!host) {
        throw new NotFoundError(`Host user '${effectiveUsername}' not found`);
      }

      const problem = await prisma.problem.findUnique({
        where: { id: problemId },
      });

      if (!problem) {
        throw new NotFoundError('Selected problem does not exist');
      }

      // Generate collision-resistant 6-character room code
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const code = `ARENA-${randomSuffix}`;

      const match = await prisma.match.create({
        data: {
          code,
          player1Id: host.id,
          problemId: problem.id,
          status: 'WAITING',
          durationSeconds: durationSeconds || 900,
        },
        include: {
          player1: {
            select: { id: true, username: true, name: true, avatarUrl: true, arenaRating: true, ratingTier: true },
          },
          problem: true,
        },
      });

      res.status(201).json({ success: true, data: match });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/matches/:code/join - Join an existing match
router.post(
  '/:code/join',
  optionalAuth,
  validateRequest({ params: matchCodeParamSchema, body: joinMatchSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const { player2Username } = req.body;
      const effectiveUsername = req.user?.username || player2Username;

      if (!effectiveUsername) {
        throw new BadRequestError('Player 2 username is required (or log in)');
      }

      const match = await prisma.match.findUnique({
        where: { code },
        include: { player1: true },
      });

      if (!match) throw new NotFoundError(`Match '${code}' not found`);

      if (match.status !== 'WAITING') {
        throw new BadRequestError(`Match is already ${match.status.toLowerCase()}`);
      }

      const joiningPlayer = await prisma.user.findUnique({
        where: { username: effectiveUsername },
      });

      if (!joiningPlayer) throw new NotFoundError(`Player '${effectiveUsername}' not found`);

      if (match.player1Id === joiningPlayer.id) {
        throw new BadRequestError('Cannot duel yourself. Share this link with an opponent!');
      }

      const startedAt = new Date();

      const updatedMatch = await prisma.match.update({
        where: { id: match.id },
        data: {
          player2Id: joiningPlayer.id,
          status: 'IN_PROGRESS',
          startedAt,
        },
        include: {
          player1: {
            select: { id: true, username: true, name: true, avatarUrl: true, arenaRating: true, ratingTier: true },
          },
          player2: {
            select: { id: true, username: true, name: true, avatarUrl: true, arenaRating: true, ratingTier: true },
          },
          problem: true,
        },
      });

      // Start authoritative server timer
      startServerMatchTimer(updatedMatch.id, updatedMatch.code, updatedMatch.durationSeconds);

      res.status(200).json({ success: true, data: updatedMatch });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/matches/:code/submit - Submit code during match
router.post(
  '/:code/submit',
  rateLimiter,
  optionalAuth,
  validateRequest({ params: matchCodeParamSchema, body: submitMatchCodeSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const { language, code: sourceCode, username } = req.body;
      const effectiveUsername = req.user?.username || username;

      if (!effectiveUsername) {
        throw new BadRequestError('Username is required for submission (or log in)');
      }

      const match = await prisma.match.findUnique({
        where: { code },
        include: {
          player1: true,
          player2: true,
          problem: true,
        },
      });

      if (!match) throw new NotFoundError(`Match '${code}' not found`);

      if (match.status !== 'IN_PROGRESS') {
        throw new BadRequestError(
          match.status === 'COMPLETED' || match.status === 'DRAW'
            ? 'This match has already concluded. Submissions are closed.'
            : 'Match has not started yet. Waiting for opponent to join.'
        );
      }

      const user = await prisma.user.findUnique({ where: { username: effectiveUsername } });
      if (!user) throw new NotFoundError(`User '${effectiveUsername}' not found`);

      const isParticipant = match.player1Id === user.id || match.player2Id === user.id;
      if (!isParticipant) {
        throw new ForbiddenError('You are not a registered participant in this duel');
      }

      // Parse test cases
      let testCases: TestCase[] = [];
      try {
        testCases = JSON.parse(match.problem.testCases);
      } catch {
        testCases = [];
      }

      // Create pending submission record
      const submission = await prisma.submission.create({
        data: {
          matchId: match.id,
          userId: user.id,
          problemId: match.problemId,
          language,
          code: sourceCode,
          status: 'PENDING',
        },
      });

      // Enqueue judge evaluation job
      const { jobId } = await enqueueJudgeJob({
        submissionId: submission.id,
        userId: user.id,
        problemId: match.problemId,
        code: sourceCode,
        language,
        testCases,
        timeLimitMs: match.problem.timeLimitMs,
        matchId: match.id,
        matchCode: match.code,
      });

      res.status(200).json({
        success: true,
        message: 'Submission enqueued for evaluation',
        data: {
          jobId,
          submissionId: submission.id,
          status: 'PENDING',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/matches/:code/draw - Finalize match as a draw
router.post(
  '/:code/draw',
  optionalAuth,
  validateRequest({ params: matchCodeParamSchema, body: drawMatchSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const { username } = req.body;
      const effectiveUsername = req.user?.username || username;

      const match = await prisma.match.findUnique({
        where: { code },
        include: { player1: true, player2: true },
      });

      if (!match) throw new NotFoundError(`Match '${code}' not found`);

      if (match.status === 'COMPLETED' || match.status === 'DRAW') {
        res.status(200).json({ success: true, message: 'Match already concluded', data: match });
        return;
      }

      if (effectiveUsername) {
        const user = await prisma.user.findUnique({ where: { username: effectiveUsername } });
        if (user && match.player1Id !== user.id && match.player2Id !== user.id) {
          throw new ForbiddenError('Only match participants can trigger draw finalization');
        }
      }

      clearMatchTimer(code);

      const result = await finalizeMatchResult({
        matchId: match.id,
        isDraw: true,
      });

      const io = getSocketServer();
      if (io) {
        io.to(`match:${code}`).emit('match:concluded', {
          matchCode: code,
          outcome: 'DRAW',
          reason: 'USER_FINALIZED_DRAW',
          match: result.match,
          eloDeltas: result.eloDeltas,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Match declared as a DRAW. Stats and ratings updated.',
        data: result.match,
        eloDeltas: result.eloDeltas,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/matches/:code/messages - Get live chat feed
router.get('/:code/messages', (req: Request, res: Response) => {
  const { code } = req.params;
  const messages = matchMessagesStore.get(code) || [];
  res.status(200).json({ success: true, data: messages });
});

// POST /api/matches/:code/messages - Post message or taunt
router.post(
  '/:code/messages',
  validateRequest({ params: matchCodeParamSchema, body: matchMessageSchema }),
  (req: Request, res: Response) => {
    const { code } = req.params;
    const { senderUsername, text } = req.body;

    const newMessage: MatchMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderUsername,
      text,
      createdAt: new Date().toISOString(),
    };

    const existing = matchMessagesStore.get(code) || [];
    existing.push(newMessage);
    if (existing.length > 50) existing.shift();
    matchMessagesStore.set(code, existing);

    const io = getSocketServer();
    if (io) {
      io.to(`match:${code}`).emit('match:chat-broadcast', newMessage);
    }

    res.status(201).json({ success: true, data: newMessage });
  }
);

export const matchRoutes = router;
