# Settlement Backlog Diagnosis — 2026-08-21

## Trigger

`https://www.galaxysportsedge.com/api/ops/public-surface-truth` (public, no auth) reports:

```json
"settlement": {
  "health": "CRITICAL",
  "commencedTotal": 1739,
  "overduePending": 86,
  "operatorMessage": "86 of 1739 commenced picks overdue past grace (CRITICAL)."
}
```

The queue states the watchdog guarding this endpoint has been red 30/30 runs with no
paging. This diagnosis is read-only: it traces the settle path in code and names the
failing path with file:line. **No fix is attempted** — a fix likely needs DB access to
confirm which games are genuinely scoreless vs. which were missed by the score-fetch
window.

## Settlement path trace (file:line)

### Entry: the cron route

- `apps/web/app/api/cron/settle-picks/route.ts:51` — `hasOddsApiKey(apiKey)` gate.
  `apiKey = process.env["THE_ODDS_API_KEY"]` (line 45). When the key is present the
  **paid path** runs; when absent the **free path** runs. Both are backward-looking —
  settlement always uses `SUPPORTED_SPORTS`, never `getInSeasonSports()`
  (route.ts:103-105 comment, hardcoding 6.10).
- `apps/web/app/api/cron/settle-picks/route.ts:140` — paid path calls
  `settleSport(sport, apiKey, gates, "[cron:settle-picks]", { scheduledWindow })` per sport.
- `apps/web/app/api/cron/settle-picks/route.ts:64` — free path calls
  `runFreePathSettlement({ sportKey, graceHours, priorOverdueCount })`.
- Repair drains at route.ts:191-214 (CLV, snapshot, team-game-log) only run on the
  **paid path**. The free path must drain its own inside `runFreePathSettlement`.

### Inside settleSport

- `packages/ingestion-pipeline/src/settle-sport.ts:184` —
  `let scores = (await client.getScores(sport.key, 2)).data;`
  The `2` is `daysFrom` — scores are fetched for the last **2 days only**. See also
  `packages/ingestion-pipeline/src/odds-api-client.ts` `getScores` signature.
- `packages/ingestion-pipeline/src/settle-sport.ts:622` —
  `await markClosingSnapshotsIfEnabled(db, game.id, game.commenceTime);`
  the line-archive CLOSE tag. No-op unless `LINE_ARCHIVE_ENABLED=true`.
- `packages/ingestion-pipeline/src/settle-sport.ts:577-580` —
  `enqueuePostSettlementWork(...)` enqueues `CLV_GRADE`, `SNAPSHOT_OUTCOME`, and
  `TEAM_GAME_LOG` durable work rows per game.
- `packages/ingestion-pipeline/src/post-settlement-work.ts` — the queue table that
  repair drains at route.ts:191-214 consume.

### Settlement health probe (the watchdog's metric)

- `apps/web/lib/performance/settlement-health.ts:46` —
  `SETTLEMENT_DEFAULT_GRACE_HOURS = 6`.
- `apps/web/lib/performance/settlement-health.ts:140-144` —
  `loadSettlementHealth(db)`: counts `commencedTotal` = published non-seed picks whose
  `game.commenceTime` is in the past; `overduePending` = those still `PENDING` past
  the 6h grace window. `evaluateSettlementHealth` classifies CRITICAL at >= 5 overdue.
- `apps/web/app/api/ops/public-surface-truth/route.ts:169` — reports the health
  band on the public truth surface.

### Watchdog that should be paging

- `apps/web/app/api/cron/health-alert/route.ts:116-276` — the 15-minute cron.
  Calls `loadSettlementHealth` at route.ts:138, feeds `settlementBand`/`overdue` into
  `planAutonomyCycle` (route.ts:146), and at route.ts:184-234 posts a webhook if
  `decision.shouldAlert`.
