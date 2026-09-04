import { createApp } from '@/app.js';
import { env } from '@/env.js';
import { logger } from '@/lib/logger.js';
import { prisma } from '@/lib/db.js';

const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Server listening');
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down gracefully');

  server.close(async () => {
    try {
      await prisma.$disconnect();
      logger.info('Database disconnected');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Error during shutdown');
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
