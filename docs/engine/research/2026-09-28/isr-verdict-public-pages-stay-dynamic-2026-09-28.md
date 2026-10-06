# ISR verdict: the public money pages stay dynamic (2026-09-28)

**Finding:** the round-2 research recommended ISR for "public projections and
rankings" on the assumption those pages are identical for every visitor. That
assumption is FALSE for this app, and acting on it would leak tier-gated
content. This note exists so no agent "optimizes" these pages into a
correctness incident.

## Why /board, /picks, /slate must stay `force-dynamic`

- Each page calls `auth()` + `getUserEntitlements()` per request and renders
  different content per tier ("Free gets a daily teaser; Pro and Elite unlock
  the full set" — `apps/web/app/picks/page.tsx`).
- A single cached HTML shell served to everyone would show Pro content to
  logged-out visitors (or Free content to paying users). There is no per-tier
  ISR variant on one URL.
- `force-dynamic` on these routes is CORRECT. It is not a missed optimization.

## Why /performance stays `force-dynamic`

- Explicit repo rule: `.claude/rules/nextjs-caching.md` — "never let Next
  memoise this page." It reads settled picks and calibration state per
  request. Overriding a standing rule for a caching win is not allowed.

## Where ISR is still legitimate (coding-agent follow-up)

Uniform public pages with no per-visitor variation: identify them with the
public/private fence checklist (no signals, no methodology, no NGS, no
metrics internals — projections/rankings/published picks/outcomes only), then
apply the round-2 pattern: `revalidate = false` + on-demand `revalidatePath`
from a CRON_SECRET-protected route with warm-up fetch, `revalidate = 86400`
safety net where a TTL makes sense, `dynamic = 'force-dynamic'` (auto-private)
for everything internal. One uncached fetch or `cookies()`/`headers()` poisons
the whole route dynamic — verify with `next build && next start`.

## The real runtime wins (shipped or queued, no correctness risk)

- **Shipped 2026-09-28:** middleware matcher narrowed to gated paths only
  (was match-all-minus-statics; every public page view ran middleware for a
  no-op). `github.autoJobCancelation: true` in vercel.json (kills stacked
  builds from the fleet's push cadence). Pooled-connection boot guard in
  `@sports/db` (warns in production when `DATABASE_URL` is not a `-pooler`
  host with `?pgbouncer=true`; warn-only, never throws).
- **Queued (needs measurement, not guessing):** Fluid `memory: 512` +
  `maxDuration: 120-180` per cron route in vercel.json `functions` config.
  Do NOT apply blind — backtest-calibration, calibration-metrics,
  feature-recipe-backtest, hydrate-cold-plane and the backfill crons are
  compute-heavy and may OOM at 512MB. Measure peak memory per route first,
  then set per-route values; the money pipeline is not worth gambling for
  single-digit dollars/month.
