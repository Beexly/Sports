# Scale + Limits Sanity (READ-ONLY analysis)

> Static analysis only. No load test was run against production or any live service.
> Every number below is traceable to a file:line or a configuration value in this
> repository. Where the repo has no answer, "NO PROCEDURE EXISTS" is stated.

---

## 1. Database connection model

The data layer is **PostgreSQL via Prisma** (`packages/db/prisma/schema.prisma:5`).

Production deploys to **Neon** (serverless PostgreSQL). The `.env` on the developer
box points at a local PostgreSQL instance, but the schema and package deps are
Neon-oriented (see below).

### 1.1 Connection driver selection

`packages/db/src/index.ts` builds the Prisma client once and reuses it (singleton):

  - `export const db = globalForPrisma.prisma ?? buildClient();` (`packages/db/src/index.ts:236`)
  - In non-production (`NODE_ENV !== "production"`), the client is cached on
    `globalForPrisma.prisma` so dev hot-reloads don't multiply connections
    (`packages/db/src/index.ts:238-239`).
  - `globalForPrisma` is declared at `packages/db/src/index.ts:152` as
    `globalThis as unknown as { prisma?: PrismaClient; prismaStubMode?: boolean }`.

Two driver paths exist:

| Condition | Driver |
|---|---|
| `NEON_SERVERLESS_DRIVER=true` + deps installed | Neon serverless WebSocket adapter (`@neondatabase/serverless` Pool + `@prisma/adapter-neon`) |
| otherwise (default) | Prisma 5 default `pg`/adapter driver |

`packages/db/src/index.ts:194` gates the serverless adapter behind the
`NEON_SERVERLESS_DRIVER` env flag. `packages/db/package.json` lists
`@neondatabase/serverless` ^0.10.4, `@prisma/adapter-neon` ^5.22.0, and
`@prisma/client` ^5.22.0 as dependencies — the adapter deps are present but
only activated at runtime when the flag is set.

### 1.2 Pool / connection limit configuration

**No `connection_limit`, `pool_timeout`, or `maxPoolSize` is configured anywhere.**

  - `.env` has no connection-string connection params;
    `DATABASE_URL` contains no `connection_limit` query parameter.
  - `grep` for `connection_limit | PGCONNECT_TIMEOUT | pool_timeout |
    CONNECTION_LIMIT` across `.env apps/web/ packages/ vercel.json` finds nothing
    in config; the only hit is a test fixture at
    `apps/web/__tests__/ai-control-plane-credit-admission.test.ts:1130`
    (`url.searchParams.set("connection_limit", "25")`), not a production setting.
  - `vercel.json` has no `functions.*.memory` or connection-related entries.

With no explicit pool sizing, Prisma 5 defaults to a per-instance pool governed by
the database server's `max_connections` (Prisma's `connection_limit` defaults to
`min(10, max_connections)` but no value is set in this repo, so the database
side caps it). No procedure in the repo sets, reads, or tunes database connection
limits.

### 1.3 Connection health monitoring

A health probe exists (`packages/db/src/neon-pool-monitor.ts:63`,
`probeNeonPool`) that runs `SELECT clock_timestamp()` and samples
`pg_stat_activity` connection counts. It is **export-only tooling**, not wired
into request routing or cold-start gating for API routes.

### 1.4 Stub mode

When `DATABASE_URL` is absent or a sentinel, `@sports/db` falls back to a stub
Prisma client (writes no-op). `isStubMode()` (`packages/db/src/index.ts:234`)
gates this. The `.env` has a real local URL, so stub mode is off locally; in
production `DATABASE_URL` must be a real Neon URL or the stub activates and
protected writes fail closed
(`packages/db/src/durable-write-guard.ts`).

---

## 2. Rate limiting coverage

Source: `handoff/RATE_LIMIT_COVERAGE.md` (independent re-measurement,
2026-08-16).

