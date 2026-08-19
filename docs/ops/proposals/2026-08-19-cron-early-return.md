# H-M: Cron No-Op Audit — REVISED (proposal only)

Do not implement without founder sign-off.

## Correction applied

The prior version proposed **flag-guard** optimizations. Those are unsafe and
must not be implemented:

- **board-fill** is ingestion (`runBoardFillPipeline` upserts games / odds /
  signals). Gating it on `LIVE_BOARD` (a display gate consumed in `lib/board/*`)
  would leave a permanent gap in odds history — which CLV and calibration are
  computed from.
- **generate-signal-slate**'s header says it opens the PUBLIC_PICKS board, so
  gating it on `PUBLIC_PICKS_ENABLED` is circular: flipping the flag reveals an
  empty board.

Every flag-guard proposal is replaced below with a **data-driven early-return**:
skip when no games start inside the pipeline's horizon.

## Question

Not "is a feature flag set?" — **"is there a game commencing within the
pipeline's horizon right now?"** If not, the ingestion/processing phase has no
signal target and should short-circuit.

Existing machinery:

- `packages/ingestion-pipeline/src/quiet-board.ts` already defines
  `isQuietBoard(commenceTimes, now, horizonHours)`.
- `packages/ingestion-pipeline/src/process-sport.ts:335-354` already uses that
  check: zero-work SUCCESS, does **not** reset the freshness clock.
- `packages/ingestion-pipeline/src/generate-signal-slate.ts:96` defaults
  `horizonHours` to **504** (21d). The `gameList` query is at `:125-136`; if
  empty, the loop body never runs. An explicit early-return is a small addition.

## Per-cron early-return assessment

| Cron Path | Schedule | Invocations/Day | Current data-driven early-return? | Proposed early-return |
|---|---|---|---|---|
| `/api/cron/refresh-odds` | `*/15 * * * *` | 96 | Yes (`process-sport` quiet-board) | None — already correct |
| `/api/cron/board-fill` | `2,17,32,47 * * * *` | 96 | Partial (ESPN seed always) | After seed, if zero games in `[now, 504h]` → skip odds-refresh + signal-slate, return `{ skipped: "no_upcoming_games_in_horizon" }` |
| `/api/cron/settle-picks` | `20 * * * *` | 24 | Yes (only commenced games) | None |
| `/api/cron/deliver-settlement-alerts` | `15 */3 * * *` | 8 | N/A (alerting) | None |
| `/api/cron/generate-signal-slate` | `5,20,35,50 * * * *` | 96 | Partial (empty `gameList` loop) | After `gameList` query, if `length === 0` → `{ skipped: "no_upcoming_games_in_horizon", gamesConsidered: 0 }` |
| `/api/cron/generate-drafts` | `0 11 * * *` | 1 | Partial (quiet-board draft) | None |
| `/api/cron/reconcile-entitlements` | `0 8 * * *` | 1 | N/A | None |
| `/api/cron/ingest-player-stats` | `0 9 * * *` | 1 | N/A | None |
| `/api/cron/hydrate-cold-plane` | `30 9 * * *` | 1 | N/A | None |
| `/api/cron/drain-ai-telemetry-recovery` | `30 * * * *` | 48 | N/A | None |
| `/api/cron/prune-rate-limits` | `30 6 * * *` | 1 | N/A | None |
| `/api/cron/repair-checkout-attempts` | `30 8 * * *` | 1 | N/A | None |
| `/api/cron/run-formal-receipt` | `45 9 * * *` | 1 | N/A | None |
| `/api/cron/jarvis-snapshot` | `15 * * * *` | 96 | No | None — health snapshot; absence of games is itself a signal |
| `/api/cron/free-spine-health` | `0 */2 * * *` | 12 | No | None — must always run (H-H) |
| `/api/cron/health-alert` | `*/15 * * * *` | 96 | No | None — must always run (H-H) |
| `/api/cron/autonomy-cycle` | `7,22,37,52 * * * *` | 96 | Partial (dry-run; `AUTONOMY_EXECUTE` default off) | None |
| `/api/cron/calibration-metrics` | `40 */6 * * *` | 4 | Partial (empty if no settled picks) | None |
| `/api/cron/backfill-independent-trueprob` | `10 */4 * * *` | 6 | N/A | None |
| `/api/cron/refresh-player-stats` | `0,30 * * * *` | 48 | N/A | None |

## Proposed changes (do not implement)

### 1. board-fill — early-return after seed

In `packages/ingestion-pipeline/src/board-fill.ts`, after the ESPN seed, count
games with `commenceTime` in `[now, now+504h]`. If zero, return
`{ ok: true, skipped: "no_upcoming_games_in_horizon" }` and skip the odds
fetch + signal-slate writes.

This does **not** create an odds-history gap: there are no games to price.
`processSport` already returns `quiet_board` in that case; this only moves the
check upstream of the network fetch.

### 2. generate-signal-slate — early-return after `gameList`

Immediately after `generate-signal-slate.ts:125-136`, if `gameList.length === 0`,
return `{ ok: true, gamesConsidered: 0, candidatesWithIndependents: 0,
picksUpserted: 0, picksSkipped: 0, errors: [], note: "skipped: no upcoming
games in 504h horizon" }`.

### 3. No flag-guard on any cron

Rejected: `LIVE_BOARD`, `PUBLIC_PICKS_ENABLED`, `HEALTH_ALERT_WEBHOOK_URL`, or
any other publication/display flag as a producer gate.

## Re-derived savings

Only board-fill and generate-signal-slate have work proportional to upcoming
games.

| Cron | Invocations/day | Est. skips/day (off-season, no game in 504h) |
|---|---|---|
| board-fill | 96 | ~30 |
| generate-signal-slate | 96 | ~30 |
| **Total** | **192** | **~60 / day** |

During the season (games always in horizon) **zero** invocations are saved, by
design. The prior ~576/day figure assumed flags would be off. That figure is
withdrawn.

`jarvis-snapshot`, `autonomy-cycle`, `drain-ai-telemetry-recovery`, and
`refresh-player-stats` are not safely short-circuitable on game absence.
