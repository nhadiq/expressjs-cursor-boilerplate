import { z } from 'zod';
import { Router } from 'express';
import { asyncHandler } from '@/lib/async-handler.js';
import { ApiError } from '@/lib/api-error.js';
import { success } from '@/lib/service-response.js';
import { prisma } from '@/lib/db.js';
import { assertOrgMember } from '@/lib/tenant-guard.js';
import { isValidOrgSlug, param } from '@/lib/utils.js';
import { requireSession } from '@/middleware/require-session.js';
import { requireOrgPermissionMiddleware } from '@/middleware/require-org-permission.js';
import { validate } from '@/middleware/validate.js';

const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(48),
});

const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(48).optional(),
  logo: z.string().url().nullable().optional(),
});

const switchOrgSchema = z.object({
  organizationId: z.string().min(1),
});

export const orgRouter = Router();

orgRouter.use(requireSession);

orgRouter.get(
  '/slug/:slug/available',
  asyncHandler(async (req, res) => {
    const slug = param(req.params.slug);

    if (!isValidOrgSlug(slug)) {
      res.json(success({ available: false, reason: 'invalid_slug' }));
      return;
    }

    const existing = await prisma.organization.findUnique({ where: { slug } });
    res.json(success({ available: !existing }));
  }),
);

orgRouter.post(
  '/switch',
  validate(switchOrgSchema),
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const { organizationId } = req.body as z.infer<typeof switchOrgSchema>;

    await assertOrgMember(session.user.id, organizationId);

    await prisma.session.update({
      where: { id: session.session.id },
      data: { activeOrganizationId: organizationId },
    });

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    res.json(
      success({
        activeOrganizationId: organizationId,
        organization,
      }),
    );
  }),
);

orgRouter.get(
  '/:orgId',
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const orgId = param(req.params.orgId);

    await assertOrgMember(session.user.id, orgId);

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });

    if (!organization) {
      throw new ApiError(404, 'Organization not found', 'NOT_FOUND');
    }

    res.json(success(organization));
  }),
);

orgRouter.post(
  '/',
  validate(createOrgSchema),
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const { name, slug } = req.body as z.infer<typeof createOrgSchema>;

    if (!isValidOrgSlug(slug)) {
      throw new ApiError(400, 'Invalid organization slug', 'INVALID_SLUG');
    }

    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (existing) {
      throw new ApiError(409, 'Slug already taken', 'SLUG_TAKEN');
    }

    const organization = await prisma.organization.create({
      data: {
        id: crypto.randomUUID(),
        name,
        slug,
        createdAt: new Date(),
      },
    });

    await prisma.member.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: organization.id,
        userId: session.user.id,
        role: 'owner',
        createdAt: new Date(),
      },
    });

    if (session.session.id) {
      await prisma.session.update({
        where: { id: session.session.id },
        data: { activeOrganizationId: organization.id },
      });
    }

    res.status(201).json(success(organization));
  }),
);

orgRouter.patch(
  '/:orgId',
  requireOrgPermissionMiddleware('organization:update'),
  validate(updateOrgSchema),
  asyncHandler(async (req, res) => {
    const orgId = param(req.params.orgId);
    const body = req.body as z.infer<typeof updateOrgSchema>;

    if (body.slug && !isValidOrgSlug(body.slug)) {
      throw new ApiError(400, 'Invalid organization slug', 'INVALID_SLUG');
    }

    if (body.slug) {
      const existing = await prisma.organization.findFirst({
        where: { slug: body.slug, NOT: { id: orgId } },
      });
      if (existing) {
        throw new ApiError(409, 'Slug already taken', 'SLUG_TAKEN');
      }
    }

    const organization = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.slug !== undefined ? { slug: body.slug } : {}),
        ...(body.logo !== undefined ? { logo: body.logo } : {}),
      },
    });

    res.json(success(organization));
  }),
);

orgRouter.delete(
  '/:orgId',
  requireOrgPermissionMiddleware('organization:delete'),
  asyncHandler(async (req, res) => {
    const orgId = param(req.params.orgId);

    await prisma.organization.delete({ where: { id: orgId } });
    res.json(success({ deleted: true }));
  }),
);
