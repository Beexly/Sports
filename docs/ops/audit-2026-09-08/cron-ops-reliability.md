# Audit: the 22 cron schedules and ops reliability

Date: 2026-09-08. Read-only. Dimension: cron schedules, idempotency, partial failure,
retry, failure visibility, overlap safety, cost-vs-work, and the settlement lane end to end.

Every claim below traces to a file and line I read or a command I ran. Where I could not
verify something (production env values, Vercel platform behaviour, GitHub Actions billing)
it is marked NOT VERIFIED.

---

## What I checked (with commands run)

```bash
cat /home/user/Sports/apps/web/vercel.json                       # 22 crons, headers, build config
cat /home/user/Sports/vercel.json                                # root mirror
diff /home/user/Sports/vercel.json /home/user/Sports/apps/web/vercel.json   # -> IDENTICAL
ls -1 /home/user/Sports/apps/web/app/api/cron/                   # 25 route dirs
find . -name route.ts (under app/api/cron and app/api/ops)       # all 25 + 4 ops routes present
wc -l apps/web/app/api/cron/*/route.ts                           # 3786 lines total
```

Read in full or in the relevant region:

- All 21 `/api/cron/*` routes named in `vercel.json`, plus `/api/ops/daily-truth`.
- The 4 cron routes NOT in `vercel.json`: `backfill-historical-games`, `backfill-player-data`,
  `backtest-calibration`, `gamma`.
- `apps/web/lib/cron/authorize.ts` (shared auth, bearer_only default).
- `apps/web/lib/ops/cron-schedule-manifest.ts`, `apps/web/lib/ops/scheduler-liveness.ts`.
- `apps/web/lib/autonomy/operating-kernel.ts`, `safe-cron-targets.ts`, `execute-autonomy-cycle.ts`.
- `apps/web/lib/settlement-outbox/worker.ts` (claim/lease/dead-letter/health).
- `apps/web/lib/settlement/zero-sit-lane.ts`, `apps/web/lib/performance/settlement-health.ts`.
- `apps/web/lib/data-sources/free-score-persist.ts`, `free-settlement-runner.ts` (write guards).
- `apps/web/lib/ops/calibration-eligibility-durable.ts` (streak + dedupe).
- `packages/ingestion-pipeline/src/refresh-odds.ts`, `board-fill.ts`, `process-sport.ts` (writes).
- `packages/data-ingestion/src/paid-odds-governor.ts`, `odds-credit-governor.ts` (spend pacing).
- `apps/web/lib/ingestion/{historical-games,depth-charts,team-efficiency,snap-counts,injuries}.ts`.
- `apps/web/lib/ingestion/satellite-window.ts`.
- `.github/workflows/{external-cron,external-watchdog,daily-smoke}.yml`.
- `packages/db/prisma/schema.prisma` (Odds model, OutboxDeadLetterReceipt).

Tests actually executed:

```bash
cd /home/user/Sports/apps/web && npx vitest run \
  __tests__/cron-schedule-manifest.test.ts __tests__/github-workflow-contract.test.ts
# -> 2 passed, 22 tests passed

cd /home/user/Sports && npx vitest run apps/web/__tests__/vercel-config-drift.test.ts
# -> 3 passed
```

Greps run: `pg_advisory|SKIP LOCKED|FOR UPDATE` across `apps/web/lib` and `packages/*/src`;
`atomicCapable`; `DEAD_LETTER`; `OutboxDeadLetterReceipt`; `deleteMany` across lib/src.

---

## Findings

### 1. BLOCKER: 19 of 22 schedules have no liveness signal and no failure alarm anywhere

`apps/web/lib/ops/scheduler-liveness.ts:35-39` declares the complete set of crons whose
run is durably observable:

```
const INGESTION_OBSERVABLE_PATHS = [
  "/api/cron/refresh-odds",
  "/api/cron/free-spine-health",
  "/api/cron/refresh-player-stats",
] as const;
```

Three paths. The manifest at `apps/web/lib/ops/cron-schedule-manifest.ts:144-169` declares
22. So the platform can stop firing `settle-picks`, `deliver-settlement-alerts`,
`reconcile-entitlements`, `repair-checkout-attempts`, `drain-ai-telemetry-recovery`,
`prune-rate-limits`, `run-formal-receipt`, `calibration-metrics`, `board-fill`,
`generate-signal-slate`, `generate-drafts`, `ingest-player-stats`, `hydrate-cold-plane`,
`jarvis-snapshot`, `health-alert`, `autonomy-cycle`, `backfill-independent-trueprob`,
`backfill-team-efficiency` or `/api/ops/daily-truth` and `schedulerLiveness` still reads
`healthy`, because any one of the three observable crons resets the clock
(`scheduler-liveness.ts:19-24` states this explicitly as the design).

Settlement is partially covered indirectly: if `settle-picks` stops, `settlement.health`
degrades and the external watchdog does eventually page on `CRITICAL`
(`.github/workflows/external-watchdog.yml:80-83`). Nothing else is covered at all.

The second half of this is that no live monitor reads any cron's HTTP status.
`.github/workflows/external-watchdog.yml:46-83` polls only
`/api/ops/public-surface-truth` and checks exactly two fields, `.schedulerLiveness.status`
and `.settlement.health`. `.github/workflows/external-cron.yml` does check
`test "${response}" = "200"` per job, but its own header at lines 8-12 says it is
intentionally idle:

> PRODUCTION SCHEDULER SoT (2026-08-10): **Vercel-only** until private-repo
> GitHub Actions minutes / billing are restored. This workflow may sit idle
> (no runners) - that is accepted, not a bug.

Which raises the compounding problem: `external-watchdog.yml` is a GitHub Actions
workflow on the same private repo and the same runner pool that `external-cron.yml`
says has no minutes. The one alarm built specifically because "every existing health
signal for this product lives INSIDE the same platform whose failure it's supposed to
detect" (`external-watchdog.yml:4-9`) is itself gated on billing that another file in
the same directory documents as unavailable. NOT VERIFIED: whether Actions minutes are
currently restored. That single fact decides whether this product has any external alarm
at all, and it is not written down anywhere I could find.

