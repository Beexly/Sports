# All Stats → All Systems: nflverse Distribution Contract

**Source of truth:** `packages/data-ingestion/src/stat-distribution.ts` (enforced by
`stat-distribution.test.ts`). This document mirrors the contract as audited on
**2026-06-12** — it reflects the REAL current wiring, not aspiration.

## Legend

| Status | Meaning |
|---|---|
| **LIVE** | A real consumer exists in the codebase today. Every LIVE edge was verified by tracing an actual loader/fetch into a rendered surface, and the verified list is pinned in the test. |
| **AVAILABLE** | The dataset is catalogued and fetchable via `nflverse-source.ts`, and the edge is planned/sensible — but no consumer is wired yet. This is the wiring backlog. |
| **FOUNDER_GATED** | Feeding this dataset into live model scoring requires founder approval, recalibration, and a `MODEL_VERSION` bump. **Every** `PREDICTION_MODEL` edge is FOUNDER_GATED — confidence scores must stay calibrated against historical results and all picks are versioned/auditable (CLAUDE.md). |
| — | No edge declared. |

## Dataset × System Matrix

| Dataset | PLAYERS_LAB | TRENDS | SIGNALS | CONTENT | GALAXY_TWIN | PREDICTION_MODEL |
|---|---|---|---|---|---|---|
| `pbp` | AVAILABLE¹ | AVAILABLE | AVAILABLE | AVAILABLE | AVAILABLE | FOUNDER_GATED |
| `pbp_participation` | AVAILABLE | AVAILABLE² | AVAILABLE | — | — | FOUNDER_GATED |
| `player_stats_week` | **LIVE** | **LIVE** | AVAILABLE | AVAILABLE | — | FOUNDER_GATED |
| `snap_counts` | **LIVE** | **LIVE**³ | AVAILABLE | — | — | FOUNDER_GATED |
| `ngs` | **LIVE** | AVAILABLE² | — | AVAILABLE | — | FOUNDER_GATED |
| `pfr_advstats` | **LIVE** | AVAILABLE² | — | — | — | FOUNDER_GATED |
| `ftn_charting` | — | AVAILABLE | AVAILABLE | — | — | FOUNDER_GATED |
| `depth_charts` | AVAILABLE⁴ | AVAILABLE² | AVAILABLE | — | — | FOUNDER_GATED |
| `injuries` | **LIVE** | AVAILABLE² | AVAILABLE | AVAILABLE | — | FOUNDER_GATED |
| `rosters` | **LIVE** | **LIVE**³ | — | — | — | FOUNDER_GATED |
| `espn_qbr_week` | **LIVE** | — | — | AVAILABLE | — | FOUNDER_GATED |
| `players` | AVAILABLE | **LIVE** | — | — | — | FOUNDER_GATED |
| `schedules` | — | **LIVE** | AVAILABLE | — | AVAILABLE | FOUNDER_GATED |
| `draft_picks` | AVAILABLE | — | — | AVAILABLE | — | FOUNDER_GATED |
| `combine` | **LIVE** | — | — | AVAILABLE | — | FOUNDER_GATED |
| `officials` | — | AVAILABLE | AVAILABLE | — | — | FOUNDER_GATED |
| `stats_team` | — | AVAILABLE | AVAILABLE | — | AVAILABLE | FOUNDER_GATED |
| `contracts` | AVAILABLE | — | — | AVAILABLE | — | FOUNDER_GATED |
| `teams` | AVAILABLE | — | — | AVAILABLE | AVAILABLE | FOUNDER_GATED |
| `trades` | — | AVAILABLE | — | AVAILABLE | — | FOUNDER_GATED |

¹ A real `pbp` loader exists (`apps/web/lib/nflverse/pbp.ts`) but its consumers are the
`/intelligence` engines (`scoring-zone`, `team-environment`), which sit outside the six
contract systems — so the PLAYERS_LAB edge is honestly AVAILABLE, not LIVE.
² Declared in `NFLVERSE_TREND_PLANS` `requiredDatasets` (a real plan with join specs),
but the plan is not computed yet (`publicUntilReady: "empty-state-only"`), so the edge
stays AVAILABLE.
³ LIVE via the `/trends` runtime readiness probe (`apps/web/lib/trends/nflverse-readiness.ts`)
of the default `qb-age-rb-target-share` plan — real fetch + row counts rendered on the page.
⁴ Loader exists (`apps/web/lib/nflverse/depth-charts.ts`, used by
`lib/intelligence/opportunity-transfer.ts`) but no `/players` lab view consumes it.

## Verified LIVE evidence (audit trail)

