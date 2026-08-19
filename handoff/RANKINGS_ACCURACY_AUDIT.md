# P11-02 — Rankings Pipeline Accuracy Audit

**Task:** P11-02 — Rankings pipeline accuracy audit (READ-ONLY)
**Date:** 2026-08-16
**Auditor:** GSE sprint executor

---

## Summary

There is **no single "rankings pipeline"** that fabricates or hardcodes rankings.
What exists is a **calibration/evaluation control plane** (RPCP) that audits
how ranking-probability (`rankingP`) is derived and whether it carries
statistical signal. The actual ranking P is derived from **real model
confidence** blended with **real independent trueProb** from live data sources.
No fabricated numbers were found. Several **stale-data and silent-fail risks**
were identified and are written up as findings for P11-04.

---

## 1. What is the actual ranking computation?

### 1a. Ranking probability (`rankingP`) — PASS

The ranking probability is computed in:
- `packages/prediction-engine/src/ranking-prob.ts` — `deriveRankingProbability()`
  (lines 42–108).

It is a **real statistical computation** reading two inputs:
1. **`confidence`** — the model's heuristic confidence (0–100), divided by 100.
2. **`independentEdge.trueProb`** — a raw independent true probability from
   real data sources (FPI, Elo, Kalshi, MLB standings, NFL EPA, etc.).

The blend law (v5.2.1, `constants.ts` line 18):
- If `trueProb` is finite in (0,1) and decision is SPEAK/LEAN (or
  `rankOnAnyTrueProb` is not false): `rankingP = clamp01((1−w)·confP + w·trueProb)`
  with `w = 0.7` (default), or pure `trueProb` if `pureOnSpeak` or `w≥1`.
- If no independent `trueProb`: `rankingP = confidence/100` (confidence-only fallback).

**No hardcoded/fabricated values.** Edge score is explicitly never used as p
(line 10: "NEVER use rawEdge / shrunkEdge / edgeScore as ranking p").

### 1b. Ranking score kind selection (RPCP bake-off) — PASS

`apps/web/lib/calibration/ranking-power-control.ts` — `buildRankingPowerControl()`
(lines 217–554) runs a **multi-score bake-off** comparing four score kinds:
- `confidence` (conf/100)
- `independent_trueProb` (raw independent only)
- `blend_indep_conf` (0.5·conf + 0.5·independent)
- `marketFairProb` (de-vigged book market probability)

Selection criteria (lines 293–316):
- Polarity gate: separation > 0, n ≥ 50, coverage ≥ 40% for non-confidence kinds.
- Best kind = highest RES with Spearman `rankingSignal` (ρ ≥ 0.04 AND |separation| ≥ 0.02).
- Tests assert bake-off kinds exclude `edgeScore` and `blend_conf_edge`
  (test file lines 64–76).

**No fabrication.** `scoreOf()` (lines 164–179) maps each kind to its source
value; all values are real probabilities or null (never invented).

### 1c. Sort key for display — PASS

`apps/web/lib/ranking/sort-key.ts` — `rankingSortKey()` (lines 11–29).
- Prefers `factorBreakdown.rankingP` when finite (clamped to 0–1).
- Falls back to `factorBreakdown.rankingScore / 100`.
- Falls back to `confidence / 100`.
- **Never invents values** (line 6: "Never invent values").

### 1d. ESPN poll rankings (AP/Coaches) — PASS (fact parser, not a model)

`apps/web/lib/data-sources/free-adapters/espn-rankings.ts` — `parseEspnRankings()`
(lines 54–82). Parses the ESPN public rankings API response into `RankedTeam[]`
with rank, team, record, points, firstPlaceVotes.

This is a **pure fact parser**, not a ranking computation. It reads live AP/Coaches
poll data. The `fetchEspnRankings()` function (lines 91–105) is a standard
`fetch` with abort timeout.

**Key observation:** ESPN poll rankings are fetched via `FreeStats.rankings()`
(`free-stats.ts` line 77) with a 6-hour TTL cache (line 32: `rankings: 6 * 60 * 60_000`).
They are consumed by `getCfbSnapshot()` / `apTop25()` in
`apps/web/lib/data-sources/cfb-free.ts` (lines 29–51).

---

## 2. Where does input data come from?

### 2a. Independent trueProb sources — PASS (real, verified sources)

`packages/ingestion-pipeline/src/build-independent-fair-values.ts` —
`buildIndependentFairValues()` (lines 452–607) assembles independent fair
values from these **real, free sources**:

