# PRODUCTION IS DOWN — Postgres unreachable, not an odds problem (2026-09-29)

**Severity: live outage.** Confirmed by direct probe of four independent endpoints.
This corrects an earlier conclusion of mine that the odds path was failing.

## The evidence

| Probe | Result |
|---|---|
| `GET /api/health` | **503** `{"status":"degraded","checks":{"database":{"status":"error","detail":"database unreachable"},"ingestion":{"status":"error","detail":"Failed to query"}}}` |
| `GET /api/picks` | **503** — the durable Postgres rate limiter cannot reach its store |
| `GET /api/ops/public-surface-truth` | `operatorHint: "Failed to query IngestionRun — cannot assess scheduler liveness this request."` |
| odds credit fields | `remaining: null`, `used: null`, `lastSuccessAt: null` |

The credits are **`null`, not `0`** — and that distinction is the whole diagnosis.
A spent budget or a 429 storm leaves *numbers*. `null` means the code that writes
those counters only runs on a completed cycle, so the cycle never completed.
`lastZeroOddsSuccessAt` is also null: there is no SUCCESS row of any kind, ever.

## Why this is invisible rather than loud

`packages/ingestion-pipeline/src/process-sport.ts:340`

```ts
const run = await db.ingestionRun.create({ data: { sport: sport.key, status: "RUNNING" } });
```

That is the **first** statement in `processSport()`, and it sits **above** the
`try` block that only opens at line 384. With Postgres unreachable it throws
outside the catch, so:

- no FAILED `IngestionRun` row is written,
- `client.getOdds()` at line 422 is never reached,
- zero credits are spent, so the credit governor looks perfectly healthy.

The one row that would have made this self-diagnosing is the row the outage
prevents from existing. Moving `ingestionRun.create` inside the `try` is a
one-line change that would have turned an invisible outage into a readable one.
Not applied here — it is a behaviour change on the ingestion path.

## What is NOT the cause (each ruled out with evidence)

- **Missing API keys** — `THE_ODDS_API_KEY` and `THERUNDOWN_API` both resolve.
- **Budget exhausted** — `dailyBudget: 600` is a compile-time constant at
  `odds-credit-governor.ts:24`, not a configured value.
- **Governor denial** — the governor fails open, so it cannot block writes.
- **Season gate** — four sports are in season in UTC month 9.
- **402 circuit breaker** — in-memory, resets on every cold start.
- **Deploy lag** — real, but NOT causal: `git diff --stat f61ef8e38c22..HEAD`
  across all six odds-path files is **empty**. Redeploying changes nothing here.

## Separate live bug, opposite direction (causes overspend, not blackout)

ESPN now returns **HTTP 400** for the exact `?dates=A-B&limit=300` range query the
credit governor issues. Single-day and no-dates forms still return 200. It fails
open, so it cannot cause the blackout — but the free cost-control is silently dead.

## What needs a human, now

1. **Why is production Postgres unreachable?** That is a hosting/connection/
   pool question, not a code question. Everything else is downstream of it.
2. Only after that: the `ingestionRun.create` placement, so the next outage is
   visible instead of silent.
3. The ESPN 400 can be fixed independently whenever.

No code was changed in producing this. Read-only throughout: no DB write, no
migration, no deploy, no env flip.
