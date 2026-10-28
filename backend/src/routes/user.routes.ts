import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { calculateCompositeScore, getRatingTier } from '../services/rating.service';

const router = Router();

// GET /api/users - Leaderboard ranking
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        profile: true,
      },
      orderBy: {
        arenaRating: 'desc',
      },
      take: 50,
    });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:username - User profile details with multi-platform stats
router.get('/:username', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username } = req.params;
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        profile: true,
        submissions: {
          include: {
            problem: true,
          },
          orderBy: { submittedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: `User '${username}' not found` });
      return;
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// POST /api/users/sync-profile - Update platform handles and recompute composite rating
router.post('/sync-profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      username,
      leetcodeUsername,
      codeforcesHandle,
      codechefHandle,
      leetcodeRating,
      leetcodeSolved,
      codeforcesRating,
      codechefRating,
    } = req.body;

    if (!username) {
      res.status(400).json({ success: false, message: 'username is required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { profile: true },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const lcRating = leetcodeRating ?? user.profile?.leetcodeRating ?? 1800;
    const cfRating = codeforcesRating ?? user.profile?.codeforcesRating ?? 1600;
    const ccRating = codechefRating ?? user.profile?.codechefRating ?? 1700;

    const composite = calculateCompositeScore(lcRating, cfRating, ccRating);
    const tier = getRatingTier(composite);

    // Update user and profile in a transaction
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        arenaRating: composite,
        ratingTier: tier,
        profile: {
          upsert: {
            create: {
              leetcodeUsername: leetcodeUsername ?? user.profile?.leetcodeUsername,
              leetcodeRating: lcRating,
              leetcodeSolved: leetcodeSolved ?? user.profile?.leetcodeSolved ?? 250,
              codeforcesHandle: codeforcesHandle ?? user.profile?.codeforcesHandle,
              codeforcesRating: cfRating,
              codechefHandle: codechefHandle ?? user.profile?.codechefHandle,
              codechefRating: ccRating,
              compositeScore: composite,
              lastSyncedAt: new Date(),
            },
            update: {
              leetcodeUsername: leetcodeUsername ?? user.profile?.leetcodeUsername,
              leetcodeRating: lcRating,
              leetcodeSolved: leetcodeSolved ?? user.profile?.leetcodeSolved,
              codeforcesHandle: codeforcesHandle ?? user.profile?.codeforcesHandle,
              codeforcesRating: cfRating,
              codechefHandle: codechefHandle ?? user.profile?.codechefHandle,
              codechefRating: ccRating,
              compositeScore: composite,
              lastSyncedAt: new Date(),
            },
          },
        },
      },
      include: {
        profile: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Profile and composite ratings synchronized successfully',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
});

export const userRoutes = router;
