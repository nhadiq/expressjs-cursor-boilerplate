import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'better-auth.session_token',
});

const ErrorResponseSchema = registry.register(
  'ErrorResponse',
  z.object({
    success: z.literal(false),
    error: z.object({
      message: z.string(),
      code: z.string().optional(),
    }),
  }),
);

registry.registerPath({
  method: 'get',
  path: '/health',
  tags: ['Health'],
  summary: 'Liveness probe',
  responses: {
    200: {
      description: 'Service is alive',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ status: z.literal('ok') }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/ready',
  tags: ['Health'],
  summary: 'Readiness probe with database check',
  responses: {
    200: {
      description: 'Service is ready',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              status: z.literal('ready'),
              database: z.string(),
            }),
          }),
        },
      },
    },
    500: {
      description: 'Database unavailable',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/me',
  tags: ['Me'],
  summary: 'Get current user session',
  security: [{ cookieAuth: [] }],
  responses: {
    200: { description: 'Current user' },
    403: {
      description: 'Not authenticated',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/me/organizations',
  tags: ['Me'],
  summary: 'List organizations for current user',
  security: [{ cookieAuth: [] }],
  responses: {
    200: { description: 'User organizations' },
    403: {
      description: 'Not authenticated',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Express Multitenant API',
      version: '1.0.0',
      description:
        'Express 5 multitenant API with Better Auth, Prisma, and organization RBAC.',
    },
    servers: [{ url: '/', description: 'Current server' }],
    security: [{ cookieAuth: [] }],
  });
}
