# Neon Postgres Round 2 — Lane B: Vercel Integration + Functions + Data API

**Date:** 2026-09-28 · **Researcher:** Motif (subagent) · **Method:** neon.com/docs reads via browser
**Scope:** Research only — no repo git state touched.
**Related:** Round 1 findings in `/home/hatch/workspace/tmp/neon-leverage/neon-findings.md` (billing basics: compute duty cycle ≈ $19.35/mo per always-on 0.25 CU on Launch at $0.106/CU-hr; 23 Vercel crons pin the compute awake).

---

## RANKED FINDINGS (value × feasibility)

| # | Finding | Value / savings | Difficulty | Reversible? |
|---|---------|-----------------|------------|-------------|
| 1 | **Neon Functions schedule triggers are native now** — cron triggers on a Neon Function replace Vercel crons with zero scheduler dependency, run even with scale-to-zero on, and are **FREE during the public beta** (https://neon.com/blog/your-neon-functions-can-now-run-on-a-schedule) | ~$0.59/mo post-beta for the signals-writer job (vs unknown-but-positive Vercel Fluid cost); real win is architectural: native cron + colocation, not the dollar amount | Code change + Neon API key | Yes — delete trigger + function |
| 2 | **DO NOT install the Vercel-Managed ("Native") integration for Garrett's existing DB** — it provisions a *new* Neon project/org and cannot attach to the existing one. If the team wants branch-per-preview, use the **Neon-Managed (Connectable Account) integration**, which links the existing project and keeps billing in Neon | Avoids creating a second parallel production DB + surprise billing surface | Founder tap (Vercel Marketplace, ~15 min) | Yes — "Remove Project Connection" keeps DB intact |
| 3 | **Branch-per-preview is NOT an automatic cost bomb** — idle preview-branch computes scale to zero independently, copy-on-write storage starts at $0, first 10 branches/project are free on Launch, extras are $1.50/branch-month *prorated hourly*. BUT cleanup lags: Vercel-Managed deletes only when the Vercel *deployment* is removed (default retention: 6 months) | Risk is bounded and measurable: ~30 stale branches ≈ $30/mo worst case before hourly proration; with cleanup it's near $0 | Config change + janitor automation | Yes |
| 4 | **Moving the signals-writer cron to a Neon Function does NOT cut the $19.35/mo Neon DB bill** — the function still queries the same branch compute, and the other 22 crons pin it awake anyway. Only the Vercel Fluid side is saved | Savings: one Vercel cron slot + Fluid execution cost (small). No Neon DB savings until ALL pinning traffic moves | Code change | Yes |
| 5 | **Data API (managed PostgREST) can serve the public projections/rankings reads straight from the browser with RLS** — `anonymous` role + `GRANT SELECT` + RLS policy on a `published_*` view. No separate Data API charge exists (verified against the official plans table) | Deletes Vercel API-route invocations for the hottest public reads; removes a cold-start hop | Config + frontend code change | Yes — disable Data API in console |
| 6 | **Gotchas that must be in any plan:** Data API disabled if IP Allow/Private Networking is on; schema changes require a manual schema-cache refresh; JWT is required even for "anonymous" access (Better Auth `allowAnonymous` or a self-issued token); no business logic — complex aggregation needs SQL views/RPC functions exposed as endpoints | Prevents shipping a broken half-migration | — | — |

---

## TOPIC 1 — NEON–VERCEL INTEGRATION

### There are TWO integrations — picking the wrong one is the #1 trap

**Vercel-Managed Integration ("Native")**
- What it is: installed from the Vercel Marketplace; **billing handled entirely inside Vercel**.
- Install: "Creates a Neon account + project for you (if you don't already have one). For existing Neon users, adds a new organization named `Vercel: <team-name>` to your account."
- **Critical:** it provisions a NEW Neon project — it cannot attach to Garrett's existing gse-postgres project with the production data in it.
- Foot-gun: "Deleting from Vercel permanently removes the Neon project and all data. This cannot be undone."
- Also: `neon login` doesn't work for Vercel-managed accounts (API-key auth only) — this would break the coding-agent CLI workflows that expect `neon link`.
- Docs: https://neon.com/docs/guides/vercel-native-integration (read in full this session)

**Neon-Managed Integration (Connectable Account)** — the correct one for an existing project
- "The Neon-Managed Integration links your existing Neon project to a Vercel project while keeping billing in Neon. Instead of sharing a single database across all preview deployments, this integration creates an isolated database branch for each preview deployment."
- Installed via Vercel Marketplace → Connectable Accounts → "Neon"; select "Link Existing Neon Account".
- Docs: https://neon.com/docs/guides/neon-managed-vercel-integration
- Chooser page comparing all three paths (Vercel-Managed / Neon-Managed / Manual): https://neon.com/docs/guides/vercel-overview

### Exactly what it wires per environment

From the official doc's env-var table (Vercel-Managed; Neon-Managed injects the same set):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | **Pooled** connection string (PgBouncer) |
| `DATABASE_URL_UNPOOLED` | Direct connection string |
| `PGHOST`, `PGHOST_UNPOOLED`, `PGUSER`, `PGDATABASE`, `PGPASSWORD` | Raw pieces to build custom strings |
| `POSTGRES_*` (legacy) | Backwards compatibility with Vercel Postgres templates |
| `NEON_AUTH_BASE_URL`, `VITE_NEON_AUTH_URL` | Managed Better Auth endpoints (when enabled on production branch) |

- When connecting a Vercel project, you choose which environments receive DB variables: Development, Preview, Production.
- **Preview branching:** under Advanced Options → Deployments Configuration, enable the **Preview** toggle. Then: "Vercel sends a webhook to Neon → Neon creates branch `preview/<git-branch>`." Branch-specific connection variables are **injected at deployment time only** — they override preview env vars for that deployment and are never stored or viewable in Vercel's env-var settings (so there's no manual cleanup of secrets when branches are deleted).
- Migrations: run in the Vercel build step, e.g. `npx prisma migrate deploy && npm run build` against the branch's connection.
- Neon-Managed additionally can create a persistent `vercel-dev` Neon branch for the Development environment (useful for local dev, but note: the `nihongojp/cornerstone` field report warns that a drifted `vercel-dev` branch that never receives migrations silently shows "all the content disappeared" — keep migrations wired or don't use it).

### Cost analysis: branch-per-preview

- **Included:** 10 branches/project on Launch; extra branches $1.50/branch-month, **prorated hourly** (official plans table: https://neon.com/docs/introduction/plans).
- **Each branch gets its own compute endpoint, and scales to zero independently** — so an idle preview branch costs ~$0 in compute. Copy-on-write storage starts at $0 and grows only with writes on that branch (capped at the branch's data size).
- **Cleanup exists but lags:**
  - Vercel-Managed: "Preview branches are automatically deleted when their corresponding Vercel deployments are removed. The timing of this cleanup depends on Vercel's deployment retention policy, which retains preview deployments for **6 months by default**." → stale branches linger for months.
  - Neon-Managed: cleanup is **git-branch-based** — fires when the git branch is deleted and a later preview deployment triggers cleanup (so branches from closed PRs without a subsequent deploy can linger; a janitor cron deleting branches older than N days is the belt-and-braces).
- **Verdict for Garrett's setup:** NOT a cost bomb if cleanup is honored — with heavy agent-branch activity, the realistic risk is N stale branches beyond the 10 included, at $1.50/mo each prorated hourly (e.g., 30 stale branches for a full month ≈ $30; for a week ≈ $7). The real hazard isn't money, it's branch sprawl confusing the agent fleet. Recommendation: enable preview branching via the **Neon-Managed** integration AND add a janitor cron (Neon API `DELETE /projects/{id}/branches/{id}` for `preview/*` branches with no matching open PR, older than 7 days). This is the safe-testing story: schema migrations tested per-PR against a production-data copy, production untouched.

### What breaks if the project was created outside the integration

- **Vercel-Managed (Native):** cannot attach to an existing project, period. Installing it creates a separate new project/org (`Vercel: <team-name>`). Garrett's DB stays where it is; he'd have two Neon projects and a Vercel bill line he didn't expect. His stated billing is through Neon — wrong choice.
- **Neon-Managed:** explicitly built for this case ("Link Existing Neon Account"); nothing breaks — it injects env vars into the Vercel project, keeps billing in Neon, and adds preview branching. The integration doc's FAQ notes one subtlety: toggling the Production `DATABASE_URL` checkbox off/on re-pushes the whole set (the documented repair path if Production's pair goes missing).
- **Team membership:** Vercel roles sync to Neon (Owner/Admin/Member → Neon Admin; Viewer/Billing → Neon Member) after a one-time "Open in Neon" click. Removing someone from the Vercel team removes them from the Neon org.

**Difficulty:** founder tap (~15 min in Vercel Marketplace + Neon console; requires Neon OAuth/API access the integration handles itself — no raw API key needed for the Neon-Managed path).
**Reversibility:** yes — "Remove Project Connection" removes env vars but keeps the DB; "You can manually delete preview branches at any time via the Neon Console, Neon CLI, or Neon API."

---

## TOPIC 2 — NEON FUNCTIONS: deep-dive + real pricing math

### What a Neon Function is (mechanics)

- Long-running Node.js 24 HTTP handlers **deployed onto a Neon branch**, running in the branch's region, next to the DB. "Built for WebSocket servers, SSE endpoints, long agent HTTP streams, and APIs. Still scales to zero when idle." (Docs: https://neon.com/docs/compute/functions/get-started.md — read in full this session; this also confirms the lane-A `neon.ts` branch-policy note.)
- A function is any module whose default export has a `fetch(request)` method returning a `Response` (WinterTC/Workers-compatible); a Hono app exports exactly that shape, so `export default app` works directly.
- **Database access pattern:** create a `pg` `Pool` **once at module scope** and reuse it across requests ("Don't use `@neondatabase/serverless` here: it's built for short-lived, edge-style invocations... which wastes the persistent runtime"). Use the pooled `DATABASE_URL` injected automatically when the branch has Postgres; `DATABASE_URL_UNPOOLED` only for `LISTEN`/`NOTIFY`. Call `attachDatabasePool(pool)` (from `@neon/functions` ≥ 0.8.0) so idle disconnects (scale-to-zero, pooler reclaim) don't crash the isolate. Docs explicitly say: keep pool `max` small (e.g. 5) — effective connections = `max` × number of live isolates.
- **Declared in `neon.ts`** at the project root:
  ```ts
  import { defineConfig } from "@neon/config/v1";
  export default defineConfig({
    functions: {
      signalswriter: { name: "Signals writer", source: "./functions/signals-writer.ts" },
    },
  });
  ```
  (The slug is permanent — can't be renamed after first deploy; slugs must match `^[a-z0-9]{1,20}$`.)
- **Deploy:** `neon deploy` reads `neon.ts`, bundles each function with esbuild, uploads, waits for `completed`. Or single-file: `neon functions deploy helloworld --src hello-world.ts`. Manage/list/inspect/delete via `neon functions` CLI or the Neon API.
- **Invoke:** public HTTPS URL per function, e.g. `https://br-wispy-brook-a1b2c3d4-helloworld.compute.c-2.us-east-2.aws.neon.tech/`. Custom domains supported (docs: "Custom domains for Neon Functions"). Auth the caller yourself — docs have a dedicated "Neon Functions authentication" page.
- **Local dev:** `neon dev` serves all functions in `neon.ts` with hot reload and injects `DATABASE_URL` from the linked branch.
- **Availability (check before building):** Functions currently require the Neon project to be in `aws-us-east-2`, `aws-us-east-1`, `aws-eu-central-1`, or `aws-ap-southeast-1` ("Support is expanding toward all regions"). **Garrett's Neon project region must be verified** — Vercel is in iad1 (us-east-1), and us-east-1 IS on the supported list, so if the Neon project sits in us-east-1 it qualifies.

### Scheduled triggers — the missing piece now exists NATIVELY

- **Function Triggers** are branch-scoped definitions that tell Neon when to invoke a deployed function. The first trigger type shipped is **`schedule`** — a five-field UTC cron that is **explicitly "compatible with scale to zero"** (the timer lives outside the Postgres compute, unlike `pg_cron`, which silently doesn't run when the compute is suspended).
- Triggers created via the Neon API: `POST /projects/{project_id}/branches/{branch_id}/triggers` with `{ type: "schedule", function_slug, name, schedule: { cron: "*/15 * * * *" }, function_path: "/", enabled: true }`, or `neon triggers` CLI. Incoming scheduled calls carry an `X-Neon-Trigger-Invocation-Id` header — verify it in the handler (return 403 otherwise).
- Child branches **inherit the parent's triggers but disabled** — "branching production for a test doesn't fire the parent's cron a second time."
- Docs: https://neon.com/blog/your-neon-functions-can-now-run-on-a-schedule (announcement, 7 days old) and the trigger doc it cites: https://neon.com/docs/compute/functions/triggers/schedule.md

### Runtime limits (hard constraints)

Docs: https://neon.com/docs/compute/functions/reference/runtime-limits.md (read in full)

| Limit | Value |
|---|---|
| Time to first byte | **15 minutes** — handler must start responding within 15 min |
| Heartbeat | 15 min — streams/WebSockets stay open as long as data flows (1 byte per 15 min keeps it alive) |
| `waitUntil` (post-response work) | 15 min — for short follow-ups, NOT a background-job runner |
| Concurrency | isolates scale out on demand; **account-wide default cap 100 concurrent invocations** (429 + `Retry-After` when exceeded) |
| Memory | 2048 MiB, fixed, not configurable |
| Runtime / isolation | Node.js 24, microVM per isolate |
| Cold starts | isolate boots on first request after idle; pool reconnects via `attachDatabasePool` |

For a 60–120s hourly signals-writer: none of these limits bite.

### Pricing — OFFICIAL numbers, and the beta surprise

Official plans table (https://neon.com/docs/introduction/plans):

| Metric | Launch | Scale |
|---|---|---|
| Active compute | **$0.10/Capacity-Hour** | $0.12/Capacity-Hour |
| Waiting compute | **$0.025/Capacity-Hour** | $0.03/Capacity-Hour |
| Invocations | **$0.60/M** | $0.60/M |

Billing rules: "You're billed for compute only while a request is being processed. Billing starts when a request triggers the function and continues until processing finishes, either by returning a response or by completing any background `waitUntil` work. **You aren't billed between requests.**" During beta, one hour of function runtime = one Capacity-Hour (fixed size).
Free plan (post-beta): 10 active + 400 waiting Capacity-Hours + 1M invocations/month included.
**Headline: "There's no charge for Functions during the beta"** — all of the below is $0 today; the math is for when billing begins.

### Pricing math: moving the signals-writer cron (hourly, 60–120s, I/O-heavy)

**Assumptions (stated):** 24 runs/day → 720 invocations/month; 60–120s each → midpoint 90s → 64,800s = **18 hours of function wall-time/month**; I/O-heavy (external API fetch + Neon queries) → model 10% active CPU / 90% waiting; 1 isolate at a time (a cron has no concurrent bursts).

| Line | Math | Cost/mo (Launch, post-beta) |
|---|---|---|
| Active compute | 18h × 10% × $0.10 | $0.18 |
| Waiting compute | 18h × 90% × $0.025 | $0.405 |
| Invocations | 720 × $0.60/1,000,000 | $0.0004 |
| **Total** | | **≈ $0.59/mo** |
| Worst case (100% active) | 18 × $0.10 | $1.80/mo |
| If cadence doubles to 4×/hr (like generate-signal-slate) | 72h → same mix | ≈ $2.34/mo |

**Compare vs current:**
- **Vercel Fluid side:** Fluid bills memory for the *whole instance lifetime including I/O waits* — an I/O-heavy 90s job is the worst case for that model. Exact current dollar value needs Garrett's Vercel usage data (not available to this lane), but the direction is favorable and it also frees one of the 23 cron slots.
- **Neon DB side: $0 change.** The function queries the same branch compute, which wakes for each run — but the compute is already pinned awake 24/7 (~$19.35/mo) by the other 22 crons and app traffic. Moving ONE cron off Vercel onto a Function Trigger does not let the DB suspend.

**When the move wins:** I/O-heavy jobs with long waits (waiting-rate is 4× cheaper than active), replacing Vercel Fluid execution that bills wall-clock; native cron trigger removes a Vercel cron dependency; colocation with the DB in the branch region cuts a network hop; **it's free during the beta right now**.
**When it doesn't:** it never reduces the Neon DB compute bill — only moving *all* pinning traffic (23 crons + app reads + agent fleet touches) lets the compute suspend. If the job is pure SQL with no external calls, `pg_cron`... still doesn't run under scale-to-zero; the schedule trigger is the correct tool either way.

**The co-location gotcha (explicit):** "The Function still needs the DB compute awake to query it — does co-location change the duty-cycle math?" **No.** The function runs on *separate* function compute next to the DB; the branch's Postgres compute still wakes per query and still bills $0.106/CU-hr wall-clock while awake. The function's own bill ($0.59/mo here) is additive to, not a substitute for, the DB compute bill. The duty-cycle win only materializes if the whole cron fleet migrates AND nothing else touches the DB between runs — architecturally significant, currently not the case.

**Difficulty:** code change (Hono function + `neon.ts` + trigger creation) + **founder tap: Neon API key** (round-1 finding: `neon link`/`neon deploy` live application is blocked on this) + verify project region is in the 4 supported regions.
**Reversibility:** yes — delete the trigger and the function; point the cron back at Vercel.

---

## TOPIC 3 — DATA API as a real product surface

### Exact mechanics

- **What:** a *fully managed* PostgREST-compatible HTTP query interface for Neon Postgres (not the DIY-Docker PostgREST of the older guide at https://neon.com/docs/guides/postgrest). "Query a database without persistent TCP connections... stateless, scales to thousands of concurrent users without connection pool exhaustion." Overview: https://neon.com/docs/data-api/overview.md (read this session)
- **Enabled per branch, per single database:** Console → Postgres database → Data API → "Enable Data API"; or programmatically via `neon data-api create`, the Neon API, or MCP `provision_neon_data_api`. Enabling provisions the `pg_session_jwt` extension plus `authenticated`/`anonymous` roles.
- **URL shape:** `https://<endpoint>.apirest.<region>.aws.neon.tech/neondb/rest/v1` (consistent across multiple field reports; the console shows the exact URL after enabling).
- **Query syntax** (PostgREST, identical to Supabase — JS via `@neondatabase/postgrest-js` or raw HTTP):
  ```
  GET /projections?week=eq.4&select=player_name,projected_points&order=projected_points.desc&limit=50
  GET /player_stats?player_id=eq.123&select=*,games(game_date,opponent)     # embedding/join via FK
  POST /picks  (Prefer: resolution=merge-duplicates, on_conflict=...)        # upsert
  POST /rpc/get_weekly_rankings  {"week": 4}                                 # stored-procedure RPC
  ```
- **What it does NOT do vs raw Postgres:** no TCP `pg` protocol (HTTP only); no `LISTEN`/`NOTIFY`; no superuser ops; no cross-database queries; **no business logic** — but stored procedures ARE exposed as `/rpc/*` endpoints, so aggregation/computed logic can live in SQL functions. Schema changes require a **manual schema-cache refresh** (console button, or `PATCH .../data-api/{db}` with empty body).
- **Hard incompatibilities:** does NOT support projects with **IP Allow or Private Networking** enabled. RLS must be enabled on exposed tables (console warns on tables without it).
- Get-started doc: https://neon.com/docs/data-api/get-started.md (read in full this session)

### Auth story — JWT + Postgres-native security, no separate permission system

Docs: https://neon.com/docs/data-api/access-control.md (read in full this session)

- **Two layers, both in Postgres:** (1) `GRANT` table privileges per role, (2) Row-Level Security policies per row.
- **Role selection from the JWT:** valid token → `authenticated` role; no sign-in → `anonymous` role (but note: **even anonymous access uses a JWT** — via Better Auth `allowAnonymous: true`, which fetches a short-lived token from `GET /token/anonymous`, or a third-party guest token); a custom `role` claim can switch to any Postgres role (e.g. `"role": "admin"` → role `admin`).
- **RLS example for the public surface:** `auth.user_id()` extracts the JWT `sub` claim; for GSE's *public* projections/rankings the pattern is simpler — `GRANT SELECT ON published_projections TO anonymous;` + `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` + `CREATE POLICY public_read ON published_projections FOR SELECT TO anonymous USING (is_published = true);`. Console setup applies default GRANTs to `authenticated` on `public` schema; `anonymous` starts with **zero** permissions — you grant explicitly, which is exactly the safe posture for a public read surface.
- **Client:** `@neondatabase/neon-js` (`createClient(databaseUrl)`) handles Better Auth tokens automatically; `@neondatabase/postgrest-js` for any JWT provider (Auth0/Clerk/Firebase/custom).
- **Rate limiting:** NOT documented as a Data API feature — field reports note you can't rate-limit per IP at the API itself, and IP Allow is incompatible with the Data API, so throttling would need to live at Vercel/Cloudflare in front of it. **Gap confirmed: no official rate-limit control found in docs.**

### The catch list

1. **Duty cycle: YES, Data API traffic wakes the branch compute.** The Data API is a stateless HTTP front-end, but every query still executes against the branch's Postgres compute — an incoming request wakes a suspended compute just like a pooled connection does (Neon's scale-to-zero trigger is "no activity", and a Data API query is activity). No doc claims otherwise; one field report explicitly pairs the Data API with "compute scales to zero between rounds and wakes on the first request." Implication: it does NOT change the $19.35/mo math — the compute is already awake from the cron fleet. It also does NOT add a cold start *beyond* the DB wake (~0.3–1.5s first query after suspend, per third-party benchmarks — no official latency numbers found).
2. **Latency vs Vercel API routes:** currently Vercel route → Neon pooled connection → query. Data API path from the browser: browser → Neon Data API → query — one fewer hop through Vercel, no Vercel cold start, no Vercel invocation billed. For the *hottest public reads* (projections/rankings pages), this is strictly better.
3. **No business logic forces Vercel functions to stay for:** anything not expressible in SQL/views/RPC (external API calls, odds-provider aggregation, auth-gated writes with server-side validation). The honest split: reads of published data → Data API direct; writes and computed pipelines → keep Vercel routes or Neon Functions.
4. **Client-side token visibility:** if the public reads use a `NEXT_PUBLIC_*` JWT, anyone can reuse it — safe only because the role is SELECT-only on published views. Do NOT expose a token whose role can write.
5. **Schema-cache refresh** is manual — wire it into the migration pipeline or the API 404s/stale-reads new tables.
6. **Could the public read surface be served direct with RLS, deleting Vercel invocations?** Yes — for the projections/rankings pages: publish `published_projections` / `published_rankings` views (or tables written by the writer jobs), `GRANT SELECT TO anonymous`, RLS `is_published = true`, and have the Next.js pages fetch the Data API URL directly (client or server component). Deletes the API-route invocation + Vercel compute for those reads. Under the public/private doctrine (2026-09-28: public site shows ONLY projections and rankings), this is the natural shape — the Data API exposes exactly the public fence and nothing behind it.

### Pricing

- **No separate Data API charge** — verified: the official plans table (https://neon.com/docs/introduction/plans) itemizes Compute, Storage, network transfer, Instant restore, History window, Snapshots, Auth, Object Storage, Functions, AI Gateway, Private network transfer — **no Data API line item**. Round 1's "none found" stands. It rides on the branch's existing compute/storage meters (same wake behavior, same storage).

**Difficulty:** config change (enable in console — founder tap) + SQL (views, GRANTs, RLS policies) + frontend code change (swap API-route fetch for Data API client). No new services to pay for.
**Reversibility:** yes — disable Data API in console; views/policies stay inert in the DB; frontend reverts to API routes.

---

## CROSS-CUTTING NOTES / OPEN QUESTIONS

1. **Neon project region** — Functions require us-east-1 / us-east-2 / eu-central-1 / ap-southeast-1. Verify Garrett's project region before committing to the Functions lane (founder/builder check, 2 min in console).
2. **Functions billing clock** — "no charge during the beta" is stated in the official plans doc today; when billing begins, the $0.59/mo math above applies. Watch the changelog.
3. **Branch janitor** — if preview branching is enabled, automate `preview/*` branch cleanup (PR-close + age-based) via the Neon API; the native cleanup lags by Vercel's 6-month deployment retention on the Vercel-Managed path.
4. **Rate limiting on the Data API** — no official control found; if the public read surface moves direct-to-Data-API, put Cloudflare or Vercel in front for throttle/abuse protection.
5. **Latency numbers** — Neon publishes no official Data API or function cold-start latency figures; third-party benchmarks cite ~0.5–1.5s first-query-after-suspend. Treat as untested ("queued for evaluation") per the INGEST-AND-LEARN doctrine.
6. **Neon API key** — still the gating founder tap for `neon deploy`, trigger creation via API, and CLI-driven branch hygiene (round-1 finding, unchanged).

## DOC URL INDEX (all read or cited this session)

- https://neon.com/docs/guides/vercel-native-integration — Vercel-Managed integration (full read)
- https://neon.com/docs/guides/neon-managed-vercel-integration — Neon-Managed integration (link an existing project)
- https://neon.com/docs/guides/vercel-overview — integration chooser
- https://neon.com/docs/compute/functions/get-started.md — Functions get-started (full read)
- https://neon.com/docs/compute/functions/reference/runtime-limits.md — timeouts/concurrency (full read)
- https://neon.com/blog/your-neon-functions-can-now-run-on-a-schedule — schedule triggers announcement
- https://neon.com/docs/compute/functions/triggers/schedule.md — schedule trigger doc (cited in announcement)
- https://neon.com/docs/data-api/overview.md — Data API overview (full read)
- https://neon.com/docs/data-api/get-started.md — Data API get-started (full read)
- https://neon.com/docs/data-api/access-control.md — Data API auth/RLS (full read)
- https://neon.com/docs/guides/postgrest — DIY PostgREST guide (full read; legacy approach — managed Data API supersedes it)
- https://neon.com/docs/introduction/plans — official plans/pricing table (Functions $0.10/$0.025/CH, $0.60/M; extra branches $1.50/mo prorated; no Data API line item)
- https://neon.com/docs/llms.txt — docs index used to locate all of the above
