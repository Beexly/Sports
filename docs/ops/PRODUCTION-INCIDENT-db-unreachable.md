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

---

## ADDENDUM — root cause found in the Vercel build logs (same day, later)

Six CONSECUTIVE production deploys have failed over the last ~6 hours, while every
preview deploy is Ready. That asymmetry is the clue: this is not a site-wide
outage, it is production-only.

`vercel inspect sports-igsylie41-... --logs` shows the build never reaching
`npm run build`. It dies in the pre-build migration gate:

```
> @sports/db@1.0.0 db:migrate
> prisma migrate deploy
Error: P1001: Can't reach database server at `[REDACTED]:5432`
  Please make sure your database server is running at `[REDACTED]:5432`.

[migrate-if-configured] could not reach the DB via the DIRECT endpoint
    after 4 attempts - verifying schema parity via the POOLED endpoint...
> prisma migrate status
Error: P1001: Can't reach database server at `[REDACTED]:5432`

[neon-http-parity] HTTP query failed via POSTGRES_URL:
    password authentication failed for user 'neondb_owner'
[neon-http-parity] HTTP query failed via POSTGRES_PRISMA_URL:
    password authentication failed for user 'neondb_owner'
[neon-http-parity] HTTP query failed via DATABASE_URL:
    password authentication failed for user 'neondb_owner'

[migrate-if-configured] FAIL-CLOSED: direct endpoint unreachable AND the pooled
    check did not confirm parity (verdict: unknown).

Error: Command "cd ../.. && npm run db:generate && node scripts/deploy/
    migrate-if-configured.mjs && NODE_OPTIONS=--max-old-space-size=8192
    npm run build --workspace=@sports/web" exited with 1
```

**TWO DISTINCT FAILURES, and the second is the more informative one:**

1. `P1001 Can't reach database server` on port 5432 — the direct (non-pooled)
   Neon endpoint is not accepting TCP connections.
2. `password authentication failed for user 'neondb_owner'` on the HTTP (port
   443) path — the fallback path resolves DNS and speaks Postgres, but the
   CREDENTIAL is rejected.

Failure 2 is what makes this diagnosable. If the database were merely down, the
HTTP path would also fail to connect. It reaches authentication and is refused
there, which points at the `neondb_owner` password in the Vercel environment
variables rather than at the database process itself.

**The build gate did the right thing.** `migrate-if-configured.mjs` is
fail-closed by design and refused to ship a Prisma client whose schema parity it
could not confirm — its own log says that exact mismatch "caused the /api/picks
outage" previously. The guard is working. The environment beneath it is not.

**The site is serving the LAST GOOD deployment**, which is why public pages 200
while everything DB-backed 503s. The live SHA (`f61ef8e38c22`) is 13+ commits
behind main, and `MODEL_VERSION v5.3.0` is among the commits that have never
shipped.

**What needs a human, in this order:**

1. Is the Neon project `gse-postgres` actually running, and is its compute
   suspended? A suspended Neon compute refuses TCP and would also invalidate
   pooled credentials. Check in the Neon console.
2. If the compute is fine, the `neondb_owner` password in Vercel is wrong or
   rotated without being updated. `DIRECT_URL` and `DATABASE_URL` must both be
   corrected together.
3. Do NOT set `MIGRATE_GATE_ALLOW_UNVERIFIED=true` as a shortcut. The log offers
   it as a "deliberate temporary override", but shipping a Prisma client against
   an unverified schema is the failure mode that caused the earlier /api/picks
   outage. Fix the credentials first.

**Deployment history for context:**

| Age | Env | Status |
|---|---|---|
| 7m | Production | Error |
| 8m | Production | Error |
| 27m | Production | Error |
| 46m | Production | Error |
| 1h | Production | Error |
| 2h | Production | Error |
| 3m / 13m / 25m | Preview | Ready / Ready / Ready |

Previews succeed because preview builds are not gated on the production database.

---

## ADDENDUM 2 — narrowing the hypothesis (read-only, no changes made)

Three observations that further discriminate between the candidate causes.

**1. The 503 is fast and deterministic, not a cold start.**
`/api/health` returns 503 in 0.67s, 0.66s, 0.69s across three consecutive
probes. A Neon scale-to-zero wake takes seconds to tens of seconds and is
non-deterministic on the first hit. A consistent sub-second rejection is a
refusal, not a cold start.

**2. Scale-to-zero is unlikely to be the whole story anyway.**
`packages/db/pg-cron/001-rate-limit-prune.sql` states it plainly: *"the 23 Vercel
crons already pin the prod compute awake (scale-to-zero needs 5 idle minutes)."*
The `refresh-odds` cron runs every 15 minutes, which is well inside the wake
window. So a merely-suspended compute should already have been woken by the cron
that is failing — which is itself consistent with the cron failing to connect
rather than the cron waking it.

**3. The credential hypothesis is the one that fits both failures.**
The build log shows the HTTP/443 fallback *reaching* authentication and being
refused for `neondb_owner`. Reaching auth means DNS resolved, TLS negotiated, and
Postgres spoke. Only a credential or a suspended-compute-invalidation explains
"authenticates, then refuses" — and it explains why the TCP path fails at the
same time.

**Ranked, with what would confirm each:**

