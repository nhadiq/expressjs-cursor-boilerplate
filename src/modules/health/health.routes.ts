import { Router } from 'express';
import { asyncHandler } from '@/lib/async-handler.js';
import { success } from '@/lib/service-response.js';
import { prisma } from '@/lib/db.js';

export const healthRouter = Router();

healthRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    res.json(success({ status: 'ok' }));
  }),
);

healthRouter.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json(success({ status: 'ready', database: 'connected' }));
  }),
);
