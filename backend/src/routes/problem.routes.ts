import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { evaluateSubmission, TestCase } from '../services/judge.service';
import { rateLimiter } from '../middlewares/rateLimit';
import { validateRequest } from '../middlewares/validate';
import {
  problemSlugParamSchema,
  runProblemCodeSchema,
  submitProblemCodeSchema,
} from '../validators/problem.validator';
import { optionalAuth } from '../middlewares/auth';
import { NotFoundError } from '../errors/AppError';

const router = Router();

// Helper: Filter out hidden test cases to prevent problem answer leaks
function sanitizeProblemForPublic(problem: any) {
  let publicCases: any[] = [];
  try {
    const parsed = JSON.parse(problem.testCases);
    // Only return the first 2 sample cases publicly; remaining cases are hidden judge cases
    publicCases = Array.isArray(parsed) ? parsed.slice(0, 2) : [];
  } catch {
    publicCases = [];
  }

  return {
    ...problem,
    testCases: JSON.stringify(publicCases),
  };
}

// GET /api/problems - List all problems
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const problems = await prisma.problem.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        category: true,
        acceptanceRate: true,
        timeLimitMs: true,
        memoryLimitMb: true,
        createdAt: true,
      },
      orderBy: { title: 'asc' },
    });

    res.status(200).json({ success: true, count: problems.length, data: problems });
  } catch (error) {
    next(error);
  }
});

// GET /api/problems/:slug - Get single problem details (sanitizes hidden test cases)
router.get(
  '/:slug',
  validateRequest({ params: problemSlugParamSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const problem = await prisma.problem.findUnique({
        where: { slug },
      });

      if (!problem) {
        throw new NotFoundError(`Problem '${slug}' not found`);
      }

      res.status(200).json({ success: true, data: sanitizeProblemForPublic(problem) });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/problems/:slug/run - Run code against sample test cases (Dry Run)
router.post(
  '/:slug/run',
  rateLimiter,
  validateRequest({ params: problemSlugParamSchema, body: runProblemCodeSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const { code, language, testCases } = req.body;

      const problem = await prisma.problem.findUnique({ where: { slug } });
      if (!problem) throw new NotFoundError(`Problem '${slug}' not found`);

      let parsedCases: TestCase[] = [];
      if (testCases && Array.isArray(testCases) && testCases.length > 0) {
        parsedCases = testCases;
      } else {
        try {
          const allCases = JSON.parse(problem.testCases);
          parsedCases = allCases.slice(0, 2); // Dry run runs on sample test cases
        } catch {
          parsedCases = [];
        }
      }

      const verdict = await evaluateSubmission(code, parsedCases, undefined, language);
      res.status(200).json({ success: true, data: verdict });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/problems/:slug/submit - Practice / Solo submission against full test suite
router.post(
  '/:slug/submit',
  rateLimiter,
  optionalAuth,
  validateRequest({ params: problemSlugParamSchema, body: submitProblemCodeSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const { code, language, username } = req.body;
      const effectiveUsername = req.user?.username || username || 'anonymous';

      const problem = await prisma.problem.findUnique({ where: { slug } });
      if (!problem) throw new NotFoundError(`Problem '${slug}' not found`);

      let fullTestCases: TestCase[] = [];
      try {
        fullTestCases = JSON.parse(problem.testCases);
      } catch {
        fullTestCases = [];
      }

      // Evaluate against all test cases including hidden ones
      const verdict = await evaluateSubmission(code, fullTestCases, undefined, language);

      // Record submission if user exists
      const user = await prisma.user.findUnique({ where: { username: effectiveUsername } });
      let submissionRecord = null;

      if (user) {
        submissionRecord = await prisma.submission.create({
          data: {
            problemId: problem.id,
            userId: user.id,
            language,
            code,
            status: verdict.status,
            passedCount: verdict.passedCount,
            totalCount: verdict.totalCount,
            runtimeMs: verdict.runtimeMs,
          },
        });
      }

      res.status(200).json({
        success: true,
        message: verdict.status === 'ACCEPTED' ? 'Solution Accepted!' : 'Submission did not pass all test cases',
        data: {
          verdict,
          submission: submissionRecord,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export const problemRoutes = router;