**PLAYERS_LAB** — all via `apps/web/lib/players/views.tsx`, rendered at `/players`
(`apps/web/app/players/page.tsx`, `apps/web/components/players/player-lab-table.tsx`):

| Dataset | Loader |
|---|---|
| `player_stats_week` | `lib/nflverse/player-lab.ts`, `lib/nflverse/edge-signals.ts`, `lib/intelligence/receiving-opportunity.ts` |
| `rosters` | `lib/nflverse/player-lab.ts` |
| `snap_counts` | `lib/nflverse/snap-share.ts` |
| `ngs` | `lib/nflverse/next-gen-stats.ts` (+ `rushing-efficiency`, `qb-consensus`, `edge-signals`) |
| `pfr_advstats` | `lib/nflverse/pressure-coverage.ts` |
| `combine` | `lib/nflverse/combine.ts` |
| `espn_qbr_week` | `lib/nflverse/qbr.ts` (+ `lib/intelligence/qb-consensus.ts`) |
| `injuries` | `lib/nflverse/injury-report.ts` |

**TRENDS** — all via `apps/web/app/trends/page.tsx`:

| Dataset | Loader |
|---|---|
| `player_stats_week`, `players`, `schedules` | `lib/nflverse/qb-age-rb-trend.ts`, `lib/nflverse/birthday-usage-trend.ts` |
| `rosters`, `snap_counts` | `lib/trends/nflverse-readiness.ts` (default-plan probe) |

**SIGNALS / CONTENT / GALAXY_TWIN / PREDICTION_MODEL** — audited
(`packages/prediction-engine/src/signal-snapshot.ts`,
`packages/data-ingestion/src/context-enrichment.ts`,
`apps/web/lib/{content-engine,journal,twitter-bot,discord-bot}`,
`apps/web/components/{world,slate-twin}`, `apps/web/app/observatory`,
`packages/prediction-engine/src/**`): **zero** nflverse dataset consumption today.
No LIVE edges are claimed for these systems.

## Founder activation checklist (turning a FOUNDER_GATED model edge ON)

A FOUNDER_GATED edge means the stat may NOT enter live pick scoring until all of the
following ship together, with founder sign-off:

1. **Recalibrate** — retrain/refit confidence against historical settled results with the
   new feature included; confidence scores (0–100) must remain calibrated.
2. **Bump `MODEL_VERSION`** — every pick carries `model_version`; a new feature is a new
   model (`packages/prediction-engine/src/scoring.ts`). Old picks stay auditable under the
   old version.
3. **Validate** — verify calibration (reliability curve / Brier) and discrimination
   (does the feature actually separate winners from losers?) on held-out seasons before
   any production pick uses it.
4. **Ship** — flip the edge from FOUNDER_GATED activation candidate to live model input,
   update `STAT_DISTRIBUTION` and this doc, and let the contract test pin the new state.

## Prioritized non-model wiring backlog (AVAILABLE edges)

Ordered by leverage (highest-value, lowest-lift first):

1. **`injuries` → SIGNALS** — availability is the highest-value non-market factor; loader already exists.
2. **`schedules` → SIGNALS** — rest/roof/surface context; loader exists, context-enrichment currently DB-only.
3. **`snap_counts` → SIGNALS** — workload shifts as pick context; loader exists.
4. **`injuries` / `player_stats_week` → CONTENT** — data-backed injury/usage claims for briefs, journal, bots (no fabricated stats).
5. **`depth_charts` → PLAYERS_LAB** — loader exists; just needs a `/players` lab view.
6. **TRENDS plan completion** — compute the three declared-but-unbuilt plans: `rest-route-participation` (`pbp_participation`), `injury-cascade` (`injuries`, `depth_charts`), `ngs-separation-buy-low` (`ngs`, `pfr_advstats`).
7. **`pbp` → PLAYERS_LAB / TRENDS / GALAXY_TWIN** — EPA/pace surfaces; loader exists in `/intelligence`, port the consumer.
8. **`stats_team` → TRENDS / SIGNALS / GALAXY_TWIN** — team-week aggregates without rolling up pbp.
9. **`officials` → SIGNALS / TRENDS** — crew flag/pace tendencies for totals context.
10. **`ftn_charting` → TRENDS / SIGNALS** — play-design context the market rarely prices.
11. **`espn_qbr_week`, `ngs`, `combine`, `draft_picks`, `contracts`, `trades`, `teams` → CONTENT** — factual enrichment for generated content.
12. **`players`, `draft_picks`, `contracts`, `teams` → PLAYERS_LAB** — bio, draft capital, contract context columns.
13. **`schedules`, `teams`, `pbp` → GALAXY_TWIN** — slate/world visual texture.
