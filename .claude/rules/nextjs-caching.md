---
description: No stale data — dynamic rendering and no-store responses for anything entitlement- or odds-dependent
paths:
  - "apps/web/app/**"
---

# No Stale Data (App Router)

CLAUDE.md non-negotiable #5: **no stale data — always validate timestamps and freshness.** This app is App Router only — there is no `pages/` directory, and it must stay that way.

## The rule

Any `page.tsx` or `route.ts` that reads picks, odds, lines, calibration, settlement, or entitlements must opt out of Next's render/data cache:

```ts
export const dynamic = "force-dynamic";
// or, where finer-grained: revalidate = 0
```

API routes must return through the `jsonNoStore` helper (`apps/web/lib/api/no-store.ts`) rather than a bare `NextResponse.json(...)`:

```ts
export function jsonNoStore(
  body: unknown,
  init?: { status?: number; headers?: Record<string, string> },
): NextResponse
```

It sets `Cache-Control: no-store, no-cache, must-revalidate` — deliberately `no-store` rather than `no-cache`, so nothing is written down by an intermediary at all. This closes two real failure modes: a cached 503 kill-switch response that keeps serving after the flag flips back on, and a cached 200 slate populated for one tier's `meta.tier` / `canSeeConfidence` / filtered `data` that then bleeds to another tier at the edge — the second is a paywall bypass and squarely CLAUDE.md rule #3's territory, not just staleness.

## Rules

1. `force-dynamic` (or `revalidate = 0`) on every page/route touching picks, odds, lines, calibration, settlement, or entitlements — no exceptions for "it's probably fine to cache for a minute."
2. Every such API route returns via `jsonNoStore`, including error/gate responses (503 bootstrap/stale-data gates, 403 entitlement denials) — not just the 200 happy path. A cacheable error is exactly as dangerous as a cacheable success.
3. Entitlement-dependent output is never cached, full stop — even a page that isn't primarily "picks" (e.g. a dashboard aggregating tier-gated widgets) must not let Next memoize a response shaped by `meta.tier`.
4. Static marketing pages (landing, pricing copy, legal) may use ISR/static generation — this rule is scoped to data that changes or that varies by viewer entitlement, not the whole app.
5. App Router only. No `pages/` directory — if one appears, that's a regression, not a valid alternative routing surface.

## Real examples already doing this correctly

- `apps/web/app/api/picks/route.ts` — `export const dynamic = "force-dynamic"` (line 22) plus every response (200 slate, 503 bootstrap/stale gates) wrapped in `jsonNoStore`.
- `apps/web/app/api/picks/daily-slate/route.ts` — same `jsonNoStore` pattern on both the gate responses and the data response.
- `apps/web/app/board/page.tsx` — `export const dynamic = "force-dynamic"` (line 28) on the page that renders the entitlement-filtered board.
- `apps/web/app/api/board/state/route.ts` — `export const dynamic = "force-dynamic"` (line 7) on the board's underlying state API.
