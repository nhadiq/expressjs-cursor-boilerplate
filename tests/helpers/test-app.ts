import type { Express } from 'express';
import { setupTestDatabase } from './test-db';

let cachedApp: Express | null = null;

export async function createTestApp(): Promise<Express> {
  if (cachedApp) {
    return cachedApp;
  }

  setupTestDatabase();

  const { createApp } = await import('@/app');
  cachedApp = createApp();

  return cachedApp;
}

export function resetTestAppCache(): void {
  cachedApp = null;
}
