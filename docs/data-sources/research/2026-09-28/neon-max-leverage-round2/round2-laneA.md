# Neon Postgres Round 2 — Lane A: Extensions + Connection Pooling

Research date: 2026-09-28. **Research only — no repo git state touched.**
Primary sources: official neon.com/docs (crawled this pass) + Prisma docs where cited. Third-party tables (e.g. the Mar-2026 Medium comparison claiming pg_cron/Timescale/pg_partman are unavailable on Neon) are **stale and contradicted by Neon's own extension explorer** — see Finding 5.

---

## RANKED FINDINGS (by value × feasibility)

| Rank | Finding | Est. value | Difficulty | Reversibility |
|---|---|---|---|---|
| 1 | **Move Prisma runtime to the pooled `-pooler` endpoint** (config-only; pooler is free + always-on). 10,000 pooled client conns vs 104 direct at 0.25 CU — kills serverless connection-exhaustion risk | Prevents outages under burst; saves a compute-size upgrade (~$20–40/mo if exhaustion forces scaling) | Config change, no founder tap | Trivial (swap string back) |
| 2 | **pg_cron IS available on Neon** — can absorb pure-SQL maintenance jobs off Vercel crons. Marginal compute cost ≈ $0 if the existing 23 Vercel crons already keep the compute warm; up to ~$19.35/mo if scale-to-zero must be disabled | Saves Vercel function spend + gives transactional, zero-hop maintenance jobs | Config change + 1 founder tap (Neon API key for enablement; brief restart) | High (`cron.unschedule` + drop extension) |
| 3 | **pgvector is on every Neon plan, no add-on** — v0.8.x, HNSW + IVFFlat. Makes a separate vector DB unnecessary for the bge-m3/Qwen3 embeddings lane | Avoids a Pinecone/Weaviate tier (~$0–70+/mo depending on vendor) | Config + code change, no founder tap | High (column/index are ordinary schema) |
| 4 | **pg_stat_statements (+ the `neon` extension) = free query telemetry** already sitting in the catalog | Faster slow-query triage; zero cost | Config change (`CREATE EXTENSION`) | High |
| 5 | **Surprise: TimescaleDB AND pg_partman are BOTH listed in Neon's extension explorer** — time-series + partitioning primitives for the signals/calibration tables are available | Continuous aggregates + retention policies could cut rollup-job code substantially | Code change (evaluate on throwaway branch) | High |
| 6 | **pg_net / pg_http NOT available** — no async HTTP calls from inside SQL. pg_cron cannot phone out to webhooks on Neon | Avoids a dead-end design (don't architect pg_cron→webhook) | N/A | N/A |
| 7 | **PostGIS + family listed** (postgis, raster, sfcgal, tiger_geocoder, topology, h3, pgrouting) — parked until a geospatial need appears | N/A today | Config change | High |

---

## TOPIC 1 — POSTGRES EXTENSIONS ON NEON

Source for the whole list: [Neon extension explorer](https://neon.com/docs/extensions/extensions-intro).

### 1a. Exact availability matrix (verified this pass)

| Extension | On Neon? | Source |
|---|---|---|
| **pg_cron** | ✅ YES — full docs page | [neon.com/docs/extensions/pg_cron](https://neon.com/docs/extensions/pg_cron) |
| **pgvector** | ✅ YES — all plans, no add-on | [neon.com/docs/extensions/pgvector](https://neon.com/docs/extensions/pgvector) |
| **PostGIS** (incl. raster, sfcgal, tiger_geocoder, topology, h3, pgrouting) | ✅ YES | [extension explorer](https://neon.com/docs/extensions/extensions-intro) |
| **pg_partman** | ✅ YES | [extension explorer](https://neon.com/docs/extensions/extensions-intro) |
| **timescaledb** | ✅ YES — explicitly listed | [extension explorer](https://neon.com/docs/extensions/extensions-intro) |
| **pg_trgm** | ✅ YES | [extension explorer](https://neon.com/docs/extensions/extensions-intro) |
| **unaccent** | ✅ YES | [extension explorer](https://neon.com/docs/extensions/extensions-intro) |
| **uuid-ossp** | ✅ YES | [extension explorer](https://neon.com/docs/extensions/extensions-intro) |
| **pg_stat_statements** | ✅ YES | [extension explorer](https://neon.com/docs/extensions/extensions-intro) |
| **pg_net / pg_http** | ❌ NO — not in explorer | search of explorer page for `pg_net` returned no match (2026-09-28) |
| **dblink / postgres_fdw** | ✅ YES (note: these ARE available; DB-to-DB only, not arbitrary HTTP) | [extension explorer](https://neon.com/docs/extensions/extensions-intro) |
| Bonus: **lakebase_vector** ("scalable vector similarity search for RAG"), **pg_mooncake** (columnstore + DuckDB execution), **pg_tiktoken** | ✅ Listed — future evaluation candidates | [extension explorer](https://neon.com/docs/extensions/extensions-intro) |

**Plan gating:** Neon's docs do not gate these extensions by Free/Launch/Scale *except where explicitly noted*. pgvector's page states it outright: "**available on every Neon plan with no add-on or paid tier required** … installed per database, not per project." For pg_cron the docs page states **no plan restriction** — one third-party writeup claims "paid plan only," but the official enablement flow is self-serve via the Neon API (see 1b), so treat paid-only as **unverified**.

### 1b. pg_cron — exact mechanics (from official docs)

Doc: [neon.com/docs/extensions/pg_cron](https://neon.com/docs/extensions/pg_cron)

**Enablement (NOT a plain `CREATE EXTENSION` — 3 steps):**
1. Set `cron.database_name` on the compute endpoint via the **Update compute endpoint** API — needs a **Neon API key** (founder tap; currently an owed item anyway):
   `PATCH https://console.neon.tech/api/v2/projects/<project_id>/endpoints/<endpoint_id>` with `{"endpoint":{"settings":{"pg_settings":{"cron.database_name":"<dbname>"}}}}`
2. **Restart the compute endpoint** (drops current connections — do during low traffic or on a branch first).
3. `CREATE EXTENSION IF NOT EXISTS pg_cron;` in that database.

**Per-branch semantics:** the setting is per compute *endpoint*, and each branch has its own endpoint — so pg_cron is enabled **per branch**. The `cron.job` metadata rows are ordinary table data, so a branch will inherit the job catalog, but the launcher only runs where `cron.database_name` is set. Recommendation: enable only on prod; test jobs on a throwaway branch.

**Scheduling syntax:** standard 5-field cron (min hr dom mon dow), all schedules **interpreted in UTC** (`crontab.guru` + UTC conversion). Plus pg_cron extras: `'[1–59] seconds'` interval syntax (e.g. `'10 seconds'` — impossible in real cron) and `$` for last-day-of-month.

```sql
SELECT cron.schedule('archive-old-orders', '0 2 * * 0', $$ ... $$);
SELECT cron.unschedule('archive-old-orders');   -- by name
SELECT cron.unschedule(26);                    -- by job id
```

**Monitoring (built in):**
- `SELECT * FROM cron.job;` — job id, schedule, command, **scheduling user**
- `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;` — status, start/end times, return messages
- Self-maintenance is the docs' own example: schedule a daily `'0 0 * * *'` job that `DELETE FROM cron.job_run_details WHERE end_time < NOW() - INTERVAL '7 days'`

**Which user runs the job:** the database user that scheduled it (shown in `cron.job`). Run maintenance jobs as the app role or a dedicated role, not `neondb_owner`.

**One database per cluster; cross-database:** `cron.schedule_in_database(name, schedule, dbname, command)` exists and is documented with an example — BUT the docs page carries an adjacent "#### Function not supported in Neon" header whose target is ambiguous. **Treat cross-database scheduling as unverified until tested on a branch.**

**Non-user-modifiable settings (managed by Neon):** `cron.launch_active_jobs = on` (global kill switch, no restart needed), `cron.log_run = on`, `cron.log_statement = on`, `cron.max_running_jobs = 32`, `cron.use_background_workers = off` — jobs execute via client connections, so heavy concurrent pg_cron jobs consume pool slots.

**CRITICAL duty-cycle implication — quote verbatim from Neon docs:** "Remember that `pg_cron` schedules are interpreted in UTC and **will only run when your compute is active.**"

The math (round-1 numbers):
- A pg_cron job every **5 minutes** keeps the compute awake 24/7: 0.25 CU × 24h × 30d = 180 CU-hrs × $0.106 = **~$19.35/mo on Launch** — identical to the always-on cost already measured.
- A job **hourly or less frequent** is cheap: compute wakes, runs, suspends after 5 min idle → ~2 min active/hr ≈ 8% duty ≈ **~$1.60/mo** — but with a cold-start on every run.
- **Garrett's actual situation flips this:** 23 Vercel crons (hottest every 15 min) already hit the DB around the clock. If cron traffic keeps the compute warm 24/7 anyway, pg_cron's marginal duty-cycle cost is **≈ $0** — it just rides the existing wakefulness. If Vercel crons have quiet overnight windows, only then does scale-to-zero produce real savings that pg_cron would forfeit.

**When pg_cron WINS anyway:**
- Zero Vercel function cost (no GB-hours, no 60s timeout on long maintenance queries).
- Zero network hops / zero connection-open overhead per run.
- Transactional with the data — a rollup or prune that fails rolls back atomically instead of half-completing across an HTTP call.
- No `CRON_SECRET` auth surface, no Vercel cron-plan limits.

**When pg_cron LOSES:** anything needing outbound HTTP (no pg_net on Neon — see 1c), anything that must notify the app layer (no LISTEN/NOTIFY over the pooler), anything needing Node libs, and any job that must fire during a scale-to-zero window.

**2–3 concrete candidate jobs from his workload:**
1. **`prune-rate-limits` / sessions cleanup** — `DELETE FROM rate_limit_events WHERE created_at < NOW() - INTERVAL '7 days'` on a `0 5 * * *` schedule. Pure SQL, transactional, runs in seconds. Replaces one Vercel cron route.
2. **`calibration-metrics rollup`** — nightly `INSERT INTO calibration_daily SELECT ... GROUP BY` over settled outcomes. Runs inside the DB, no row-shipping to a serverless function. Vercel 60s timeout disappears as a constraint.
3. **`reconcile-entitlements`** (Kit/entitlement consistency sweep) — set-based `UPDATE … FROM` diff between entitlements and payments. Atomic by construction.

Honest tradeoff summary: pg_cron trades Vercel-cron cost + timeouts for Postgres-cron duty-cycle cost + no-outbound-HTTP. With the existing 15-min Vercel cadence the duty-cycle cost is likely zero; the real gain is transactional correctness and dropping timeout-prone routes. **Recommend migrating candidates 1–2 as a trial on a branch, keeping the Vercel routes as fallback until the first clean week.**

Value: saves Vercel function spend (pennies–$ per job/mo) + removes timeout failure mode. Difficulty: **config change + founder tap** (Neon API key + compute restart). Reversibility: **high** — `cron.unschedule()`, drop extension, re-enable Vercel route.

### 1c. pg_net — NOT available

`pg_net` (and `pg_http`) are **absent** from the extension explorer — verified by direct find on the page, 2026-09-28. No async HTTP calls from inside SQL on Neon, so there is no "webhook on row change" primitive in-database. Partial substitutes that ARE available: `dblink` and `postgres_fdw` (DB-to-DB remote access only, not HTTP); a Vercel cron or Neon Function that polls a queue table is the realistic outbound path. Do not design around pg_cron→webhook on Neon.

Value of knowing: avoids a dead-end architecture. Difficulty: n/a. Reversibility: n/a.

### 1d. pgvector — embeddings lane verdict

Doc: [neon.com/docs/extensions/pgvector](https://neon.com/docs/extensions/pgvector)

- **Available on every Neon plan, no add-on**; enabled per database (`CREATE EXTENSION vector;`).
- Version: docs reference **0.8.0** as latest-supported example (0.8.x line; prior version installable).
- **Index types: HNSW and IVFFlat**, both documented with opclass syntax (`vector_l2_ops`, `vector_ip_ops`, `vector_cosine_ops`, `vector_l1_ops`, `bit_hamming_ops`, `bit_jaccard_ops`).
- **HNSW limits:** `vector` ≤ 2,000 dims, `halfvec` ≤ 4,000 dims — **bge-m3 (1,024 dims) and Qwen3 embeddings both fit with headroom.** HNSW builds without training data; supports `m`, `ef_construction`, `hnsw.ef_search` (with `SET LOCAL` per-query tuning that works in transaction mode).
- Distances: L2, inner product, cosine, L1, Hamming, Jaccard; single/half-precision, binary, sparse vectors.
- Neon-specific: ACID + PITR apply to vector columns; bulk load via `COPY … FORMAT BINARY`.

**Verdict:** pgvector + Neon's autoscaling makes a separate vector DB **unnecessary for the embeddings evaluation lane** — embeddings live in the same system of record as predictions/calibration, JOINable in one query. Worth watching: **`lakebase_vector`** ("scalable vector similarity search for RAG") is newly listed in the explorer — queued for evaluation as a possible larger-scale alternative.

Value: avoids a standalone vector-DB subscription (~$0–70+/mo depending on vendor/tier) and keeps embeddings JOINable with predictions. Difficulty: **config + code change** (extension + column + index). Founder tap: none. Reversibility: **high** (ordinary schema objects).

### 1e. TimescaleDB + pg_partman — the surprise

Both are listed in [Neon's extension explorer](https://neon.com/docs/extensions/extensions-intro) (pg_partman: "creating and managing time-based and number-based table partition sets"; timescaledb: "Enables Postgres as a time-series database"). This contradicts the Mar-2026 Medium comparison table that marked both unavailable on Neon — **that table is stale**.

- **TimescaleDB fit:** the `game_signals` table (5,142 rows and growing), settled outcomes, calibration history are all time-series-shaped. Hypertables + **continuous aggregates** could replace hand-rolled rollup crons; retention policies could replace hand-rolled prunes. Plan gating not stated in explorer — verify on a branch.
- **pg_partman fit:** automated partition management/retention for large event tables without TimescaleDB's opinionated API.

Value: continuous aggregates could retire rollup code entirely (engineering leverage, not just dollars). Difficulty: **code change**; evaluate on a **throwaway Neon branch** (copy-on-write) before any prod decision. Reversibility: high pre-landing. Founder tap: none.

---

## TOPIC 2 — CONNECTION POOLING: THE MIGRATION CHECKLIST

### 2a. Exact limitations (Neon docs, not folklore)

Source: [neon.com/docs/connect/connection-pooling](https://neon.com/docs/connect/connection-pooling). Neon's PgBouncer config:
`pool_mode=transaction`, `max_client_conn=10000`, `default_pool_size=0.9 × max_connections`, **`max_prepared_statements=1000`**, `query_wait_timeout=120`. "These settings are not user-configurable." "The pooled endpoint is always available."

**NOT supported with pooled connections:**
- `SET` / `RESET` (session variables) — most common breakage is `SET search_path`; fix is `ALTER ROLE … SET` or schema-qualified queries
- `LISTEN` / `NOTIFY`
- `WITH HOLD` cursors
- `PREPARE` / `DEALLOCATE` (**SQL-level** prepared statements only — see below)
- Temporary tables with `PRESERVE` / `DELETE ROWS`
- `LOAD` statement
- Session-level advisory locks

**Nuance on prepared statements (important for Prisma):** Neon's PgBouncer **supports protocol-level prepared statements** (PgBouncer 1.22.0+, up to **1000 per connection**); SQL-level `PREPARE`/`EXECUTE` is what breaks. So the issue is not "prepared statements" categorically — it's **session-bound named statements**, which the Prisma query engine uses when pointed at the pooler without the pgbouncer flag.

**Connection math (official table):** 0.25 CU = 104 `max_connections` (direct); pooled = 10,000 client connections funneled into `default_pool_size` = 90% of max_connections (≈ 93 for 0.25 CU). Pools are **per user+database combination**.

Source: [neon.com/docs/connect/connection-pooling](https://neon.com/docs/connect/connection-pooling)

### 2b. Prisma migration checklist (concrete)

His stack: Prisma ORM, default `pg` driver, Vercel serverless functions; the serverless HTTP driver is flagged OFF. Official Neon Prisma guide: [neon.com/docs/guides/prisma](https://neon.com/docs/guides/prisma) (currently documents the `@prisma/adapter-neon` path — the checklist below applies to both adapter paths and the legacy `pg`-engine path).

**Changes:**
1. In the Neon Console → **Connect** modal, copy **both** strings: the **Pooled** (`…-pooler.…`) and the **Direct** one. (Console toggle is on by default for new projects; it just switches which string is displayed.)
2. `DATABASE_URL` = **pooled** string + `?pgbouncer=true` (+ optionally `&connection_limit=1` per Vercel function instance — keeps total connections ≈ active instances). The `pgbouncer=true` flag tells Prisma the target is PgBouncer-fronted and **disables Prisma's own prepared-statement caching path** (uses simple query protocol instead) — this is the fix for `prepared statement "X" already exists` and `cached plan must not change result type` errors after deploys.
   - Nuance (2026): on PgBouncer 1.21+ with server-side `max_prepared_statements` (Neon sets 1000), the flag is "no longer recommended and can even cause errors of its own" per one 2026 pooling writeup — start WITH the flag (it's the canonical, widely-deployed fix), know the flag-removal is the escape hatch if you see flag-specific errors.
3. `DIRECT_URL` = **direct** string. Prisma ≤6: `directUrl = env("DIRECT_URL")` in `schema.prisma`; Prisma 7+: `prisma.config.ts` → `datasource.url = env("DATABASE_URL_UNPOOLED")` (Neon's current official naming). The CLI (`migrate deploy`, `db push`, `db pull`/introspection) **must** use this — migrations/introspection hang or fail on the pooler because they rely on session-level SQL.

**Test these query patterns against the pooled string before cutover:**
- Normal CRUD + `$transaction` interactive transactions → **fine** (transaction mode handles these).
- `SET search_path` / any `SET` in app code or `schema.prisma` → **breaks**; replace with `ALTER ROLE … SET` or schema-qualified tables.
- Raw `$queryRaw` containing SQL-level `PREPARE`/`DEALLOCATE` → **breaks** on pooled; move to direct or rewrite.
- Anything using `pg_advisory_lock` → **breaks** on pooled.
- LISTEN/NOTIFY-driven code → **breaks** on pooled; needs direct (and a long-lived process, not a serverless function).
- `pg_dump`/`pg_restore` → **direct only** (they issue `SET` statements; Neon's docs call this out explicitly).

**What must STAY on the direct connection (permanent, not transitional):** `prisma migrate deploy`, `prisma db push`, `prisma db pull`, `pg_dump`/`pg_restore`, any one-shot script issuing `SET`/prepared statements, LISTEN/NOTIFY listeners, long-running analytics that shouldn't contend with the pool (`query_wait_timeout=120` queues pooled clients).

**Monitoring:** Neon Console Monitoring page has dedicated **Pooler client connections** and **Pooler server connections** graphs; also available via OpenTelemetry/Datadog integrations. Watch "waiting" state on the client graph during deploys (old+new function instances briefly double connections).

**Pooler cost:** the pooler is **free and always-on** — no add-on, no per-connection charge. Value: removes the 104-connection ceiling as a scaling constraint without upsizing compute. Difficulty: **config change**, no founder tap. Reversibility: **trivial** (revert the string).

### 2c. Prisma + serverless driver note

The serverless HTTP driver (`@neondatabase/serverless`, flagged OFF in his stack) is orthogonal to the pooler decision: it runs queries over HTTP/WebSocket and is the recommended path for Edge runtime, but with Node.js serverless functions + default `pg` driver, the **TCP pooled endpoint is the correct, simpler target**. If the HTTP driver is ever turned on, it bypasses PgBouncer entirely (its own connection semantics) — the direct/pooled split above applies to the TCP path only.

---

## Quick-win action list (in order)

1. **Pooler cutover** — swap `DATABASE_URL` to pooled `?pgbouncer=true`, set `directUrl`/unpooled for CLI. Zero cost, no founder tap, testable in minutes on a preview deploy.
2. **`CREATE EXTENSION pg_stat_statements;`** (and inspect the `neon` extension) — free query telemetry, one statement.
3. **pg_cron trial** — request Neon API key (already owed), enable on a branch endpoint, schedule `prune-rate-limits` + `calibration rollup`, monitor `cron.job_run_details` for a week against Vercel-cron duty cycle; promote only if jobs fire reliably.
4. **pgvector pilot** — `CREATE EXTENSION vector;` on a branch; backfill bge-m3 embeddings for a candidate table; HNSW index; benchmark recall/latency vs. current approach before any vendor conversation.
5. **TimescaleDB / pg_partman evaluation** — throwaway branch; test hypertable + continuous aggregate on `game_signals`; compare against the hand-rolled rollup jobs before committing.
6. **Watchlist:** `lakebase_vector` (new scalable vector option), `pg_mooncake` (columnstore/DuckDB for analytics queries over calibration history).

## Gaps / things not fully verifiable this pass

- **PostGIS version + plan gating on Neon** — listed in explorer; the dedicated docs page fetch hit a rate limit (429), so version number is not cited here. No evidence of plan gating.
- **`cron.schedule_in_database()` on Neon** — docs example exists but an adjacent "Function not supported in Neon" header makes cross-database scheduling ambiguous; needs a branch test.
- **pg_cron on Free tier** — official docs state no restriction; one third-party doc claims paid-only. Flag as unverified.
- **TimescaleDB plan gating + exact version on Neon** — listed, not detailed; branch test required.
- Report filed at: [round2-laneA.md](sandbox://workspace/tmp/neon-leverage/round2-laneA.md) (sibling: `neon-findings.md` in the same dir — left untouched).
