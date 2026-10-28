import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { calculateCompositeScore, getRatingTier } from '../services/rating.service';
import { validateRequest } from '../middlewares/validate';
import { syncProfileSchema, usernameParamSchema } from '../validators/user.validator';
import { registerSchema } from '../validators/auth.validator';
import { register } from '../services/auth.service';
import { syncAllPlatformStats } from '../services/externalProfile.service';
import { NotFoundError } from '../errors/AppError';
import { optionalAuth, requireOwnership } from '../middlewares/auth';

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
router.get(
  '/:username',
  validateRequest({ params: usernameParamSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
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
          ratingHistories: {
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
        },
      });

      if (!user) {
        throw new NotFoundError(`User '${username}' not found`);
      }

      const { passwordHash: _, refreshTokenHash: __, ...safeUser } = user;
      res.status(200).json({ success: true, data: safeUser });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/users/sync-profile - Update platform handles and recompute composite rating
router.post(
  '/sync-profile',
  optionalAuth,
  validateRequest({ body: syncProfileSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
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

      const user = await prisma.user.findUnique({
        where: { username },
        include: { profile: true },
      });

      if (!user) {
        throw new NotFoundError(`User '${username}' not found`);
      }

      // Automatically fetch latest stats from external platforms with caching & retries
      const effectiveLcHandle = leetcodeUsername ?? user.profile?.leetcodeUsername;
      const effectiveCfHandle = codeforcesHandle ?? user.profile?.codeforcesHandle;
      const effectiveCcHandle = codechefHandle ?? user.profile?.codechefHandle;

      const externalStats = await syncAllPlatformStats({
        leetcodeUsername: effectiveLcHandle,
        codeforcesHandle: effectiveCfHandle,
        codechefHandle: effectiveCcHandle,
      });

      const lcRating = leetcodeRating ?? externalStats.leetcodeRating ?? user.profile?.leetcodeRating ?? 1800;
      const lcSolved = leetcodeSolved ?? externalStats.leetcodeSolved ?? user.profile?.leetcodeSolved ?? 250;
      const cfRating = codeforcesRating ?? externalStats.codeforcesRating ?? user.profile?.codeforcesRating ?? 1600;
      const cfMaxRating = externalStats.codeforcesMaxRating ?? user.profile?.codeforcesMaxRating ?? cfRating;
      const cfRank = externalStats.codeforcesRank ?? user.profile?.codeforcesRank ?? 'Expert';
      const ccRating = codechefRating ?? externalStats.codechefRating ?? user.profile?.codechefRating ?? 1700;
      const ccStars = externalStats.codechefStars ?? user.profile?.codechefStars ?? '3★';

      const composite = calculateCompositeScore(lcRating, cfRating, ccRating);
      const tier = getRatingTier(composite);

      // Record rating history if composite changed
      const oldRating = user.arenaRating;
      const ratingDelta = composite - oldRating;

      const updatedUser = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({
          where: { id: user.id },
          data: {
            arenaRating: composite,
            ratingTier: tier,
            profile: {
              upsert: {
                create: {
                  leetcodeUsername: effectiveLcHandle,
                  leetcodeRating: lcRating,
                  leetcodeSolved: lcSolved,
                  codeforcesHandle: effectiveCfHandle,
                  codeforcesRating: cfRating,
                  codeforcesMaxRating: cfMaxRating,
                  codeforcesRank: cfRank,
                  codechefHandle: effectiveCcHandle,
                  codechefRating: ccRating,
                  codechefStars: ccStars,
                  compositeScore: composite,
                  lastSyncedAt: new Date(),
                },
                update: {
                  leetcodeUsername: effectiveLcHandle,
                  leetcodeRating: lcRating,
                  leetcodeSolved: lcSolved,
                  codeforcesHandle: effectiveCfHandle,
                  codeforcesRating: cfRating,
                  codeforcesMaxRating: cfMaxRating,
                  codeforcesRank: cfRank,
                  codechefHandle: effectiveCcHandle,
                  codechefRating: ccRating,
                  codechefStars: ccStars,
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

        if (ratingDelta !== 0) {
          await tx.ratingHistory.create({
            data: {
              userId: user.id,
              ratingBefore: oldRating,
              ratingAfter: composite,
              change: ratingDelta,
              reason: 'PROFILE_SYNC',
            },
          });
        }

        return u;
      });

      const { passwordHash: _, refreshTokenHash: __, ...safeUser } = updatedUser;

      res.status(200).json({
        success: true,
        message: 'Profile and composite ratings synchronized successfully',
        data: safeUser,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/users/register - Register a new user (delegates to auth.service)
router.post(
  '/register',
  validateRequest({ body: registerSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = await register(req.body);
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

export const userRoutes = router;
