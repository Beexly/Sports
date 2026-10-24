# Launch-Night Session Coordination

Two Claude sessions are working in parallel on the launch-night build.
This file is the shared marker so they don't duplicate work. Each
session appends to its own section. Read before opening a file.

## Session A — "Launch sports intelligence dashboard tonight"

Session A is owning the dashboard's visual surface and a parallel
demo-mode pattern. As of this update, Session A has shipped (observed
from the current `apps/web/app/dashboard/page.tsx`):

- `isDemoPicksEnabled()` helper exported from `@sports/db`
- `demoActive = isDemoPicksEnabled() && stubMode` flag on /dashboard
- `<SampleDataBanner />` and `<PickRow />` components inside the
  dashboard page
- `dashboard-sample-mode` data-testid on the inline "Sample mode" pill
- `todayPicks` query returning the day's picks rendered as a list

Session B has stopped duplicating that surface. Where Session B added
overlapping `todaysPicks` / `recentSettledList` queries earlier in the
loop, those have been superseded by Session A's structure and are no
longer in the file.

## Session B — "Jarvis Launch Observatory"

This session built the Jarvis cockpit, history ledger, policy gate, and
the testing/docs harness. Latest deliverables:

- `packages/db/prisma/seed.ts` — added `seedPicks()` that generates ~38
  synthetic picks across NFL/NBA/MLB/NHL/NCAAF. Idempotent on
  `db.pick.count() === 0`, blocked in production.
- `apps/web/app/dashboard/page.tsx` — added "Today's picks" and
  "Recent results" tiles fetching from `db.pick`. Both queries filter
  `isBootstrap: false`.
- `apps/web/app/cockpit/page.tsx` — added a "Picks at a glance"
  section with concrete counts (today, pending canonical, settled 7d,
  canonical, bootstrap, featured) + freshness timestamps.
- `apps/web/lib/cockpit/jarvis.ts` — `oneSentenceAssessment` now
  references canonical/pending/bootstrap counts in every status case.

### What Session B intentionally did NOT touch

- `apps/web/app/cockpit/page.tsx` rewrites — left the user's structure
  intact, only inserted the picks-glance section.
- `/api/picks` and `/api/picks/daily-slate` — already gate-checked
  earlier.
- Live ingestion path (`workers/data-refresh`, `processSport`) — not
  modified; the seed is the only synthetic data source.
- The performance gate or the public-performance policy — synthetic
  picks must never unlock public claims.

### What Session A should consider building on top

- Wire `/picks` page to consume the seeded picks (it already does via
  `/api/picks`, but render polish may help).
- Add a "demo mode" indicator on `/picks` when synthetic picks are the
  source (modelVersion `v5.0.0-seed`).
- Surface model-version distribution in `/cockpit/history` so the
  operator can distinguish seed picks from real ingestion output.

### Tests added by Session B

- `apps/web/__tests__/seed-picks-wiring.test.ts`
- `apps/web/__tests__/cockpit-picks-glance.test.ts`
- `apps/web/__tests__/dashboard-picks-tiles.test.ts`

All Session B test files use the existing source-level invariant
pattern (read file, regex assertions). No DB or Next.js runtime
required to execute.

## /admin/dashboard (Session A simplification)

The admin dashboard view shipped earlier in the loop (live launch-status
pill probing `/api/cockpit/jarvis`) has been simplified by Session A to
a thin landing page with a link grid into the `/cockpit/*` subroutes.
`/admin/dashboard` still gates on `role !== "ADMIN"`. The Jarvis probe
is owned by `/cockpit` itself now.

## Cross-session updates

Session A has also shipped (observed):
- `apps/web/app/cockpit/page.tsx` — added a "Today's picks" chip in the
  header next to the launch-status pill. Reads from `db.pick` with the
  start-of-day filter; annotates `(sample)` when `demoActive` is true.

Session B added on top of Session A's work (deliverables that are
still on disk):
- `/cockpit/history` Source filter pill (live vs seed) so the operator
  can isolate `modelVersion === "v5.0.0-seed"` rows.
- `seedPicks()` in the Prisma seed for ~38 db-backed picks
  (idempotent, dev-only).
- `/api/picks` `meta.containsSeedData` flag (Session A's
  `sample-data-banner-picks` consumes the equivalent state via
  `demoActive = isStubMode() && isDemoPicksEnabled()`).
- `oneSentenceAssessment` overhaul in `lib/cockpit/jarvis.ts` — now
  cites `canonical / pending / bootstrap excluded` counts in every
  status case.
- `scripts/morning-setup.mjs` — one-shot operator helper.

Safety decision (Session A's call, kept): the customer-facing
canonical-count queries DO include seed picks. Safety is at the gate
layer — `seedPicks()` is dev-only, `PERFORMANCE_STATS_ENABLED` defaults
off, the `Sample mode` disclosure surfaces whenever seeded picks
render. The extracted `lib/dashboard/load-performance.ts` is the only
loader that filters the seed, kept as a safer default for any future
caller.

## Shared expectations

- Run `npm run test:fast` before committing — covers brand-safety and
  cockpit invariants in under 2 minutes.
- All synthetic picks ship with `modelVersion='v5.0.0-seed'` so they
  can be purged later.
- The `Verified Record` / `Win Rate` display on `/dashboard` is gated
  by the public-performance policy regardless of seed data. Neither
  session should weaken that gate.