| Metric | Count |
|---|---|
| Total `route.ts` files under `apps/web/app/api/` | 176 |
| Protected (has a rate-limit call) | 71 |
| Unprotected (no rate-limit call) | 105 |
| **Coverage ratio** | **71 / 176 = 40.3%** |

No middleware-based rate limiting exists (`apps/web/middleware.ts` contains zero
rate-limit references — verified by the coverage doc). Rate limiting is applied
per-route only, via four helpers:

  1. `consumeRateLimit` from `@/lib/api/rate-limit` — IP-keyed or user-id-keyed,
     **in-memory token bucket** (`apps/web/lib/api/rate-limit.ts:33`).
  2. `consumePublicFormRateLimit` from `@/lib/api/public-form-rate-limit`.
  3. `requirePremiumApiRateLimited` from `@/lib/api-entitlement`.
  4. `rateLimitB2b` from `@/lib/b2b/api-key-auth`.

### 2.1 Critical limitation: in-memory, per-instance

The default limiter (`consumeRateLimit`) stores buckets in a module-level
`Map` (`apps/web/lib/api/rate-limit.ts:19`):

  ```
  const registries = new Map<string, Map<string, Bucket>>();
  ```

This is **per-Vercel-instance memory**. There is no shared Redis/Dynamo
counter. `REDIS_URL` exists in `.env`
(`redis://localhost:6379`) but is **not** wired into `rate-limit.ts` (no Redis
import or call in that file). Consequence: every Vercel instance tracks its own
bucket, so a distributed spike across many instances divides the effective limit
rather than enforcing it globally.

### 2.2 Anonymous (public, no auth) + DB-heavy routes

Routes that import `@sports/db`, do NOT import `auth`/`getServerSession`/
`requireAdmin`, and are therefore callable by anonymous users with no session:

  - `apps/web/app/api/performance/route.ts` — uses raw SQL `GROUP BY` (not
    `findMany`); rate-limited? No (`consumeRateLimit` absent). **NO rate limit.**
  - `apps/web/app/api/proof/receipts/route.ts` — cursor-paginated `findMany` with
    `take: limit + 1`, `MAX_LIMIT = 100` (`route.ts:31-32, 80, 104`). Rate-limited
    via `consumeRateLimit` (60/60s, IP-keyed, `route.ts:38`). Protected.
  - `apps/web/app/api/picks/daily-slate/route.ts` — rate-limited via
    `consumeRateLimit` (60/60s, IP-keyed, `route.ts:29`). Protected.
  - `apps/web/app/api/moderation/anonymous-report/route.ts` — anonymous; DB write.
  - `apps/web/app/api/receipts/[id]/route.ts` — anonymous read.
  - `apps/web/app/api/verify/route.ts` — anonymous read.

`apps/web/app/api/picks/route.ts` is public/anonymous but tier-gated server-side:
`take` is bounded by `entitlements.dailyPickLimit ?? 200`
(`apps/web/app/api/picks/route.ts:128`; `dailyPickLimit` is `2` for FREE,
`null` for PRO/ELITE in `packages/types/src/index.ts:180`).

---

## 3. Unbounded `findMany` calls (no `take`/`skip`)

A repository-wide scan of `findMany` in `apps/web/app/api/**/route.ts` found
three routes whose `findMany` call has **no `take`** parameter:

  1. **`apps/web/app/api/picks/daily-slate/route.ts:114`** —
     `db.pick.findMany({ where: baseWhere, select: {...} })`. No `take`.
     Bounded by the `baseWhere` date filter (today's published picks only —
     comment: "a day's slate is bounded," `route.ts:108-109`). As pick volume for
     a single day grows (e.g. more models x more sports), this row set grows
     without a hard cap.
  2. **`apps/web/app/api/picks/[id]/audit/route.ts:129`** —
     `db.sourceSnapshot.findMany(...)`. Has `take: 25` (`route.ts:132`).
     **Bounded.** (Flagged initially by a coarse grep; false positive on manual
     review.)
  3. **`apps/web/app/api/cockpit/tasks/[id]/decisions/route.ts:19`** —
     `db.cockpitDecision.findMany({ where: { taskId: params.id }, ... })`. No
     `take`. **Admin-only** (`session.user.role !== "ADMIN"` -> 403 at
     `route.ts:12`). Not a public-anonymous vector.

