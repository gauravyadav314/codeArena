import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { evaluateSubmission, TestCase } from '../services/judge.service';
import { getRatingTier } from '../services/rating.service';
import { rateLimiter } from '../middlewares/rateLimit';

const router = Router();

// ---------------------------------------------------------------------------
// Helper: Compute ELO delta for a match result
// K = 32, expectedScore from winner's perspective
// ---------------------------------------------------------------------------
function computeElo(winnerRating: number, loserRating: number): { gain: number; loss: number } {
  const K = 32;
  const expectedScore = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const gain = Math.round(K * (1 - expectedScore));
  const loss = Math.round(K * expectedScore);
  return { gain, loss };
}

// GET /api/matches - List all matches
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

// GET /api/matches/:code - Get single match details
router.get('/:code', async (req: Request, res: Response, next: NextFunction) => {
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
      res.status(404).json({ success: false, message: `Match '${code}' not found` });
      return;
    }

    res.status(200).json({ success: true, data: match });
  } catch (error) {
    next(error);
  }
});

// POST /api/matches/create - Create a new 1v1 match room
router.post('/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { problemId, player1Username, durationSeconds } = req.body;

    if (!player1Username) {
      res.status(400).json({ success: false, message: 'player1Username is required' });
      return;
    }

    // Find host player
    const user = await prisma.user.findUnique({
      where: { username: player1Username },
    });

    if (!user) {
      res.status(400).json({ success: false, message: 'Valid host user required' });
      return;
    }

    // Find problem or pick first one
    const problem = problemId
      ? await prisma.problem.findUnique({ where: { id: problemId } })
      : await prisma.problem.findFirst();

    if (!problem) {
      res.status(400).json({ success: false, message: 'No problem available to start match' });
      return;
    }

    const roomCode = `ARENA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const match = await prisma.match.create({
      data: {
        code: roomCode,
        player1Id: user.id,
        problemId: problem.id,
        status: 'WAITING',
        durationSeconds: durationSeconds || 900,
      },
      include: {
        player1: true,
        problem: true,
      },
    });

    res.status(201).json({ success: true, message: 'Arena room created', data: match });
  } catch (error) {
    next(error);
  }
});

// POST /api/matches/:code/join - Join as Player 2
router.post('/:code/join', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const { username } = req.body;

    const match = await prisma.match.findUnique({ where: { code } });
    if (!match) {
      res.status(404).json({ success: false, message: 'Match not found' });
      return;
    }

    if (match.player2Id) {
      res.status(400).json({ success: false, message: 'Match already has 2 players' });
      return;
    }

    const player2 = await prisma.user.findFirst({
      where: username ? { username } : { NOT: { id: match.player1Id } },
    });

    if (!player2) {
      res.status(400).json({ success: false, message: 'Opponent player not found' });
      return;
    }

    const updatedMatch = await prisma.match.update({
      where: { code },
      data: {
        player2Id: player2.id,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
      include: {
        player1: true,
        player2: true,
        problem: true,
      },
    });

    res.status(200).json({ success: true, message: 'Player joined match', data: updatedMatch });
  } catch (error) {
    next(error);
  }
});

// POST /api/matches/:code/submit - Submit code and evaluate test cases
router.post('/:code/submit', rateLimiter(10), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const { username, codeContent, language = 'javascript' } = req.body;

    const match = await prisma.match.findUnique({
      where: { code },
      include: {
        problem: true,
        player1: true,
        player2: true,
      },
    });

    if (!match) {
      res.status(404).json({ success: false, message: 'Match not found' });
      return;
    }

    if (!username) {
      res.status(400).json({ success: false, message: 'username is required for submission' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Only participants can submit
    const isParticipant = user.id === match.player1Id || user.id === match.player2Id;
    if (!isParticipant) {
      res.status(403).json({ success: false, message: 'You are not a participant in this match' });
      return;
    }

    // Cannot submit to a match that hasn't started yet
    if (match.status === 'WAITING') {
      res.status(400).json({ success: false, message: 'Match has not started yet — waiting for opponent' });
      return;
    }

    // Cannot submit to a completed match
    if (match.status === 'COMPLETED') {
      res.status(400).json({ success: false, message: 'Match is already completed' });
      return;
    }

    if (!codeContent || typeof codeContent !== 'string' || codeContent.trim().length === 0) {
      res.status(400).json({ success: false, message: 'codeContent is required' });
      return;
    }

    let parsedTestCases: TestCase[] = [];
    try {
      parsedTestCases = JSON.parse(match.problem.testCases);
    } catch {
      parsedTestCases = [];
    }

    // Evaluate in safe VM
    const verdict = await evaluateSubmission(codeContent, parsedTestCases, undefined, language);

    // Save submission record
    const submission = await prisma.submission.create({
      data: {
        matchId: match.id,
        userId: user.id,
        problemId: match.problemId,
        language,
        code: codeContent,
        status: verdict.status,
        passedCount: verdict.passedCount,
        totalCount: verdict.totalCount,
        runtimeMs: verdict.runtimeMs,
      },
    });

    // Check if match should be completed
    let updatedMatch = match;
    if (verdict.status === 'ACCEPTED') {
      const isPlayer1 = match.player1Id === user.id;
      const scoreGain = Math.round(100 * (verdict.passedCount / Math.max(verdict.totalCount, 1)));

      // Determine winner and loser players
      const winner = user;
      const loser = isPlayer1
        ? (match.player2 ?? null)
        : (match.player1 ?? null);

      const winnerRating = winner.arenaRating;
      const loserRating = loser ? loser.arenaRating : 1200;

      const { gain: eloGain, loss: eloLoss } = computeElo(winnerRating, loserRating);

      updatedMatch = await prisma.match.update({
        where: { id: match.id },
        data: {
          status: 'COMPLETED',
          winnerId: user.id,
          endedAt: new Date(),
          ...(isPlayer1 ? { player1Score: scoreGain } : { player2Score: scoreGain }),
        },
        include: {
          problem: true,
          player1: true,
          player2: true,
        },
      });

      // Update winner stats with ELO gain
      const newWinnerRating = Math.max(100, winnerRating + eloGain);
      await prisma.user.update({
        where: { id: winner.id },
        data: {
          wins: { increment: 1 },
          streak: { increment: 1 },
          arenaRating: newWinnerRating,
          ratingTier: getRatingTier(newWinnerRating),
        },
      });

      // Update loser stats with ELO loss (min rating 100)
      if (loser) {
        const newLoserRating = Math.max(100, loserRating - eloLoss);
        await prisma.user.update({
          where: { id: loser.id },
          data: {
            losses: { increment: 1 },
            streak: 0,
            arenaRating: newLoserRating,
            ratingTier: getRatingTier(newLoserRating),
          },
        });
      }
    }

    res.status(200).json({
      success: true,
      verdict,
      submission,
      match: updatedMatch,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/matches/:code/draw - Mark match as DRAW (e.g. time ran out)
router.post('/:code/draw', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;

    const match = await prisma.match.findUnique({
      where: { code },
      include: { player1: true, player2: true },
    });

    if (!match) {
      res.status(404).json({ success: false, message: 'Match not found' });
      return;
    }

    if (match.status !== 'IN_PROGRESS') {
      res.status(400).json({ success: false, message: `Cannot declare draw — match is ${match.status}` });
      return;
    }

    // Mark match as DRAW
    const updatedMatch = await prisma.match.update({
      where: { id: match.id },
      data: {
        status: 'DRAW',
        endedAt: new Date(),
      },
      include: { player1: true, player2: true, problem: true },
    });

    // Increment draws for both players — no ELO change
    const updateOps: Promise<any>[] = [
      prisma.user.update({
        where: { id: match.player1Id },
        data: { draws: { increment: 1 } },
      }),
    ];

    if (match.player2Id) {
      updateOps.push(
        prisma.user.update({
          where: { id: match.player2Id },
          data: { draws: { increment: 1 } },
        })
      );
    }

    await Promise.all(updateOps);

    res.status(200).json({ success: true, message: 'Match ended in a draw', data: updatedMatch });
  } catch (error) {
    next(error);
  }
});

export const matchRoutes = router;
