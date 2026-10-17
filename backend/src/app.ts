import express, { Application } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { apiRouter } from './routes';
import { healthRoutes } from './routes/health.routes';
import { notFoundHandler } from './middlewares/notFoundHandler';
import { errorHandler } from './middlewares/errorHandler';

export const createApp = (): Application => {
  const app = express();

  // Basic security and parsing middleware
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Root health check & API router
  app.use('/health', healthRoutes);
  app.use('/api', apiRouter);

  // 404 Not Found Middleware
  app.use(notFoundHandler);

  // Global Error Handler Middleware
  app.use(errorHandler);

  return app;
};

export const app = createApp();
