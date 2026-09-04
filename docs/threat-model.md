# Threat Model (STRIDE-lite)

## Scope

Better Auth + organization multitenancy + Express 5 REST API.

| Threat | Mitigation |
| ------ | ---------- |
| Spoofing | Better Auth sessions; secure cookies in production; `TRUST_PROXY` for correct client IP |
| Tampering | Signed cookies; Zod validation on all inputs |
| Repudiation | Auth event logging (no PII) |
| Information disclosure | IDOR guards (`assertOrgMember`); generic 403 errors; no stack traces in production |
| Denial of service | Rate limiting on `/api/auth/*` (10 req/min per IP) |
| Elevation of privilege | Server-side RBAC (`requireOrgPermission`); tenant isolation tests |

## Trust boundaries

- Client requests are untrusted — re-validate session on every protected route
- `requireSession` middleware is mandatory — never skip for "internal" routes
- Org ID from verified session or path param + membership check — never from body alone
- Better Auth `/api/auth/*` and REST `/api/v1/*` share DB but REST enforces explicit RBAC

## IDOR scenarios

| Attack | Defense |
|--------|---------|
| User A reads User B's org via `:orgId` | `assertOrgMember(userA, orgId)` before query |
| Member deletes org | `requireOrgPermission('organization:delete')` — owner only |
| Member invites users | `requireOrgPermission('invitation:create')` — owner/admin only |
| Listing members without membership | 403 before any data returned |

Tests: `tests/security/tenant-isolation.test.ts`, `tests/integration/org-crud.test.ts`.

## Session fixation

- Better Auth issues new session on sign in
- Cookies: httpOnly, secure (production), sameSite=lax
- Rotate `BETTER_AUTH_SECRET` on compromise

## Rate limit bypass

- Rate limit keyed by client IP (respects `trust proxy`)
- Separate Upstash limiter in production (not in-memory)
- 429 response with `Retry-After` header

Tests: `tests/security/rate-limit.test.ts`.

## Input validation

- Zod schemas on body, query, params
- `hpp()` for HTTP parameter pollution
- Prisma parameterized queries only

## Deferred threats (v2)

- Subdomain tenant spoofing (not implemented in v1)
- Per-org API key abuse
- Webhook replay attacks
