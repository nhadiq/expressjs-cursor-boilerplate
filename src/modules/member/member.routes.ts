import { z } from 'zod';
import { Router } from 'express';
import { asyncHandler } from '@/lib/async-handler.js';
import { ApiError } from '@/lib/api-error.js';
import { success } from '@/lib/service-response.js';
import { prisma } from '@/lib/db.js';
import { assertOrgMember } from '@/lib/tenant-guard.js';
import { isOrgRole } from '@/lib/org-permissions.js';
import { parsePagination, paginationMeta } from '@/lib/pagination.js';
import { requireSession } from '@/middleware/require-session.js';
import { requireOrgPermissionMiddleware } from '@/middleware/require-org-permission.js';
import { validate } from '@/middleware/validate.js';

const updateRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
});

export const memberRouter = Router({ mergeParams: true });

memberRouter.use(requireSession);

memberRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const { orgId } = req.params as { orgId: string };
    const { page, limit, skip } = parsePagination(req.query as { page?: string; limit?: string });

    await assertOrgMember(session.user.id, orgId);

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where: { organizationId: orgId },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.member.count({ where: { organizationId: orgId } }),
    ]);

    res.json(
      success(members, {
        pagination: paginationMeta(page, limit, total),
      }),
    );
  }),
);

memberRouter.patch(
  '/:memberId',
  requireOrgPermissionMiddleware('member:update'),
  validate(updateRoleSchema),
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const { orgId, memberId } = req.params as { orgId: string; memberId: string };
    const { role } = req.body as z.infer<typeof updateRoleSchema>;

    if (!isOrgRole(role)) {
      throw new ApiError(400, 'Invalid role', 'INVALID_ROLE');
    }

    const target = await prisma.member.findFirst({
      where: { id: memberId, organizationId: orgId },
    });

    if (!target) {
      throw new ApiError(404, 'Member not found', 'NOT_FOUND');
    }

    if (target.role === 'owner' && role !== 'owner') {
      const ownerCount = await prisma.member.count({
        where: { organizationId: orgId, role: 'owner' },
      });
      if (ownerCount <= 1) {
        throw new ApiError(400, 'Cannot demote the last owner', 'LAST_OWNER');
      }
    }

    if (target.userId === session.user.id && role !== target.role) {
      throw new ApiError(400, 'Cannot change your own role', 'SELF_ROLE_CHANGE');
    }

    const member = await prisma.member.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    res.json(success(member));
  }),
);

memberRouter.delete(
  '/:memberId',
  requireOrgPermissionMiddleware('member:delete'),
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const { orgId, memberId } = req.params as { orgId: string; memberId: string };

    const target = await prisma.member.findFirst({
      where: { id: memberId, organizationId: orgId },
    });

    if (!target) {
      throw new ApiError(404, 'Member not found', 'NOT_FOUND');
    }

    if (target.userId === session.user.id) {
      throw new ApiError(400, 'Cannot remove yourself', 'SELF_REMOVE');
    }

    if (target.role === 'owner') {
      const ownerCount = await prisma.member.count({
        where: { organizationId: orgId, role: 'owner' },
      });
      if (ownerCount <= 1) {
        throw new ApiError(400, 'Cannot remove the last owner', 'LAST_OWNER');
      }
    }

    await prisma.member.delete({ where: { id: memberId } });
    res.json(success({ deleted: true }));
  }),
);
