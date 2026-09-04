const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'settings',
  'auth',
  'dashboard',
  'org',
  'health',
  'ready',
]);

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'org'
  );
}

/** Express 5 route params may be `string | string[]` — normalize to a single string. */
export function param(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export function isValidOrgSlug(slug: string): boolean {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return false;
  }
  return !RESERVED_SLUGS.has(slug);
}