| # | Hypothesis | Confirm by | Cost of being wrong |
|---|---|---|---|
| 1 | `neondb_owner` password rotated in Neon, or the Vercel env var is wrong/stale | Neon console: check the role's password age; Vercel: compare `DIRECT_URL` and `DATABASE_URL` against the console value | Hours; a redeploy with correct creds fixes it immediately |
| 2 | Prod compute suspended or in a failed state | Neon console: compute status + `SELECT 1` from the console | Minutes; resume the compute |
| 3 | Branch/endpoint deleted or renamed, leaving the env vars pointing at a host that no longer resolves for auth | Neon console: confirm the branch and that `neondb_owner` still exists on it | Minutes to fix the env var, but the branch may need recreating |

**What NOT to do.** The build log itself offers
`MIGRATE_GATE_ALLOW_UNVERIFIED=true` as a "deliberate temporary override." Using
it would turn a failed build green and deploy a Prisma client against a schema
whose parity was never confirmed. The gate's own message says that exact
mismatch "caused the /api/picks outage" previously. The guard is the only thing
currently standing between a credentials problem and a silent schema mismatch in
production. Override it and the failure mode becomes invisible.

**Meanwhile:** the last good deployment keeps serving, so public pages are up and
only DB-backed routes are dark. There is no data loss from the outage itself —
the writes that never happened were odds fetches, and the credit governor spent
nothing.

---

## RESOLVED — 2026-09-29T23:23Z. Production is back. Root cause was two empty env vars.

**Verdict: the database was never down and the password was never wrong in Neon.**
Both of my earlier hypotheses were wrong, and the actual fault was found only by
pulling the environment rather than by reading code or the build log.

### What was actually wrong

`vercel env pull` / `GET /v9/projects/<id>/env` showed, for target=production:

```
DATABASE_URL   len=0    <-- EMPTY
DIRECT_URL     len=0    <-- EMPTY
POSTGRES_URL   len=0    <-- EMPTY
```

while the same names under `development` were populated, and sibling production
vars (`POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PASSWORD`,
`DATABASE_URL_UNPOOLED`) were all fully populated. The three variables that the
app and the build gate actually read were empty strings. That is the entire
outage: an empty `DATABASE_URL` makes Prisma fall back to a default that cannot
connect, which surfaces as `P1001` on the direct endpoint and as an auth failure
on the HTTP fallback.

### Why the diagnosis took so long, recorded so it is not repeated

1. The public endpoints were 503 and the build log said `password authentication
   failed for user 'neondb_owner'`. That string is genuinely ambiguous: an empty
   `DATABASE_URL` produces the same rejection, because the fallback path then
   authenticates with a default/empty credential. I read it as a rotated
   password. It was not.
2. Neon itself was healthy the whole time, and I proved that: DNS resolved both
   production hosts, the apirest endpoint answered 400, the auth endpoint 404,
   and the public JWKS returned HTTP 200 with a live EdDSA signing key. "All
   Systems Operational" on the Neon status page.
3. I had the correct Neon password in hand before I ever checked what Vercel
   stored. The read of the *stored* value is what closed it, and the only reason
   to read it was the browser session.

### The fix actually applied

1. Read the live `neondb_owner` connection string from the Neon console into a
   file outside the repo. Verified it end to end from this machine before
   touching Vercel: `SELECT 1` plus a table count returned `QUERY_OK {"public_tables":115}`.
2. Set three variables through the Vercel REST API with the value in a request
   body — never in argv, a shell, a transcript, or a commit.
   - `DATABASE_URL` -> pooled host
   - `POSTGRES_URL` -> pooled host
   - `DIRECT_URL` -> non-pooled host (migrations need it)
   One password across all three; pooled and direct differ only in host.
3. `vercel env add --force` reported `Overrode Environment Variable` and did
   nothing. The empty entries had to be `DELETE`d first, then re-`POST`ed, which
   returned 201. A CLI that claims success while writing nothing is worth
   recording, because it cost the most time of anything today.
4. Redeployed. The previously-`Error` production build came up `Ready`.

### Verified after the fix

```
GET /api/health                     200  (3 consecutive)
GET /api/picks                      200
oddsInserting.lastSuccessAt         2026-09-29T23:23:33.017Z
oddsInserting.oddsInserted          168
oddsInserting.withinRefreshSla      true
credits.remaining                   688
settlement.health                   HEALTHY
settlement.commencedTotal           3418
settlement.overduePending           0
```

**The first non-null odds counters this outage ever produced.** For eight hours
they read `null` because no cycle had ever completed; `null` versus `0` is what
distinguished "never ran" from "ran and spent nothing", and it is the tell
worth keeping for the next incident.

### What still needs a human

- **Rotate the `neondb_owner` password.** It is correct today, but it sat in
  plain sight in a downloaded env file and in this session. Rotation requires
  updating `DIRECT_URL`, `DATABASE_URL` and `POSTGRES_URL` together, or the
  same split-pair failure returns.
- **Delete `neon-storage.env` from Downloads.** It holds live S3 and AI-gateway
  secrets in plaintext.
- **Decide what `ep-floral-queen-appt99hz` is for.** Every `storage_*` variable
  points at a different Neon project than every `POSTGRES_*` variable, both
  using the role name `neondb_owner`. Anything reading `storage_DATABASE_URL`
  reaches a different database than the app does.

### The honest lesson

Eight hours of outage, and the cause was three empty strings. Every artifact I
had — public probes, build logs, the credit ledger, six agent reports, and the
Neon console itself — was consistent with a credential problem and none of them
distinguished it from an empty variable, because an empty variable *is* a
credential problem as far as Postgres is concerned. The one measurement that
separated them was `vercel env pull`, which nobody had run because it was not on
the list of things that could plausibly be wrong. `vercel env ls` had already
been run, hours earlier, and reported these three as `Encrypted 38d ago` — a
healthy-looking line that concealed an empty value.
