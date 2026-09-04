# Multitenancy

Organization-based multitenancy via Better Auth's `organization()` plugin.

## Tenant model

| Concept | Implementation |
|---------|----------------|
| Tenant | `Organization` record |
| Membership | `Member` record linking `User` ↔ `Organization` |
| Active tenant | `Session.activeOrganizationId` |
| Roles | `owner`, `admin`, `member` |
| Default workspace | Personal org created on signup via `databaseHooks` |

## RBAC matrix

Permissions are defined in `src/lib/org-permissions.ts`:

| Permission | owner | admin | member |
|------------|:-----:|:-----:|:------:|
| `organization:update` | ✓ | ✓ | |
| `organization:delete` | ✓ | | |
| `member:create` | ✓ | ✓ | |
| `member:update` | ✓ | ✓ | |
| `member:delete` | ✓ | ✓ | |
| `invitation:create` | ✓ | ✓ | |
| `invitation:cancel` | ✓ | ✓ | |

Use `can(role, permission)` for checks and `requireOrgPermission()` in services/middleware.

## Tenant isolation rules

1. **Session-scoped org ID** — use `session.activeOrganizationId` for default scoping
2. **Path param verification** — when `:orgId` is in the URL, call `assertOrgMember(userId, orgId)` before any query
3. **Never trust body** — do not accept `organizationId` from request body without membership check
4. **Filter all queries** — org-scoped lists must include `where: { organizationId }`
5. **Generic errors** — return 403 Forbidden, not 404, when user lacks membership (prevents enumeration)

## Middleware chain

Protected org routes use:

```text
requireSession → requireActiveOrg → requireOrgPermission('...') → controller
```

## Adding org-scoped models

1. Add model to `prisma/schema.prisma`:

```prisma
model Project {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  name           String
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([organizationId])
}
```

2. Create module under `src/modules/project/` with routes, controller, service, schema
3. In service methods:
   - Accept `userId` and `organizationId` from verified session
   - Call `assertOrgMember(userId, organizationId)` before reads/writes
   - Always filter: `where: { organizationId }`
4. Add RBAC permission if needed (extend `OrgPermission` type and `ROLE_PERMISSIONS`)
5. Add tests in `tests/integration/` for IDOR prevention

## Switching active organization

`POST /api/v1/organizations/switch` sets `activeOrganizationId` on the session after verifying membership.

Better Auth organization plugin also provides org switch via `/api/auth/*` client API.

## v2 extension points (not implemented)

- Subdomain or `X-Tenant-Id` header resolution
- Per-org API keys
- Row-level audit log (`AuditEvent` model)
- Stripe billing per org
