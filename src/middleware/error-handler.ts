import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '@/lib/api-error.js';
import {
  ForbiddenError,
  NotFoundError,
} from '@/lib/tenant-guard.js';
import { logger } from '@/lib/logger.js';
import { env } from '@/env.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, ...(err.code ? { code: err.code } : {}) },
    });
    return;
  }

  if (err instanceof ForbiddenError) {
    res.status(403).json({
      success: false,
      error: { message: err.message, code: 'FORBIDDEN' },
    });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({
      success: false,
      error: { message: err.message, code: 'NOT_FOUND' },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: { message: 'Validation failed', code: 'VALIDATION_ERROR' },
    });
    return;
  }

  logger.error(
    {
      err,
      requestId: req.requestId,
      path: req.path,
      method: req.method,
    },
    'Unhandled error',
  );

  res.status(500).json({
    success: false,
    error: {
      message:
        env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err instanceof Error
            ? err.message
            : 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
};
