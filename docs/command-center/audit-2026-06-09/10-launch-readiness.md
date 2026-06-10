# Launch Readiness Audit — 2026-06-09

**Grade: B− · Verdict: GO-WITH-FIXES (narrow deploy clone), conditional on owner-provisioned DB/ingestion + one cron fix.**

The deploy clone (`C:/Users/Garrett/Sports`) is genuinely the right thing to ship first: it is a hardened, degraded-safe picks/board product with split liveness/readiness semantics, a fail-closed truth contract on the odds cron, a properly double-gated `DEV_FAKE_ADMIN`, and the broad Player-Lab/roster surface correctly cut from launch scope. The code-side launch engineering is strong. But "launch-grade" is not the same as "launchable today": `/api/ready` is intentionally 503 until a production-like DB + fresh ingestion exist, and the deploy clone's own cron + freshness configuration **cannot keep that gate green on Vercel** — the crons run once per sport per day while the freshness gate fails closed at 60 minutes. Two infra deltas the canonical clone already has (in-build `prisma migrate deploy` and an HSTS header) are **missing from the deploy clone's `vercel.json`**, so a deploy of this exact tree would not migrate the DB and would ship without HSTS. None of these are crashes or trust leaks — they are provisioning/operational gates — which is why this is GO-WITH-FIXES, not NO-GO. The shortest honest path is: provision DB+ingestion, fix the cron cadence (or freshness window), port the migrate-in-build step, stage the reviewed P0 subset, and re-run `prod-probe` green before flipping the switch.

---

## Blocker list (must clear before deploy-go)

1. **DB + ingestion not provisioned** → `/api/ready` 503, `prod-probe` red. (Owner.) — P0
2. **Cron cadence vs. 60-min freshness gate is self-contradictory on Vercel** → even *with* DB+ingestion, `/api/ready?check=ingestion-freshness` goes 503 ~23h/day. (Fixable in repo, owner-gated.) — P0
3. **Deploy clone `vercel.json` does not run migrations in build** (`migrate-if-configured.mjs` absent) → fresh prod DB never gets schema. (Fixable in repo.) — P0
4. **Dirty tree: 108 changed paths on `safety/sports-wip-2026-06-04`** → deliberate P0-only staging required; no `git add .`. (Owner.) — P1
5. **Deploy `vercel.json` missing HSTS header** that canonical has. — P1

---

## Findings by severity

### P0 — launch-blocking

#### P0-1 · Production DB + ingestion not provisioned → `/api/ready` 503 (deploy)
`apps/web/app/api/ready/route.ts:15` returns `503` when `payload.ok` is false. `apps/web/lib/health/checks.ts:23-78` requires both a live `SELECT 1` (`checks.ts:27`) and a successful `IngestionRun` within 60 minutes (`checks.ts:8`, `:59`). With no provisioned DB/ingestion, readiness is correctly red, and `scripts/prod-probe.mjs:271-276` exits non-zero on any `/api/ready` failure. This is the headline gate the manifest itself names (`p0-staging-manifest.md:65-68`). **This is correct fail-closed behavior, not a bug** — but it means launch cannot proceed until the owner provisions a production-like Postgres + at least one fresh ingestion run. **Recommendation (owner):** provision DB (`DATABASE_URL` + `DIRECT_URL`), run one real ingestion, then `APP_URL=<target> node scripts/prod-probe.mjs` must go green before deploy.

