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

describe('organization CRUD integration', () => {
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

  it('returns org details for a member', async () => {
    const userA = await signUpAndSignIn(app);
    const orgs = await userA.agent
      .get('/api/v1/me/organizations')
      .set('Origin', process.env.CLIENT_URL ?? 'http://localhost:3000');

    const orgId = orgs.body.data[0].id;

    const response = await userA.agent
      .get(`/api/v1/organizations/${orgId}`)
      .set('Origin', process.env.CLIENT_URL ?? 'http://localhost:3000');

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(orgId);
  });

  it('prevents IDOR access to another users organization', async () => {
    const userA = await signUpAndSignIn(app);
    const userB = await signUpAndSignIn(app);

    const orgsA = await userA.agent
      .get('/api/v1/me/organizations')
      .set('Origin', process.env.CLIENT_URL ?? 'http://localhost:3000');
    const orgIdA = orgsA.body.data[0].id;

    const forbidden = await userB.agent
      .get(`/api/v1/organizations/${orgIdA}`)
      .set('Origin', process.env.CLIENT_URL ?? 'http://localhost:3000');

    expect(forbidden.status).toBe(403);
    expect(forbidden.body.success).toBe(false);
  });

  it('denies members from deleting an organization', async () => {
    const owner = await signUpAndSignIn(app);
    const orgs = await owner.agent
      .get('/api/v1/me/organizations')
      .set('Origin', process.env.CLIENT_URL ?? 'http://localhost:3000');
    const orgId = orgs.body.data[0].id;

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
      .delete(`/api/v1/organizations/${orgId}`)
      .set('Origin', process.env.CLIENT_URL ?? 'http://localhost:3000');

    expect(response.status).toBe(403);
  });

  it('allows owner to update organization metadata', async () => {
    const owner = await signUpAndSignIn(app);
    const orgs = await owner.agent
      .get('/api/v1/me/organizations')
      .set('Origin', process.env.CLIENT_URL ?? 'http://localhost:3000');
    const orgId = orgs.body.data[0].id;

    const response = await owner.agent
      .patch(`/api/v1/organizations/${orgId}`)
      .set('Origin', process.env.CLIENT_URL ?? 'http://localhost:3000')
      .send({ name: 'Renamed Org' });

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Renamed Org');
  });
});
