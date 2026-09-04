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

// ---------------------------------------------------------------------------
// Shared schemas
// ---------------------------------------------------------------------------

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

const UserSummarySchema = registry.register(
  'UserSummary',
  z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    image: z.string().nullable().optional(),
  }),
);

const OrganizationSchema = registry.register(
  'Organization',
  z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    logo: z.string().nullable().optional(),
    createdAt: z.coerce.date(),
    metadata: z.string().nullable().optional(),
  }),
);

const UserOrganizationSchema = registry.register(
  'UserOrganization',
  OrganizationSchema.extend({
    role: z.string(),
  }),
);

const MemberSchema = registry.register(
  'Member',
  z.object({
    id: z.string(),
    organizationId: z.string(),
    userId: z.string(),
    role: z.string(),
    createdAt: z.coerce.date(),
    user: UserSummarySchema.optional(),
  }),
);

const InvitationSchema = registry.register(
  'Invitation',
  z.object({
    id: z.string(),
    organizationId: z.string(),
    email: z.string().email(),
    role: z.string().nullable(),
    status: z.string(),
    expiresAt: z.coerce.date(),
    inviterId: z.string(),
  }),
);

const PaginationMetaSchema = registry.register(
  'PaginationMeta',
  z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
);

const CreateOrgBodySchema = registry.register(
  'CreateOrgBody',
  z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(48),
  }),
);

const UpdateOrgBodySchema = registry.register(
  'UpdateOrgBody',
  z.object({
    name: z.string().min(1).max(100).optional(),
    slug: z.string().min(1).max(48).optional(),
    logo: z.string().url().nullable().optional(),
  }),
);

const SwitchOrgBodySchema = registry.register(
  'SwitchOrgBody',
  z.object({
    organizationId: z.string().min(1),
  }),
);

const UpdateMemberRoleBodySchema = registry.register(
  'UpdateMemberRoleBody',
  z.object({
    role: z.enum(['owner', 'admin', 'member']),
  }),
);

const CreateInvitationBodySchema = registry.register(
  'CreateInvitationBody',
  z.object({
    email: z.string().email(),
    role: z.enum(['admin', 'member']).default('member'),
  }),
);

const OrgIdParamsSchema = z.object({
  orgId: z.string().openapi({ param: { name: 'orgId', in: 'path' } }),
});

const MemberIdParamsSchema = OrgIdParamsSchema.extend({
  memberId: z.string().openapi({ param: { name: 'memberId', in: 'path' } }),
});

const InvitationIdParamsSchema = OrgIdParamsSchema.extend({
  invitationId: z
    .string()
    .openapi({ param: { name: 'invitationId', in: 'path' } }),
});

const SlugParamsSchema = z.object({
  slug: z.string().openapi({ param: { name: 'slug', in: 'path' } }),
});

const PaginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .openapi({ param: { name: 'page', in: 'query' } }),
  limit: z
    .string()
    .optional()
    .openapi({ param: { name: 'limit', in: 'query' } }),
});

const forbiddenResponse = {
  description: 'Not authenticated or insufficient permissions',
  content: { 'application/json': { schema: ErrorResponseSchema } },
};

const notFoundResponse = {
  description: 'Resource not found',
  content: { 'application/json': { schema: ErrorResponseSchema } },
};

const validationErrorResponse = {
  description: 'Validation failed',
  content: { 'application/json': { schema: ErrorResponseSchema } },
};

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Me
// ---------------------------------------------------------------------------

registry.registerPath({
  method: 'get',
  path: '/api/v1/me',
  tags: ['Me'],
  summary: 'Get current user session',
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: 'Current user and session',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              user: UserSummarySchema.extend({
                emailVerified: z.boolean().optional(),
                createdAt: z.coerce.date().optional(),
                updatedAt: z.coerce.date().optional(),
              }),
              session: z.object({
                id: z.string(),
                activeOrganizationId: z.string().nullable(),
                expiresAt: z.coerce.date(),
              }),
            }),
          }),
        },
      },
    },
    403: forbiddenResponse,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/me/organizations',
  tags: ['Me'],
  summary: 'List organizations for current user',
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: 'Organizations the user belongs to',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(UserOrganizationSchema),
          }),
        },
      },
    },
    403: forbiddenResponse,
  },
});

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

