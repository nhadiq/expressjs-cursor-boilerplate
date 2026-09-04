import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ForbiddenError,
  NotFoundError,
  assertOrgMember,
  requireOrgPermission,
  scopeToActiveOrg,
} from '@/lib/tenant-guard';

const findFirst = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    member: {
      findFirst: (...args: unknown[]) => findFirst(...args),
    },
  },
}));

describe('tenant guard', () => {
  beforeEach(() => {
    findFirst.mockReset();
  });

  it('throws when user is not a member of the organization', async () => {
    findFirst.mockResolvedValue(null);

    await expect(assertOrgMember('user-a', 'org-b')).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('returns membership when user belongs to organization', async () => {
    findFirst.mockResolvedValue({ role: 'member' });

    await expect(assertOrgMember('user-a', 'org-a')).resolves.toEqual({
      role: 'member',
    });
  });

  it('rejects missing active organization', async () => {
    await expect(scopeToActiveOrg('user-a', null)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('scopes to active organization when membership exists', async () => {
    findFirst.mockResolvedValue({ role: 'owner' });

    await expect(scopeToActiveOrg('user-a', 'org-a')).resolves.toBe('org-a');
  });

  it('denies insufficient permissions for member role', async () => {
    findFirst.mockResolvedValue({ role: 'member' });

    await expect(
      requireOrgPermission('user-a', 'org-a', 'invitation:create'),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('allows owner permissions', async () => {
    findFirst.mockResolvedValue({ role: 'owner' });

    await expect(
      requireOrgPermission('user-a', 'org-a', 'organization:delete'),
    ).resolves.toBeUndefined();
  });

  it('exposes typed error classes', () => {
    expect(new ForbiddenError().name).toBe('ForbiddenError');
    expect(new NotFoundError().name).toBe('NotFoundError');
  });
});
