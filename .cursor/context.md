## Current State (Sep 2026)

- **Express API boilerplate complete**: core runtime, tests, docs, and Cursor rules all landed
- Auth: Better Auth with email/password, Google OAuth (optional), email verification, Resend emails
- Multitenancy: Better Auth organization plugin — personal org on signup, RBAC, session `activeOrganizationId`
- Database: Prisma 7 + SQLite (dev); `Account.issuer` field required for Better Auth 1.7 signup
- API: REST at `/api/v1/*`; auth at `/api/auth/*` via `toNodeHandler`; OpenAPI at `/api/v1/docs`
- Env: `dotenv` loads `.env` in `src/env.ts` (Express does not auto-load like Next.js)
- Tests: 38 passing (Vitest unit + Supertest integration); `vitest.global-setup.ts` for DB isolation
- Cursor rules: 14 files (4 global + 10 scoped)
- Docs: 9 files in `docs/` (getting-started, api, multitenancy, auth, deployment, postgresql, security-policy, threat-model, graphify-setup)
- Verified: `pnpm typecheck`, `pnpm test:ci`, `pnpm dev` on port 4000

## Open Questions / What's Next

- [ ] Docker compose smoke test
- [ ] Run `pnpm graphify:build` after Graphify CLI install
- [ ] Port `Account.issuer` to Next.js sibling boilerplate (same Better Auth 1.7 signup bug)
- [ ] Sentry error monitoring (deferred v2)
- [ ] Stripe billing per org (deferred v2)

## Architecture Decisions

| Decision | Why |
| -------- | --- |
| Better Auth over Firebase/Supabase | Self-hosted sessions, TypeScript-first, no vendor lock-in |
| Prisma 7 + SQLite for dev | Zero-config local setup; swap to PostgreSQL for production |
| Better Auth organization plugin | Official multitenancy with session `activeOrganizationId` |
| Session-based active org (not subdomains) | Simpler v1; subdomain tenancy deferred |
| Resend for email | Simple API for reset + verification |
| Express 5 + ESM | Required by Better Auth; `*splat` wildcard for auth routes |
| API-only (no SSR) | Pairs with Next.js frontend boilerplate |
| Feature modules (`src/modules/`) | Scales for multitenant domain growth |
| Supertest integration tests | API-first; no Playwright needed |
| Graphify for code intelligence | Query-first exploration via AST graph |
| Graphify outputs gitignored (Sep 2026) | Local-only graph; regenerated on bootstrap and post-merge |
| Better Auth before body parser | `express.json()` before `toNodeHandler` causes auth hang |
| `dotenv` in env.ts | Express has no built-in `.env` loading unlike Next.js |
| `Account.issuer` on schema | Better Auth 1.7 requires `issuer` + `@@unique([issuer, accountId])` for signup |
| `pnpm-workspace.yaml` allowBuilds | Native modules (`better-sqlite3`) need explicit build allowlist under pnpm 11 |
| `/organizations/switch` before `/:orgId` | Param route would swallow `switch` without explicit ordering |

## What Was Tried / Learnt

- (Sep 2026) Next.js `proxy.ts` auth guard replaced by Express `requireSession` middleware
- (Sep 2026) `nextCookies()` plugin removed — Express uses `fromNodeHeaders` only
- (Sep 2026) Personal org created via `databaseHooks.user.create.after` in auth.ts
- (Sep 2026) Prisma 7 requires `prisma.config.ts` and driver adapters for SQLite
- (Sep 2026) Test DB isolated at `prisma/test.db` with env vars in `vitest.setup.ts`
- (Sep 2026) Integration tests: `fileParallelism: false` + global setup prevents DB race conditions
- (Sep 2026) Auth rate limit bypassed when `NODE_ENV === 'test'` to avoid 429 in Supertest
- (Sep 2026) `ForbiddenError` split to `errors.ts` so mocked unit tests don't pull in Prisma