#### P0-2 · Cron cadence (daily) contradicts 60-min freshness gate → readiness can't stay green on Vercel (deploy)
`apps/web/lib/health/checks.ts:8` sets `FRESHNESS_MAX_AGE_MINUTES = 60` and `:59` flips ingestion to `error` past that. But `vercel.json:8-44` schedules each sport's refresh **once per day** (`"0 5 * * *"`, `"0 6 * * *"`, … one per sport). The cron *route* even documents itself as "refresh odds every 30 minutes" (`apps/web/app/api/cron/refresh-odds/route.ts:2`, `:11-12` "`*/30 * * * *`") — but the actual `vercel.json` schedule is daily, so the comment and the config disagree. Consequence: within ~60 minutes of each daily run, `/api/ready` (and the `?check=ingestion-freshness` probe at `prod-probe.mjs:349-361`, which hard-fails over 60 min) go 503 for the rest of the day. The every-30-min path only exists in the long-running worker (`workers/data-refresh/src/index.ts:40` `REFRESH_INTERVAL_MS = 30*60*1000`), which is **not** deployed on Vercel — and the cron route's own header says it exists precisely "so the operator doesn't have to deploy a long-running worker box" (`refresh-odds/route.ts:5-7`). So on a Vercel-only launch, the freshness contract and the cron schedule cannot both hold. **Recommendation (repo fix, owner-gated):** either (a) change `vercel.json` crons to a sub-60-min cadence (e.g. `"*/30 * * * *"` consolidated, or per-sport at <60-min spacing) so freshness stays green, or (b) consciously widen `FRESHNESS_MAX_AGE_MINUTES` to match the real cadence — but the founder's stated rule is 60 min (`checks.ts:5-7`), so option (a) is the trust-preserving fix. Decide before flipping `/api/ready` into any uptime monitor.

#### P0-3 · Deploy clone does not run DB migrations in build (deploy vs canonical)
Deploy `vercel.json:3` buildCommand: `cd ../.. && npm run db:generate && npm run build --workspace=@sports/web` — **no migrate step**. Canonical `vercel.json:3` buildCommand includes `node scripts/migrate-if-configured.mjs` between generate and build. The script (`C:/Users/Garrett/Sports-canonical-2026-06-03/scripts/migrate-if-configured.mjs:18-34`) runs `prisma migrate deploy` only when `DIRECT_URL` is present (production), skips cleanly on previews — and its header (`:6-13`) documents that its absence previously caused a "~80% deploy ERROR rate." The file **does not exist in the deploy clone at all** (`scripts/` has no `migrate-if-configured.mjs`). So a deploy of the current deploy tree against a fresh production DB would never apply schema → runtime DB queries (incl. `checks.ts:27,41`) fail → `/api/ready` permanently 503. Memory note "migrate-in-build added to vercel.json" applies to the canonical/prod tree, not this deploy clone. **Recommendation (repo fix):** port `scripts/migrate-if-configured.mjs` into the deploy clone and add it to `vercel.json` buildCommand exactly as canonical does, OR run `prisma migrate deploy` once out-of-band against the provisioned DB before first deploy. Do not deploy the deploy clone to a fresh DB without one of these.

### P1 — important

#### P1-1 · Dirty tree: 108 changed paths; P0 subset must be staged deliberately (deploy)
`git status --short` on `safety/sports-wip-2026-06-04` shows 108 entries mixing the P0 fail-closed repair with Launch-2 work (control-plane `cockpit/sources/page.tsx`, world-model `packages/types/src/index.ts`, regenerated `reports/launch-night/snapshots/*.html`, and all of `docs/research/**`). The manifest already enumerates the exact P0 subset — now **26 paths** (`p0-staging-manifest.md:15-47`, `:78-86`) plus the Wave-2 truth-contract files (`:92-114`) — and explicitly excludes the Launch-2 set (`:56-60`). The risk is a blind `git add .` shipping world-model/control-plane/snapshot churn into Launch 1. **Recommendation (owner):** stage exactly the manifest's path list (command provided at `p0-staging-manifest.md:51`), then `git status` to confirm only P0 paths are staged, as the manifest's own checklist requires (`:52`).

