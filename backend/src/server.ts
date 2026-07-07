import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { initAdminAuth } from './services/admin-auth.service.js';
import { ensureImagesDir } from './services/image-storage.service.js';
import { startUserCleanupWorker, stopUserCleanupWorker } from './workers/user-cleanup.worker.js';

export { logger, prisma };

async function main() {
  await initAdminAuth();
  await ensureImagesDir();
  startUserCleanupWorker();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`RecipeVault backend listening on port ${env.PORT}`);
  });

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    stopUserCleanupWorker();
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => {
    stopUserCleanupWorker();
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
