import type { Session } from '@/lib/auth.js';
import type { OrgPermission } from '@/lib/org-permissions.js';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      session?: Session | null;
      organizationId?: string;
      organizationRole?: string;
      requiredPermission?: OrgPermission;
    }
  }
}

export {};
