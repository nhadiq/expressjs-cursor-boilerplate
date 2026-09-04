import { describe, expect, it } from 'vitest';
import { can, isOrgRole } from '@/lib/org-permissions';

describe('org permissions', () => {
  it('allows owners to invite members', () => {
    expect(can('owner', 'invitation:create')).toBe(true);
  });

  it('denies members from inviting', () => {
    expect(can('member', 'invitation:create')).toBe(false);
  });

  it('allows admins to update organizations', () => {
    expect(can('admin', 'organization:update')).toBe(true);
  });

  it('denies admins from deleting organizations', () => {
    expect(can('admin', 'organization:delete')).toBe(false);
  });

  it('denies members from updating members', () => {
    expect(can('member', 'member:update')).toBe(false);
  });

  it('validates org roles', () => {
    expect(isOrgRole('admin')).toBe(true);
    expect(isOrgRole('owner')).toBe(true);
    expect(isOrgRole('member')).toBe(true);
    expect(isOrgRole('guest')).toBe(false);
  });
});
