import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { problemRoutes } from './problem.routes';
import { matchRoutes } from './match.routes';

const router = Router();

// Mount all core feature routers
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/problems', problemRoutes);
router.use('/matches', matchRoutes);

export const apiRouter = router;
