# Security Policy

See also: [threat-model.md](./threat-model.md).

## Authentication

- Better Auth only; no custom password hashing
- Email verification required in production (`requireEmailVerification: true`)
- Password policy v1: min 8, max 128 (recommend 12+ in production)
- Session expiry: 7 days; cookie cache 5 minutes

## Authorization & multitenancy

- Tenant isolation via `assertOrgMember()` and `requireOrgPermission()`
- RBAC roles: owner, admin, member
- IDOR prevention on all org-scoped queries
- `requireSession` middleware on all protected `/api/v1/*` routes

## HTTP security

- Security headers via `helmet()`
- CORS: explicit `CLIENT_URL` only — no wildcard in production
- Rate limiting on `/api/auth/*` via Upstash (prod) or in-memory (dev)
- `TRUST_PROXY=true` in production behind reverse proxy
- No stack traces in production error responses

## Secrets

- Validated at startup via `src/env.ts`
- Upstash required in production for rate limiting
- Never log tokens, passwords, or reset links
- pino-http redacts `cookie`, `authorization`, `set-cookie`

## Dependencies

- `make security-audit` runs `pnpm audit --audit-level=high`
- Dependabot enabled

## Incident response

1. Rotate `BETTER_AUTH_SECRET` and invalidate sessions
2. Review logs for auth failures and permission denials
3. Report vulnerabilities per project SECURITY.md (when added)
