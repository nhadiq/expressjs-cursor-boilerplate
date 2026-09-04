import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const TEST_DB_PATH = path.join(process.cwd(), 'prisma', 'test.db');

export function getTestDatabaseUrl(): string {
  return `file:${TEST_DB_PATH}`;
}

export function setupTestDatabase(): void {
  process.env.DATABASE_URL = getTestDatabaseUrl();

  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  execSync('pnpm exec prisma db push', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: getTestDatabaseUrl() },
  });
}

export async function resetTestDatabase(): Promise<void> {
  const { prisma } = await import('@/lib/db');

  await prisma.$transaction([
    prisma.invitation.deleteMany(),
    prisma.member.deleteMany(),
    prisma.organization.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.verification.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export async function disconnectTestDatabase(): Promise<void> {
  const { prisma } = await import('@/lib/db');
  await prisma.$disconnect();
}
