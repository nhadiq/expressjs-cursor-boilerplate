import type { Express } from 'express';
import request, { type Agent } from 'supertest';

export type AuthSession = {
  agent: Agent;
  email: string;
  password: string;
  name: string;
};

export async function signUpUser(
  app: Express,
  overrides?: Partial<{ email: string; password: string; name: string }>,
): Promise<AuthSession> {
  const email = overrides?.email ?? `user-${Date.now()}@example.com`;
  const password = overrides?.password ?? 'TestPassword123!';
  const name = overrides?.name ?? 'Test User';
  const agent = request.agent(app);

  await agent
    .post('/api/auth/sign-up/email')
    .set('Origin', process.env.CLIENT_URL ?? 'http://localhost:3000')
    .send({ email, password, name })
    .expect((res) => {
      if (res.status !== 200 && res.status !== 201) {
        throw new Error(
          `Sign up failed: ${res.status} ${JSON.stringify(res.body)}`,
        );
      }
    });

  return { agent, email, password, name };
}

export async function signInUser(
  app: Express,
  credentials: { email: string; password: string },
): Promise<Agent> {
  const agent = request.agent(app);

  await agent
    .post('/api/auth/sign-in/email')
    .set('Origin', process.env.CLIENT_URL ?? 'http://localhost:3000')
    .send(credentials)
    .expect((res) => {
      if (res.status !== 200) {
        throw new Error(
          `Sign in failed: ${res.status} ${JSON.stringify(res.body)}`,
        );
      }
    });

  return agent;
}

export async function verifyUserEmail(email: string): Promise<void> {
  const { prisma } = await import('@/lib/db');
  await prisma.user.update({
    where: { email },
    data: { emailVerified: true },
  });
}

export async function signUpAndSignIn(
  app: Express,
  overrides?: Partial<{ email: string; password: string; name: string }>,
): Promise<AuthSession> {
  const session = await signUpUser(app, overrides);
  await verifyUserEmail(session.email);
  const agent = await signInUser(app, {
    email: session.email,
    password: session.password,
  });

  return { ...session, agent };
}

export function extractSessionCookie(
  setCookieHeader?: string | string[],
): string | undefined {
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];

  const sessionCookie = cookies.find((cookie) =>
    cookie.startsWith('better-auth.session_token='),
  );

  return sessionCookie?.split(';')[0];
}