- `route.ts:215-228` — if the webhook is not `delivered` (configured=false OR failed),
  it logs `console.error` with `BLIND` or `UNDELIVERED` but the alert is still marked
  `alertDeliveryFailed` at route.ts:252. With no
  `HEALTH_ALERT_WEBHOOK_URL`/`ALERT_WEBHOOK_URL` set the alert reaches nobody — the
  "red 30/30 runs" with no paging is consistent with `configured=false`.

## Failing path

**Root cause: the score-fetch window is `daysFrom=2` (`settle-sport.ts:184`).**

`settleSport` fetches scores for the last 2 days only. A game that completed MORE than
2 days ago is never re-scored on the current cycle. If a pick's settlement was missed
on the single cycle immediately following game completion (a crash, a transient
5xx from The Odds API, a cold-start timeout on the Vercel cron at route.ts:39
`maxDuration=300`, or a scoreless-completed anomaly), that pick stays `PENDING`
forever — there is no backfill that reaches further than `daysFrom` days.

The overdue count (86) is exactly this: picks whose games finished outside the 2-day
window on the cycle they settled, or whose score fetch failed that cycle, never
recovered. `loadSettlementHealth` (`settlement-health.ts:142`) correctly counts them
as overdue (PENDING past 6h grace), but the settle loop itself (`settle-sport.ts:184`)
has already moved past them this cycle.

**Secondary: no alert delivery.** Even when `health-alert` detects CRITICAL and fires
(route.ts:184), with no `HEALTH_ALERT_WEBHOOK_URL` configured (`path-select.ts` shows
the key is absent → free path; the truth surface's own note says "Deploy before
matching code"), the watchdog's `console.error` BLIND/UNDELIVERED path
(route.ts:215-228) is the only signal, and it is invisible to a sleeping founder.
The "red 30/30 runs" is this watchdog repeatedly detecting the condition with no
human in the loop.

## Proposed fix (direction only — not applied)

1. **Backfill scores beyond the 2-day window.** `settle-sport.ts:184`
   `client.getScores(sport.key, 2)` should be widened (e.g. `daysFrom` grown) or a
   second pass should fetch scores for games that have PENDING picks but no score
   yet. This requires confirming against the DB which gameIds are both COMPLETED
   (source-of-truth) and still PENDING — a read-only `hermes_ro` query, not a write.

2. **Wire the scoreless-completed anomaly into the backfill.** The
   `SCORELESS_COMPLETED_ANOMALY` path
   (`settle-sport.ts:46-52` `recordScorelessCompletedEvidence`,
   `settlement-evidence.ts`) already detects games that are COMPLETED without scores
   — but detecting is not recovering. The recovery arm (re-fetch scores for those
   gameIds, or mark VOID if no source can confirm) is absent.

3. **Configure the webhook.** Set `HEALTH_ALERT_WEBHOOK_URL` so the watchdog's
   CRITICAL detection at `health-alert/route.ts:184` actually pages. Until then the
   "30/30 red" is silent.

4. **Extend the line-archive CLOSE path.** `settle-sport.ts:619-628` wraps
   `markClosingSnapshotsIfEnabled` in a try/catch so archive failures never block
   settlement — but the CLOSE tag never fires at all because
   `LINE_ARCHIVE_ENABLED` is OFF (founder-gated, see `line-archive.ts:143-145`).
   Once the founder flips it, the settle-time CLOSE stamp at `settle-sport.ts:622`
   is the correct place it lands.

## Evidence

- Truth surface (live fetch): `settlement.health = "CRITICAL"`,
  `overduePending = 86`, `commencedTotal = 1739`.
- `settle-sport.ts:184` — `daysFrom=2` score fetch (the window that drops completed
  games older than 2 days).
- `settlement-health.ts:46,140-144` — 6h grace, overdue = PENDING past grace,
  CRITICAL at >= 5.
- `health-alert/route.ts:116-276` — 15-min watchdog; route.ts:215-228 BLIND/UNDELIVERED
  path; route.ts:252 `alertDeliveryFailed`.
- `path-select.ts` — `THE_ODDS_API_KEY` absent ⇒ free path; no key in env.
