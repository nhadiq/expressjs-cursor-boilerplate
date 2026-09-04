import { Router } from 'express';
import { meRouter } from '@/modules/me/me.routes.js';
import { orgRouter } from '@/modules/org/org.routes.js';
import { memberRouter } from '@/modules/member/member.routes.js';
import { invitationRouter } from '@/modules/invitation/invitation.routes.js';

export const apiRouter = Router();

apiRouter.use('/me', meRouter);
apiRouter.use('/organizations', orgRouter);
apiRouter.use('/organizations/:orgId/members', memberRouter);
apiRouter.use('/organizations/:orgId/invitations', invitationRouter);
