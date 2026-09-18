# ever-gauzy as reference architecture: monorepo patterns and multi-tenancy

Read on 2026-09-18 at the founder's request, scoped to two questions: monorepo structure
and multi-tenancy. Source: `ever-co/ever-gauzy`, public, cloned shallow. Every claim below
was checked in that tree, not recalled.

## 1. Monorepo

| | ever-gauzy | GSE |
|---|---|---|
| Packages | 36 across `apps/*`, `packages/*`, `packages/plugins/*`, `tools` | 25 across `apps/*`, `packages/*`, `workers/*` |
| Tooling | Nx plus Lerna plus Yarn 1 classic | npm workspaces, no orchestrator |
| Boundary enforcement | Nx project graph and tags | none today |

**The pattern worth taking, and we already have it.** Gauzy puts every shared interface in
`packages/contracts`, a dependency-free package everything else imports. That is exactly
the role `@sports/types` plays here, and it is why the 22 files that partially mock
`@sports/prediction-engine` do not break anything crossing through it. The convergence is
worth making explicit as a rule rather than leaving as an accident:

> Anything both `apps/web` and `packages/*` need crosses through `@sports/types`. It is the
> contracts package. It takes no dependency on either side.

**What not to take.** Nx plus Lerna plus Yarn 1 is three overlapping tools and Yarn 1 is
end of life. At 25 packages npm workspaces is adequate. The one capability Nx buys that we
lack is a machine-checked dependency graph, which would turn "`packages/*` never imports
`apps/web`" into a build error rather than a convention. That gap is real, and the cheap
close is an enumerating test (mainline queue wave 4, task 14), not an Nx migration.

## 2. Multi-tenancy

Their model is a two-level inheritance chain, and it is clean:

- `packages/core/src/lib/core/entities/tenant-base.entity.ts:10` defines
  `TenantBaseEntity`, adding an indexed nullable `tenantId` with `onDelete: CASCADE`.
- `tenant-organization-base.entity.ts` extends it with `organizationId`, same shape.
- **136 entities** under `packages/core/src/lib` inherit the tenant plus organization base.

**The finding that matters, and it argues against adopting the approach.** Isolation is
**not automatic**. There is no query-level guard, no row-level security, and no ORM
middleware that scopes reads. Enforcement is `RequestContext.currentTenantId()`
(`packages/core/src/lib/core/context/request-context.ts:189`), which reads the tenant off
the current user and is called manually across **196 files**, with **42 sites** writing
`tenantId: RequestContext.currentTenantId()` into a where clause by hand.

So a single forgotten `tenantId` on a single query is a cross-tenant read, and neither the
type system nor the database prevents it. For a mature open-source ERP that is a known and
managed tradeoff. Adopting it here would import a new permanent class of defect into a
codebase whose current problem is that its learning loop has never closed.

## 3. Where GSE actually stands

Verified in `packages/db/prisma/schema.prisma`: **single-tenant**. No `Tenant`,
`Organization` or `Workspace` model, and zero occurrences of `tenantId`, `organizationId`
or `workspaceId`. The only model matching the search is `Account` at `:46`, which is
NextAuth's OAuth record and not a tenant.

The one signal toward a future need is `packages/partner-stack` (`assessPartner`,
`grantCredits`, `allowedRevenueStreams`, `REVENUE_STREAMS`, `BLOCKED_PARTNER_KINDS`). It
has exactly one importer outside its own directory,
`apps/web/lib/gse-stats/session-tier.ts`. Partner revenue is scaffolded, not live.

## 4. Recommendation

**Do not build multi-tenancy now.** It is only worth it if the white-label or partner path
becomes real, and retrofitting a tenant key means touching every table, every query and
every cron. That is a large founder-gated migration competing directly with work already
queued.

**When it does become real, do not copy this pattern.** Use Postgres row-level security so
the database enforces isolation and a forgotten predicate fails closed rather than leaking.
Manual context threading fails open, which is the wrong direction for a defect nobody sees
until it has already happened. Row-level security is strictly safer and we would be
adopting it fresh instead of inheriting someone else's debt.

**The decision that unblocks this:** is partner or white-label revenue a this-quarter path
or a someday path? A someday answer means this document is the whole deliverable and the
row stays closed.

## 5. What was not examined

Scoped to the founder's two questions. Not read: their plugin architecture, the desktop
application packages, the MCP server package, their authentication and authorization
model beyond the tenant accessor, their migration strategy, or their test approach. Any of
those is a separate pass and none was sampled, so nothing should be inferred about them
from this document.
