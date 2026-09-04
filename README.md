# Express Cursor Boilerplate

Express 5 multitenant API with Better Auth, Prisma 7, organization RBAC, and OpenAPI docs.

## Prerequisites

| Tool | Purpose |
|------|---------|
| Node.js 20+ | Runtime |
| pnpm | Package manager (`npm i -g pnpm`) |

## Quick start

```bash
pnpm install
pnpm bootstrap
pnpm dev
```

API runs at `http://localhost:4000` by default.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness probe |
| GET | `/ready` | Readiness probe (DB check) |
| ALL | `/api/auth/*` | Better Auth handlers |
| GET | `/api/v1/docs` | Swagger UI |
| GET | `/api/v1/me` | Current user session |
| GET | `/api/v1/me/organizations` | User organizations |
| CRUD | `/api/v1/organizations` | Organization management |
| POST | `/api/v1/organizations/switch` | Switch active org |
| GET/PATCH/DELETE | `/api/v1/organizations/:orgId/members` | Member management |
| POST/DELETE | `/api/v1/organizations/:orgId/invitations` | Invitations |

## Environment

Copy `.env.example` to `.env` and set at minimum:

- `BETTER_AUTH_SECRET` (min 32 chars — `openssl rand -base64 32`)
- `BETTER_AUTH_URL` (API URL, e.g. `http://localhost:4000`)
- `CLIENT_URL` (frontend origin for CORS/trusted origins)

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with hot reload |
| `pnpm build` | Generate Prisma client and compile TypeScript |
| `pnpm start` | Run production build |
| `pnpm typecheck` | TypeScript check |
| `pnpm bootstrap` | Fresh clone setup (env, prisma, migrations) |
| `make check` | Lint, format, typecheck, audit, tests |
| `make ci` | Full CI gate (same as pre-push) |

## Docker

```bash
docker compose up --build
docker compose -f docker-compose.dev.yml up
```

## RBAC permissions

`organization:update`, `organization:delete`, `member:create`, `member:update`, `member:delete`, `invitation:create`, `invitation:cancel`

Roles: `owner`, `admin`, `member` — see `src/lib/org-permissions.ts`.
