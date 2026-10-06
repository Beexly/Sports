# Odds-Insert Blackout — Why Production Has Never Recorded a Successful Odds Insert

**Date:** 2026-09-29
**Prod deployment SHA:** `f61ef8e38c22ce490c9a2f1b140e27c6bab36883` (11 commits behind `HEAD`=`ecbde527b2`)
**Branch examined:** `hermes-surf-16-provenance-fix`
**Scope:** read-only diagnosis. No DB write, no migration, no install, no deploy, no env change, no shadow stamp.

---

## TL;DR

**The blackout is not an odds problem. The production Postgres database is unreachable, and every
odds-inserting write path dies on its first DB statement.**

Both paid API keys and the 600/day budget are irrelevant to the failure: `OddsApiClient.getOdds()`
is never even reached, because `processSport()` opens with an unguarded
`db.ingestionRun.create()` **before** the try block that would catch a provider failure. With the DB
down that create throws, the throw escapes `processSport` entirely (it is not inside the `try`), and
`refreshOdds()` records `ok:false` per sport and moves on. Net result: **no `IngestionRun` row of any
status is ever created, so `lastSuccessAt` can never be non-null** — and the credit ledger, which is
written from the *result envelope* of a run that never completes, never receives its first
observation, which is why `credits.remaining` / `credits.used` are `null` rather than `0`.

The measured facts ("keys present, budget configured, never succeeded") are all **consistent with
this and only consistent with this** — every one of them is an *input* to the pipeline, and none of
them is evidence that the pipeline ran.

### The single most important tell

`/api/ops/public-surface-truth` returns, for `schedulerLiveness`:

```json
{ "status": "unknown", "lastAnyIngestionSuccessAt": null,
  "operatorHint": "Failed to query IngestionRun — cannot assess scheduler liveness this request." }
```

That string is the **`catch` arm** of `apps/web/lib/ops/scheduler-liveness.ts:179-186`, not the
"no rows" arm at `:138-146`. The two are different diagnoses:

| Message | Meaning |
|---|---|
| `No successful IngestionRun ever recorded — scheduler may never have fired…` | Query succeeded, table empty |
| **`Failed to query IngestionRun — cannot assess…`** | **Query THREW** |

The table is not empty. **The query cannot execute.** Note also that `isStubMode()` is false in prod
(the stub arm at `:121-128` would have said `"Stub DB mode — …"`), so this is a **real Prisma client
pointing at a database it cannot reach** — not a null-config stub.

### Independent confirmation (separate endpoint, separate code path)

`GET https://www.galaxysportsedge.com/api/health` → **HTTP 503**:

```json
{ "ok": false, "status": "degraded",
  "checks": { "database":  { "status": "error", "detail": "database unreachable" },
              "ingestion": { "status": "error", "detail": "Failed to query" } },
  "capabilityGraph": [ { "capabilityId": "db:primary", "status": "unavailable",
                         "reasons": ["evidence_kind:probe","database ping failed"] },
                       { "capabilityId": "engine:settlement", "status": "unavailable",
                         "reasons": ["hard_dep_unavailable:db:primary", ...] } ] }
```

`"database unreachable"` is the static string at
`apps/web/lib/health/live-capability-probes.ts:113-119`, emitted when a bare
`await db.$queryRaw\`SELECT 1\`` throws. That probe touches **no** `IngestionRun` table, **no** odds
provider, and **no** credit ledger — so it isolates the fault to the database itself.

A third independent confirmation: `GET /api/picks` → **HTTP 503**
`{"code":"rate_limit_store_unavailable"}`. Per `apps/web/app/api/picks/route.ts:44-59`, that
limiter is a durable-Postgres store, and the comment is explicit that "limiter store down" means the
DB is down.

**Three endpoints, three unrelated code paths, one shared dependency: Postgres is down.**

---

## Ranked candidate causes

### #1 — Production Postgres is unreachable (CONFIRMED, root cause)

**Evidence — live, independent of this repo's logic:**

- `GET /api/health` → 503, `checks.database.status = "error"`, `detail = "database unreachable"`.
  Produced by `await db.$queryRaw\`SELECT 1\`` throwing
  (`apps/web/lib/health/live-capability-probes.ts:112-120`).
