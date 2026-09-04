import { prisma } from '@/lib/db.js';
import { ForbiddenError, NotFoundError } from '@/lib/errors.js';

export { ForbiddenError, NotFoundError };

export async function assertOrgMember(
  userId: string,
  organizationId: string,
): Promise<{ role: string }> {
  const member = await prisma.member.findFirst({
    where: { userId, organizationId },
  });

  if (!member) {
    throw new ForbiddenError('You are not a member of this organization');
  }

  return { role: member.role };
}

export async function scopeToActiveOrg(
  userId: string,
  activeOrganizationId: string | null | undefined,
): Promise<string> {
  if (!activeOrganizationId) {
    throw new ForbiddenError('No active organization');
  }

  await assertOrgMember(userId, activeOrganizationId);
  return activeOrganizationId;
}

export async function requireOrgPermission(
  userId: string,
  organizationId: string,
  permission: import('@/lib/org-permissions.js').OrgPermission,
): Promise<void> {
  const { role } = await assertOrgMember(userId, organizationId);

  const { can, isOrgRole } = await import('@/lib/org-permissions.js');

  if (!isOrgRole(role) || !can(role, permission)) {
    throw new ForbiddenError('Insufficient permissions');
  }
}
