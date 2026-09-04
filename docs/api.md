# API Reference

REST API at `/api/v1/*`. Auth endpoints at `/api/auth/*` (Better Auth — see [auth.md](./auth.md)).

Interactive OpenAPI docs: `GET /api/v1/docs` (when enabled).

## Response envelope

**Success:**

```json
{
  "success": true,
  "data": {},
  "meta": { "requestId": "uuid" }
}
```

**Error:**

```json
{
  "success": false,
  "error": { "code": "FORBIDDEN", "message": "Insufficient permissions" }
}
```

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | none | Liveness probe |
| GET | `/ready` | none | Readiness probe (includes DB check) |
| GET | `/api/auth/ok` | none | Better Auth handler health |

## User / session

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/me` | session | Current user + active org summary |
| GET | `/api/v1/me/organizations` | session | List user's organizations with roles |

## Organizations

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/api/v1/organizations` | session | Create organization |
| GET | `/api/v1/organizations/:orgId` | member | Org details (IDOR-safe) |
| PATCH | `/api/v1/organizations/:orgId` | `organization:update` | Update name/slug/logo |
| DELETE | `/api/v1/organizations/:orgId` | `organization:delete` | Delete org (owner only) |
| POST | `/api/v1/organizations/switch` | member | Set `activeOrganizationId` on session |
| GET | `/api/v1/organizations/slug/:slug/available` | session | Check slug availability |

## Members

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/v1/organizations/:orgId/members` | member | List members (paginated) |
| PATCH | `/api/v1/organizations/:orgId/members/:memberId` | `member:update` | Change role |
| DELETE | `/api/v1/organizations/:orgId/members/:memberId` | `member:delete` | Remove member |

**Pagination query params:** `page` (default 1), `limit` (default 20, max 100).

## Invitations

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/v1/organizations/:orgId/invitations` | member | List pending invitations |
| POST | `/api/v1/organizations/:orgId/invitations` | `invitation:create` | Invite by email |
| DELETE | `/api/v1/organizations/:orgId/invitations/:invitationId` | `invitation:cancel` | Cancel pending invite |

## Status codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 403 | Forbidden (not authenticated, not a member, or insufficient RBAC) |
| 404 | Resource not found |
| 409 | Conflict (duplicate slug, existing member, etc.) |
| 429 | Rate limited (auth endpoints) |
| 500 | Internal error (no stack trace in production) |

## RBAC permission strings

| Permission | owner | admin | member |
|------------|:-----:|:-----:|:------:|
| `organization:update` | ✓ | ✓ | |
| `organization:delete` | ✓ | | |
| `member:create` | ✓ | ✓ | |
| `member:update` | ✓ | ✓ | |
| `member:delete` | ✓ | ✓ | |
| `invitation:create` | ✓ | ✓ | |
| `invitation:cancel` | ✓ | ✓ | |

See [multitenancy.md](./multitenancy.md) for tenant isolation rules.