- `GET /api/ops/public-surface-truth` → `schedulerLiveness.operatorHint = "Failed to query IngestionRun"`
  (`apps/web/lib/ops/scheduler-liveness.ts:179-186`).
- `GET /api/picks` → 503 `rate_limit_store_unavailable` (durable Postgres rate-limit store,
  `apps/web/app/api/picks/route.ts:44-59`).
- `capabilityGraph`: `db:primary: unavailable` and `engine:settlement: unavailable` with reason
  `hard_dep_unavailable:db:primary` — the platform's own dependency graph agrees the DB is down.

**Why the odds path cannot survive it — the exact code chain:**

1. `apps/web/app/api/cron/refresh-odds/route.ts:117` → `refreshOdds(...)`.
2. `packages/ingestion-pipeline/src/refresh-odds.ts:332` → `processSport(sport, processKey, gates, ...)`.
3. `packages/ingestion-pipeline/src/process-sport.ts:340-342` — **the first statement in the function
   body**, *above* the `try {` that opens at line 384:

   ```ts
   const run = await db.ingestionRun.create({
     data: { sport: sport.key, status: "RUNNING" },
   });
   ```

   With the DB down this **throws before the `try` is entered**. The `catch` at
   `process-sport.ts:1651-1657` — the one that would have written `status: "FAILED", errorMessage`
   — is never reached, because the throw happened outside it. So not even a FAILED row is recorded.
4. The throw propagates to `refresh-odds.ts:386-392`, which catches per-sport and pushes
   `{ sport, ok: false, error }`. The loop continues to the next sport, which throws identically.
5. `processSport` returns via exception, so the paid call at `process-sport.ts:419-424`
   (`client.getOdds(...)`) **is never reached**. No credits are spent; no quota headers are ever read.

**Why every measured fact is null (not zero) — the falsifiable detail:**

`process-sport.ts:372-382` returns `{}` (no quota fields) unless `paidRequestCount > 0`.
`paid-run-accounting.ts:76-86` writes a credit observation **only** when
`res.oddsApiRemainingRequests != null`. Since no run ever completes, `recordCredits()` is never
called, so the ledger has zero rows. `packages/data-ingestion/src/odds-credit-governor.ts`
(`latestObservation` → `remaining = null`) then reports `remaining: null, used: null`.

**`null` is therefore the signature of "never ran", not "ran and got nothing".** This is the
discriminator that rules out every provider-side hypothesis below: a genuinely exhausted budget or a
429 storm would show *numbers* (`remaining: 0`) and *rows*, not `null`.

**Likely underlying trigger (documented, not asserted):** the repo carries a standing, unresolved
migration-ledger divergence. `docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md` records that
`prisma migrate deploy` has failed with **P1001** (Neon *direct* endpoint unreachable from the Vercel
build network) and that `DIRECT_URL` "predates a password rotation / compute change and points at a
dead endpoint." `scripts/deploy/migrate-if-configured.mjs:26-33` names the same failure class. A Neon
compute suspend/expire or a stale host would produce exactly this runtime symptom. **Confirm against
the Neon console and the Vercel env vars before acting** — this is a hypothesis about *why* the DB is
unreachable, not the established fact. The fact is: the DB is unreachable, proven three ways.

---

### #2 — Deployment SHA lag: `f61ef8e38c22` is 11 commits behind (REAL, but NOT causal here)

Prod runs `f61ef8e38c22`; `HEAD` is `ecbde527b2`; `git rev-list --count f61ef8e38c22..HEAD` = **11**.

This was checked and then **ruled out as the cause of the odds blackout**:

```
git diff --stat f61ef8e38c22..HEAD -- \
  packages/data-ingestion/src/odds-credit-governor.ts \
  packages/data-ingestion/src/paid-odds-governor.ts \
  packages/data-ingestion/src/espn-schedule-seed.ts \
  packages/ingestion-pipeline/src/refresh-odds.ts \
  packages/ingestion-pipeline/src/process-sport.ts \
  apps/web/app/api/cron/refresh-odds/route.ts
→ (empty)
```

