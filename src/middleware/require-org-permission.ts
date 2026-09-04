import type { RequestHandler } from 'express';
import type { OrgPermission } from '@/lib/org-permissions.js';
import { requireOrgPermission, ForbiddenError } from '@/lib/tenant-guard.js';
import { param } from '@/lib/utils.js';

export function requireOrgPermissionMiddleware(
  permission: OrgPermission,
): RequestHandler {
  return async (req, _res, next) => {
    try {
      const session = req.session;

      if (!session?.user) {
        throw new ForbiddenError('Authentication required');
      }

      const organizationId =
        req.organizationId ??
        (param(req.params.orgId) || param(req.params.organizationId));

      if (!organizationId) {
        throw new ForbiddenError('Organization context required');
      }

      await requireOrgPermission(session.user.id, organizationId, permission);
      req.organizationId = organizationId;
      next();
    } catch (error) {
      next(error);
    }
  };
}
