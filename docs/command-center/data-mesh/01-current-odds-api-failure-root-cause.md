# 01 — Current Odds-API Failure Root Cause (Phase 1)

> Full trace of how live data flows from The Odds API into the product, and the
> single most important finding: **a provider failure is reported to Vercel cron
> monitoring as a success.** Every claim below is file:line backed. No secret
> values appear in this document.

---

## Headline — how the failure was masked as success

**A provider 401 / 403 / 429 becomes an HTTP 200 "ok" from the cron endpoint.**

The chain that produces the lie:

1. `packages/ingestion-pipeline/src/process-sport.ts:418-426` — `processSport()`
   wraps its whole body in `try/catch`. On **any** error (including a provider
   401/403/429 thrown out of `OddsApiClient`) it does **not rethrow**. It updates
   the `IngestionRun` row to `FAILED` and **returns** `{ sport, status: "failed",
   games: 0, picks: 0, error: message }`.
2. `apps/web/app/api/cron/refresh-odds/route.ts:74-87` — the caller `await`s
   `processSport(...)` but **ignores its return value**. Inside its own
   `try/catch`, the only way it records a failure is if `processSport` *throws* —
   which it never does. So the catch block (lines 78-84) is effectively dead for
   provider failures, and the loop always pushes `{ sport, ok: true }` (line 77).
3. `apps/web/app/api/cron/refresh-odds/route.ts:92-100` — the final
   `NextResponse.json({ ok: okCount === sportResults.length, ... })` is returned
   **with no status code argument**, so it defaults to **HTTP 200**.

Net effect: Vercel cron health is judged on HTTP status. A run where the provider
returns 401/403/429 for **every** sport still returns **HTTP 200**. The failure
is only visible by parsing `body.results[].ok === false` — which nothing monitors.
The provider outage is invisible to the platform's cron monitoring.

### The one honest signal that survives

`process-sport.ts:421-424` still writes `IngestionRun.status = "FAILED"` with
`errorMessage` and `completedAt` to the database before returning. That database
write is the *only* place the failure is recorded truthfully. It is also exactly
why readiness eventually (and correctly) goes red — see "Readiness calc" below.
The bug is a **monitoring-signal** masking, not a data-integrity masking: bad data
is not written, but the operator is told "green" when the pipeline is starving.

---

## Where odds is called (provider surface)

The single client is `packages/data-ingestion/src/odds-api-client.ts`:

| Method | Lines | Purpose |
|---|---|---|
| `OddsApiClient.fetch` (private) | 41-73 | Core fetch + query-string + error handling |
| `getSports` | 75-77 | List sports |
| `getOdds` | 79-89 | Odds for a sport (h2h/spreads/totals) |
| `getScores` | 91-99 | Scores (settlement) |
| `getEvents` | 101-107 | Event list |

Call sites:

- `packages/ingestion-pipeline/src/process-sport.ts:108` — `new OddsApiClient(apiKey)`
- `packages/ingestion-pipeline/src/process-sport.ts:111` — `client.getOdds(...)`
- `workers/data-refresh/src/index.ts:76` — `new OddsApiClient(...)` in `settleResults`
- `workers/data-refresh/src/index.ts:81` — `client.getScores(...)`
- `apps/web/app/api/admin/trigger-refresh/route.ts:28` — `processSport(...)` with `apiKey`

**Env var:** `THE_ODDS_API_KEY` (read at `refresh-odds/route.ts:45`; absent ⇒ HTTP 500).

**Fields consumed:** `h2h` (moneyline), `spreads`, `totals`; bookmaker keys
(`fanduel`, `draftkings`, `betmgm`, `caesars`, `pointsbetus`, `bovada`,
`mybookieag`); prices (home/away/draw); points (spread & total); `event id`,
`sport_key`, `commence_time`, `home_team`, `away_team`; `scores` + `completed`
status (settlement); `last_update` timestamps; `bookmaker.key`, `bookmaker.title`,
`market.key`, `market.last_update`; `outcomes` (name + price) and `outcomes.point`.

