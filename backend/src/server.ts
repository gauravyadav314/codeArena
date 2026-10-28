import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { initSocketServer } from './socket';
import { initJudgeQueue } from './services/judgeQueue.service';
import { prisma } from './config/prisma';

const server = http.createServer(app);

// Attach Socket.IO real-time websockets server
const io = initSocketServer(server);

// Initialize Judge Queue (BullMQ if Redis available, otherwise in-memory fallback)
initJudgeQueue();

server.listen(env.PORT, () => {
  logger.info(`[CodeArena API] Server listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
  logger.info(`[CodeArena API] Health check available at http://localhost:${env.PORT}/api/health`);
  logger.info(`[CodeArena API] WebSockets ready for real-time 1v1 duels`);
});

const gracefulShutdown = (signal: string) => {
  logger.info(`[CodeArena API] Received ${signal}. Starting graceful shutdown...`);

  // Close HTTP and Socket connections
  server.close(async (err) => {
    if (err) {
      logger.error({ err }, '[CodeArena API] Error closing server');
      process.exit(1);
    }

    try {
      if (io) {
        await io.close();
      }
      await prisma.$disconnect();
      logger.info('[CodeArena API] HTTP and Prisma connections closed cleanly.');
      process.exit(0);
    } catch (cleanupErr) {
      logger.error({ cleanupErr }, '[CodeArena API] Error during resource cleanup');
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds timeout
  setTimeout(() => {
    logger.error('[CodeArena API] Forceful shutdown initiated due to timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, '[CodeArena API] Unhandled Rejection');
});

process.on('uncaughtException', (error) => {
  logger.error({ error }, '[CodeArena API] Uncaught Exception');
  gracefulShutdown('uncaughtException');
});

export default server;
