import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import hpp from 'hpp';
import { pinoHttp } from 'pino-http';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '@/lib/auth.js';
import { env } from '@/env.js';
import { logger } from '@/lib/logger.js';
import { requestId } from '@/middleware/request-id.js';
import { authRateLimit } from '@/middleware/auth-rate-limit.js';
import { errorHandler } from '@/middleware/error-handler.js';
import { notFound } from '@/middleware/not-found.js';
import { apiRouter } from '@/routes/index.js';
import { docsRouter } from '@/api-docs/docs.routes.js';
import { healthRouter } from '@/modules/health/health.routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  app.use(compression());
  app.use(
    cors({
      origin: [env.CLIENT_URL, env.BETTER_AUTH_URL],
      credentials: true,
    }),
  );
  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req: express.Request) => req.requestId ?? 'unknown',
    }),
  );

  app.use('/api/auth', authRateLimit);
  app.all('/api/auth/*splat', toNodeHandler(auth));

  app.use(express.json({ limit: '1mb' }));
  app.use(hpp());

  app.use(healthRouter);
  app.use('/api/v1/docs', docsRouter);
  app.use('/api/v1', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
