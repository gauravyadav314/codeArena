import { app } from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`[CodeArena API] Server listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
  console.log(`[CodeArena API] Health check available at http://localhost:${env.PORT}/api/health`);
});

const gracefulShutdown = (signal: string) => {
  console.log(`[CodeArena API] Received ${signal}. Starting graceful shutdown...`);
  server.close((err) => {
    if (err) {
      console.error('[CodeArena API] Error closing server:', err);
      process.exit(1);
    }
    console.log('[CodeArena API] HTTP server closed cleanly.');
    process.exit(0);
  });

  // Force shutdown after 10 seconds timeout
  setTimeout(() => {
    console.error('[CodeArena API] Forceful shutdown initiated due to timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('[CodeArena API] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[CodeArena API] Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

export default server;