A fourth candidate, `apps/web/app/api/admin/dashboard/route.ts:387`
(`db.pickSignalSnapshot.findMany({...})`), has **no `take`** and runs inside an
admin-only route, with an inline comment "manageable at current scale."

`apps/web/app/api/picks/route.ts` (line 128) applies `take: entitlements.dailyPickLimit ?? 200` — bounded.
`apps/web/app/api/proof/receipts/route.ts:80` applies `take: limit + 1` with `MAX_LIMIT = 100` — bounded + cursor-paginated.
`apps/web/app/api/v1/probabilities/route.ts:48` (`take: 80`) and `apps/web/app/api/v1/signals/route.ts:60` (`take: 50`), but are B2B (API-key-auth) routes.

---

## 4. Vercel / Next.js serverless function ceilings

`apps/web` is a Next.js 14 app (`next: ^14.2.15`, `package-lock.json`).

### 4.1 Execution timeout / duration

**No `maxDuration` or `memory` override exists on any public/anonymous API route.**

  - `grep -rn "maxDuration" apps/web/app --include=*.ts` finds overrides only in
    `apps/web/app/api/cron/*` (all 300s except a few at 60s/120s) and three
    `apps/web/app/api/intelligence/*` routes at 60s.
  - No public surface route (`picks`, `daily-slate`, `proof/receipts`,
    `performance`, `board/state`, `v1/*`) sets `maxDuration`.
  - Next.js 14 on Vercel serverless defaults: **10 s timeout on Hobby, 15 s on
    Pro** (no explicit value in-repo; Vercel platform default when
    `maxDuration` is unset). Cron routes explicitly raise to 300 s with comments
    "Vercel cron caps at 5 min"
    (`apps/web/app/api/cron/backfill-historical-games/route.ts:12`,
    `.../settle-picks/route.ts:39`, `.../refresh-odds/route.ts:53`, etc.).

### 4.2 Memory ceiling

No `memory` field anywhere in `vercel.json` or route files. Vercel default for
Next.js serverless functions is **1024 MB**. The build step raises the
Node heap (`NODE_OPTIONS=--max-old-space-size=8192` in `vercel.json` buildCommand,
line 3), but that is a **build-time** setting, not a runtime function memory
allocation.

### 4.3 Response size ceiling

Next.js / Vercel serverless responses are capped at **~1 MB** (Next.js default
response size limit; no override in `next.config.mjs`).
`apps/web/next.config.mjs` sets `typescript.ignoreBuildErrors: true`
(line 61) and `eslint.ignoreDuringBuilds: false` (line 62) but does **not**
configure `api` size limits.

### 4.4 Runtime

All scanned public routes default to Node.js runtime (`export const runtime` is
absent; only `apps/web/app/api/v1/probabilities/route.ts:16` and
`apps/web/app/api/v1/signals/route.ts:16` explicitly set
`export const runtime = "nodejs"`; no route uses `"edge"`). Edge-runtime cold
start is therefore not a factor, but Node cold starts are (~1-3 s typical on
Vercel, can exceed 5 s on fresh instances).

### 4.5 Dynamic rendering

169 route files set `export const dynamic = "force-dynamic"` (verified via grep
across `apps/web/app/api`). These bypass ISR and re-execute the handler + DB
query on every request — no CDN cache layer sits between the client and the
database.

---

## 5. Vercel build configuration