registry.registerPath({
  method: 'get',
  path: '/api/v1/organizations/slug/{slug}/available',
  tags: ['Organizations'],
  summary: 'Check organization slug availability',
  security: [{ cookieAuth: [] }],
  request: { params: SlugParamsSchema },
  responses: {
    200: {
      description: 'Slug availability result',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              available: z.boolean(),
              reason: z.literal('invalid_slug').optional(),
            }),
          }),
        },
      },
    },
    403: forbiddenResponse,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/organizations/switch',
  tags: ['Organizations'],
  summary: 'Switch active organization',
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: SwitchOrgBodySchema } },
    },
  },
  responses: {
    200: {
      description: 'Active organization updated',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              activeOrganizationId: z.string(),
              organization: OrganizationSchema.nullable(),
            }),
          }),
        },
      },
    },
    400: validationErrorResponse,
    403: forbiddenResponse,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/organizations/{orgId}',
  tags: ['Organizations'],
  summary: 'Get organization by ID',
  security: [{ cookieAuth: [] }],
  request: { params: OrgIdParamsSchema },
  responses: {
    200: {
      description: 'Organization with members',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: OrganizationSchema.extend({
              members: z.array(MemberSchema),
            }),
          }),
        },
      },
    },
    403: forbiddenResponse,
    404: notFoundResponse,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/organizations',
  tags: ['Organizations'],
  summary: 'Create organization',
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: CreateOrgBodySchema } },
    },
  },
  responses: {
    201: {
      description: 'Organization created',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: OrganizationSchema,
          }),
        },
      },
    },
    400: validationErrorResponse,
    403: forbiddenResponse,
    409: {
      description: 'Slug already taken',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/organizations/{orgId}',
  tags: ['Organizations'],
  summary: 'Update organization',
  description: 'Requires `organization:update` permission.',
  security: [{ cookieAuth: [] }],
  request: {
    params: OrgIdParamsSchema,
    body: {
      content: { 'application/json': { schema: UpdateOrgBodySchema } },
    },
  },
  responses: {
    200: {
      description: 'Organization updated',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: OrganizationSchema,
          }),
        },
      },
    },
    400: validationErrorResponse,
    403: forbiddenResponse,
    409: {
      description: 'Slug already taken',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/organizations/{orgId}',
  tags: ['Organizations'],
  summary: 'Delete organization',
  description: 'Requires `organization:delete` permission.',
  security: [{ cookieAuth: [] }],
  request: { params: OrgIdParamsSchema },
  responses: {
    200: {
      description: 'Organization deleted',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ deleted: z.literal(true) }),
          }),
        },
      },
    },
    403: forbiddenResponse,
    404: notFoundResponse,
  },
});

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

registry.registerPath({
  method: 'get',
  path: '/api/v1/organizations/{orgId}/members',
  tags: ['Members'],
  summary: 'List organization members',
  security: [{ cookieAuth: [] }],
  request: {
    params: OrgIdParamsSchema,
    query: PaginationQuerySchema,
  },
  responses: {
    200: {
      description: 'Paginated member list',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(MemberSchema),
            meta: z.object({
              pagination: PaginationMetaSchema,
            }),
          }),
        },
      },
    },
    403: forbiddenResponse,
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/v1/organizations/{orgId}/members/{memberId}',
  tags: ['Members'],
  summary: 'Update member role',
  description: 'Requires `member:update` permission.',
  security: [{ cookieAuth: [] }],
  request: {
    params: MemberIdParamsSchema,
    body: {
      content: {
        'application/json': { schema: UpdateMemberRoleBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Member role updated',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: MemberSchema,
          }),
        },
      },
    },
    400: validationErrorResponse,
    403: forbiddenResponse,
    404: notFoundResponse,
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/organizations/{orgId}/members/{memberId}',
  tags: ['Members'],
  summary: 'Remove organization member',
  description: 'Requires `member:delete` permission.',
  security: [{ cookieAuth: [] }],
  request: { params: MemberIdParamsSchema },
  responses: {
    200: {
      description: 'Member removed',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ deleted: z.literal(true) }),
          }),
        },
      },
    },
    400: validationErrorResponse,
    403: forbiddenResponse,
    404: notFoundResponse,
  },
});

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

