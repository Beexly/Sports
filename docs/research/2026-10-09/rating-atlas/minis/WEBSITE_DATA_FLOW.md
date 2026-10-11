# WEBSITE DATA FLOW — How galaxysportsedge.com Gets Its Data

**Date:** 2026-10-11
**Branch:** `research/rating-atlas-2026-10-09-packet`
**Status:** Reconnaissance only — no code changed.

## TL;DR

The site is **deliberately gated, not broken**. Three separate founder gates hold it in "honest empty" mode:
1. **`LIVE_BOARD` env var** (defaults `false`) — the board shows "held by founder gate" until Garrett sets it `true` in Vercel
2. **Freshness/calibration gates** — picks only surface if they're fresh and pass quality thresholds
3. **Illustrative fallbacks** — the DFS optimizer and projections default to hardcoded sample data until a live provider is registered

The data plumbing (Neon → API → frontend) is real and working. The gates are what show "n/a" / "building" / empty states.

---

## Page → API Route → Data Source Map

### 1. `/board` page

| Layer | Detail |
|---|---|
| **Page** | `apps/web/app/board/page.tsx` (496 lines) |
| **API call** | `GET /api/board/state` |
| **Route** | `apps/web/app/api/board/state/route.ts` (39 lines) |
| **Loader** | `loadBoardState()` in `apps/web/lib/board/state.ts` (1,138 lines) |
| **Data source** | **Neon Postgres** via `@sports/db` |
| **What's real** | Real DB queries against the picks/games tables |
| **What's fallback** | `classifyBoardState()` returns honest-empty states |

**The gates (in order):**
1. `LIVE_BOARD` env var → `liveBoardOn()` — if not `"true"`, returns `HONEST_EMPTY_LIVE_BOARD_OFF` ("Live board is held (founder gate)")
2. `freshPickWhere()` — stale pick policy; old picks filtered out
3. `isPublicPicksSurfaceStale()` — public freshness gate
4. Calibration gates, selective publish filters
5. Three output lanes: `SCORING_NOW` / `PUBLISHED_TODAY` / `GATED_TODAY`

**Why Garrett sees "n/a":** `LIVE_BOARD` is not set to `"true"` in production. The classifier honestly refuses to show a board. This is intentional — not a bug.

### 2. `/picks` page

| Layer | Detail |
|---|---|
| **Page** | `apps/web/app/picks/page.tsx` (868 lines) |
| **API calls** | `GET /api/picks`, `GET /api/picks/daily-slate`, `GET /api/ops/public-surface-truth` |
| **Route** | `apps/web/app/api/picks/route.ts` |
| **Data source** | **Neon Postgres** via `@sports/db` — DB-heavy route (findMany + count + per-pick filters) |
| **What's real** | Real DB queries with intelligence enrichment |
| **What's fallback** | Empty when no picks pass the gates |

**The gates (in order):**
1. `getReadinessGates()` from `@sports/prediction-engine` — readiness must pass
2. `freshPickWhere()` — stale pick policy
3. `MIN_PUBLIC_PICK_DATA_QUALITY_SCORE` — quality threshold
4. `passesPublicSelectiveFilterAsync()` — selective publish
5. `dropContradictedModelSignals()` — coherence filter
6. `dropAdverseEdgePicks()` — adverse edge suppression
7. Intelligence enrichment, consensus, edge scores, confidence calibration

**Why Garrett sees empty:** No picks in Neon pass all gates, OR the picks table has no fresh rows. The route is working — it's refusing to show stale/low-quality picks.

### 3. DFS Optimizer (site tool)

| Layer | Detail |
|---|---|
| **Engine** | `apps/web/lib/fantasy/dfs-optimizer.ts` (663 lines) — real optimizer |
| **Slate source** | `activeDfsSlate()` in `apps/web/lib/integrations/dfs.ts` (49 lines) |
| **Data source** | **HARDCODED ILLUSTRATIVE** by default |
| **What's real** | The optimizer logic (heuristic + branch-and-bound) |
| **What's fallback** | **The entire player pool** — `ILLUSTRATIVE_DFS` serves `DFS_SLATE` from `dfs-slate.ts` |

**The gate:**
```typescript
export function activeDfsSlate(env = process.env): readonly DfsPlayer[] {
  const provider = resolveDfsSlateProvider(env);
  return provider.live ? provider.slate() : DFS_SLATE; // <-- always DFS_SLATE today
}
```

Live data requires BOTH:
1. `registerDfsSlateProvider(liveProvider)` called at startup with `live: true`
2. `isConfigured("dfs", env)` — env flag set

