import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';
import { ApiError } from '@/lib/api-error.js';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate<T extends ZodSchema>(
  schema: T,
  target: ValidationTarget = 'body',
): RequestHandler {
  return (req, _res, next) => {
    try {
      const parsed = schema.parse(req[target]);
      req[target] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new ApiError(400, 'Validation failed', 'VALIDATION_ERROR'),
        );
        return;
      }
      next(error);
    }
  };
}
