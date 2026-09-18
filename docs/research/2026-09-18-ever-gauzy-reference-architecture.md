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

## 4. Recommendation, corrected

An earlier revision of this section said "do not build multi-tenancy now". That was wrong,
and it was wrong in the specific direction this project keeps having to correct: it treated
a product decision that is not yet made as a reason to defer foundational work whose cost
only rises with time.

**Build the foundation now. Gate the product decision separately.** Retrofitting a tenant
key is a function of how much data and how many customers exist when you do it. Today every
row belongs to one tenant by definition, so the backfill is a constant and every migration
is reversible. After white-label revenue exists it is surgery under load. This is the same
wall-clock asymmetry that governs the capture plane, applied to schema rather than sample,
and the earlier recommendation failed to apply it.

**Our position is much better than theirs, and one measured fact is why.** This repository
exports ONE database client, `export const db` at `packages/db/src/index.ts:250`, imported
by 308 files. Gauzy threads tenant context by hand through 196 files because it has no such
chokepoint. We can enforce centrally in two layers that both fail CLOSED: Postgres
row-level security so the database refuses cross-tenant rows, and a Prisma client extension
at the single `db` export so the policies have a tenant to read. Neither depends on a
developer remembering anything, which is the whole difference from the reference
implementation.

**The hazard that decides the design.** `packages/db/src/index.ts:225-233` builds a Neon
`Pool`, and the fallback client pools too. A pooled connection is reused by the next
request, so a session-level `SET app.current_tenant` leaks the previous request's tenant
into the next one, which is precisely the vulnerability the work exists to prevent. Every
assignment must be `SET LOCAL` inside an explicit transaction. There are 67 non-test
`$transaction` call sites already, so the pattern exists here.

**What is queued.** `docs/ops/hermes/BUILD-QUEUE-2026-09-18-tenancy.md`, six tasks, with
the property that merged and deployed with no founder action, nothing behaves differently:
a pure tenancy library in `@sports/types`, a tested client extension attached to nothing,
two SQL proposals the founder applies on his own schedule, an enumerating guard committed
skipped with a named unskip condition, and a cutover runbook.

**The founder decision that remains, and it is narrower than before:** not whether to build
the foundation, but which tables are tenant-scoped. The queue classifies each of the 102
models three ways and escalates the ambiguous set rather than resolving it, because a wrong
call leaks in one direction and needlessly scopes global reference data in the other. If
the answer turns out to be that white-label is never a path, phase one simply is not
applied and the foundation sits on the shelf at zero running cost.

## 5. What was not examined

Scoped to the founder's two questions. Not read: their plugin architecture, the desktop
application packages, the MCP server package, their authentication and authorization
model beyond the tenant accessor, their migration strategy, or their test approach. Any of
those is a separate pass and none was sampled, so nothing should be inferred about them
from this document.