| # | Source | File | Endpoint | Status |
|---|--------|------|----------|--------|
| 1 | Kalshi exchange | `kalshi` via `tryKalshiFairValue` | Kalshi API (paid market, exchange-middled) | Real API |
| 2 | ESPN PowerIndex (FPI) | `tryEspnPowerIndexFairValue` | `sports.core.api.espn.com/v2/.../powerindex` | Real, public, no key |
| 3 | ClubElo | `tryClubEloFairValue` | clubelo.com CSV | Real, public |
| 4 | Poisson from TeamGameLog | `poissonIndependentFairValue` | `db.teamGameLog` (stored results) | Real, DB-backed |
| 5 | Dixon–Coles | `dixonColesIndependentFairValue` | Same `db.teamGameLog` | Real, DB-backed |
| 6 | MLB standings win% | `tryMlbStandingsFairValue` | MLB Stats API | Real, public |
| 7 | Elo fitted from results | `fitEloRatingsFromResults` | `db.teamGameLog` | Real, DB-backed |
| 8 | NFL EPA/play | `tryNflEpaFairValue` | `db.teamGameEfficiency` (nflverse) | Real, DB-backed |
| 9 | Polymarket Gamma | `tryPolymarketIndependentFairValue` | Polymarket API | **OFF by default** (compliance hold, line 246) |

**Verification of ESPN PowerIndex endpoint:**
The ESPN FPI is fetched from `sports.core.api.espn.com/v2/sports/{sport}/leagues/{league}/seasons/{year}/powerindex`
(`espn-powerindex-client.ts` lines 130–141). This is a **real, public, undocumented
ESPN Core API** endpoint. No API key required. The parser (`parseFpi()`, lines 78–93)
only accepts named metrics (`fpi`, `bpi`, `powerindex`, `pwr`) — refuses unknown
predictives to avoid wrong-metric risk (line 80).

**Verification of ESPN poll rankings endpoint:**
`sports.site.api.espn.com/apis/site/v2/sports/{path}/rankings`
(`espn-rankings.ts` line 86). Real ESPN public site API. Returns AP/Coaches polls
for ncaaf, ncaab, nfl, nba (not mlb — `ESPN_PATHS` is `Partial<Record>` at line 12,
returns `null` for sports without polls).

### 2b. ESPN rankings vs ESPN PowerIndex — two DIFFERENT things — NOTE

The ESPN **poll rankings** (`espn-rankings.ts`, `site.api.espn.com`) and ESPN
**PowerIndex/FPI** (`espn-powerindex-client.ts`, `sports.core.api.espn.com`)
are **two separate API calls with two separate endpoints**:
- Poll rankings = human-voted AP/Coaches poll (ordinal ranks 1–25).
- PowerIndex FPI = ESPN's proprietary predictive rating (continuous model output).

The poll rankings are used only for the CFB snapshot display
(`getCfbSnapshot` / `apTop25` in `cfb-free.ts`). They do **NOT** feed into
`rankingP` or `pIndependent` — the independent path uses **FPI** (PowerIndex),
not poll rankings. This is architecturally correct: poll rankings are ordinal
human votes, not a probability model.

### 2c. `apps/web/lib/ranking/` directory — NOTE (empty except sort-key)

The task instruction says "Read `apps/web/lib/ranking/` in full." The directory
contains only one file: `sort-key.ts` (51 lines, 57 lines). There is **no**
separate `ranking/` computation module — the actual ranking P computation lives
in `packages/prediction-engine/src/ranking-prob.ts` and the RPCP audit logic
in `apps/web/lib/calibration/ranking-power-control.ts`. This path mismatch
should be noted for P11-04.

---

## 3. Scheduled refresh / staleness

### 3a. ESPN poll rankings cache TTL — PASS (has refresh, but limited)

`FreeStats.rankings()` (`free-stats.ts` lines 77–82):
- TTL: **6 hours** (`TTL.rankings: 6 * 60 * 60_000`, line 32)
- In-process `Map` cache (line 44), NOT shared across Vercel/isolate instances
- `fetchImpl` is injectable for testing; defaults to global `fetch`
- Cache hit returns `cached: true` and the original `fetchedAt` — no stale
  fetch-time confusion (tested in `free-stats.test.ts` lines 49–68)

### 3b. ESPN PowerIndex (FPI) cache — PASS (has refresh)

`getCachedEspnPowerIndexMap()` in `espn-powerindex-client.ts` (lines 248–262):
- TTL: **6 hours** (`CACHE_TTL_MS = 6 * 60 * 60 * 1000`, line 246)
- In-process `Map` cache
- On cache miss or expiry: fetches fresh from ESPN Core API pages
- Failure → returns stale cache or empty map (line 260: honest no-opinion)

### 3c. RPCP / holdout ranking report — PASS (on-demand rebuild)

