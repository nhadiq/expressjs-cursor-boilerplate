import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError, assertOrgMember } from '@/lib/tenant-guard';

const findFirst = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    member: {
      findFirst: (...args: unknown[]) => findFirst(...args),
    },
  },
}));

describe('tenant isolation', () => {
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

  it('queries membership by userId and organizationId', async () => {
    findFirst.mockResolvedValue({ role: 'admin' });

    await assertOrgMember('user-42', 'org-99');

    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-42', organizationId: 'org-99' },
    });
  });
});

describe('IDOR prevention', () => {
  it('uses forbidden errors instead of leaking org data', () => {
    const error = new ForbiddenError('Organization not found');
    expect(error.message).not.toMatch(/sql/i);
    expect(error).toBeInstanceOf(ForbiddenError);
  });

  it('returns generic forbidden message for non-members', async () => {
    findFirst.mockResolvedValue(null);

    await expect(assertOrgMember('user-a', 'org-secret')).rejects.toMatchObject({
      message: 'You are not a member of this organization',
    });
  });
});
