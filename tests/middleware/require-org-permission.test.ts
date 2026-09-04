import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from '@/lib/errors';
import { requireOrgPermissionMiddleware } from '@/middleware/require-org-permission';

const requireOrgPermissionGuard = vi.fn();

vi.mock('@/lib/tenant-guard', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tenant-guard')>();
  return {
    ...actual,
    requireOrgPermission: (...args: unknown[]) =>
      requireOrgPermissionGuard(...args),
  };
});

describe('requireOrgPermissionMiddleware', () => {
  beforeEach(() => {
    requireOrgPermissionGuard.mockReset();
  });

  it('forwards ForbiddenError when request has no session', async () => {
    const middleware = requireOrgPermissionMiddleware('member:delete');
    const req = { params: { orgId: 'org-1' } } as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('forwards ForbiddenError when orgId param is missing', async () => {
    const middleware = requireOrgPermissionMiddleware('member:delete');
    const req = {
      session: { user: { id: 'user-1' }, session: { id: 'sess-1' } },
      params: {},
    } as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('forwards permission errors from tenant guard', async () => {
    requireOrgPermissionGuard.mockRejectedValue(
      new ForbiddenError('Insufficient permissions'),
    );

    const middleware = requireOrgPermissionMiddleware('organization:delete');
    const req = {
      session: { user: { id: 'user-1' }, session: { id: 'sess-1' } },
      params: { orgId: 'org-1' },
    } as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);

    expect(requireOrgPermissionGuard).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'organization:delete',
    );
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('sets organizationId and calls next when permission check passes', async () => {
    requireOrgPermissionGuard.mockResolvedValue(undefined);

    const middleware = requireOrgPermissionMiddleware('invitation:create');
    const req = {
      session: { user: { id: 'user-1' }, session: { id: 'sess-1' } },
      params: { orgId: 'org-1' },
    } as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);

    expect(req.organizationId).toBe('org-1');
    expect(next).toHaveBeenCalledWith();
  });
});
