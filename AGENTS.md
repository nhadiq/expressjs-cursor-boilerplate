# Agent Instructions — Express Multitenant API

TypeScript Express 5 API boilerplate with Better Auth, Prisma 7, and organization multitenancy.

## Before writing code

1. Run `graphify query "<your question>"` before exploring source (see `.cursor/rules/graphify.mdc`)
2. Read relevant Cursor rules: `express-core.mdc`, `express-auth.mdc`, `better-auth-multitenancy.mdc`
3. Check `package.json` before using any third-party API

## Critical invariants

### Middleware order

Better Auth **must** mount before `express.json()`. Violating this causes auth requests to hang indefinitely.

```text
helmet → cors → request-id → logging → rate-limit(/api/auth) → toNodeHandler(auth) → express.json() → routes → error handler
```

### Multitenancy

1. `organizationId` comes from verified session (`activeOrganizationId`) or path param + `assertOrgMember()`
2. Never trust `organizationId` from request body alone
3. Call `requireOrgPermission()` before member/invitation/org mutations
4. Personal org auto-created on signup — do not duplicate in services

### Auth endpoints

| Path | Owner | Purpose |
|------|-------|---------|
| `/api/auth/*` | Better Auth (`toNodeHandler`) | Sign up, sign in, OAuth, org plugin |
| `/api/v1/*` | Express modules | Business REST API with RBAC |

Session access: `auth.api.getSession({ headers: fromNodeHeaders(req.headers) })`.

### What NOT to use

- No `nextCookies()`, no Next.js `headers()`/`cookies()`
- No Supabase, Firebase, Auth.js, or custom JWT auth
- No `middleware.ts` or `proxy.ts` patterns from Next.js

## Project layout

```
src/
├── app.ts              # createApp() factory
├── server.ts           # HTTP server + graceful shutdown
├── env.ts              # Zod-validated env
├── lib/                # auth, db, tenant-guard, org-permissions
├── middleware/         # require-session, require-org-permission, error-handler
└── modules/            # org, member, invitation, me, health
```

## Testing

- Unit tests: mock Prisma in `tests/lib/`, `tests/middleware/`, `tests/security/`
- Integration: Supertest + `tests/helpers/auth.ts` for session cookies
- Test env in `vitest.setup.ts` at project root

## Docs

All documentation lives in `docs/` — see `docs/getting-started.md` for bootstrap steps.
