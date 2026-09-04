import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { createTestApp } from '../helpers/test-app';
import {
  disconnectTestDatabase,
  resetTestDatabase,
} from '../helpers/test-db';
import { signUpAndSignIn } from '../helpers/auth';

describe('invitation flow integration', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  async function getOwnerOrgId(agent: Awaited<ReturnType<typeof signUpAndSignIn>>['agent']) {
    const orgs = await agent
      .get('/api/v1/me/organizations')
      .set('Origin', process.env.CLIENT_URL ?? 'http://localhost:3000');

    return orgs.body.data[0].id as string;
  }

  it('allows owner to create an invitation', async () => {
    const owner = await signUpAndSignIn(app);
    const orgId = await getOwnerOrgId(owner.agent);

    const response = await owner.agent
      .post(`/api/v1/organizations/${orgId}/invitations`)
      .set('Origin', process.env.CLIENT_URL ?? 'http://localhost:3000')
      .send({ email: 'invitee@example.com', role: 'member' });

    expect(response.status).toBe(201);
    expect(response.body.data.email).toBe('invitee@example.com');
  });

  it('denies members from creating invitations', async () => {
    const owner = await signUpAndSignIn(app);
    const orgId = await getOwnerOrgId(owner.agent);

    const memberSession = await signUpAndSignIn(app, {
      email: `member-${Date.now()}@example.com`,
    });
    const { prisma } = await import('@/lib/db');
    const memberUser = await prisma.user.findUnique({
      where: { email: memberSession.email },
    });

    await prisma.member.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: orgId,
        userId: memberUser!.id,
        role: 'member',
        createdAt: new Date(),
      },
    });

    const response = await memberSession.agent
      .post(`/api/v1/organizations/${orgId}/invitations`)
      .set('Origin', process.env.CLIENT_URL ?? 'http://localhost:3000')
      .send({ email: 'blocked@example.com', role: 'member' });

    expect(response.status).toBe(403);
  });

  it('allows owner to cancel a pending invitation', async () => {
    const owner = await signUpAndSignIn(app);
    const orgId = await getOwnerOrgId(owner.agent);

    const created = await owner.agent
      .post(`/api/v1/organizations/${orgId}/invitations`)
      .set('Origin', process.env.CLIENT_URL ?? 'http://localhost:3000')
      .send({ email: 'cancel-me@example.com', role: 'member' });

    const invitationId = created.body.data.id;

    const response = await owner.agent
      .delete(`/api/v1/organizations/${orgId}/invitations/${invitationId}`)
      .set('Origin', process.env.CLIENT_URL ?? 'http://localhost:3000');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