`vercel.json`:

  - `buildCommand`: `npm run db:generate && node scripts/deploy/migrate-if-configured.mjs && NODE_OPTIONS=--max-old-space-size=8192 npm run build --workspace=@sports/web`
  - `installCommand`: `npm install --include=dev`
  - `ignoreCommand`: `node scripts/vercel-skip-build.mjs` (skips builds on
    docs-only or inactive-agent-branch pushes)
  - `regions`: `iad1` (single origin; no multi-region deployment)
  - `framework`: `nextjs`, `outputDirectory`: `.next`

No `functions.*` block configures per-route memory/duration.

---

## 6. If 10,000 people arrive in one hour — what breaks first?

At ~2.8 req/s average (peaks far higher), ranked by time-to-failure:

1. **In-memory rate limiter (per-instance) — breaks first, in seconds to minutes.**
   The default limiter (`consumeRateLimit`) uses a module-level `Map` with no
   shared backing store (`apps/web/lib/api/rate-limit.ts:19`). At least
   **105 of 176 routes have no rate-limit call at all**
   (`handoff/RATE_LIMIT_COVERAGE.md`). An anonymous attacker (or 10k organic
   users through a CDN with per-IP pooling) can hit those 105 endpoints with
   zero throttling. Even on the 71 protected routes, Vercel spins up many
   serverless instances during a spike, and each instance has its own bucket —
   the effective global limit is `per_instance_limit x instances`, not a true
   ceiling. No Redis/DynamoDB shared counter exists (`REDIS_URL` is in `.env` but
   unused by `rate-limit.ts`).
   **NO PROCEDURE EXISTS** to raise a global rate floor under load.

2. **Database connections — next bottleneck, under sustained concurrency.**
   Prisma client is a singleton per server instance
   (`packages/db/src/index.ts:236`), and there is **no `connection_limit` set**.
   Under a cold-start storm, Vercel spawns many serverless instances
   concurrently; each opens its own connection(s) to Neon via the default `pg`
   driver. Neon's free tier has a **hard connection limit** (documented by Neon
   at https://docs.neon.tech/limits; the repo records no local override —
   grep for `connection.limit | max.connection | Neon.*limit` in `handoff/ packages/`
   finds no repo-level connection ceiling). The repo has a pool health probe
   (`packages/db/src/neon-pool-monitor.ts`) but it does **not** gate or limit
   new connections — it only reports. The comment at `packages/db/src/index.ts:27`
   notes raw TCP to Neon "flakes on serverless cold starts," and the
   `NEON_SERVERLESS_DRIVER` WebSocket adapter is shipped **dark** (off by
   default). If it is not enabled in prod, cold-start TCP storms hit Neon
   head-on.
   **NO PROCEDURE EXISTS** in-repo to cap Prisma `connection_limit` or to
   enable the serverless adapter as a connection-preservation measure.

3. **Unbounded `findMany` on public/semi-public routes — third bottleneck,
   as data grows.**
   `apps/web/app/api/picks/daily-slate/route.ts:114` runs
   `db.pick.findMany({ where: baseWhere })` with **no `take`**; it is
   date-filtered ("a day's slate is bounded," `route.ts:108`), so it scales with
   picks-per-day x sports x models, not total history.
   `apps/web/app/api/admin/dashboard/route.ts:387` has an unbounded
   `pickSignalSnapshot.findMany` but is admin-only. The admin-only
   `apps/web/app/api/cockpit/tasks/[id]/decisions/route.ts:19` is unbounded but
   not anonymously reachable. The most exposed unbounded public query is
   daily-slate's, and only if a single day's pick count climbs into the high
   thousands (the comment assumes a day is bounded, which holds today but has
   no numeric guard).

4. **Vercel 10 s function timeout — fourth.** Public routes have no
   `maxDuration` override (Vercel default 10 s Hobby / 15 s Pro). A slow query
   on the unbounded daily-slate path (item 3) plus a cold start can exceed 10 s
   and return 504/timeout. `apps/web/app/api/proof/receipts` is cursor-paginated
   (`take: 100`) and rate-limited (60/60 s), so it survives; `apps/web/app/api/picks`
   is capped at 200 rows. The daily-slate path is the one route with both a
   public/anonymous caller **and** no hard row cap — it is the only realistic
   route to blow the 10 s budget from pure query size.

