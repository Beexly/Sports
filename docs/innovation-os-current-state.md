# Innovation OS Current State

Last updated: 2026-05-22

## Phase 0 Foundation

The current branch is stabilized around three internal trust/compliance surfaces:

- Loss Autopsy and Loss Room
- Promo Desk operator registry
- Market Twin cockpit posture view

The accidental nested `Sports/` checkout is ignored from the root repository so it no longer pollutes `git status`.

## Loss Autopsy

The Prisma schema now adds `LossAutopsy`, related one-to-one with `Pick`, plus `LossAutopsyStatus` and `LossRootCause` enums. The migration is:

- `packages/db/prisma/migrations/20260522141600_add_loss_autopsy/migration.sql`

The migration creates `loss_autopsies`, indexes authored time, status, and root cause, and enforces a unique autopsy per pick. Rollback is straightforward while no production data depends on it: drop the foreign key, indexes, table, then the two enums.

Current UI/API state:

- `/cockpit/losses` is a read-only operator queue for authored autopsies.
- `/performance/losses` is the public Loss Room surface. It shows published autopsies when present and falls back to settled non-bootstrap published losses awaiting full writeup.
- `/performance/losses/[id]` provides the detail view for authored or fallback loss entries.

## Promo Desk

`apps/web/lib/cockpit/operator-registry.ts` is the code-reviewed operator registry. All current rows are demo operators. There are no approved partners.

Public promotion publishing is intentionally blocked unless an operator is present and classified as `APPROVED_PARTNER`. The promotion guards now return `OPERATOR_NOT_APPROVED` when:

- the sportsbook key is unknown,
- the operator is demo, blocked, or not partnered,
- or the registry has zero publishable partners.

Current UI/API state:

- `/cockpit/promo-desk` shows the registry summary and registered operators.
- `/api/cockpit/operator-registry` exposes the same registry to admins only.
- Public promotion payload tests now expect no public promo rows while no approved partners exist.

## Market Twin

Market Twin is an internal read-only cockpit surface for upcoming board posture.

Current UI/API state:

- `/cockpit/market-twin` lists scheduled games for the next seven days and classifies them as `READY_TO_SCORE`, `WATCH_ONLY`, `CONFLICT`, or `QUIET`.
- `/api/cockpit/market-twin` exposes the same admin-only rows.

The first version uses existing `Game` fields: bookmaker coverage, context freshness, and line movement spread.

## Build Safety

The homepage now skips its self-fetch to `/api/picks` when `DATABASE_URL=stub`. This prevents static generation from hanging during safe local builds where no Next server is listening at `localhost:3000`.

Live/non-stub behavior is unchanged.

## Verification

Green on 2026-05-22:

- `npm.cmd run lint --workspace=apps/web`
- `npm.cmd run typecheck`
- `$env:DATABASE_URL='stub'; npm.cmd run test --workspace=apps/web`
- `$env:DATABASE_URL='stub'; npm.cmd run build --workspace=apps/web`

Plain build without the stub override still depends on valid local Postgres credentials in `.env`.
