import type { RequestHandler } from 'express';
import { assertOrgMember } from '@/lib/tenant-guard.js';
import { ForbiddenError } from '@/lib/tenant-guard.js';

export const requireActiveOrg: RequestHandler = async (req, _res, next) => {
  try {
    const session = req.session;

    if (!session?.user) {
      throw new ForbiddenError('Authentication required');
    }

    const orgId = session.session.activeOrganizationId;

    if (!orgId) {
      throw new ForbiddenError('No active organization');
    }

    const { role } = await assertOrgMember(session.user.id, orgId);
    req.organizationId = orgId;
    req.organizationRole = role;
    next();
  } catch (error) {
    next(error);
  }
};