registry.registerPath({
  method: 'get',
  path: '/api/v1/organizations/{orgId}/invitations',
  tags: ['Invitations'],
  summary: 'List pending invitations',
  security: [{ cookieAuth: [] }],
  request: { params: OrgIdParamsSchema },
  responses: {
    200: {
      description: 'Pending invitations',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(InvitationSchema),
          }),
        },
      },
    },
    403: forbiddenResponse,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/organizations/{orgId}/invitations',
  tags: ['Invitations'],
  summary: 'Create invitation',
  description: 'Requires `invitation:create` permission.',
  security: [{ cookieAuth: [] }],
  request: {
    params: OrgIdParamsSchema,
    body: {
      content: {
        'application/json': { schema: CreateInvitationBodySchema },
      },
    },
  },
  responses: {
    201: {
      description: 'Invitation created',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: InvitationSchema,
          }),
        },
      },
    },
    400: validationErrorResponse,
    403: forbiddenResponse,
    409: {
      description: 'User already a member or invitation pending',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/organizations/{orgId}/invitations/{invitationId}',
  tags: ['Invitations'],
  summary: 'Cancel invitation',
  description: 'Requires `invitation:cancel` permission.',
  security: [{ cookieAuth: [] }],
  request: { params: InvitationIdParamsSchema },
  responses: {
    200: {
      description: 'Invitation cancelled',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({ cancelled: z.literal(true) }),
          }),
        },
      },
    },
    403: forbiddenResponse,
    404: notFoundResponse,
  },
});

// ---------------------------------------------------------------------------
// Auth (Better Auth reference — not implemented in this REST layer)
// ---------------------------------------------------------------------------

registry.registerPath({
  method: 'post',
  path: '/api/auth/sign-up/email',
  tags: ['Auth'],
  summary: 'Sign up with email and password (Better Auth)',
  description:
    'Handled by Better Auth (`toNodeHandler`). See https://better-auth.com/docs for full auth API.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            email: z.string().email(),
            password: z.string().min(8),
            name: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: 'User created and session cookie set' },
    400: validationErrorResponse,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/sign-in/email',
  tags: ['Auth'],
  summary: 'Sign in with email and password (Better Auth)',
  description:
    'Handled by Better Auth (`toNodeHandler`). See https://better-auth.com/docs for full auth API.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            email: z.string().email(),
            password: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: 'Session cookie set' },
    400: validationErrorResponse,
    403: forbiddenResponse,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/sign-out',
  tags: ['Auth'],
  summary: 'Sign out (Better Auth)',
  description:
    'Handled by Better Auth (`toNodeHandler`). Clears session cookie.',
  security: [{ cookieAuth: [] }],
  responses: {
    200: { description: 'Session cleared' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/auth/get-session',
  tags: ['Auth'],
  summary: 'Get current session (Better Auth)',
  description:
    'Handled by Better Auth (`toNodeHandler`). Prefer `/api/v1/me` for the REST envelope.',
  security: [{ cookieAuth: [] }],
  responses: {
    200: { description: 'Current session or null' },
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
        'Express 5 multitenant API with Better Auth, Prisma, and organization RBAC. Business REST endpoints are under `/api/v1/*`. Authentication is handled by Better Auth at `/api/auth/*` (reference paths included; see Better Auth docs for the full surface).',
    },
    servers: [{ url: '/', description: 'Current server' }],
    security: [{ cookieAuth: [] }],
  });
}