`loadProvenPathSurface()` in `proven-path-seed.ts` (lines 63–116):
- Calls `loadRows()` → `db.pick.findMany(...)` with
  `CANONICAL_LEARNING_PICK_WHERE` (lines 43–54, `compute-live-calibration-metrics.ts`
  lines 124–131: `isPublished: true, isBootstrap: false, result: WIN/LOSS,
  signalSnapshot.eligibleForLearning: true, NOT modelVersion v5.0.0-seed`)
- Builds `RankingPowerControl` **on every call** (line 85: "Always rebuild so
  polarity law applies")
- Persisted via `persistProvenPathPlan()` to DB (`proven-path-durable.ts`)
  with `scope: "ops.calibration.proven-path"`

### 3d. Cron schedule — FAIL (no rankings-specific cron; relies on on-demand)

The cron manifest (`cron-schedule-manifest.ts`) declares crons at
`vercel.json` schedule. Relevant crons:
- `/api/cron/calibration-metrics` — every 6h (`"40 */6 * * *"`)
  → triggers `loadProvenPathSurface()` → `buildRankingPowerControl()`
- `/api/cron/backfill-independent-trueprob` — every 4h (`"10 */4 * * *"`)
  → enriches picks with `independentEdge.trueProb` (the input to RPCP)
- `/api/cron/free-spine-health` — every 2h
- `/api/cron/generate-signal-slate` — every 5 min (`"5,20,35,50 * * * *"`)

**There is NO cron that refreshes ESPN rankings or FPI data directly.**
The ESPN PowerIndex/FPI data is fetched **lazily on-demand** inside
`buildIndependentFairValues()` → `tryEspnPowerIndexFairValue()` when
`backfill-independent-trueprob` runs. The ESPN **poll rankings** (AP/Coaches)
are only fetched via `getCfbSnapshot()` which is **not called from any live
route or cron** — only from tests (`free-adapters.test.ts`).

**Finding:** ESPN poll rankings are fetched, cached for 6h in-process, but
have no scheduled refresh and no live consumer. The FPI path (which IS
used for independent trueProb) has 6h in-process cache refreshed on-demand
by the `backfill-indep` cron every 4h. If the FPI fetch fails
(`getCachedEspnPowerIndexMap` returns empty map on error), all ESPN-sourced
independents silently produce no-opinion with no alert.

---

## 4. Pause mechanism cross-reference

### 4a. How rankings pause — PASS (explicit, founder-gated)

`ranking-pause-apply.ts` — `resolvePausedGroups()` (lines 39–110):
Three pause sources, checked in priority order:
1. **`SELECTIVE_PAUSE_GROUPS` env** (lines 48–65) — always applies when non-empty.
   Splits comma-separated list, trims, filters empty.
2. **`RANKING_PAUSE_APPLY=true`** env (lines 67–76) — applies plan pause groups.
   Default OFF (line 30: `isRankingPauseApplyEnabled` returns false unless
   explicitly set to "1"/"true"/"yes"/"on").
3. **Durable founder-yes snap** (lines 79–97) — `RankingPauseDurableSnap`
   from `jarvisMemoryEvent` DB table, scope `ops.ranking.pause-apply`
   (`ranking-pause-durable.ts` line 9). Multi-isolate opt-in without Vercel
   env redeploy.

Plan pause groups come from RPCP significance analysis:
`buildRankingPowerControl` → `computeHoldoutSignificance` →
`pauseCandidates` (groups where `murphyResolution < resPause` threshold,
default 0.005; `holdout-ranking-report.ts` line 79: `murphyResolution < 0.005`).

### 4b. Silent-fail path for paused rankings — FAIL

**Finding:** When `RANKING_PAUSE_APPLY` is OFF (the default) and no durable
snap is enabled, `resolvePausedGroups()` returns:
- `pausedGroups: []` (line 100)
- `source: "none"` (line 101)
- `applyEnabled: false` (line 102)
- `operatorHint` mentions the plan recommends pauses but they're advisory
  (line 107)

This is **by design** (founder-opt-in). However, the **silent-fail risk**
is in the `RankingPowerControl` construction itself:

`proven-path-seed.ts` lines 83–90:
```typescript
let rankingPower: RankingPowerControl | null = null;
try {
  rankingPower = buildRankingPowerControl(rows, { appliedPauseGroups });
} catch {
  rankingPower = null;  // SILENT: no log, no alert
}
```

If `buildRankingPowerControl` throws (e.g., due to NaN in rows, unexpected
data shape, or `db.pick` returning malformed `factorBreakDown`), the entire
RPCP is silently set to `null`. `rankingPowerPosture(null)` then returns
`present: false` with `operatorHint: "Ranking Power Control Plane not
seeded (sample < threshold or stub)."` (line 613). There is **no alert**,
no metrics emission, no error log — the ops surface simply shows
"not seeded" which could be mistaken for "no data yet."

**Additionally:** `loadRows()` (lines 42–56) hard-caps at 2000 picks
(line 53: `take: 2000`) but skips the 50-row minimum check silently —
if `rows.length < 50`, `buildRankingPowerControl` still runs but
produces degenerate results (all `NaN` metrics, `pathViable: false`).
There is no upstream guard preventing this.

---

## 5. VERIFY Summary

| Item | Status | Evidence |
|------|--------|----------|
| Ranking P computation is real (not fabricated) | PASS | `ranking-prob.ts:42-108`; `scoreOf()` never invents; edge never used as p (`ranking-prob.ts:10`) |
| Score kinds are win probabilities only | PASS | `ranking-power-control.ts:48-53`; tests assert no `edgeScore`/`blend_conf_edge` (`ranking-power-control.test.ts:64-76`) |
| sort-key.ts never invents values | PASS | `sort-key.ts:5-6`; falls back to confidence/100, never creates |
| ESPN rankings = fact parser, not model | PASS | `espn-rankings.ts:54-82`; pure parser, tested with fixture (`free-adapters.test.ts:96-121`) |
| ESPN rankings ≠ FPI (two different APIs) | PASS | `espn-rankings.ts:86` (site.api.espn.com) vs `espn-powerindex-client.ts:137` (sports.core.api.espn.com) |
| ESPN poll rankings have 6h TTL cache | PASS | `free-stats.ts:32`; tested (`free-stats.test.ts:49-68`) |
| FPI has 6h in-process cache | PASS | `espn-powerindex-client.ts:246-262` |
| No rankings-specific scheduled cron | FAIL | `cron-schedule-manifest.ts:144-165`; rankings only refreshed lazily via backfill-indep cron (every 4h) |
| ESPN poll rankings have no live consumer | FAIL | `getCfbSnapshot`/`apTop25` only called in tests — `grep` confirms zero production callers outside `cfb-free.ts` definition + tests |
| Pause is founder-gated, not silent | PASS | `ranking-pause-apply.ts:30-33,39-110`; default OFF |
| Silent-fail: RPCP null on throw | FAIL | `proven-path-seed.ts:83-90`; catch sets null with no alert/log |
| Silent-fail: no guard on <50 rows | FAIL | `proven-path-seed.ts:67` checks `< 50 → null` but `buildRankingPowerControl` called only after; rows.length>=50 guard exists (line 67) — PASS for that path, but `buildRankingPowerControl([])` degrades to NaN (tested as valid null case `ranking-power-control.test.ts:121-126`) |
| Pause groups come from significance analysis | PASS | `holdout-significance.ts` → `ranking-power-control.ts:333-334`; threshold documented (`holdout-ranking-report.ts:79`) |
| Polarity law enforced (no edge-as-p) | PASS | `ranking-power-control.ts:12-16`; `proven-path-rows.ts:7` |
| Market echo protection | PASS | `live-calibration-p.ts:80-83`: confidence only helps when conf ≠ independent (≥0.03 gap) |
| Synthetic marketFair=0.5 ignored | PASS | `backfill-independent-trueprob.ts:222-230`; `live-calibration-p.ts:48-52` |

---

## Findings for P11-04 (consolidated)

1. **ESPN poll rankings (`getCfbSnapshot`/`apTop25`) have no live consumer** —
   the adapter and FreeStats facade exist and are tested, but no route/cron
   calls them. If CFB poll display is intended, this is dead code. If not
   intended, the adapter should be removed or documented as unused.

2. **No rankings-specific cron refresh** — FPI (the input to independent
   trueProb) is refreshed lazily via the `backfill-indep` cron every 4h with a
   6h in-process cache. If Vercel is the only scheduler (per
   `cron-schedule-manifest.ts` lines 5–7), a platform-side cron failure silently
   starves the independent path with no alert.

3. **Silent-fail in RPCP construction** (`proven-path-seed.ts:83-90`) —
   `buildRankingPowerControl` catch block sets `null` with no log/error/metric.
   A malformed `factorBreakdown` or NaN in rows kills the entire ranking audit
   plane silently. Should emit a metric or at minimum a `console.error`.

4. **Directory path mismatch** — the ranking computation is in
   `packages/prediction-engine/src/ranking-prob.ts` and
   `apps/web/lib/calibration/ranking-power-control.ts`, but the task
   referenced `apps/web/lib/ranking/` which only contains `sort-key.ts`.
   Documentation/navigation should be corrected.
