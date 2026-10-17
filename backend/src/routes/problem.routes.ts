import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { evaluateSubmission, TestCase } from '../services/judge.service';

const router = Router();

// GET /api/problems - List all problems
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { difficulty, category, search } = req.query;

    const whereClause: any = {};
    if (difficulty && typeof difficulty === 'string' && difficulty !== 'All') {
      whereClause.difficulty = difficulty;
    }
    if (category && typeof category === 'string' && category !== 'All') {
      whereClause.category = category;
    }
    if (search && typeof search === 'string') {
      whereClause.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const problems = await prisma.problem.findMany({
      where: whereClause,
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
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json({ success: true, count: problems.length, data: problems });
  } catch (error) {
    next(error);
  }
});

// GET /api/problems/:slug - Detailed problem with starter code & test cases
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const problem = await prisma.problem.findUnique({
      where: { slug },
      include: {
        submissions: {
          take: 5,
          orderBy: { submittedAt: 'desc' },
          include: {
            user: {
              select: { username: true, arenaRating: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!problem) {
      res.status(404).json({ success: false, message: `Problem '${slug}' not found` });
      return;
    }

    res.status(200).json({ success: true, data: problem });
  } catch (error) {
    next(error);
  }
});

// POST /api/problems/:slug/run - Run code against problem test cases
router.post('/:slug/run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ success: false, message: 'Code content is required' });
      return;
    }

    const problem = await prisma.problem.findUnique({
      where: { slug },
    });

    if (!problem) {
      res.status(404).json({ success: false, message: `Problem '${slug}' not found` });
      return;
    }

    let parsedTestCases: TestCase[] = [];
    try {
      parsedTestCases = JSON.parse(problem.testCases);
    } catch {
      parsedTestCases = [];
    }

    const verdict = evaluateSubmission(code, parsedTestCases);
    res.status(200).json({ success: true, verdict });
  } catch (error) {
    next(error);
  }
});

export const problemRoutes = router;

