# Getting Started

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| pnpm | latest | `npm i -g pnpm` |
| Graphify CLI (optional) | latest | `uv tool install graphifyy` |

## Fresh clone setup

```bash
git clone <repo-url> express-cursor-boilerplate
cd express-cursor-boilerplate
pnpm install
pnpm bootstrap
```

`pnpm bootstrap` will:

1. Copy `.env.example` → `.env` if missing
2. Generate Prisma client and push the SQLite schema
3. Install Husky git hooks
4. Build Graphify knowledge graph (if CLI is installed)

## Start development

```bash
pnpm dev
```

The API starts on **http://localhost:4000** by default.

Verify Better Auth is mounted:

```bash
curl http://localhost:4000/api/auth/ok
```

## Environment variables

Minimum required (see `.env.example` for full list):

```env
DATABASE_URL="file:./prisma/dev.db"
BETTER_AUTH_SECRET="your-secret-at-least-32-characters-long"
BETTER_AUTH_URL="http://localhost:4000"
CLIENT_URL="http://localhost:3000"
PORT=4000
```

## Common commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start dev server with hot reload |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm start` | Run production build |
| `pnpm test` | Vitest watch mode |
| `pnpm test:ci` | Vitest single run (unit) |
| `pnpm test:integration` | Supertest integration tests |
| `make check` | Lint, format, typecheck, audit, unit tests |
| `make pre-push` | Full CI gate including integration tests |

## Pairing with Next.js frontend

When used alongside the Next.js boilerplate:

1. Set Express `CLIENT_URL=http://localhost:3000`
2. Set Next.js `BETTER_AUTH_URL=http://localhost:4000` (or proxy auth routes)
3. See [auth.md](./auth.md) for CORS and cookie details

## Next steps

- [API reference](./api.md)
- [Multitenancy guide](./multitenancy.md)
- [Auth setup](./auth.md)
- [Graphify setup](./graphify-setup.md)
