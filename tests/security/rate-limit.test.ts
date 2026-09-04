import { describe, expect, it } from 'vitest';
import { rateLimitAuth } from '@/lib/rate-limit';

describe('rate limiting', () => {
  it('returns 429 after threshold for auth endpoints', async () => {
    const key = `test-${Date.now()}`;

    for (let i = 0; i < 10; i += 1) {
      const result = await rateLimitAuth(key);
      expect(result.success).toBe(true);
    }

    const blocked = await rateLimitAuth(key);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('resets allowance for a new identifier', async () => {
    const keyA = `test-a-${Date.now()}`;
    const keyB = `test-b-${Date.now()}`;

    for (let i = 0; i < 10; i += 1) {
      await rateLimitAuth(keyA);
    }

    const blockedA = await rateLimitAuth(keyA);
    const allowedB = await rateLimitAuth(keyB);

    expect(blockedA.success).toBe(false);
    expect(allowedB.success).toBe(true);
  });
});