**Byte-identical.** Every file in the odds-insert path is the same in prod and on this branch.
Redeploying current `main` would not change a single line of the odds pipeline. It remains a real
hygiene debt (the truth endpoint's own `deployment.note` says as much) but it is **not** this bug.

---

### #3 — In-season gate yields an empty sport list (RULED OUT)

If `getInSeasonSports()` returned `[]`, the loop body never runs, `results` is `[]`, and
`ok = okCount === results.length` → `0 === 0` → **`ok:true` with no work done**.

Checked against the live clock (2026-09-29, UTC month 9) using the windows in
`packages/data-ingestion/src/config.ts:52-69` and `monthInWindow` (`:71-75`):

| Sport | Window | In season (Sep) |
|---|---|---|
| `americanfootball_nfl` | 8→2 (wraps) | **yes** |
| `americanfootball_ncaaf` | 8→1 (wraps) | **yes** |
| `baseball_mlb` | 3→10 | **yes** |
| `soccer_usa_mls` | 2→12 | **yes** |
| `basketball_nba` | 10→6 | no |
| `basketball_ncaab` | 11→4 | no |
| `icehockey_nhl` | 10→6 | no |

**4 sports are in season.** The gate is not the problem. (It *is* a latent reporting trap worth
noting: the empty-list case returns `ok:true`, so "no sports to process" is indistinguishable from
"all sports processed fine" in the cron response. Not today's cause.)

---

### #4 — Credit governor denies every sport before the paid call (NOT the cause; fails OPEN by design)

`refresh-odds.ts:308-326` — when the governor denies, the sport is skipped with
`note: "credit_governor_skip: …"` and `oddsInserted: 0`, and `continue`s.

The only denial path that could latch permanently with zero ledger writes is
`odds-credit-governor.ts`'s `hasEventWithin48h === false` (free ESPN scoreboard check), since the
quota branch is skipped entirely when `remaining === null`. **Verified it cannot latch:**

- `apps/web/lib/odds/paid-odds-governor.ts` / `packages/data-ingestion/src/espn-schedule-seed.ts` build
  a **range** query, `?dates=20260929-20261001&limit=300`.
- **Measured live, right now:** ESPN returns **HTTP 400** for that exact shape on every sport
  (`football/nfl`, `baseball/mlb`, `soccer/usa.1`, `football/college-football`):
  `{"code":400,"message":"Failed to get events endpoint."}`. Single-day (`dates=20260929`) and
  no-dates forms return **200**.
- A non-`ok` response is caught and returns `null` = *"scoreboard unreadable → never a reason to
  skip"* → the governor **allows**.

So the ESPN 400 fails **open** and cannot be the blackout. It is a **real, separate, still-live bug**
worth filing: the governor's free cost-control is silently dead, because the range query it uses is
one ESPN now rejects. That bug causes *overspend*, not blackout — opposite direction.

---

### #5 — Paid HTTP 402 circuit breaker latched OPEN (NOT the cause)

`process-sport.ts:404-411` skips the paid leg when the breaker is open and falls through to the free
dual-path. But the breaker is **process-memory, re-armed per cold start**
(`packages/data-ingestion/src/odds-api-circuit-breaker.ts`) — a fresh serverless instance re-probes
upstream rather than inheriting a latch. And crucially the free path would still run and still write
`IngestionRun` rows. Since **zero** rows exist, this cannot be the cause either.

---

### #6 — Provider returns empty / 429 / quiet board (RULED OUT by the `null` signature)

A quiet board, a 429 cascade, or an empty slate would all produce `IngestionRun` rows with
`status:"SUCCESS", oddsInserted:0` — which is precisely what the truth surface reports separately as
`lastZeroOddsSuccessAt` (`public-surface-truth/route.ts:371-379`, which selects
`status:"SUCCESS", oddsInserted: 0, sport: { not: "free-spine" }`).

**`lastZeroOddsSuccessAt` is also `null`.** There is no quiet-board history. This closes off the
entire family of provider-side explanations and is the second-strongest piece of evidence for #1.

---

### #7 — The free ESPN tertiary path is enabled but unreachable (CONTRIBUTING, not primary)

`dualPath.espnPublicTertiary: true` is a **hardcoded literal** in the truth route
(`public-surface-truth/route.ts:328-329`) — it reports that the *code path exists*, not that it ran
or succeeded. Given #1, the free dual-path (and its zero-key fallback chain in
`refresh-odds.ts:223-233`) is dead in production for the same reason. Nothing here is a separate
cause; it is downstream of #1.

---

## What I ruled out and why (evidence summary)

| Hypothesis | Verdict | Discriminating evidence |
|---|---|---|
| Missing / mismatched API key | **Ruled out** | `oddsKeyPresent:true`, `oddsMatchedEnv:THE_ODDS_API_KEY`, `rundownKeyPresent:true`. Also `resolveOddsApiKey` (17 aliases, `odds-api-key.ts:9-40`) would have to miss all of them. |
| Credit budget exhausted | **Ruled out** | `remaining`/`used` are `null`, not `0`. A spent budget shows numbers + rows. `dailyBudget:600` is a **constant** (`odds-credit-governor.ts:24`, surfaced at `:282`), not a configured value — it reports regardless of reality. |
| Governor denying all sports | **Ruled out** | Fails open on both branches; ESPN range 400 → `null` → allow. |
| No sports in season | **Ruled out** | 4 in-season sports at UTC month 9. |
| Empty slate / 429 / quiet board | **Ruled out** | `lastZeroOddsSuccessAt` is `null` — no SUCCESS row of any kind exists. |
| 402 circuit latched | **Ruled out** | In-memory, resets per cold start; free path would still write rows. |
| Cron not firing at all | **Not needed** | `schedulerLiveness` shows the *query* failed, not that the table was empty. And `/api/picks` + `/api/health` fail outside cron entirely. |
| Prod SHA 11 commits behind | **Real, non-causal** | `git diff --stat` on all 6 odds-path files: **empty**. |
| **DB unreachable** | **CONFIRMED** | `/api/health` 503 `database ping failed`; `SELECT 1` throws; plus 2 more independent endpoints. |

---

## Recommended next steps (operator — NOT performed here; read-only scope)

1. **Confirm the DB is still down** (seconds): `curl -s https://www.galaxysportsedge.com/api/health | jq .checks.database`
   → expect `{"status":"error","detail":"database unreachable"}`.
2. **Identify the DB failure** — Neon console (compute suspended/expired, branch, connection limits)
   and the Vercel env vars `DATABASE_URL` (pooled, `-pooler` + `?pgbouncer=true`) and `DIRECT_URL`
   (direct, non-pooler). Per `packages/db/src/index.ts:218-245`, app traffic must use the pooled
   endpoint; an unpooled `DATABASE_URL` is a known outage class.
3. **Do NOT redeploy to "fix" this.** Redeploying will not help while the DB is unreachable, and
   `migrate-if-configured.mjs` will hard-fail the build on an unreconciled ledger
   (`MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md`).
4. **Once the DB is back, re-check the truth endpoint.** `oddsInserting.lastSuccessAt` should populate
   within one `*/15` cycle, and `dualPath.credits.remaining` should go from `null` to a number on the
   first successful paid call. If `credits.remaining` stays `null` after the DB is restored, that is a
   *new* finding and points at the paid fetch itself.
5. **Separately file the ESPN range-query regression** (#4 above). It is live right now, it silently
   disables the free cost-control, and it will cause credit overspend once the DB is back. Fix shape:
   use per-day requests instead of a `dates=A-B` range (the repo's own `espn-schedule-seed.ts` comments
   already document that range form dropping events).
6. **Consider hardening the failure mode** (design note, not urgent): `process-sport.ts:340` sits
   outside the `try`, so a DB outage yields *no* row at all rather than a `FAILED` row. Moving the
   `ingestionRun.create` inside the `try` (or wrapping it) would make outages legible in the ledger
   instead of invisible. This is the single change that would have made today's outage self-diagnosing.

---

## Provenance

- All production claims come from three live read-only GETs on 2026-09-29:
  `/api/ops/public-surface-truth` (200), `/api/health` (503), `/api/picks` (503), plus two read-only
  ESPN GETs used to test the governor's query shape.
- All code claims are file:line citations into the working tree at `ecbde527b2`, diffed against prod
  SHA `f61ef8e38c22` where relevant.
- No writes, no migrations, no installs, no deploys, no env changes, no git mutations were performed.
