# Odds cadence RCA — why `refresh-odds` landed hourly on a 15-minute schedule

2026-11-12. Read-only investigation plus one code fix. No gate, env or schedule
change. The 30-minute freshness rule in `completeness-gate.ts` is untouched.

## Symptom

`vercel.json` declares `*/15 * * * *` for `/api/cron/refresh-odds`. Observed
`odds` ingestion runs on 2026-11-12 were 19:48, 20:52 and 22:00 UTC — roughly
hourly, with jitter.

## What it is not

- **Not the schedule.** `vercel.json` and `apps/web/vercel.json` both declare
  `*/15 * * * *`, and `__tests__/cron-schedule-manifest.test.ts` pins it.
- **Not the route.** `apps/web/app/api/cron/refresh-odds/route.ts` has no early
  return, no time check and no lock. It authenticates, resolves the key, builds
  the governor and calls `refreshOdds()`.
- **Not the governor's event check.** `hasEventWithinHorizon` only skips when
  the free scoreboard shows no event within 48 h, and it fails open (returns
  null, never a skip) when the scoreboard is unreachable.

## What it is

`PAID_CALL_MIN_INTERVAL_MS = 60 * 60 * 1000` in
`packages/data-ingestion/src/odds-credit-governor.ts:36`. The credit governor
allows at most one paid odds call per sport per hour, and `decide()` reserves
that hourly slot atomically. That is deliberate cost control on the Odds API
budget, and it is correct.

The defect is what `refreshOdds()` did with a hold. In
`packages/ingestion-pipeline/src/refresh-odds.ts`, a held sport hit:

```ts
results.push({ sport: sport.key, ok: true, oddsInserted: 0,
               note: `${CREDIT_GOVERNOR_SKIP_NOTE}: ${decision.reason}` });
continue;
```

That `continue` skipped `processSport()` entirely — which skipped the FREE path
as well. `processSport` selects the free ESPN/Rundown path from the key it is
handed (`"espn-free-path"` / `"rundown-free-path"`), and it was never called. So
the hourly cap on the PAID request silently became an hourly cap on ALL odds
ingestion.

The governor gates a paid request. It was gating the sport.

## The fix

On a hold, the sport now runs on the free path instead of being dropped:

```ts
let freeFallback = false;
if (governor) {
  const decision = await governedDecision(governor, sport.key);
  if (!decision.allow) {
    console.info(`... paid odds fetch skipped, credit governor: ${decision.reason}; running the free path`);
    freeFallback = true;
  } else {
    slotReserved = decision.reserved;
  }
}
...
const effectiveKey = freeFallback
  ? (rundownKey ? "rundown-free-path" : "espn-free-path")
  : processKey;
const res = await processSport(sport, effectiveKey, gates, "[cron:refresh-odds]");
if (governor && !freeFallback) {
  await recordPaidRunAccounting(governor, sport.key, res, { reserved: slotReserved });
}
```

`recordPaidRunAccounting` is skipped on the free fallback, because no paid
request was made and marking one would corrupt the credit ledger.

## What this does and does not change

- The paid call is still capped at one per sport per hour. Credits are not
  spent faster.
- The free ESPN/Rundown path now runs on every cron tick, so `odds.fetchedAt`
  should advance every 15 minutes instead of every 60.
- The 30-minute freshness rule is unchanged. If the free path cannot deliver,
  the gate still reports `MISSING_DATA` rather than accepting stale prices.
- `CREDIT_GOVERNOR_SKIP_NOTE` is still exported and still used by the
  accounting path; it is no longer the note for a held sport.

## Tests

`packages/ingestion-pipeline/src/__tests__/refresh-odds.test.ts` — 41 passed.
Four tests asserted the old behaviour (`processSport` not called on a hold) and
were updated to assert the new contract: the held sport runs, and the key it is
handed is `"espn-free-path"`.

## Not verified

The fix is not live. It needs a Production deployment, and the running
deployment still has the old code. Until that deploy lands, the odds feed will
keep moving hourly. The next qualifying Production deployment should be checked
for `odds.fetchedAt` advancing on a 15-minute cadence.

## Residual risk

If the free path is the only path and it is rate-limited, the cron will now
attempt it every 15 minutes instead of every 60. `refreshOdds` already has an
inter-sport pause and a Rundown 429 cascade guard (`skipRundownSports`), so a
rate limit degrades to fewer sports per tick rather than a hard failure. Watch
the first hour after deploy for 429s in the cron log.
