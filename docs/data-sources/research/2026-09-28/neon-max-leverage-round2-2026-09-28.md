# Neon Postgres Round 2 — Non-Obvious Platform Value (2026-09-28)

**Method:** three parallel deep-research lanes over current neon.com/docs, read this session. Research only — no repo git state touched.
**Lane files (full detail):** `round2-laneA.md` (extensions + pooling) · `round2-laneB.md` (Vercel integration + Functions + Data API) · `round2-laneC.md` (replication + auth + storage + autoscaling + allowances).
**Round-1 context assumed:** compute duty cycle is the whole bill (~$19.35/mo per always-on 0.25 CU on Launch at $0.106/CU-hr); 23 Vercel crons hit the DB ~every 2 min so scale-to-zero likely never triggers; branch-only testing rule + `neon.ts` 7-day TTL landed; Neon plan tier UNCONFIRMED (console check owed); Neon API key still owed (blocks `neon deploy`, branch janitor, pg_cron enablement, trigger creation).

Nothing below is marked dead without evidence — untested items are **queued for evaluation**.

---

## MASTER RANKING (value × feasibility)

| # | Finding | Est. value | Difficulty | Reversible |
|---|---|---|---|---|
| 1 | **Pooled connection cutover** — `DATABASE_URL` → `-pooler` + `?pgbouncer=true`, `directUrl` for CLI/migrations. 10,000 pooled conns vs 104 direct at 0.25 CU; pooler free + always-on | Prevents connection-exhaustion outages; avoids a forced compute upsizing (~$20–40/mo) | Config change, no founder tap | Trivial |
| 2 | **pg_cron IS available** — absorb pure-SQL maintenance jobs (prune-rate-limits, calibration rollups, reconcile-entitlements) off Vercel crons. Marginal duty-cycle cost ≈ $0 since the 23 Vercel crons already pin the compute awake | Saves Vercel function spend + removes timeout failure mode; transactional, zero-hop | Config + founder tap (Neon API key + compute restart) | High |
| 3 | **pgvector on every plan, no add-on** (v0.8.x, HNSW ≤ 2,000 dims — bge-m3's 1,024 fits) — embeddings live in the system of record, JOINable with predictions | Avoids a Pinecone/Weaviate tier ($0–70+/mo) when the embeddings lane lands | Config + code change | High |
| 4 | **Neon-Managed Vercel integration** (NOT the Vercel-Managed "Native" one — that provisions a *new* project and can't attach to gse-postgres). Branch-per-preview is NOT a cost bomb: idle preview branches scale to zero independently, first 10 free on Launch, extras $1.50/branch-mo prorated hourly | Safe per-PR schema testing against prod-data copies | Founder tap (~15 min Marketplace install) + janitor cron | Yes |
| 5 | **Scheduled Neon Functions** — native cron triggers (announced ~7 days ago), explicitly scale-to-zero-compatible, **FREE during public beta**. Signals-writer job (24×/day, ~90s, I/O-heavy) models at ≈ **$0.59/mo** post-beta. Honest caveat: does NOT cut the $19.35/mo DB bill — the function queries the same branch compute and the other 22 crons pin it awake anyway | Saves the Vercel Fluid side (Fluid bills memory through I/O waits — worst case for this job); architectural win, not a dollar win | Code change + API key + region check | Yes |
| 6 | **Data API (managed PostgREST) + RLS for public reads** — no separate charge (verified absent from plans table). `anonymous` role + `GRANT SELECT` + RLS `is_published = true` on published views = the public/private doctrine as infrastructure; deletes Vercel API-route invocations for the hottest reads | Fewer Vercel invocations; one fewer hop; no Vercel cold start on public pages | Config (console enable) + SQL + frontend change | Yes |
| 7 | **pg_stat_statements** — free query telemetry, one `CREATE EXTENSION` | Faster slow-query triage | Config | High |
| 8 | **TimescaleDB + pg_partman both listed** (stale third-party tables say otherwise) — continuous aggregates + retention policies could retire hand-rolled rollup/prune jobs | Engineering leverage | Evaluate on throwaway branch | High pre-landing |
| 9 | **Object Storage + Neon Function (`sharp`) image pipeline** — resize-once-at-write replaces Vercel image transforms ($0.05–$0.0812/1K). $0.023/GB-mo, no per-op fees; catch: no on-the-fly resizing | Turns a variable per-request meter into a fixed ~$1.15/mo per 50 GB | Code change | Full |
| 10 | **Neon Auth (Managed Better Auth): 1M MAU included on Launch/Scale** — no paid auth spend today, so this is $300–2,880/yr avoidance insurance; users live in his own `neon_auth` schema, branch-aware | Future Clerk/Auth0 bill avoided | Code change (moderate) | High (SQL export) |
| 11 | **Neon AI Gateway** — zero-markup model routing vs OpenRouter's 5.5% deposit fee + NIM flakiness; "free during beta" per third-party mirror — verify in console | Fleet routing consolidation | Code change + prepaid credits | Full |
| 12 | **Do NOT run 24/7 logical replication for analytics** — a connected subscriber pins prod compute awake (docs say so explicitly): up to $19.35/mo at 0.25 CU, $77.40/mo at 1 CU min, plus traffic counts against the 500 GB allowance. Use throwaway analytics branches or scheduled exports instead | Up to $19.35/mo avoided | Config + SQL | Full |
| 13 | **Autoscale caps + spending notifications** — worst-case math grounds the 0.5–1 CU cap: 16 CU runaway weekend = **$81.41** vs **$5.09** (1 CU cap) vs **$2.54** (0.5 CU cap); 4 CU backfill × 3h = $1.27 | Bounds the surprise bill | Config | Yes |
| 14 | **pg_net / pg_http NOT available** — no async HTTP from SQL; pg_cron cannot phone out to webhooks. Design constraint: outbound path = Vercel cron or Neon Function polling a queue table | Avoids a dead-end architecture | n/a | n/a |

---

## 1. POSTGRES EXTENSIONS (lane A — full detail in `round2-laneA.md`)

Source for the availability list: https://neon.com/docs/extensions/extensions-intro

**pg_cron — YES, with a 3-step enablement** (https://neon.com/docs/extensions/pg_cron):
1. Set `cron.database_name` on the compute endpoint via Update-compute-endpoint API (needs the Neon API key),
2. restart the compute endpoint (drops connections — do on a branch first),
3. `CREATE EXTENSION pg_cron;` in that database.
Per-branch (setting is per endpoint); schedules interpreted in **UTC**; interval syntax (`'10 seconds'`) supported; monitoring via `cron.job` / `cron.job_run_details`; jobs run as the scheduling user. Neon's verbatim duty-cycle rule: **"will only run when your compute is active."** A 5-min job pins 24/7 ≈ $19.35/mo; an hourly job ≈ $1.60/mo with cold starts. His situation flips the math: the 23 Vercel crons already keep the compute warm, so marginal cost ≈ **$0**. Candidate jobs: `prune-rate-limits` (daily DELETE), `calibration-metrics` rollup (nightly INSERT…SELECT), `reconcile-entitlements` (set-based UPDATE…FROM). Recommend: trial candidates 1–2 on a branch, keep Vercel routes as fallback for one clean week.

**pgvector — every plan, no add-on** (https://neon.com/docs/extensions/pgvector): v0.8.x, HNSW + IVFFlat, ≤2,000 dims on HNSW. bge-m3 (1,024) and Qwen3 embeddings fit. Watchlist: `lakebase_vector` (new scalable vector search) and `pg_mooncake` (columnstore/DuckDB execution) also listed.

**Surprise: TimescaleDB AND pg_partman both listed** — contradicts stale Mar-2026 comparison tables. Hypertables + continuous aggregates + retention policies fit `game_signals` and calibration history; evaluate on a throwaway branch (version/plan gating unverified).

**Quick wins present:** pg_trgm, unaccent, uuid-ossp, **pg_stat_statements** (free query telemetry).

**pg_net / pg_http: NOT available** — verified by direct find on the explorer page.

## 2. CONNECTION POOLING — the migration checklist (lane A)

Source: https://neon.com/docs/connect/connection-pooling — `pool_mode=transaction`, `max_client_conn=10000`, `max_prepared_statements=1000`, settings not user-configurable. Break-list: `SET`/`RESET`, `LISTEN`/`NOTIFY`, `WITH HOLD` cursors, SQL-level `PREPARE`/`DEALLOCATE`, certain temp tables, `LOAD`, session advisory locks. Nuance: protocol-level prepared statements ARE supported (PgBouncer 1.22.0+); the Prisma fix is `?pgbouncer=true` on the pooled string (disables Prisma's prepared-statement caching path). Checklist: `DATABASE_URL` = pooled + `?pgbouncer=true` (+ optional `&connection_limit=1` per Vercel instance); `DIRECT_URL` = direct for `migrate deploy`/`db push`/`db pull`/`pg_dump`; test `SET search_path`, raw `PREPARE`, advisory locks, LISTEN/NOTIFY against pooled before cutover; those stay on direct permanently. Serverless HTTP driver (flagged OFF in his stack) is orthogonal — TCP pooled endpoint is the correct target for Node.js serverless functions.

## 3. NEON–VERCEL INTEGRATION (lane B — full detail in `round2-laneB.md`)

**Two integrations; picking wrong is the #1 trap.** Vercel-Managed ("Native") — https://neon.com/docs/guides/vercel-native-integration — provisions a NEW Neon project/org, cannot attach to existing gse-postgres, breaks `neon login` for CLI workflows, and deleting from Vercel permanently deletes the DB. **Use the Neon-Managed (Connectable Account) integration** — https://neon.com/docs/guides/neon-managed-vercel-integration — "Link Existing Neon Account", billing stays in Neon. Wires `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED`, `PG*` pieces per environment (Development/Preview/Production selectable). Preview branching: Vercel webhook → Neon creates `preview/<git-branch>`; branch connection vars injected at deployment time only (never stored in Vercel env settings). **Cost verdict: NOT a bomb** — idle preview branches scale to zero independently, copy-on-write storage starts at $0, 10 branches free on Launch, extras $1.50/branch-mo prorated hourly (~$30/mo worst case for 30 stale branches held a full month). Cleanup lags (Vercel-Managed deletes on deployment removal — 6-month default retention; Neon-Managed is git-branch-based) → add a janitor cron via the Neon API for `preview/*` branches older than 7 days with no open PR.

## 4. NEON FUNCTIONS — deep-dive + pricing math (lane B)

Mechanics: Node.js 24 handlers with `fetch(request)` (Hono apps work directly), declared in `neon.ts`, deployed with `neon deploy`, public HTTPS URL per function, `neon dev` for local. DB pattern: `pg` Pool once at module scope + `attachDatabasePool(pool)` (NOT the serverless driver); keep pool max small (~5). Limits: 15-min time-to-first-byte, 15-min heartbeat, 100 concurrent invocations default cap, 2048 MiB fixed memory. **Schedule triggers are native now** (https://neon.com/blog/your-neon-functions-can-now-run-on-a-schedule, ~7 days old): 5-field UTC cron, explicitly "compatible with scale to zero" (timer lives outside the Postgres compute, unlike pg_cron), child branches inherit triggers disabled. Region requirement: project must be in us-east-1 / us-east-2 / eu-central-1 / ap-southeast-1 — verify his project region (Vercel is iad1/us-east-1, which qualifies if Neon matches). **Pricing** (official plans table): $0.10/active + $0.025/waiting Capacity-Hour + $0.60/M invocations on Launch; **no charge during the public beta**. Signals-writer math (24 runs/day × ~90s, 10% active / 90% waiting): **≈ $0.59/mo** post-beta ($1.80/mo worst case all-active; ~$2.34/mo at 4×/hr cadence). Co-location gotcha: the function runs on separate function compute — it does NOT change the $19.35/mo DB bill; that only moves when ALL pinning traffic migrates.

## 5. DATA API as a product surface (lane B)

Managed PostgREST (https://neon.com/docs/data-api/overview.md): enabled per branch per database; URL shape `https://<endpoint>.apirest.<region>.aws.neon.tech/neondb/rest/v1`; full PostgREST syntax (filters, ordering, embedding/joins, upsert, `/rpc/*` for stored procedures). Auth: Postgres-native — GRANT per role + RLS per row; valid JWT → `authenticated`, anonymous via Better Auth `allowAnonymous` (JWT still required even for anonymous); `anonymous` starts with zero permissions (safe default). Public-surface pattern: `GRANT SELECT ON published_projections TO anonymous` + RLS `is_published = true` — the public/private doctrine as infrastructure; Next.js pages fetch the Data API directly, deleting Vercel API-route invocations for the hottest reads. **No separate charge** (verified absent from the official plans table). Catch list: Data API traffic wakes the branch compute (no duty-cycle escape); no official rate limiting (put Cloudflare/Vercel in front); manual schema-cache refresh after migrations (wire into the migration pipeline); no business logic (SQL views/RPC only); disabled with IP Allow/Private Networking; no official latency numbers — queued for evaluation.

## 6. LOGICAL REPLICATION / CDC (lane C — full detail in `round2-laneC.md`)

Supported (https://neon.com/docs/guides/logical-replication-neon): enable per project (flips `wal_level` → `logical`, **all computes restart** — maintenance window), `CREATE PUBLICATION`, replication role must be `neon_superuser` member (raw-SQL roles can't get REPLICATION), subscriber needs a **direct** connection string, `pgoutput`/`wal2json` decoders, Debezium-compatible, `max_wal_senders = 10`. **Two cost traps:** (1) a connected subscriber pins the compute awake 24/7 — $19.35/mo at 0.25 CU min, $77.40/mo at 1 CU min; (2) replication traffic counts against the 500 GB transfer allowance. Verdict for his analytics/backtest use case: **don't** — use throwaway analytics branches (branch, backtest, delete ≈ storage delta + a few CU-hours) or scheduled exports (COPY to object storage daily). If real-time CDC is ever required, replicate from a dedicated branch's compute, never prod.

## 7. NEON AUTH (lane C)

Managed Better Auth 1.4.18 (https://neon.com/docs/auth/overview.md): **1M MAU included on Launch/Scale** (60k free); OAuth via Google/GitHub/Vercel; email/password, OTP, magic link, phone (BYO SMS); Organizations plugin partial; MFA and admin customization **coming soon**; identity in his own `neon_auth` schema (real FKs, RLS-compatible, branch-aware per branch — the killer feature vs external providers); not supported with IP Allow/Private Networking. Migration: Next.js SDK, drop-in route handler. Missing vs incumbents: MFA/SSO/SAML/SCIM now, hosted UI. No paid auth spend today → value is **$300–2,880/yr avoidance insurance**. Reversibility unusually good (users are SQL rows).

## 8. OBJECT STORAGE (lane C)

S3-compatible, branches with the DB (copy-on-write per branch), declared in `neon.ts`, SigV4/path-style, 5 GiB objects, `private` (default) / `public_read` modes, presigned URLs supported, Files SDK or raw AWS SDK v3. **$0.023/GB-mo, zero per-op fees**; egress shares the 500 GB transfer allowance; no free allowance on Launch (5 GB is Free-plan-only). Image-pipeline architecture: upload → Neon Function (`sharp`: resize to 3 widths, webp/avif) → `public_read` bucket → Cloudflare free / Vercel edge CDN with long `Cache-Control`, new key per variant, key tracked in Postgres. Catch: no on-the-fly resizing. Availability caveat: beta-era region/project eligibility — confirm in console. Branch billing semantics for large artifacts unconfirmed.

## 9. AUTOSCALING specifics (lane C)

Per-compute min/max (no restarts), max range 8 CU, ceiling 16 CU on Launch, min 0.25 CU, per-branch settings supported (cheap 0.25–1 CU profile for preview/dev via the `neon.ts` branch hook; prod larger). Scale-to-zero: 5 min inactivity on Launch. Worst-case math on Launch ($0.106/CU-hr): 4 CU × 3h backfill = **$1.27**; 16 CU runaway × 48h weekend = **$81.41** vs **$5.09** (1 CU cap) vs **$2.54** (0.5 CU cap) — grounds the 0.5–1 CU default cap. Exact trigger thresholds/latencies not stated in fetchable docs (deep-dive page rate-limited) — unconfirmed.

## 10. UNUSED ALLOWANCES on Launch (lane C — corrected)

500 GB/mo transfer (covers backtest exports, image serving — his usage likely <1%); 100 manual snapshots (pre-backfill safety net, storage $0.09/GB-mo); 1M Auth MAU; Data API included; 10 branches included; AI Gateway ("free during beta" per third-party mirror — verify in console). **Correction:** the Functions "10 active / 400 waiting CH + 1M invocations" and 5 GB Object Storage free allowances are **Free-plan-only**, not Launch allowances — both are cheap usage billing on Launch.

---

## FOUNDER TAPS (unchanged + new)

1. **Neon API key** — still the gating tap (was already owed): `neon deploy` for the `neon.ts` TTL policy, pg_cron enablement, schedule-trigger creation, branch janitor.
2. **Console check (5 min):** plan tier (still unconfirmed — determines which allowances apply), current burn by line item, **project region** (Functions need us-east-1/us-east-2/eu-central-1/ap-southeast-1), Object Storage eligibility.
3. **Neon-Managed Vercel integration install** (~15 min, Vercel Marketplace → Connectable Accounts → "Link Existing Neon Account"). Never the Vercel-Managed flavor.
4. Compute settings: autoscale max 0.5–1 CU, confirm PITR 1 day, spending notifications on.

## OPEN GAPS (queued for evaluation)

PostGIS version/plan gating (docs page 429'd); `cron.schedule_in_database()` cross-database support on Neon (ambiguous docs header); pg_cron on Free tier (docs silent, third-party claims paid-only); TimescaleDB version/plan gating; autoscaling exact trigger thresholds/latencies; Object Storage branch-billing semantics; AI Gateway "free during beta" (third-party mirror only); Data API latency numbers (no official figures).
