import { Router } from 'express';
import { asyncHandler } from '@/lib/async-handler.js';
import { success } from '@/lib/service-response.js';
import { listUserOrganizations } from '@/lib/org-server.js';
import { requireSession } from '@/middleware/require-session.js';

export const meRouter = Router();

meRouter.use(requireSession);

meRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const session = req.session!;

    res.json(
      success({
        user: session.user,
        session: {
          id: session.session.id,
          activeOrganizationId: session.session.activeOrganizationId,
          expiresAt: session.session.expiresAt,
        },
      }),
    );
  }),
);

meRouter.get(
  '/organizations',
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const organizations = await listUserOrganizations(session.user.id);
    res.json(success(organizations));
  }),
);
