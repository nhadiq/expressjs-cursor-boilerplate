import type { Request } from 'express';
import { auth } from '@/lib/auth.js';
import { prisma } from '@/lib/db.js';
import {
  ForbiddenError,
  requireOrgPermission,
  scopeToActiveOrg,
} from '@/lib/tenant-guard.js';
import type { OrgPermission } from '@/lib/org-permissions.js';
import { getServerSession } from '@/lib/auth-server.js';

export async function requireSession(req: Request) {
  const session = await getServerSession(req);

  if (!session?.user) {
    throw new ForbiddenError('Authentication required');
  }

  return session;
}

export async function getActiveOrganization(req: Request) {
  const session = await requireSession(req);
  const orgId = session.session.activeOrganizationId;

  if (!orgId) {
    return null;
  }

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      members: {
        include: { user: true },
      },
    },
  });

  if (!organization) {
    return null;
  }

  const membership = organization.members.find(
    (member) => member.userId === session.user.id,
  );

  if (!membership) {
    return null;
  }

  return {
    organization,
    membership,
    role: membership.role,
  };
}

export async function requireOrganization(req: Request) {
  const active = await getActiveOrganization(req);

  if (!active) {
    throw new ForbiddenError('Active organization required');
  }

  return active;
}

export async function listUserOrganizations(userId: string) {
  const memberships = await prisma.member.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: 'asc' },
  });

  return memberships.map((membership) => ({
    ...membership.organization,
    role: membership.role,
  }));
}

export async function checkOrgPermission(
  userId: string,
  organizationId: string,
  permission: OrgPermission,
) {
  await requireOrgPermission(userId, organizationId, permission);
}

export async function getScopedOrgId(
  userId: string,
  sessionOrgId?: string | null,
) {
  return scopeToActiveOrg(userId, sessionOrgId);
}

export { ForbiddenError, NotFoundError } from '@/lib/tenant-guard.js';