#### P1-2 · Deploy `vercel.json` missing HSTS header that canonical ships (deploy vs canonical)
Deploy `vercel.json:46-58` sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` — but **no `Strict-Transport-Security`**. Canonical `vercel.json` includes `"Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload"` in the same block. HSTS is a low-cost, high-value header for a product whose entire pitch is trust. **Recommendation (repo fix):** add the HSTS header to the deploy clone's global headers rule to match canonical before launch.

#### P1-3 · `prod-probe` is the real launch gate but is not wired to anything automatic (deploy)
`scripts/prod-probe.mjs` is a thorough, well-built gate — it checks live/health/ready, 5 public routes for crashes, banned positioning phrases (`:167-178`), board/calibration/RSS shape, and trust gates (public-picks/performance must be 503-bootstrap or 200-valid, `:363-384`). But nothing runs it automatically post-deploy; it's a manual `node scripts/prod-probe.mjs` (`package.json:42`). For a one-person launch that's acceptable, but it means a regression that turns `/api/ready` red or leaks a banned phrase won't self-alert. **Recommendation (P1, owner choice):** after first launch, wire `prod-probe` into the Vercel cron or an external uptime monitor (the `synthetic-monitoring` dir already exists under `app/api/health/`). Not a launch blocker; a launch-hardening item.

#### P1-4 · `/api/ready` 503 does not fail the Vercel deployment (deploy) — verify intent
There is no `healthCheckPath` or readiness wiring in `vercel.json` or `next.config.*` (grep clean). So a 503 `/api/ready` will **not** auto-roll-back or mark the Vercel deployment unhealthy — the site will serve public pages (which is intended: they degrade gracefully) while readiness is red. This is the correct design (public surfaces are crash-safe and honest about degraded state, e.g. board returns structured degraded payloads), **but** it means the only thing standing between "ready=red" and "live to users" is the manual `prod-probe` go/no-go. **Recommendation:** confirm this is intended (it appears to be, per the degraded-safe philosophy) and treat the manual `prod-probe` green as a hard, non-skippable pre-deploy step.

### P2 — worth doing

#### P2-1 · Cron route comment is stale and misleading (deploy)
`apps/web/app/api/cron/refresh-odds/route.ts:2`,`:11-12` claim "every 30 minutes" / `"*/30 * * * *"`, contradicting the actual daily `vercel.json` schedule. Even after P0-2 is resolved, the comment should be corrected to match reality so the next operator isn't misled about ingestion cadence. **Recommendation:** update the route header to the true schedule once P0-2 is decided.

#### P2-2 · `check-deploy-readiness.mjs` requires 15 env vars incl. live Stripe + Anthropic (deploy)
`scripts/check-deploy-readiness.mjs:92-108` marks `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_ELITE_PRICE_ID`, `ANTHROPIC_API_KEY`, `REDIS_URL` as REQUIRED and will `bad()`/exit-1 if absent (`:111-119`). For a narrow launch where checkout stays gated and content is dark, several of these are not strictly needed to serve the public picks/board product. The script does soften Anthropic to a warning when `PUBLIC_BLOG_ENABLED=false` (`:229-265`), which is good judgment — but Stripe/Redis are still hard-required. **Recommendation:** confirm whether the narrow launch intends live Stripe/Redis; if not, this gate may block on env that isn't launch-critical. Keep founder-gated — do not flip Stripe live to satisfy a script.

### P3 — minor

#### P3-1 · Two-clones drift is a standing launch risk, not yet a launch blocker
The deploy clone correctly omits `/players` and `/player-lab` routes entirely (verified: no such dirs under `apps/web/app/`), while canonical ships a full `/players` surface (`combine`, `dfs`, `edge`, `injuries`, `nextgen`, `qbr`, `snaps`, …). That cut is exactly right for Launch 1. The residual risk is that infra fixes (migrate-in-build, HSTS) live only in canonical and have **already** drifted out of the deploy clone (P0-3, P1-2). **Recommendation:** after Launch 1, treat one clone as canonical-for-deploy and reconcile infra deltas in one direction so security/migration config can't diverge again.

---

## Strengths (real, grounded)

- **Liveness/readiness split is correct and honest.** `/api/live` is a pure 200 process check (`app/api/live/route.ts`), `/api/health` returns the dependency summary but always 200 (`app/api/health/route.ts:15`, semantics `liveness_with_dependency_summary`), and `/api/ready` is the only one that 503s on dependency failure (`app/api/ready/route.ts:15`). This is textbook and lets uptime monitors distinguish "process up" from "dependencies ready."
- **Fail-closed truth contract on the odds cron is genuinely launch-critical and well-executed.** `refresh-odds/route.ts:95-139` keys HTTP status off `processSport()`'s real result (200 all-ok / 207 partial / 502 all-failed) and surfaces a classified `failureReason`, fixing the prior masked-success bug where a provider 401/429 returned a silent 200. Regression-guarded per the manifest (`p0-staging-manifest.md:106-109`).
- **`DEV_FAKE_ADMIN` is double-gated everywhere it appears.** Middleware (`middleware.ts:27-28`), `auth.ts:64`, and `entitlements.ts:21` all require `DEV_FAKE_ADMIN === "true"` **and** `NODE_ENV !== "production"`, so it cannot grant a synthetic ELITE admin in prod even if the env var leaks. `check-deploy-readiness.mjs:339-340` also hard-fails if `DEV_FAKE_ADMIN`/`DEMO_PICKS_ENABLED` are true.
- **`prod-probe.mjs` is a serious gate, not a smoke stub.** It enforces crash-safety on 5 public routes, banned-positioning copy (`:167-178`), JSON/RSS shape, and the public-picks/performance trust gates (`:363-384`) — and exits non-zero on the first failure class. This is the right go/no-go instrument.
- **Roster/Player-Lab scope is actually cut, not just promised.** No `/players` or `/player-lab` route exists in the deploy clone, closing the "unsupported current-roster claims" launch risk named in the finish-line plan (`14-one-person-finish-line-plan.md:37`).
- **Public surfaces degrade instead of crashing**, and the freshness rule is deliberately *tightened* (120→60 min per `p0-staging-manifest.md:104`), erring toward "fail closed rather than serve stale-as-live."
- **The launch-day operating docs are unusually disciplined** — explicit GO / GO-WITH-WATCH / NO-GO matrix, rollback triggers, and a launch-log template (`17-launch-day-monitoring-and-rollback-checklist.md:83-146`), plus a clear ship-narrow-first decision (`14-one-person-finish-line-plan.md:7-9`).

---

## What would move this from B− to A

1. **Provision DB + ingestion and turn `prod-probe` green** against the real target (clears P0-1). This is the single biggest mover; everything else is small.
2. **Resolve the cron-vs-freshness contradiction** (P0-2): set `vercel.json` crons to a <60-min cadence so `/api/ready` stays green between runs, and correct the route comment. Without this, readiness flips red daily even after provisioning.
3. **Port `migrate-if-configured.mjs` + the migrate-in-build buildCommand into the deploy clone** (P0-3) so a fresh prod DB gets schema in-build — the exact fix that took canonical's deploy error rate from ~80% to green.
4. **Add the HSTS header** to deploy `vercel.json` (P1-2) to match canonical's security posture.
5. **Stage exactly the manifest's 26+Wave-2 P0 paths** off the 108-file dirty tree (P1-1), confirm with `git status`, commit, and only then deploy.
6. **Wire `prod-probe` into post-deploy synthetic monitoring** (P1-3) so readiness/copy regressions self-alert instead of waiting for a manual run.

When P0-1/2/3 are cleared and the P0 subset is cleanly staged, this is a legitimate **GO** for a narrow first launch — the product engineering is already there.

---

### Files cited
- `C:/Users/Garrett/Sports/docs/command-center/p0-staging-manifest.md`
- `C:/Users/Garrett/Sports/apps/web/app/api/ready/route.ts`
- `C:/Users/Garrett/Sports/apps/web/app/api/live/route.ts`
- `C:/Users/Garrett/Sports/apps/web/app/api/health/route.ts`
- `C:/Users/Garrett/Sports/apps/web/lib/health/checks.ts`
- `C:/Users/Garrett/Sports/apps/web/app/api/cron/refresh-odds/route.ts`
- `C:/Users/Garrett/Sports/vercel.json`
- `C:/Users/Garrett/Sports-canonical-2026-06-03/vercel.json`
- `C:/Users/Garrett/Sports-canonical-2026-06-03/scripts/migrate-if-configured.mjs`
- `C:/Users/Garrett/Sports/scripts/prod-probe.mjs`
- `C:/Users/Garrett/Sports/scripts/check-deploy-readiness.mjs`
- `C:/Users/Garrett/Sports/apps/web/middleware.ts`
- `C:/Users/Garrett/Sports/apps/web/lib/auth.ts`
- `C:/Users/Garrett/Sports/apps/web/lib/entitlements.ts`
- `C:/Users/Garrett/Sports/workers/data-refresh/src/index.ts`
- `C:/Users/Garrett/Sports/apps/web/app/promotions/page.tsx`
- `C:/Users/Garrett/Sports/docs/command-center/launch/13-launch-readiness-scorecard.md`
- `C:/Users/Garrett/Sports/docs/command-center/launch/14-one-person-finish-line-plan.md`
- `C:/Users/Garrett/Sports/docs/command-center/launch/17-launch-day-monitoring-and-rollback-checklist.md`
