# Deployment

## Build

```bash
pnpm install
pnpm build
```

Produces compiled JavaScript in `dist/`. Prisma client is generated during build.

## Production start

```bash
NODE_ENV=production node dist/server.js
```

Or via Docker (see below).

## Environment variables (production)

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Min 32 chars; rotate on compromise |
| `BETTER_AUTH_URL` | Yes | Public API origin |
| `CLIENT_URL` | Yes | Frontend origin for CORS |
| `TRUST_PROXY` | Yes (behind proxy) | `"true"` for nginx/ALB |
| `NODE_ENV` | Yes | `production` |
| `UPSTASH_REDIS_REST_URL` | Yes | Rate limiting in production |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Rate limiting in production |
| `RESEND_API_KEY` | Recommended | Email delivery |
| `LOG_LEVEL` | No | Default `info` |

See [postgresql.md](./postgresql.md) for database migration.

## Docker

```bash
# Development with hot reload
pnpm docker:dev

# Production
pnpm docker:prod
```

Multi-stage `Dockerfile`:

1. **Build stage** — install deps, `prisma generate`, `tsc`
2. **Production stage** — `node:20-alpine`, copy `dist/`, run `node dist/server.js`

`docker-compose.yml` can include optional PostgreSQL service.

## Health checks

| Endpoint | Purpose | Expected |
|----------|---------|----------|
| `GET /health` | Liveness | 200 |
| `GET /ready` | Readiness (DB) | 200 when DB connected |
| `GET /api/auth/ok` | Auth handler | 200 |

Configure load balancer/orchestrator to use `/ready` for readiness probes.

## Graceful shutdown

`src/server.ts` handles `SIGTERM` and `SIGINT`:

1. Stop accepting new connections
2. Wait for in-flight requests to complete
3. Disconnect Prisma client
4. Exit

Kubernetes/Docker sends `SIGTERM` on pod stop — ensure `terminationGracePeriodSeconds` allows enough time (30s recommended).

## Reverse proxy

When behind nginx, Caddy, or ALB:

```env
TRUST_PROXY=true
```

```typescript
app.set('trust proxy', 1);
```

Required for secure cookies and correct client IP in rate limiting.

## Platforms

| Platform | Notes |
|----------|-------|
| Railway / Fly.io | Set env vars, use PostgreSQL addon, `prisma migrate deploy` on deploy |
| AWS ECS / Fargate | Docker image, ALB health check on `/ready`, `TRUST_PROXY=true` |
| DigitalOcean App Platform | Dockerfile deploy, managed PostgreSQL |

## Database migrations

```bash
pnpm exec prisma migrate deploy
```

Run on every deploy before starting the server.

## Process manager (optional)

For VPS deployments without containers, use PM2:

```bash
pm2 start dist/server.js --name express-api
```

Prefer container orchestration for production.

## Security checklist

- [ ] `BETTER_AUTH_SECRET` is unique per environment
- [ ] PostgreSQL with SSL (`?sslmode=require`)
- [ ] CORS restricted to `CLIENT_URL` (no wildcard)
- [ ] Upstash rate limiting enabled
- [ ] No stack traces in error responses
- [ ] Secrets not in Docker image layers

See [security-policy.md](./security-policy.md) and [threat-model.md](./threat-model.md).
