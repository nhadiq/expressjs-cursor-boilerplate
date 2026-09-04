import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from '@/lib/tenant-guard';
import { requireSession } from '@/middleware/require-session';

const getServerSession = vi.fn();

vi.mock('@/lib/auth-server', () => ({
  getServerSession: (...args: unknown[]) => getServerSession(...args),
}));

describe('requireSession middleware', () => {
  beforeEach(() => {
    getServerSession.mockReset();
  });

  it('forwards ForbiddenError when no session exists', async () => {
    getServerSession.mockResolvedValue(null);

    const req = { headers: {} } as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await requireSession(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('forwards ForbiddenError when session has no user', async () => {
    getServerSession.mockResolvedValue({ session: { id: 'sess-1' } });

    const req = { headers: {} } as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await requireSession(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('attaches session and calls next for authenticated users', async () => {
    const sessionPayload = {
      user: { id: 'user-1', email: 'a@example.com' },
      session: { id: 'sess-1', activeOrganizationId: 'org-1' },
    };
    getServerSession.mockResolvedValue(sessionPayload);

    const req = { headers: {} } as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await requireSession(req, res, next);

    expect(req.session).toEqual(sessionPayload);
    expect(next).toHaveBeenCalledWith();
  });
});
