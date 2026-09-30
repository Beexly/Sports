# Silent-failure audit — F1 and F2 (fixed)

Branch: `fix/health-alert-unmeasurable-not-green`
Base: `origin/main` @ `0b3b5eaf5`

Both findings share one shape: **a signal that could not be measured was
reported as a signal that was measured and found fine.** Neither threw. Neither
logged. Neither turned a status field red. In both cases the monitoring
surface actively asserted health that no evidence supported.

---

## F1 — a database outage reported as "quota fine"

### Where

| Layer | File | Line (pre-fix) |
|---|---|---|
| Read | `packages/data-ingestion/src/odds-credit-ledger.ts` | `loadLatestCreditObservation` — `catch { return null }` |
| Truth | same file | `loadOddsCreditTruth` — `remaining: null` for both "empty" and "down" |
| Gate | `packages/ingestion-pipeline/src/paid-run-accounting.ts` | `isLowQuota` — `null → false`, **correct by design** |
| Report | `apps/web/app/api/cron/health-alert/route.ts` | `oddsApiLowQuota = isLowQuota({ remaining: credits.remaining })` |

### Why it was silent

The route's `.catch(() => emptyOddsCreditTruth())` never fired. The error was
already swallowed two layers down: `loadLatestCreditObservation` catches
everything and returns `null`. So a total outage and a brand-new install
produced a byte-identical `OddsCreditTruth`, both with `remaining: null`.

`isLowQuota(null) === false` is right for its job — a pacing gate must not halt
on a header-less response. The bug was a *report* consuming a *gate* boolean:
`false` there means "measured, not low", and the health surface had no way to
say "not measured" at all.

Measured on the unpatched tree: `oddsApiRemainingRequests=null,
oddsApiLowQuota=false`, with no `readFailed` signal anywhere in the payload.

### The nastier variant

The whole-database-down case is partially covered by the `database` check going
red. The **silent** case is the one the old code could not see at all: the DB
ping is green, and only the credit-ledger query is denied, timing out, or
missing its table. Nothing was red, the snapshot said `healthy`, and the quota
field said `false`.

### Fix

1. `loadOddsCreditTruthOutcome(db, now)` — new. Returns
   `{ truth, readFailed, error }`. `loadOddsCreditTruth` now delegates to it, so
   the existing never-throws contract is unchanged for every other caller.
   Private `readLatestCreditObservation` / `readCreditObservationsSince` carry
   the failure; the public ones keep returning values only.
2. `assessOddsQuota()` in `health-alert-decision.ts` — a **three-state** reading:
   `lowQuota: boolean | null`, plus `measurable` and `readFailed`. `null` is not
   `false`.
3. `classifyHealthAlertSnapshot` takes `quota` and goes **unhealthy** on
   `readFailed` (reason `oddsQuota=unreadable`). A merely *never-observed* quota
   stays green on purpose — a fresh install has never made a paid call, and
   paging for that would be the fix manufacturing its own false alarm.
4. The route reads the outcome, logs a warning, passes `quota` to the classifier,
   and emits `oddsApiQuota` plus a tri-state `oddsApiLowQuota` in both the JSON
   and the webhook payload.

---

## F2 — a database outage reported as "pool ok"

### Where

`packages/db/src/neon-pool-monitor.ts` → `probeNeonPool`, against the stub
client defined at `packages/db/src/index.ts`:

```ts
if (key === "$queryRaw" || key === "$executeRaw") return async () => [];
```

### Why it was silent

`@sports/db` answers **every** `$queryRaw` with `[]` rather than throwing when
`DATABASE_URL` is unset/sentinel. So `SELECT clock_timestamp()` "succeeded" in
~0ms against a database that does not exist. The old code only checked that the
query *resolved* — it never checked that a row came back — so it took the
success branch.

Executed against the real exported `db` with `DATABASE_URL=stub`, pre-fix:

```
probeNeonPool : status="ok" error=null stubSuspected=false serverTime=null
counters      : {"probes":1,"successes":1,"failures":0,"lastOkAt":"2026-09-30T00:31:52.029Z"}
```

The counters are the worst part: `successes` incremented **and** `lastOkAt`
refreshed during the outage. That field is what an operator or a dashboard
reads to decide "the database was fine a minute ago", so the incident window
was actively being erased by the thing meant to detect it.

### Fix

`probeNeonPool` now requires evidence: the probe must return an actual server
timestamp before it can report anything but `down`. An empty (or unusable) row
set returns `status: "down"`, `stubSuspected: true`, counts a **failure**, and
deliberately leaves `lastOkAt` untouched. A database that answers still reports
`ok` — the fix does not turn the monitor red by default.

---

## Proof

Both fixes verified by executing the real functions, not a reimplementation —
`tsx` harness importing the actual modules (the only fake is the database, which
is what is missing). `packages/db/src/index.ts` is loaded for real with
`DATABASE_URL=stub` to produce the genuine stub client.

| | pre-fix | post-fix |
|---|---|---|
| `probeNeonPool(stubDb).status` | `"ok"` | `"down"` |
| `counters.successes` | `1` | `0` |
| `counters.failures` | `0` | `1` |
| `counters.lastOkAt` | refreshed | `null` (untouched) |
| `loadOddsCreditTruthOutcome().readFailed` | n/a (error swallowed) | `true` + message |
| reported `oddsApiLowQuota` | `false` ("fine") | `null` (unmeasurable) |
| snapshot verdict, green DB + failed quota read | `healthy` | `unhealthy` |

Controls proving the fix is not red-by-default:

- a real database that answers → `status: "ok"`, `successes: 1`
- a real, measured, healthy quota (842 remaining) → `lowQuota: false`, snapshot green
- a measured low quota (4 remaining) → `lowQuota: true`
- a never-observed quota on a fresh install → unmeasurable, snapshot **green** (no false page)
- a throwing outage → still `down` (unchanged)

## Tests

- `packages/db/src/__tests__/neon-pool-monitor.test.ts` — 6 added, 21 total pass
- `packages/data-ingestion/src/__tests__/odds-credit-governor.test.ts` — 4 added, 65 total pass
- `apps/web/__tests__/health-alert-decision.test.ts` — 12 added, 23 total pass

Suites: `packages/db` 38/38 · `packages/data-ingestion` 2459/2459 (480 files) ·
`packages/ingestion-pipeline` 1452 passed / 6 skipped · `apps/web` targeted 60/60.
`tsc --noEmit` clean for `packages/db` and `apps/web` (0 errors, same as baseline).

## Not addressed here

- The activity sample (`pg_stat_activity`) still fails to nulls and keeps
  `status: "ok"`. That is deliberate and covered by an existing test: the
  *connection* is healthy, only the per-connection detail is unprivileged.
  The fix here is about the connection itself, which now cannot fake it.
- `reservePaidCallSlot` fails open (`reserved: true`) on a ledger outage. That
  is the same family of silent failure and is **not** fixed by this change — it
  is a pacing decision (fail open so settlement never stalls), not a health
  report, and changing it needs an owner decision on the budget.
- `docs/ops/live-path-reachability.json` still lists the old export set. The
  `verify-convergence-inventory` guard fails on this clone for an unrelated
  reason (a referenced commit SHA is absent locally) — identical before and
  after this change.
