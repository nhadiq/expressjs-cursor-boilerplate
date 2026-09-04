import type { RequestHandler } from 'express';
import {
  getRetryAfterSeconds,
  rateLimitAuth,
} from '@/lib/rate-limit.js';

export const authRateLimit: RequestHandler = async (req, res, next) => {
  if (process.env.NODE_ENV === 'test') {
    next();
    return;
  }

  const identifier =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
    req.ip ??
    'unknown';

  const result = await rateLimitAuth(identifier);

  res.setHeader('X-RateLimit-Limit', String(result.limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  res.setHeader('X-RateLimit-Reset', String(result.reset));

  if (!result.success) {
    res.setHeader('Retry-After', String(getRetryAfterSeconds(result.reset)));
    res.status(429).json({
      success: false,
      error: { message: 'Too many requests', code: 'RATE_LIMITED' },
    });
    return;
  }

  next();
};
