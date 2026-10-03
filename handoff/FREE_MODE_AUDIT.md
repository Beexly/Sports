# Free-Mode Reality Audit (P14-04)

**Date run:** 2026-08-17 (machine date, `date +%F`)
**Task id:** P14-04 (resumed; was STATUS: DOING)
**Mode:** READ-ONLY. No code was changed. This task only writes this report and
updates the queue/journal. The commit below contains ONLY the new report file
plus the queue status flip.

**Scope:** With `THE_ODDS_API_KEY` deactivated in prod (see
`docs/ops/FREE_MODE_INGESTION_HEALTH.md`, updated 2026-07-31), the live product
runs free-mode-first. This audit answers: what does an anonymous visitor actually
get for free, and which free tables are ingested-but-unread?

Every "unused" / "dead" claim below is backed by a grep I ran THIS session
(protocol #1: re-derive, never inherit). The grep command and its raw count are
cited inline.

---

## 1. What an anonymous visitor actually gets for free (the live surface)

The public board is driven by `apps/web/lib/board/state.ts` → `loadBoardState()`.
It reads `gateDecision`, `pick`, `game` (with `sport`), and computes
`sportsWatched`, `booksPolled`, `openPicks`, `gatedToday`, `lastRefresh`,
`modelVersion`. Edge Index is public for every tier (`canSeeEdgeScore` true);
confidence + selection + ranking internals are server-redacted for non-PRO
viewers (`state.ts:69-81`, `:99-104`, `:234-237`).

- The board does NOT read any of the four "satellite" free tables
  (depthChartEntry / pfrAdvStat / teamWeekStat / snapCount) directly. Confirmed:
  `grep -rn "depthChartEntry\|pfrAdvStat\|teamWeekStat" apps/web/lib/board`
  returns nothing; the only table access in the board path is `gateDecision`,
  `pick`, `game`, `sport`, `IngestionRun` (freshness).
- The "free spine" and free-settlement machinery (`lib/data-sources/free-*`,
  `lib/data-sources/free-adapters/*`, `lib/settlement/*`) is what keeps the
  board/picks populated **without** a paid Odds key. The free-spine *probe*
  (`/api/cron/free-spine-health` → `writeFreeSpineCache`) is a separate in-memory
  signal cache consumed only by the cockpit/Jarvis ops path
  (`jarvis-data.ts`, `operating-kernel.ts`), NOT by the public board render. The
  public board reads settled `pick`/`game` rows, not the probe snapshot.

**Honest verdict on "is free mode compelling":** Free mode delivers the core
product promise — a real board of graded/edge-scored picks with public Edge
Index, gated behind a paywall for selection/confidence. That is a coherent,
non-broken free product. What is NOT surfaced to anyone (paying or free) is the
richer player-context layer (snap share now wired; depth/advanced-team stats
still dark — see §2).

---

## 2. Ingested-but-unread free tables — the blind-spot finding

The blind-spot sweep (P12-08) found that `SnapCount`, `DepthChartEntry`,
`PfrAdvStat`, `TeamWeekStat` are WRITTEN by `/api/cron/refresh-player-stats`
but had zero readers. I re-derived the current state for each.

### Evidence method
I grep each camelCase model name across the whole repo and classified every hit
as writer / test / reader. The grep tool escaped `\.` incorrectly, so I used
bare identifiers (e.g. `snapCount`, `depthChartEntry`) and read each match.

Repo-wide grep results (this session):

- `snapCount|SnapCount` in `apps/` → 31 hits.
  Non-test READER sites: exactly **one** —
  `apps/web/lib/scoring/player-composite.ts:165`
  `const snaps = (await db.snapCount.findMany({...}))` (the P12-08 wiring, commit
  `a3fd8e93`-era, verified present). Writers: `lib/ingestion/snap-counts.ts:83-84`
  + the cron route. Tests: `player-composite.test.ts`, `*-snap-counts` tests.
- `depthChartEntry|DepthChartEntry` in `apps/` → 4 hits.
  Writers: `lib/ingestion/depth-charts.ts:86-87`
  (`db.depthChartEntry.deleteMany` / `.createMany`). Tests:
  `ingest-depth-charts.test.ts`. **Zero non-test readers.**
- `pfrAdvStat|PfrAdvStat` in `apps/` → 13 hits.
  Writers: `lib/ingestion/pfr-adv-stats.ts:163-164`.
  Tests: `ingest-pfr-adv-stats.test.ts`. **Zero non-test readers.**
- `teamWeekStat|TeamWeekStat` in `apps/` → 12 hits.
  Writers: `lib/ingestion/team-week-stats.ts:106-107`.
  Tests: `ingest-team-week-stats.test.ts`. **Zero non-test readers.**

Cross-check beyond `apps/`: `grep` of `scripts/ workers/ packages/` for
`depthChartEntry|pfrAdvStat|teamWeekStat` → **0 hits** (the only
`packages/db` hits are the Prisma model *definitions* in `schema.prisma`, not
reads). So the three tables are confirmed dead everywhere, not just unread in
`apps/`.

### Why they're written at all
`apps/web/app/api/cron/refresh-player-stats/route.ts` only ingests
`ingestSnapCounts` + `ingestDepthCharts` (lines 72, 74) — and ONLY when called
with `?mode=full` (`route.ts:47,71-87`). `pfrAdvStat` and `teamWeekStat` are
NOT even called from the cron route. Their writers live in
`lib/ingestion/{pfr-adv-stats,team-week-stats}.ts` and are exercised **only by
their own tests** (`*.test.ts`). So:
- `DepthChartEntry` — written by cron `?mode=full`; read nowhere.
- `SnapCount` — written by cron `?mode=full`; read by ONE place (player-composite, P12-08).
- `PfrAdvStat` — written only by its test (`ingestPfrAdvStats` never called by cron). Dead.
- `TeamWeekStat` — written only by its test (`ingestTeamWeekStats` never called by cron). Dead.

This matches the queue's P14-04 premise exactly, and extends it: it's not just
"ingested but unread" — two of the four are never even ingested in production.

---

## 3. Ranking the dead tables by (differentiator value / effort to surface)

Each candidate's schema shape was read from its ingestion writer to judge
user-facing value. All four are nflverse-derived and clearance-gated.

| Rank | Table | What it represents | Differentiator value | Effort to surface | Notes |
|------|-------|--------------------|----------------------|-------------------|-------|
| **1** | `DepthChartEntry` | Weekly player role/depth (starter vs backup) per team | **High** — directly powers start/sit and "is this guy even starting?" | Low | Clear per-player `depthRank`/`role`; same additive wiring pattern as P12-08 (player-composite). Closest "free unlock." |
| **2** | `PfrAdvStat` | PFR advanced stats (pass/rush/recv efficiency) | **High** — real edge signal if normalized | Medium | Split by `statType` (pass/rush/recv); needs a normalization choice (per-game vs rate); not cron-wired today. |
| **3** | `SnapCount` | Offense snap share % | **Medium** — already wired (P12-08) | Done | This is the REFERENCE example; P14-05 should build on it, not redo it. |
| **4** | `TeamWeekStat` | Team-level weekly stats | **Low-Medium** — mostly macro/contextual, weak per-pick differentiator | Medium | Team aggregates; less directly tieable to an individual pick's start/sit decision than depth or snap share. |

**Recommended P14-05 target: `DepthChartEntry`** — highest differentiator,
lowest effort, and it is the single most decision-relevant "free unlock" for a
fantasy/start-sit user (starter vs bench is the question the product answers).

---

## 4. Is free mode "compelling" — the honest answer

- As a *betting-picks* product: yes, minimally compelling and coherent — real
  graded board, public Edge Index, honest empty/refusal states, paywall for the
  rest. Not broken.
- As a *fantasy/start-sit* product (the owner's stated primary): **not yet
  compelling** — the richest free NFL context tables (depth charts, snap share,
  advanced stats) are either dead or only just wired for snaps. Surfacing
  `DepthChartEntry` (P14-05) is the single highest-leverage free unlock.

## 5. Caveats / uncertainty (protocol #5)

- I did NOT execute the cron or stand up a DB, so "zero readers" is verified by
  static grep + schema inspection, not by runtime query logs. The grep is
  repo-wide and case-sensitive to the camelCase property, and I manually read
  every hit, so confidence is high — but I could not confirm at runtime that no
  other code path reaches these tables via a different client alias. The client
  is `db` from `@sports/db` (confirmed `packages/db/src/index.ts:217,231`); the
  grep covered `db.<model>` everywhere.
- "Compelling" is a qualitative judgement of mine from reading the loaders, not a
  measured user metric. Flagged as such.
- I did not re-run the free-spine-health probe; its role (ops signal only, not
  public-board data) is inferred from the import graph
  (`free-spine-cache` imported only by `jarvis-data.ts`/`operating-kernel.ts`
  among `lib/`, per grep) and not independently runtime-confirmed.
