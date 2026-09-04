import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/test-app';
import {
  disconnectTestDatabase,
  resetTestDatabase,
} from '../helpers/test-db';
import { signUpAndSignIn, signUpUser } from '../helpers/auth';

describe('auth flow integration', () => {
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

  it('exposes Better Auth health endpoint', async () => {
    const response = await request(app).get('/api/auth/ok');

    expect(response.status).toBe(200);
  });

  it('signs up a user via Better Auth email endpoint', async () => {
    const { email } = await signUpUser(app);

    const response = await request(app)
      .get('/api/v1/me')
      .set('Origin', process.env.CLIENT_URL ?? 'http://localhost:3000');

    expect(response.status).toBe(403);

    const session = await signUpAndSignIn(app, { email });

    const me = await session.agent
      .get('/api/v1/me')
      .set('Origin', process.env.CLIENT_URL ?? 'http://localhost:3000');

    expect(me.status).toBe(200);
    expect(me.body.success).toBe(true);
    expect(me.body.data.user.email).toBe(email);
  });

  it('rejects invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/sign-in/email')
      .set('Origin', process.env.CLIENT_URL ?? 'http://localhost:3000')
      .send({ email: 'missing@example.com', password: 'WrongPassword123!' });

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('creates a personal organization on signup', async () => {
    const session = await signUpAndSignIn(app);

    const orgs = await session.agent
      .get('/api/v1/me/organizations')
      .set('Origin', process.env.CLIENT_URL ?? 'http://localhost:3000');

    expect(orgs.status).toBe(200);
    expect(orgs.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'owner',
        }),
      ]),
    );
  });
});
