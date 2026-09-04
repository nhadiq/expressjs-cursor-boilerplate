import { z } from 'zod';
import { Router } from 'express';
import { asyncHandler } from '@/lib/async-handler.js';
import { ApiError } from '@/lib/api-error.js';
import { success } from '@/lib/service-response.js';
import { prisma } from '@/lib/db.js';
import { assertOrgMember } from '@/lib/tenant-guard.js';
import { requireSession } from '@/middleware/require-session.js';
import { requireOrgPermissionMiddleware } from '@/middleware/require-org-permission.js';
import { validate } from '@/middleware/validate.js';

const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).default('member'),
});

export const invitationRouter = Router({ mergeParams: true });

invitationRouter.use(requireSession);

invitationRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const { orgId } = req.params as { orgId: string };

    await assertOrgMember(session.user.id, orgId);

    const invitations = await prisma.invitation.findMany({
      where: { organizationId: orgId, status: 'pending' },
      orderBy: { expiresAt: 'asc' },
    });

    res.json(success(invitations));
  }),
);

invitationRouter.post(
  '/',
  requireOrgPermissionMiddleware('invitation:create'),
  validate(createInvitationSchema),
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const { orgId } = req.params as { orgId: string };
    const { email, role } = req.body as z.infer<typeof createInvitationSchema>;

    const existingMember = await prisma.member.findFirst({
      where: {
        organizationId: orgId,
        user: { email },
      },
    });

    if (existingMember) {
      throw new ApiError(409, 'User is already a member', 'ALREADY_MEMBER');
    }

    const existingInvite = await prisma.invitation.findFirst({
      where: {
        organizationId: orgId,
        email,
        status: 'pending',
      },
    });

    if (existingInvite) {
      throw new ApiError(409, 'Invitation already pending', 'INVITE_EXISTS');
    }

    const invitation = await prisma.invitation.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: orgId,
        email,
        role,
        status: 'pending',
        expiresAt: new Date(Date.now() + 60 * 60 * 48 * 1000),
        inviterId: session.user.id,
      },
    });

    res.status(201).json(success(invitation));
  }),
);

invitationRouter.delete(
  '/:invitationId',
  requireOrgPermissionMiddleware('invitation:cancel'),
  asyncHandler(async (req, res) => {
    const { orgId, invitationId } = req.params as {
      orgId: string;
      invitationId: string;
    };

    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, organizationId: orgId },
    });

    if (!invitation) {
      throw new ApiError(404, 'Invitation not found', 'NOT_FOUND');
    }

    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'cancelled' },
    });

    res.json(success({ cancelled: true }));
  }),
);
