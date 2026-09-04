import type { RequestHandler } from 'express';
import { getServerSession } from '@/lib/auth-server.js';
import { ForbiddenError } from '@/lib/tenant-guard.js';

export const requireSession: RequestHandler = async (req, _res, next) => {
  try {
    const session = await getServerSession(req);
    req.session = session;

    if (!session?.user) {
      throw new ForbiddenError('Authentication required');
    }

    next();
  } catch (error) {
    next(error);
  }
};