---

## The job (what runs odds ingestion)

- **Cron schedule:** `.github/workflows/external-cron.yml:21` (every 30 minutes)
  pings the route; daily backups are in `vercel.json:8-44`.
- **Endpoint:** `apps/web/app/api/cron/refresh-odds/route.ts` — `GET`, auth via
  `Bearer ${CRON_SECRET}` (line 41), `maxDuration = 300` (line 30). Loops
  `SUPPORTED_SPORTS`, calls `processSport` per sport with a 750ms pause (line 86).
- **Shared logic:** the long-running `workers/data-refresh` and this cron both
  call `processSport` so the two paths can't drift (route header comment, lines 5-8).

---

## Last-good store

- **Model:** `IngestionRun` — `packages/db/prisma/schema.prisma:318-334`. Fields:
  `status` (`IngestionStatus`), `errorMessage`, `startedAt`, `completedAt`,
  `gamesUpserted`, `oddsInserted`. Indexed on `status` and `startedAt`.
- On success/failure, `process-sport.ts` sets `status` + `completedAt` (and
  `errorMessage` on failure at 421-424). The "last good" pointer the system uses
  is **the most recent row where `status = "SUCCESS"`** (see readiness calc).

---

## The freshness rule (the "60-minute" question)

- **Enforced threshold is 2 hours (120 minutes), not 60.**
  `apps/web/lib/health/checks.ts:46-54`:
  `const ageHours = ageMs / (1000*60*60); checks["ingestion"] = { status: ageHours > 2 ? "error" : "ok" }`.
  When the newest `SUCCESS` `IngestionRun` is older than 2h, the ingestion check
  flips to `error`, which drives `/api/ready` to 503.
- The **60-minute** figure in
  `synthetic-monitoring/dashboard.ts:170` (CHECK-E1 label) is **aspirational /
  pending**, not enforced. Documenting the discrepancy: the operator-facing label
  says 60 min, the gate says 120 min. Reconciling these belongs to Wave 2's job
  truth contract work.

---

## Health calc

- `/api/health` — `apps/web/app/api/health/route.ts` — **always HTTP 200**;
  semantics `liveness_with_dependency_summary`. It reports dependency state in the
  body but never fails the status code. (Liveness, by design.)
- `/api/ready` — `apps/web/app/api/ready/route.ts:9-16` — returns
  `status: payload.ok ? 200 : 503`; semantics `dependency_readiness`.

Both call `loadHealthChecks()` (`apps/web/lib/health/checks.ts`), which runs two
checks:

1. **Database** — `await db.$queryRaw\`SELECT 1\`` in try/catch
   (`checks.ts:19-31`). Unreachable ⇒ `error`.
2. **Ingestion freshness** — `findFirst` where `status = "SUCCESS"` ordered by
   `completedAt desc` (`checks.ts:33-55`). Returns `error` if **no** SUCCESS row
   exists, or if `ageHours > 2`.

`loadHealthChecks` sets `ok = every check === "ok"` (`checks.ts:67`).
**Readiness flips to 503 when ingestion is `error` OR the database is unreachable.**

### Why readiness is *correctly* red during an outage

Because `processSport` writes `status = "FAILED"` (never SUCCESS) on provider
failure, no new SUCCESS row appears. Within 2 hours the newest SUCCESS row ages
past the threshold and `/api/ready` returns 503 — honestly. The masking is at the
**cron HTTP signal**, not at readiness. Readiness is the backstop that already
works; the cron "ok=true" is the lie that hides the cause and delays the page.

---

## Route dependencies on odds data

- **`/` (homepage)** — loads `BoardState`, `BoardPasses`,
  `PublicCalibrationReport` via `Promise.all(...)`. All depend on game/pick/
  gateDecision tables populated by odds ingestion. Shows a sample-data banner if
  `isSampleData` is set.
- **`/board`** — same three loaders; queries live `gateDecision` lanes
  (`SCORING_NOW`, `PUBLISHED_TODAY`, `GATED_TODAY`). Depends on the 30-min refresh.