**Neither is done.** The optimizer runs on sample players. This is the "dummy data" Garrett sees.

### 4. Projections (fantasy tools)

| Layer | Detail |
|---|---|
| **Provider** | `apps/web/lib/integrations/projections.ts` |
| **Data source** | **HARDCODED ILLUSTRATIVE** by default |
| **What's real** | The projection-consuming engines (lineup, waivers, trade, DFS) |
| **What's fallback** | **The entire player pool** — `ILLUSTRATIVE_PROJECTIONS` serves `PLAYERS` from `players.ts` |

Same founder-gate pattern: live only when `registerProjectionsProvider()` is called with a live provider AND env flag is set. Neither is done.

### 5. `/api/projections`

| Layer | Detail |
|---|---|
| **Route** | `apps/web/app/api/projections/route.ts` |
| **Loader** | `loadPlayerProjections(season)` in `@/lib/projections/player-projections` |
| **Gate** | Premium-gated (`requirePremiumApiRateLimited`) |
| **Data source** | DB or file-based (need to verify which) |

---

## What "n/a" and "building" Actually Are

These aren't error messages — they're **honest-empty states** from `classify-board-state.ts`:

| State | Meaning | What triggers it |
|---|---|---|
| `HONEST_EMPTY_LIVE_BOARD_OFF` | "Live board is held (founder gate)" | `LIVE_BOARD` env ≠ `"true"` ← **current state** |
| `HONEST_EMPTY_NO_ELIGIBLE` | "No eligible rows after gate" | LIVE_BOARD on, but zero picks pass freshness/calibration |
| `SUPPRESSED_DEMO` | "Demo rows were suppressed" | Illustrative data blocked from public |
| `SUPPRESSED_STALE` | "Stale rows were suppressed" | Kill-switch emptied stale data |
| `DB_UNREACHABLE` | "Data store did not answer" | Neon connection failed |
| `BOOTSTRAP` | "Bootstrap mode" | Seed mode, not a live claim |

---

## What It Would Take to Put Real Data on the Site

### Option A: Open the existing gates (minimal code, needs Garrett's keys)

1. **Set `LIVE_BOARD=true`** in Vercel env vars → opens the board founder gate
2. **Write fresh picks to Neon** — the engine (Python) needs to insert rows into the predictions/picks table with fresh `fetchedAt`/`observed_at`
3. **Register live DFS slate provider** — code change in `instrumentation.ts` or app startup:
   ```typescript
   registerDfsSlateProvider({
     name: "GSE Live Slate",
     live: true,
     slate: () => realPlayersFrom587Pool, // the DK draftables
   });
   ```
   Plus set the `dfs` configured env flag.
4. **Register live projections provider** — same pattern with the real player pool
5. **Redeploy** (blocked on migration ledger — see below)

### Option B: Serve engine outputs as static JSON (no DB, no deploy block)

1. Create new API routes (e.g., `/api/board/engine`, `/api/dfs/lineups`) that read from JSON files
2. Push `edge5_board_2026-10-11.json`, `week5_millionaire_lineups_jev.json`, etc. to the repo
3. Frontend fetches these directly — no Neon, no gates, no env flags
4. Still needs a Vercel deploy to go live

### Blockers

- **Vercel deploy is blocked** on Prisma migration ledger drift (53 migrations squashed, DB still has old rows). See `docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md`. No deploy = no site changes go live.
- **Neon predictions table** needs fresh rows. Last verified state had stale data (latest `2026-10-03`).
- **No live slate provider exists** in the codebase — someone must write the registration code.

---

## File Reference

| Component | Path on `main` |
|---|---|
| Board page | `apps/web/app/board/page.tsx` |
| Board API | `apps/web/app/api/board/state/route.ts` |
| Board loader | `apps/web/lib/board/state.ts` |
| Board classifier | `apps/web/lib/board/classify-board-state.ts` |
| Picks page | `apps/web/app/picks/page.tsx` |
| Picks API | `apps/web/app/api/picks/route.ts` |
| DFS slate provider | `apps/web/lib/integrations/dfs.ts` |
| Projections provider | `apps/web/lib/integrations/projections.ts` |
| DFS optimizer | `apps/web/lib/fantasy/dfs-optimizer.ts` |
| DFS correlation (10k sim) | `apps/web/lib/fantasy/dfs-correlation.ts` |
| GSE Score | `apps/web/lib/fantasy/gse-score.ts` |
| Projections API | `apps/web/app/api/projections/route.ts` |
| DFS salaries API | `apps/web/app/api/dfs/salaries/route.ts` |
