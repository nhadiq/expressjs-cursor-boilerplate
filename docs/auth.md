# Authentication

Better Auth handles all authentication at `/api/auth/*`. Business APIs at `/api/v1/*` use session middleware.

Reference: [Better Auth Express integration](https://better-auth.com/docs/integrations/express).

## Architecture

```text
Client → CORS (credentials) → /api/auth/* (toNodeHandler) → session cookie
Client → CORS (credentials) → /api/v1/* (requireSession) → JSON API
```

## When to use which API

| Use case | Endpoint | Notes |
|----------|----------|-------|
| Sign up / sign in / sign out | `/api/auth/*` | Better Auth native |
| Email verification / password reset | `/api/auth/*` | Better Auth native |
| OAuth (Google) | `/api/auth/*` | Env-gated |
| Org create / invite / accept (client SDK) | `/api/auth/*` | Organization plugin |
| Org CRUD with explicit REST contract | `/api/v1/organizations/*` | Documented, RBAC-enforced |
| Member management | `/api/v1/organizations/:orgId/members/*` | Paginated, RBAC |
| Current user profile | `/api/v1/me` | Session summary |

Both layers share the same Prisma database. REST endpoints add explicit RBAC and response envelopes for BFFs and non-Better-Auth clients.

## Express mount (critical)

```typescript
import { toNodeHandler } from 'better-auth/node';

app.all('/api/auth/*splat', toNodeHandler(auth));
app.use(express.json()); // AFTER auth handler
```

Placing `express.json()` before the auth handler causes requests to hang.

## Session access in routes

```typescript
import { fromNodeHeaders } from 'better-auth/node';

const session = await auth.api.getSession({
  headers: fromNodeHeaders(req.headers),
});
```

Or use `requireSession` middleware which attaches `req.user` and `req.session`.

## CORS configuration

```typescript
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
}));
```

In `auth.ts`:

```typescript
trustedOrigins: [env.BETTER_AUTH_URL, env.CLIENT_URL],
```

## Cookie configuration

| Setting | Value |
|---------|-------|
| httpOnly | true (Better Auth default) |
| secure | true in production |
| sameSite | lax |
| Domain | Same origin as API, or shared parent domain in production |

Set `TRUST_PROXY=true` when behind nginx/ALB so secure cookies work correctly.

## Pairing with Next.js frontend

1. **Direct API calls** — point Better Auth client `baseURL` to Express (`http://localhost:4000`)
2. **Proxy** — Next.js rewrites `/api/auth/*` to Express (optional)

Required env alignment:

| App | Variable | Value |
|-----|----------|-------|
| Express | `BETTER_AUTH_URL` | `http://localhost:4000` |
| Express | `CLIENT_URL` | `http://localhost:3000` |
| Next.js | `BETTER_AUTH_URL` | `http://localhost:4000` |
| Next.js | `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |

## Email verification

Production: `requireEmailVerification: true` in `auth.ts`.

Test environment: may disable verification or mock `sendVerificationEmail` — see `tests/helpers/auth.ts`.

## Rate limiting

Auth endpoints (`/api/auth/*`) are rate limited to 10 requests/minute per IP (in-memory in dev, Upstash in production).

## Health check

```bash
curl http://localhost:4000/api/auth/ok
```

Returns 200 when Better Auth handler is mounted correctly.