**Why it matters**: this is the failure class the repo has already been bitten by twice
(`apps/web/__tests__/vercel-config-drift.test.ts:6-9` records "every deploy from `main`
silently deregistered all 20 crons and the scheduler died, twice, for roughly 23 hours
combined"). The fix that shipped guards the config file. Nothing guards the other 19 jobs
actually running.

**Proposed fix** (no gate touched, no threshold loosened): have `assessSchedulerLiveness`
report per-path liveness for every manifest entry, not a single pooled clock, using a
durable per-cron heartbeat row written at the end of each route; surface it on
`public-surface-truth` as a list of paths whose age exceeds their own
`expectedMaxGapMinutes` (already computed at `cron-schedule-manifest.ts:134`); and add
that list to the watchdog's failure condition. Separately, write down the Actions billing
state in `docs/ops/OPERATOR.md` and, if minutes are unavailable, move the watchdog to a
runner that is not the platform being watched. **Risk of fix**: a per-cron heartbeat adds
one write per cron run; a new watchdog condition can be noisy on first turn-up, so it
should be introduced as a warning line before it fails the job.

---

### 2. MAJOR: the autonomy executor times out at 90s against targets that declare 300s, so successful work is recorded as failure and duplicate concurrent runs pile up

`apps/web/lib/autonomy/execute-autonomy-cycle.ts:249`:

```
const timeoutMs = options.timeoutMs ?? 90_000;
```

`apps/web/app/api/cron/autonomy-cycle/route.ts:130-136` calls `executeAutonomyCycle`
without `timeoutMs`, so 90s stands. The allow-listed targets
(`apps/web/lib/autonomy/safe-cron-targets.ts:12-24`) declare:

| target | `maxDuration` |
|---|---|
| `/api/cron/free-spine-health` | 300 (`route.ts:27`) |
| `/api/cron/settle-picks` | 300 (`route.ts:60`) |
| `/api/cron/refresh-odds` | 300 (`route.ts:61`) |
| `/api/cron/calibration-metrics` | 300 (`route.ts:64`) |
| `/api/cron/generate-drafts` | 60 (`route.ts:52`) |

Four of five targets are permitted to run more than three times longer than the client
that invokes them will wait. `invokeCron` catches the abort and returns
`{ httpStatus: 0, ok: false }` (`execute-autonomy-cycle.ts:229-236`), which the caller
records as `status: "failed"` (line 368).

Two consequences, both real:

- **False failure.** A `settle-picks` cycle that legitimately takes 100s is logged as a
  failed autonomy act. Nothing distinguishes that from a genuine 500.
- **Duplicate concurrent invocations.** Aborting the fetch does not stop the server-side
  function. The autonomy cron fires at `7,22,37,52` (four times an hour) and re-queues the
  same action each time (`operating-kernel.ts:336-344`, `ACCUMULATE_SETTLED_SAMPLE` is
  pushed on every plan because the route hardcodes `canonicalSettled: null` at
  `autonomy-cycle/route.ts:122`, so `settled` is always 0 and always below the floor).
  So a slow settle cycle is abandoned by the caller and re-invoked 15 minutes later while
  the first is still running.

`settle-picks` writes are guarded against this (PENDING-scoped `updateMany`, exact-kickoff
match, cross-path score refusal), so I found no corruption path. The cost is wasted
compute, wasted ESPN fetches, and a failure signal that means nothing.

**Proposed fix**: pass `timeoutMs` per target derived from that route's declared
`maxDuration` plus headroom, or send the invocation with a fire-and-forget semantic and
record `dispatched` rather than `executed`/`failed`. **Risk of fix**: raising the timeout
lengthens the autonomy cycle's own wall clock; it declares `maxDuration = 300`
(`autonomy-cycle/route.ts:38`) and executes up to 4 actions
(`safe-cron-targets.ts:29`), so 4 x 300s does not fit. The honest shape is
fire-and-forget plus a heartbeat read, not a longer wait.

---

### 3. MAJOR: `/api/ops/daily-truth` is scheduled but writes nothing and is read by nobody

`vercel.json` schedules it at `5 12 * * *`. The route's own header says
(`apps/web/app/api/ops/daily-truth/route.ts:12`): "This route is READ-ONLY - it never
writes to any table." I confirmed that by reading the whole file: it assembles settlement
health, 24h settled counts, 24h win rate, CLV coverage, canonical sample posture,
calibration eligibility and scheduler liveness, and returns them as JSON. There is no
`persist`, no `create`, no file write, no webhook post.

Vercel cron invokes the URL and discards the response body. NOT VERIFIED: whether any
external consumer polls this path with the bearer token; I found no caller in the repo
(`grep` over apps and packages, and no entry in `external-cron.yml`'s job list).

Two secondary drifts confirm nobody revisited this after scheduling it:

- Line 9-10 of the route still says "NOT wired into vercel.json crons here - the owner
  wires the cron schedule when prod is back (prepare-not-flip)." It is wired.
- `cron-schedule-manifest.ts:166-169` says "it was built 2026-08 but never scheduled, so
  nothing ever read it." Scheduling it did not change the second half of that sentence.

The route's own `maxDuration` comment (`daily-truth/route.ts:31-37`) worries that "the
daily truth record simply does not get written". There is no record to write. The job is a
daily fan-out across the calibration surface, `loadPublicPerformancePolicy`,
`loadClvCoverage` and `loadSettlementHealth` whose entire output is thrown away.

**Proposed fix**: either persist the report (the durable `JarvisMemoryEvent` pattern used
by `persistFreeSpineSnapshot` and `persistCalibrationMetrics` is already available), or
remove the schedule and keep it as an on-demand operator endpoint. Persisting it also
gives the per-cron heartbeat in finding 1 something to compare against.
**Risk of fix**: a daily durable row is cheap; the only care needed is that the report
already returns honest `null` plus `reason` for every unmeasurable field, and that shape
must survive persistence rather than being zero-filled.

---

### 4. MAJOR: one dead-lettered delivery pins `deliver-settlement-alerts` at HTTP 503 permanently, and the receipt it writes is read by nothing

`apps/web/lib/settlement-outbox/worker.ts:1244-1246`:

```
const deadLetters = (deliveryCounts["DEAD_LETTER"] ?? 0) > 0;
return { ok: !deadLetters, degraded: reasons.length > 0, ... }
```

`apps/web/app/api/cron/deliver-settlement-alerts/route.ts:50-61` returns HTTP 503 whenever
`health.ok` is false. `DEAD_LETTER` is a permanent terminal:
`worker.ts:30-32` states "A stale claim AT the attempt cap goes to DEAD_LETTER, never back
to PENDING, so the cap is a true invariant." I grepped for anything that clears it and
found only the writes:

```
grep -rn "DEAD_LETTER" --include=*.ts apps/web/lib apps/web/app | grep -v __tests__
# writes at worker.ts:486, 643, 684, 703; reads at 736, 1234, 1244. No reset anywhere.
```

So once a single delivery hits the attempt cap (5, `worker.ts:64`) the alerts cron returns
503 on every run, every 3 hours, forever, until a human edits the row directly. Two harms:
the signal becomes permanently red so a genuinely new outage is indistinguishable, and the
cron looks broken when it is working.

The escalation path is also a dead end. `worker.ts:780` writes
`db.outboxDeadLetterReceipt.createMany(...)`, described at line 21 as "escalated as a
durable OutboxDeadLetterReceipt owner work item". Grepping every consumer:

```
grep -rn "outboxDeadLetterReceipt\|OutboxDeadLetterReceipt" --include=*.ts --include=*.tsx apps/web packages
# apps/web/lib/settlement-outbox/worker.ts:21 (comment), :279 (type), :780 (the write)
# packages/db/prisma/schema.prisma:1220, 1248, 1262, 1277 (the model)
```

Nothing reads the table. Not the cockpit, not `public-surface-truth`, not `daily-truth`,
not any API route. The "owner work item" is write-only. There is also no outbox health of
any kind on `public-surface-truth`, so the external watchdog cannot see queue depth or
dead letters either.

**Proposed fix**: keep `ok: false` honest, but separate "there is unresolved dead-letter
backlog" (a standing condition an operator acknowledges) from "this drain pass failed"
(the transient the 503 should mean), and surface `outbox.deadLetters` and
`outbox.queueDepth` on `public-surface-truth` plus a cockpit view of
`OutboxDeadLetterReceipt`. Do not lower the threshold and do not make dead letters
re-claimable: the attempt cap is load-bearing. **Risk of fix**: splitting the status code
must not let a real drain failure return 200; the drain's own `summary.errors` already
distinguishes the two at `deliver-settlement-alerts/route.ts:50`.

---

### 5. MAJOR: money-path crons report failure only in a response body nobody reads

`reconcile-entitlements` is the self-healing backstop for a missed Stripe webhook. Its
route header (`route.ts:5-8`) says a failed delivery otherwise "leaves a paying customer
with no access and no automatic recovery." On error it returns:

```
apps/web/app/api/cron/reconcile-entitlements/route.ts:44-53
return NextResponse.json({ ok: summary.errors === 0, ... });   // no status argument -> HTTP 200
```

`repair-checkout-attempts` is identical in shape
(`route.ts:56-62`, `ok: report.errors === 0 && report.unresolved === 0`, HTTP 200).

Both reserve non-200 for the durable-store-unavailable case only (503 at
`reconcile-entitlements/route.ts:59` and `repair-checkout-attempts/route.ts:48`). So the
ordinary failure, Stripe erroring or an attempt staying unresolved, returns HTTP 200 with
`ok: false` in a JSON body. Per finding 1, nothing reads cron response bodies and neither
path lands an `IngestionRun`, so this is fully silent: a paying member can sit
charged-without-access and the only trace is a Vercel function log line.

The same pattern appears on non-money crons and is worth listing so the audit is complete:

| route | failure shape | HTTP |
|---|---|---|
| `refresh-odds` | `ok: result.ok` (`route.ts:173`) | 200 |
| `board-fill` | `ok: result.ok` (`route.ts:22`) | 200 |
| `settle-picks` | `ok: freeOk`, incl. `starved: true` (`route.ts:254-256`) | 200 |
| `health-alert` | `ok: true` unconditionally (`route.ts:254`) | 200 |
| `autonomy-cycle` | `ok: true` even with `failedCount > 0` (`route.ts:149`) | 200 |
| `run-formal-receipt` | `ok: violationsDetected.length === 0` (`route.ts:57`) | 200 |
| `backfill-team-efficiency` | `success` computed, then `{ status: 200 }` hardcoded (`route.ts:75-78`) | 200 |
| `refresh-player-stats` | `success` folds `satellitesOk` but status is `primaryOk ? 200 : 502` (`route.ts:164`) | 200 on satellite failure |

The routes that do fail loudly are `free-spine-health` (503 on total probe failure,
`route.ts:170-190`), `prune-rate-limits` (503, `route.ts:80-84`),
`deliver-settlement-alerts` (503, see finding 4), `ingest-player-stats` (502),
`drain-ai-telemetry-recovery` / `jarvis-snapshot` / `generate-signal-slate` /
`calibration-metrics` (500 on throw). Those are correct and I say so in the "found
correct" section; the point is that the correct ones and the silent ones are indistinguishable
downstream, because nothing consumes either.

**Proposed fix**: make the two money-path crons return a non-2xx when `errors > 0` or
`unresolved > 0`, and, more importantly, give them the durable heartbeat from finding 1 so
a non-2xx is actually seen. **Risk of fix**: `repair-checkout-attempts` treats "unresolved"
as an expected steady state for attempts awaiting Stripe proof; making that a 503 could be
permanently red for the same reason finding 4 is. Split "this pass errored" from "backlog
exists" before changing the code.

---

### 6. MAJOR: the zero-sit lane, the mechanism enforcing "no pick ever sits", can be starved by the route's own time budget with no signal

`apps/web/app/api/cron/settle-picks/route.ts:179-183` runs the zero-sit lane after
`persistFreeScores`, `runFreePathSettlement`, the paid supplement and the stale backfill,
with a deadline derived from the route's own start:

```
apps/web/lib/settlement/zero-sit-lane.ts:132-134
export function zeroSitDeadline(routeStartedAtMs, routeMaxDurationSeconds): number {
  return routeStartedAtMs + routeMaxDurationSeconds * 1000 - ZERO_SIT_ROUTE_TAIL_RESERVE_MS;
}
```

With `maxDuration = 300` and `ZERO_SIT_ROUTE_TAIL_RESERVE_MS = 60_000`
(`zero-sit-lane.ts:126`), the deadline is start + 240s. The lane's first
`pastDeadline()` check is inside the per-sport loop at `zero-sit-lane.ts:1051`, before the
first scoreboard fetch. If steps 1 to 3 of the route have already consumed 240s, that
check is true on the first sport and the lane breaks immediately with
`voided: 0, deadlineHit: true`.

Nothing escalates on `deadlineHit`. It rides on the response as a field
(`settle-picks/route.ts:272`) and the response is HTTP 200. The route's own starvation
alarm cannot catch it either: `starved` requires `totalSettled === 0 && picksHeld === 0 &&
picksVoided === 0` (`settle-picks/route.ts:237-238`), so any single graded pick elsewhere
in the cycle makes a permanently deadline-hit zero-sit lane invisible.

The consequence chains directly into the PROVEN gate the ledger is already blocked on:
picks that only the zero-sit lane can clear stay PENDING, `overduePending` stays above
zero, `health` is `DEGRADED` (`settlement-health.ts:86-88`, `overduePending === 0`
required for HEALTHY), "Settlement not healthy" enters the eligibility reasons, and the
streak resets. That is the exact structural conflict AGENTS.md documents, with a third
constant nobody has named: the lane's 240s share of a 300s budget.

A related and narrower stuck state in the same function: candidates are selected
oldest-published-first with `take: cap + 1` where `cap = ZERO_SIT_VOID_CAP = 20`
(`zero-sit-lane.ts:118`, `1005-1012`). A candidate that is skipped for a reason that
recurs every cycle (`NO_FREE_SPORT` when `game.sport` is null, or a sport whose ESPN board
keeps erroring and yields `SCOREBOARD_FETCH_FAILED`, `zero-sit-lane.ts:1070-1073`) stays
PENDING and stays past the cutoff, so it occupies one of the 20 slots forever and newer
candidates behind it are never inspected. NOT VERIFIED: whether any such rows exist in
production; I did not query the database.

**Proposed fix**: report `deadlineHit` and `remaining` as a first-class ops field on
`public-surface-truth` beside `stalePendingPicks` so a starved lane is visible, and give
the lane a share of the budget measured from its own start rather than the route's (or run
it as its own schedule). For the head-of-line case, order candidates so persistently
skipped rows rotate rather than always leading. **Risk of fix**: moving the lane to its own
cron changes the ordering guarantee in the route header (the lane runs after every grader
so the VOID receipts close in the same cycle); that ordering is deliberate and should be
preserved by keeping the drain in the same route or draining the outbox again afterwards.

---

### 7. MAJOR: delete-then-insert refreshes are not transactional, so a failure mid-refresh empties a table and the route still returns 200

Seven ingestion writers use the same shape: guard against an empty upstream, then
`deleteMany` the season, then `createMany`. Verified in:

- `apps/web/lib/ingestion/team-efficiency.ts:152-158` (driven by the
  `backfill-team-efficiency` cron at `15 7 * * *`)
- `apps/web/lib/ingestion/depth-charts.ts:81-87`
- `apps/web/lib/ingestion/snap-counts.ts:78-85`
- `apps/web/lib/ingestion/injuries.ts:78-85`
- `apps/web/lib/ingestion/next-gen-stats.ts:153`, `team-week-stats.ts:106`,
  `pfr-adv-stats.ts:163`, `rush-tendencies.ts:110` (same shape, not read line by line)
- `apps/web/lib/ingestion/historical-games.ts:98-104`, which is
  `deleteMany({})` on the WHOLE table followed by a chunked insert loop

The empty-upstream guard is good and I credit it below. What is missing is atomicity:
neither the delete nor the insert is inside a `$transaction`. If the `createMany` throws,
or the function is killed at `maxDuration`, the table is left empty or half-filled. For
`historicalGame` that is the archive "calibration and backtests read from" by the code's
own comment (`historical-games.ts:84-85`), wiped by a route
(`backfill-historical-games`) that is not on any schedule, so nothing retries it.

For `backfill-team-efficiency` the failure is additionally silent: the route computes
`success` and then hardcodes the status
(`apps/web/app/api/cron/backfill-team-efficiency/route.ts:75-78`):

```
return NextResponse.json(
  { success, season: { labelled, floor }, results, floorFallback, nextFrom },
  { status: 200 },
);
```

**Proposed fix**: wrap each `deleteMany` + `createMany` pair in `db.$transaction`, and
return a non-2xx from `backfill-team-efficiency` when `success` is false.
**Risk of fix**: a full-table replace inside one transaction holds locks for the duration
and can exceed a statement timeout on the largest asset (play-by-play derived
`TeamGameEfficiency`, and `historical_games` covering 1999+). The safer variant for the
large ones is insert-to-shadow then swap, or a per-chunk upsert that never deletes.
Either way this needs a measured run before shipping, not a one-line change.

---

### 8. MAJOR: three schedulers describe three different cadences for the same jobs

`vercel.json` is the live scheduler. `.github/workflows/external-cron.yml` declares a
second, documented as idle, whose cadences contradict it:

| job | vercel.json | external-cron.yml |
|---|---|---|
| settle-picks | `20 * * * *` | `15 * * * *` (line 31) |
| free-spine-health | `0 */2 * * *` | `5 */2 * * *` (line 34) |
| refresh-player-stats | `0,30 * * * *` (48/day) | `40 */6 * * *` (4/day, line 37) |
| autonomy-cycle | `7,22,37,52 * * * *` (4/h) | `22 * * * *` (1/h, line 40) |
| board-fill | `2,17,32,47 * * * *` (4/h) | `10 * * * *` (1/h, line 42) |
| generate-signal-slate | `5,20,35,50 * * * *` (4/h) | `25 * * * *` (1/h, line 44) |

Worse, `external-cron.yml` contains a `refresh-odds` job (line 128) gated on
`github.event.schedule == '*/30 * * * *'`, and `*/30 * * * *` is **not in that file's
`on.schedule` list** (lines 30-44). That job can never fire on a schedule; it is reachable
only by `workflow_dispatch`. Same for `jarvis-snapshot` (line 224) and
`backfill-independent-trueprob` (line 307), which are dispatch-only by design.

If Actions minutes are ever restored, four of the jobs above start firing at a second,
different phase against the same routes, doubling the invocations. The `concurrency` group
at line 64-66 is keyed on the schedule string, so it does not prevent overlap with the
Vercel cron at all.

**Proposed fix**: bring `external-cron.yml`'s schedules into line with `vercel.json` or
delete the workflow, and delete the unreachable `*/30 * * * *` condition on the
`refresh-odds` job. Extend `apps/web/__tests__/github-workflow-contract.test.ts` (which
already pins the scheduler-liveness vocabulary against this directory) to assert that every
`if: github.event.schedule == X` in that file has a matching entry in its own
`on.schedule`. **Risk of fix**: low; the file is documented as idle so nothing depends on
its current values.

---

### 9. MINOR: the same signal-slate and odds work runs up to twelve times an hour across four entry points

`generateSignalSlate` and `refreshOdds` each have four callers on the schedule:

- `refresh-odds` cron `*/15` calls `refreshOdds` then `generateSignalSlate`
  (`refresh-odds/route.ts:114-123`)
- `board-fill` cron `2,17,32,47` calls `runBoardFillPipeline`, which is
  `seedGamesFromEspn` + `refreshOdds` + `generateSignalSlate`
  (`packages/ingestion-pipeline/src/board-fill.ts:36-46`)
- `generate-signal-slate` cron `5,20,35,50` calls `generateSignalSlate`
- `free-spine-health` cron `0 */2` also calls `runBoardFillPipeline`
  (`free-spine-health/route.ts:150-162`)
- plus `autonomy-cycle` may invoke `refresh-odds` and `free-spine-health` up to 4x/h when
  `AUTONOMY_EXECUTE=true` (NOT VERIFIED: the env value; AGENTS.md's own statement that
  "settle-picks runs five times an hour (the :20 cron plus the autonomy cycle)" implies it
  is on)

That is roughly 12 signal-slate passes and 8 to 12 `refreshOdds` passes an hour, against a
documented requirement of one every 15 minutes ("This cadence is required so candidate
odds stay inside the board gate's MAX_CANDIDATE_ODDS_AGE_MS (6 hours)",
`refresh-odds/route.ts:16-18`).

The paid credit spend is **not** 12x, and I verified why rather than assuming: `refreshOdds`
builds a default ledger-backed governor when the caller injects none
(`packages/ingestion-pipeline/src/refresh-odds.ts:150-192`,
`const governor = apiKey ? resolvePaidOddsGovernor(opts.governor) : undefined` at line 240),
and the governor reserves an hourly per-sport slot atomically
(`packages/data-ingestion/src/paid-odds-governor.ts:56-62`,
`PAID_CALL_MIN_INTERVAL_MS = 60 * 60 * 1000` at `odds-credit-governor.ts:30`). So C-109
does hold across every caller. What multiplies is compute time, free-source fetches, and
row growth (see finding 11).

Also in this file, `free-spine-health/route.ts:153` is dead-branch code:

```
const hasOdds = Boolean(resolveOddsApiKey()) || Boolean(resolveRundownApiKey());
if (hasOdds || true /* always attempt signal path */) {
```

`hasOdds` is computed and then discarded by `|| true`. The condition is always taken.

**Proposed fix**: pick one entry point for the slate. The cheapest honest change is to drop
the standalone `generate-signal-slate` cron (its work already happens inside `board-fill`
two to three minutes earlier every quarter hour) or drop the inline `generateSignalSlate`
call from `refresh-odds`, and delete the `|| true`. **Risk of fix**: `board-fill` passes
`skipSeed: true` to the slate and the standalone cron does not, so the two are not exactly
the same work; removing the standalone one drops a seeding pass. Confirm the seed still
happens via `seedGamesFromEspn` in `board-fill` before removing anything.

---

### 10. MINOR: `refresh-player-stats` polls a weekly-updating source 48 times a day, and the once-a-day heavy path is decided by a clock read that the cron phase can miss

`vercel.json` runs it at `0,30 * * * *`. `apps/web/lib/ingestion/satellite-window.ts:74`:

```
const inWindow = now.getUTCHours() === SATELLITE_DAILY_HOUR_UTC && now.getUTCMinutes() < 30;
```

with `SATELLITE_DAILY_HOUR_UTC = 10` (line 45). The satellite path therefore depends on the
10:00 invocation landing with `getUTCMinutes() < 30`. If the platform is late by 30 minutes
on that one firing, or the 10:00 run is skipped, the satellites do not run that day and
nothing says so; the response reports `satelliteReason: "primary-only"`
(`refresh-player-stats/route.ts:159`) and HTTP 200. The file itself is admirably honest
about the tradeoff (lines 29-41) and names the founder-owned fix (a `?mode=full` schedule
entry in `vercel.json`, which agents may not edit under AGENTS.md law 2).

Separately, the primary path fetches the nflverse weekly-stats asset on all 48 runs.
nflverse publishes weekly. Forty-eight fetches and forty-eight `IngestionRun` rows a day of
an asset that changes once a week is the clearest cadence-versus-work mismatch in the set.
It is not free: it is the second-largest contributor to the row growth in finding 11.

**Proposed fix**: founder-owned. Add a `?mode=full` cron entry so the satellite decision
stops depending on a clock read, and reduce the primary cadence to hourly or better. Note
that `scheduler-liveness.ts:38` lists this path as one of only three liveness sources, so
loosening its cadence must be paired with finding 1's per-cron heartbeat or the liveness
thresholds shift. **Risk of fix**: `tightestObservableGapMinutes()`
(`scheduler-liveness.ts:85-92`) reads the cadence from the manifest, so the thresholds
adapt automatically; the risk is that `DEGRADED_THRESHOLD_MINUTES = 60` is a literal and
would need re-deriving.

---

### 11. MINOR: the highest-frequency crons write to tables with no retention, and the only prune job covers a different table

`prune-rate-limits` (`30 6 * * *`) prunes `rate_limit_counters` and its route header says
so plainly (`route.ts:5-8`). `free-spine-durable.ts:196` prunes `JarvisMemoryEvent`. Those
are the only two retention sweeps in the codebase:

```
grep -rn "deleteMany" --include=*.ts apps/web/lib packages/*/src | grep -vi test
# everything else is a season-scoped ingestion replace or a push-subscription removal
```

Nothing prunes:

- `odds` (`packages/db/prisma/schema.prisma`, model `Odds`) which is append-only by design
  (`process-sport.ts:766-791`, `createMany`, no unique constraint) and grows at
  roughly 8 to 12 `refreshOdds` passes an hour x sports x books x markets
- `ingestion_runs`, one row per `processSport` call (`process-sport.ts:266`), so on the
  order of a thousand rows a day
- `pick_settlement_event` / `pick_settlement_delivery`, which reach terminal states and stay

This is Neon storage that only grows. It also slowly degrades the `gameId, fetchedAt`
composite index the settle path uses for closing-line lookups (the schema comment at the
`Odds` model says that index exists precisely because "per-game odds grow every cycle x
book x market").

**Proposed fix**: extend the existing `prune-rate-limits` pattern (governed actor, actor
receipt, idempotent DELETE below a cutoff) to `ingestion_runs` and terminal outbox rows
with a stated retention. Do **not** prune `odds` without a decision: it is the table
WP-28's publish-time market probability recompute reads from, so a retention window there
is a product decision about how far back calibration can be recomputed, not an ops cleanup.
**Risk of fix**: pruning `ingestion_runs` must not delete the newest rows the scheduler
liveness assessment reads, and `Odds.ingestionRunId` is a foreign key, so an
`ingestion_runs` prune cascades into the odds question above. Sequence matters.

---

### 12. MINOR: the calibration eligibility streak has no time floor between evaluations, and a second scheduler can drive it

`vercel.json` schedules `calibration-metrics` at `40 */6 * * *`, and AGENTS.md describes the
gate as "three consecutive green runs of a six-hourly cron, 12 hours minimum".

The streak's dedupe key is the metrics artifact timestamp, not elapsed time
(`apps/web/lib/ops/calibration-eligibility-durable.ts:577-596`):

```
if (priorSnap && metricsAt && priorSnap.metricsGeneratedAt === metricsAt) { ... skippedDuplicate: true }
```

Each `calibration-metrics` invocation computes a fresh payload with a fresh `generatedAt`,
so each invocation is a distinct evaluation and advances `consecutiveGreen`.

`RUN_CALIBRATION_METRICS` is pushed onto every autonomy plan unconditionally
(`apps/web/lib/autonomy/operating-kernel.ts:361-371`, in the "allow-listed housekeeping"
block with no surrounding condition), it is `autonomousSafe: true`, and it is on the
executor allow-list (`safe-cron-targets.ts:17`,
`execute-autonomy-cycle.ts:32`). The autonomy cron fires four times an hour. So with
`AUTONOMY_EXECUTE=true` the three-run streak can complete in roughly 45 minutes of wall
clock rather than 12 hours, and equally can be reset four times an hour.

I want to be precise about what this is and is not. It is **not** a weakened threshold:
the four floors are unchanged and every evaluation is a real measurement over real settled
rows. It **is** a mismatch between what the streak is documented to mean (sustained
stability over time) and what it measures (three consecutive evaluations, whenever they
happen). Given that `resolveCalibrationPublishPolicy` can write an auto-publish receipt at
streak completion (`calibration-eligibility-durable.ts:640-649`), the difference between 45
minutes and 12 hours is load-bearing for a public claim.

NOT VERIFIED: the production value of `AUTONOMY_EXECUTE`, and whether
`RUN_CALIBRATION_METRICS` actually clears the 4-action cap in practice. It is priority 120
(`operating-kernel.ts:364`), below `ACCUMULATE_SETTLED_SAMPLE` at 400 and
`RUN_FREE_SPINE_HEALTH` at 900, and the queue is sorted descending
(`operating-kernel.ts:408`) then deduped by path with `maxActions = 4`
(`execute-autonomy-cycle.ts:292`, `safe-cron-targets.ts:29`). On a typical plan the
selected four are free-spine-health, settle-picks, calibration-metrics, generate-drafts, so
it does clear the cap, but I did not observe a production plan.

**Proposed fix**: record the evaluation wall-clock alongside the streak and require a
minimum elapsed time between the evaluations that count toward it, so the streak means what
the docs say. Do not change any floor, the streak length, or the health threshold. Removing
`RUN_CALIBRATION_METRICS` from the autonomy allow-list would also work and is the smaller
change. **Risk of fix**: adding a minimum interval makes the gate strictly harder to clear,
which is the correct direction but should be a founder decision since PROVEN timing depends
on it. This is exactly the class of constant AGENTS.md forbids agents from touching.

---

### 13. MINOR: `hydrate-cold-plane` writes to a process-local store that the request discards

`apps/web/app/api/cron/hydrate-cold-plane/route.ts:34` holds the store at module scope:

```
const memoryStore = new NflverseMemoryStore();
```

The route reads up to 2000 `PlayerGameStat` rows daily (line 53-59) and hydrates them into
that in-process map. The header is honest about it (lines 14-18: "process-local memory is
single-instance. Multi-instance needs Redis"). The consequence is that on Vercel the
serverless isolate that serves the cron is not the isolate that serves
`GET /api/gse/v1/values`, and even if it were, isolates recycle. NOT VERIFIED at runtime,
but the route itself lists its own value as "single-instance / preview deploys" and
"verifying the pure engine path in production logs", neither of which is production
behaviour.

**Proposed fix**: either back the store with the Redis path the header names, or drop the
schedule and keep the route as a manual verification endpoint. **Risk of fix**: none to
product behaviour, since nothing durable depends on the current writes.

---

### 14. MINOR: calibration artifact file writes are dead in production and every failure is swallowed

`apps/web/app/api/cron/calibration-metrics/route.ts:305-306`:

```
const dir = path.join(process.cwd(), ".gse-local", "calibration");
await mkdir(dir, { recursive: true }).catch(() => undefined);
```

followed by eight `writeFile(...).catch(() => undefined)` calls (lines 383, 420, 434, 446,
459, 464, 470, 488). On Vercel `process.cwd()` is the read-only deployment bundle, so the
`mkdir` fails, every write fails, and every failure is discarded. The durable path is the
real one (`persistCalibrationMetrics`, `persistProvenPathPlan`, `persistMapBakeoff`) and
the response correctly reports `artifact: "durable:ops.calibration.metrics"` (line 573), so
nothing is misreported. The code is simply inert in production while reading as though it
produces artifacts, and the one place a durable write failure IS logged
(`route.ts:502-508`, the proven-path plan) proves the authors know the difference.

**Proposed fix**: guard the local artifact writes behind an explicit "local development"
condition so a reader can tell at a glance that they never run in production, or remove
them. **Risk of fix**: none; they already no-op.

---

### 15. MINOR: `gamma/route.ts` documents a schedule it does not have

`apps/web/app/api/cron/gamma/route.ts:9` says "Schedule: vercel.json every 30 minutes (ADD
- keep existing crons)" and line 36 configures the runner with
`scheduleCron: "*/30 * * * *"`. The path is absent from `vercel.json` and from
`CRON_MANIFEST`. It is auth-gated and harmless, but a reader of the route believes it runs.
Note `backtest-calibration/route.ts` handles the same situation correctly: it states in
capitals that it is "NOT LIVE, GATED OFF BY DEFAULT, NOT REGISTERED IN vercel.json" and
names the exact two steps to activate it. That is the pattern `gamma` should follow.

**Proposed fix**: correct the header comment to say the route is unscheduled and how to
schedule it, matching `backtest-calibration`. **Risk of fix**: none, comment only.

---

## What I checked and found CORRECT

- **All 22 scheduled paths resolve to a real route.** `find` over `app/api/cron` and
  `app/api/ops` returned a `route.ts` for every path in `vercel.json`. There are no dead
  schedules. Four routes exist without a schedule (`backfill-historical-games`,
  `backfill-player-data`, `backtest-calibration`, `gamma`); three of the four document that
  deliberately.
- **The root and `apps/web` `vercel.json` are byte-identical.** `diff` returned nothing, and
  `apps/web/__tests__/vercel-config-drift.test.ts` passed (3 tests). The guard's rationale
  (Vercel reads crons only from the Root Directory) is documented at lines 3-20 of that test.
- **`CRON_MANIFEST` matches `vercel.json`.** `cron-schedule-manifest.test.ts` passed (13
  tests), so a new cron cannot be added to the platform without becoming visible to the
  liveness code.
- **`github-workflow-contract.test.ts` passed (9 tests)**, pinning the shell string literals
  in `external-watchdog.yml` against `SCHEDULER_LIVENESS_STATUSES`.
- **Auth is bearer-only by default and correct.** `apps/web/lib/cron/authorize.ts:52-55`
  makes `bearer_only` the default mode, so the spoofable `x-vercel-cron` header is a
  per-route opt-in. I read every one of the 22 routes: none passes `mode: "dual"`. The
  autonomy route additionally escalates to bearer-only whenever execution is enabled
  (`autonomy-cycle/route.ts:52-57`). Secret comparison is delegated to
  `authorizeCronSecret` with a dual-secret rotation window, and an unset `CRON_SECRET`
  fails closed with a 500 rather than open (`authorize.ts:81-83`).
- **The settlement outbox is genuinely concurrency-safe.** Every claim writes a fresh
  `leaseToken` and increments `claimVersion`, and every result write is scoped to
  `(id, leaseToken, status: "CLAIMED")` (`worker.ts:601-616`, `661-665`). Stale-lease
  recovery is `claimVersion`-scoped so it can never clobber a newer claimant
  (`worker.ts:475-495`). Expansion is idempotent via a unique `idempotencyKey` plus
  `createMany({ skipDuplicates: true })` and a `status: "PENDING"`-scoped transition that
  returns null when a concurrent expander won (`worker.ts:1003-1013`, `1029-1037`). An
  entitlements infrastructure failure defers expansion rather than writing a false
  `SUPPRESSED` terminal (`worker.ts:1017-1027`). This is the best-engineered concurrency in
  the set.
- **Overlapping `settle-picks` runs cannot corrupt scores.** `settle-picks` at `:20` and the
  autonomy cycle at `:22` will overlap given a 300s budget, and I traced the write paths.
  `free-score-persist.ts:456-464` refuses to overwrite a recorded final that disagrees
  (`SCORE_MISMATCH_CROSS_PATH`), and the `updateMany` at 471-500 repeats both the exact
  `commenceTime` match and the score guard in the WHERE clause so a concurrent finalisation
  between the read and the write cannot be clobbered. `free-settlement-runner.ts:292-345`
  does the same for the grade write and additionally writes the kickoff back to itself to
  take a row without `SELECT ... FOR UPDATE`, with the reasoning written out. Pick grade
  writes are PENDING-scoped `updateMany`, so a second concurrent run is a no-op.
  (This finding is about concurrency only. It says nothing about C-247, which is a stored
  final disagreeing with the feed, not two of our own writers racing.)
- **The C-109 paid credit governor cannot be bypassed by a caller that forgets it.** I
  suspected `board-fill` and `free-spine-health` were spending ungoverned because they call
  `refreshOdds()` with no governor argument. They are not:
  `refresh-odds.ts:150-192` builds the default ledger-backed governor when none is injected,
  and `refresh-odds.ts:240` resolves it once per cycle. `atomicCapable` correctly defaults
  to `!isStubMode()` in both factories (`refresh-odds.ts:154`,
  `apps/web/lib/odds/paid-odds-governor.ts:115`), so the advisory reservation
  (`odds-credit-ledger.ts:375`, `pg_advisory_xact_lock`) really is taken in production.
- **The empty-upstream guard on every destructive season refresh.** All seven
  delete-then-insert writers return `status: "source-error"` with "existing data preserved"
  when the source returns zero rows, before any delete
  (`depth-charts.ts:81-85`, `team-efficiency.ts:152-156`, `snap-counts.ts:78-82`,
  `injuries.ts:78-82`, `historical-games.ts:84-94`). A transient empty mirror cannot wipe a
  table. That is the harder half of the problem and it is handled; only atomicity is missing
  (finding 7).
- **`free-spine-health` fails loudly on a total probe failure** with a 503 and an explicit
  rationale for why a 200 would be a lie (`route.ts:164-190`). `prune-rate-limits` fails
  closed with 503 on stub DB, receipt failure or store failure
  (`route.ts:48-55`, `78-85`), with a governed actor and a persisted `ActorReceipt` before
  the delete. Both are the right shape.
- **`health-alert` reports its own blindness.** It distinguishes "no webhook configured"
  from "the POST failed" (`route.ts:48-53`), escalates an unreachable alert to
  `console.error` with the word BLIND (`route.ts:232-240`), and exposes
  `alertDeliveryFailed` as the single field an external monitor should watch
  (`route.ts:275-277`). It also carries both `content` and `text` so one webhook URL works
  for Discord, Slack or ntfy (`route.ts:55-62`). The module-level `lastState` bug is fixed
  and the fix is documented (`route.ts:14-18`).
- **`generate-drafts` is idempotent per day** by date-slug, and treats a raced unique-slug
  create as "already generated" rather than throwing (`route.ts:56-90`). Repeated autonomy
  invocations are cheap no-ops, and the draft-only guarantee rides on `status`/`publishedAt`
  with a CI guardrail (`scripts/guardrails/draft-only.mjs`).
- **`settle-picks` step isolation.** Every optional stage is individually wrapped so one
  failure cannot abort the cycle: the pre-cycle health snapshot (route 134-146), the paid
  supplement per sport (293-329), the stale backfill (392-406), the zero-sit lane
  (408-421), the slate freeze (194-200) and the outbox drain (204-212). Each wrap calls
  `captureError` with a distinct `stage` tag.
- **The starvation check exists at all.** `settle-picks/route.ts:223-249` explicitly refuses
  to call a cycle that ran but graded nothing a success, and captures it to Sentry. The
  reasoning ("A cycle that ran without throwing is not the same as a cycle that graded") is
  exactly right; finding 6 is about a gap in its coverage, not its existence.
- **`backfill-team-efficiency` and `backfill-player-data` no longer restart a 1999 crawl on
  a bare scheduled hit.** Both default `from` to the labelled season and require an explicit
  range for the historical crawl, with the old bug written down
  (`backfill-team-efficiency/route.ts:35-42`, `backfill-player-data/route.ts:42-47`).
- **The unpublished-season fallback refuses to mislabel.** A 404 or ok-with-zero-rows
  retries the completed floor and reports it separately as `floorFallback`, never relabelled
  as the labelled season, and a 5xx or timeout is treated as an outage with no fallback
  (`backfill-team-efficiency/route.ts:56-73`, `refresh-player-stats/route.ts:78-90`).
  `refresh-player-stats` additionally refuses to run the daily satellite path on a
  fallback season, with the reasoning that a stale depth chart reads as a lineup while an
  empty one reads as no data (`route.ts:104-115`).
- **`maxDuration` is set on every scheduled route.** I checked all 22. The two that had
  inherited the platform default were fixed with the reasoning recorded in place
  (`prune-rate-limits/route.ts:38-42`, `daily-truth/route.ts:31-37`).
- **The `/api/(.*)` no-store header** at `vercel.json` covers every cron response, so no
  cron result can be edge-cached.

---

## What I could not check and why

- **Whether the crons are actually firing in production.** That needs the Vercel dashboard
  or production logs. Everything above is static analysis of the declared schedules and the
  code they invoke.
- **Whether GitHub Actions minutes are available on this private repo.** This decides
  whether `external-watchdog.yml` (the only external alarm) runs at all, and whether
  `external-cron.yml`'s conflicting schedules (finding 8) are live. `external-cron.yml:8-12`
  says minutes were unavailable as of 2026-08-10; nothing I read updates that. I did not
  call the GitHub API.
- **The production values of `AUTONOMY_EXECUTE`, `CRON_SECRET`, `SENTRY_DSN`,
  `HEALTH_ALERT_WEBHOOK_URL`, `THE_ODDS_API_KEY`, `HC_REFRESH_PING_URL`,
  `HC_ODDS_FETCHEDAT_PING_URL`.** `.env*` is Read-denied for agent sessions under AGENTS.md
  law 2 and I did not attempt to read them. Several findings change severity depending on
  these: if `SENTRY_DSN` is unset then `captureError` is a no-op
  (`apps/web/lib/observability/sentry.ts:34-42`) and every `captureError` I credited above
  is silent too; if `HEALTH_ALERT_WEBHOOK_URL` is unset the health-alert cron is
  structurally blind by its own definition. **These are the highest-value unknowns in this
  report and an operator can resolve all of them in about two minutes.**
- **Whether any row currently sits in `outbox_dead_letter_receipts`, or whether any
  zero-sit candidate is persistently skipped.** Both need a database read; I ran no SQL.
  Findings 4 and 6 describe mechanisms, not observed incidents.
- **Actual per-cycle wall clock for `settle-picks`.** Finding 6's severity depends on
  whether steps 1 to 3 routinely approach 240s. That needs production timing from the
  `elapsedMs` field the route already returns.
- **Vercel's own behaviour on a non-2xx cron response** (retry? alert? nothing?). I could
  not verify this from the repo, and it materially affects finding 5. The routes are written
  as though nothing retries, which is the safe assumption, but it is an assumption.
- **`workers/*`.** The dimension is the cron schedules, and `CLAUDE.md` states the workers
  are driven by the cron routes with no queue library. I did not audit
  `workers/data-refresh`, `workers/pick-generation`, `workers/content-publishing` or
  `workers/airwave-listener` for a second, independent invocation path.
- **`packages/ingestion-pipeline/src/settle-sport.ts` in full.** I read its governor
  reservation at line 275 and the route's use of it, but not the whole 
  paid settlement path.