5. **Response size (1 MB) — fifth.** Next.js default ~1 MB response cap (no
   override in `next.config.mjs`). `apps/web/app/api/picks` returns 200 rows;
   `apps/web/app/api/v1/probabilities` returns 80. None currently approach the
   cap at today's data volume, but an unbounded `findMany` (daily-slate) returning
   many rows with nested `include`s could approach it as growth continues.

### Summary table (failure order under 10k/hour)

| Rank | Failure | Time horizon | Evidence |
|---|---|---|---|
| 1 | Rate limiter is per-instance + 105 routes have zero rate limiting | seconds-minutes | `apps/web/lib/api/rate-limit.ts:19`; `handoff/RATE_LIMIT_COVERAGE.md` (105/176 unprotected) |
| 2 | DB connection exhaustion (no `connection_limit`, cold-start TCP storms) | seconds-minutes concurrent | `packages/db/src/index.ts:236` (singleton, no pool cfg); no `connection_limit` anywhere; Neon docs external |
| 3 | Unbounded `findMany` grows query size (daily-slate, no `take`) | minutes-hours as daily pick count rises | `apps/web/app/api/picks/daily-slate/route.ts:114` |
| 4 | Vercel 10 s timeout on public routes | per-slow-request | no `maxDuration` on public routes; defaults 10s/15s |
| 5 | 1 MB response cap (no override) | as payload grows | `apps/web/next.config.mjs` (no `api.bodyParser` size override) |

---

## 7. What this repo DOES protect well

  - `apps/web/app/api/proof/receipts`: cursor-paginated (`take: 100`),
    rate-limited (60/60s), empty -> honest 200 not 500
    (`apps/web/app/api/proof/receipts/route.ts:28-112`).
  - `apps/web/app/api/picks`: bounded `take: entitlements.dailyPickLimit ?? 200`
    (line 128; `dailyPickLimit` is `2` for FREE, `null` for PRO/ELITE in
    `packages/types/src/index.ts:180`), tier-gated server-side.
  - `apps/web/app/api/performance`: rewritten to raw SQL `GROUP BY` —
    O(sports x results) rows, never O(picks)
    (`apps/web/app/api/performance/route.ts:35-58`, comment "GSE-SEC-031 fix").
  - `apps/web/app/api/admin/dashboard`: time-windowed `where` clauses
    (7-day, +/-2h/48h) on most findMany calls despite the dashboard's one
    unbounded aggregation (`apps/web/app/api/admin/dashboard/route.ts:290-425`).

---

## 8. Gaps (no procedure exists / not configurable in-repo)

  - **No global/shared rate limiter.** `REDIS_URL` is present in `.env` but
    `rate-limit.ts` is in-memory only. NO PROCEDURE EXISTS to wire Redis into
    the limiter.
  - **No Prisma `connection_limit`.** Default pool sizing is absent; relies on
    Neon/DB-side `max_connections`. NO PROCEDURE EXISTS to configure
    `connection_limit` via env or Prisma `datasource` block.
  - **`NEON_SERVERLESS_DRIVER` is off by default.** The cold-start TCP-flake
    mitigation exists but is dark. NO PROCEDURE EXISTS to force it on for
    production (it is opt-in via env only — `packages/db/src/index.ts:194`).
  - **No response-size or query-cost budget enforcement.** No middleware aborts
    oversized payloads. The 1 MB cap is Vercel-imposed, not repo-configured.
  - **No per-route `maxDuration` on public surfaces.** Public routes rely on the
    Vercel platform default (10 s Hobby / 15 s Pro). Cron routes override to
    300 s; public routes do not.

---

*Generated by static analysis. No queries were executed against a live database
or production service during this measurement. All citations are `file:line` or
`.env` key names (secret values redacted).*