- **`/api/board/state`** — `route.ts:7-35` try/catch returns
  `{ success: true, ... dataStatus: "degraded" }` HTTP 200 on any loader error —
  **never 500** on provider failure.
- **`/api/board/state?check=book-depth`** — needs `bookmakerCoverageMax >= 8`
  books; depends on live odds ingestion.
- **`/picks`** — calls `/api/picks`, which gates on readiness: if
  `canExposePublicPicks === false` it returns 503 `bootstrapGateResponse`;
  otherwise queries `pick` where `isPublished:true, isBootstrap:false`.

---

## Public 500 risk — MITIGATED

All public routes fail closed; no uncaught exception reaches a public HTTP endpoint:

- `apps/web/app/api/board/state/route.ts:10-34` — catch returns
  `{ success: true, bootstrap: true, dataStatus: "degraded" }` HTTP 200.
- `/` and `/board` pages use `Promise.allSettled()` so a single loader failure
  degrades rather than crashes.
- `/api/picks` gates on readiness (503 if gate false), never throws.
- `/api/board/passes` has try/catch returning empty passes.
- `/api/cron/refresh-odds:75-84` has per-sport try/catch — partial provider
  failure surfaces as `ok:false` in the JSON body, not a 500.

Residual (minimal) risk: if `loadBoardState` / `loadBoardPasses` /
`loadPublicCalibrationReport` throw *before* the route-level catch — but each wraps
its own DB ops. The same fail-closed posture is what allows the cron masking to go
unnoticed: nothing screams, so the green status is believed.

---

## Swallowed errors (inventory)

| Location | What is swallowed |
|---|---|
| `apps/web/app/api/cron/refresh-odds/route.ts:76-77` | Ignores `processSport` return value; pushes `ok:true` |
| `packages/ingestion-pipeline/src/process-sport.ts:418-426` | Catch-all returns `{status:"failed"}` instead of throwing |
| `packages/ingestion-pipeline/src/process-sport.ts:253-257` | `.catch(() => null)` on form queries |
| `packages/ingestion-pipeline/src/process-sport.ts:123-128` | Source-snapshot error treated as non-fatal |
| `packages/ingestion-pipeline/src/process-sport.ts:235-241` | Enrichment error treated as non-fatal |

The 123-128, 235-241, and 253-257 swallows are arguably correct (snapshots/
enrichment/form are best-effort). The **load-bearing** bugs are **418-426**
(failure-as-return) and **76-77** (return ignored) — together they are the masking.

---

## Missing tests (to add in Wave 2)

- `__tests__/board-state-provider-failure.test.ts` — `/api/board/state` catch
  clause (route.ts:10-34) when `db.gateDecision.findMany` throws.
- `__tests__/picks-api-provider-failure.test.ts` — `/api/picks` when
  `db.pick.findMany` throws.
- `__tests__/picks-api-entitlements-error.test.ts` — `getUserEntitlements()`
  throwing in `/api/picks`.
- `__tests__/health-ingestion-age-boundary.test.ts` — ingestion age exactly 2.0h
  vs 2.001h boundary in `health/checks.ts`.
- `__tests__/cron-refresh-odds-partial-failure.test.ts` — cron per-sport try/catch
  (route.ts:75-84) when 3/7 sports succeed and 4 fail (and that this surfaces in
  the HTTP status, not just the body — the core of the Wave 2 fix).

---

## Launch-critical fix (Wave 2)

Make the cron endpoint honest. In
`apps/web/app/api/cron/refresh-odds/route.ts`:

1. Read the value `processSport` returns and treat `status === "failed"` as a
   failure (it currently ignores the return — lines 76-77).
2. When `okCount < totalCount`, return the final `NextResponse.json(...)` with an
   explicit non-200 status (e.g. `502`/`207`) instead of the implicit HTTP 200 at
   line 92, so Vercel cron monitoring sees the provider outage.

Smallest safe, highest-leverage change to restore the **job truth contract**:
a provider 401/403/429 must surface as a failing HTTP status, not a green run.
