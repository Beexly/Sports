# Grok Sharded Audit Pack — one mission per conversation (context-safe)

**Date:** 2026-07-10 · **Replaces:** `SUPER_GROK_MEGA_AUDIT_PROMPT.md` for execution.
The mega-prompt asked one Grok conversation to sweep the whole monorepo; Grok pulled
100 sources and overflowed its context window ("conversation is too long") twice.
The audit itself was right — the packaging was wrong. This pack shards the same
audit into 12 self-contained missions, each sized to fit ONE fresh Grok conversation.

## How to run (read this first — it is what fixes the overflow)

1. **One shard = one brand-new Grok conversation.** Never run two shards in the same
   thread; never continue a full thread "just one more question."
2. Paste the **Universal Rails** block first, then ONE shard block under it.
3. Each shard names its exact files. Grok must fetch ONLY those (raw URLs like
   `https://raw.githubusercontent.com/Beexly/Sports/main/<path>` work well) — do NOT
   attach the whole repo, do NOT let it auto-pull "sources."
4. If a shard still overflows: split its file list in half and run it as two
   conversations (the shard blocks mark a natural split point where relevant).
5. Findings come back as text + patches. Grok applies fixes on branch
   `grok/<shard-id>` and opens small PRs; CI's 14 guardrail scanners are the
   mechanical honesty net.
6. Order doesn't matter, but the first four shards are the money/trust paths.

## Universal Rails (paste at the top of every shard conversation)

```
You are auditing ONE domain of Galaxy Sports Edge (github.com/Beexly/Sports), a live
production sports-prediction platform whose entire brand is HONESTY: real data, real
track record, no fabricated numbers, server-side paywalls, evidence-gated claims.

RULES (absolute):
- Work ONLY on the files listed in the mission below. Fetch them individually. Do not
  load the whole repository or follow imports beyond the list unless a finding
  REQUIRES one specific extra file (fetch it alone, note why).
- Branch grok/<shard-id> for any fixes; never commit to main; never force-push.
- Never weaken: readiness gates, stale-data kill switch, isBootstrap provenance,
  numeric-grounding guards, CI honesty scanners, scraping clearance, server-side
  paywalls, immutable snapshots/receipts (update:{} patterns). If a fix needs to
  touch one — STOP and write up the tradeoff instead.
- No fabricated data/stats/model-IDs/price-IDs. No secrets in code (report leaked
  secret NAMES only). No `any`; TypeScript strict; tests for every behavior change.
- Assume good faith: this code is well-built and heavily tested. Improve, don't
  remove. A 0.5% improvement is still an improvement — never write off small wins.
- It is July 2026: MLB/MLS are in season; NFL/NCAAF/NBA/NHL boards are quiet
  futures — do not "fix" off-season quiet into alarms.

OUTPUT CONTRACT (hard caps — this keeps the conversation inside your window):
- Max 10 findings, ranked CRITICAL → SMALL, each: file:line, one-sentence defect,
  one-sentence why-it-matters, concrete fix.
- Max 3 full patches per reply; if more fixes exist, list them as titles and wait
  for "continue" in THIS conversation.
- End with: (a) anything you could not verify from the listed files alone,
  (b) a one-line verdict for the domain: SOLID / SOLID-WITH-FIXES / NEEDS-WORK.
```

## Shard 1 — Stripe billing & entitlements  ·  branch `grok/billing`  ·  ~2,408 LOC

```
MISSION (shard: billing): audit "Stripe billing & entitlements" — these files and ONLY these files
(fetch individually from https://raw.githubusercontent.com/Beexly/Sports/main/<path>):

   1. apps/web/app/api/webhooks/stripe/route.ts
   2. apps/web/app/api/subscriptions/checkout/route.ts
   3. apps/web/app/api/subscriptions/portal/route.ts
   4. apps/web/lib/stripe.ts
   5. apps/web/lib/entitlements.ts
   6. apps/web/lib/api-entitlement.ts
   7. apps/web/lib/billing/price-ids.ts
   8. apps/web/lib/billing/notice.ts
   9. apps/web/lib/pricing/pricing-phases.ts
  10. apps/web/components/ui/manage-subscription-button.tsx
  11. apps/web/__tests__/stripe-webhook-route.test.ts
  12. apps/web/__tests__/entitlements-enforcement.test.ts
  13. apps/web/__tests__/subscriptions-checkout-route.test.ts
  14. apps/web/__tests__/api-entitlement.test.ts
  15. apps/web/__tests__/entitlements-dev-admin.test.ts
  16. apps/web/__tests__/billing-notice.test.ts
  17. apps/web/lib/billing/price-ids.test.ts

READ FIRST (hotspots, in this order):
  - apps/web/app/api/webhooks/stripe/route.ts
      The money path: signature verification, event handling, idempotency, and tier mutation from Stripe events (337 LOC).
  - apps/web/lib/entitlements.ts
      Server-side tier gating source of truth; check for dev/admin backdoors (see entitlements-dev-admin.test.ts) and fail-open paths.
  - apps/web/lib/api-entitlement.ts
      Per-route API enforcement wrapper — where a missed check means frontend-only paywall violation.
  - apps/web/app/api/subscriptions/checkout/route.ts
      Checkout session creation: price-ID selection, authz, and customer/user linkage integrity.
  - apps/web/lib/billing/price-ids.ts
      Env-var price-ID resolution with legacy monthly fallbacks — misconfig here charges wrong amounts or blocks checkout.
  - apps/web/lib/stripe.ts
      Shared Stripe client construction/config; check API version pinning and lazy env handling.

DOMAIN CONTEXT:
  - All files exist and are small; no file exceeds 700 lines so none need individual oversized fetch.
  - Skip apps/web/components/ui/billing-notice-banner.tsx (presentational only).
  - Pricing follows a proof-gated ladder with pricing-phases.ts as the single source of truth and grandfathered founding rates — auditors should check webhook/checkout logic honors grandfathering.
  - Per-interval price env vars (STRIPE_PRO_MONTHLY_PRICE_ID etc.) fall back to legacy STRIPE_PRO_PRICE_ID/STRIPE_ELITE_PRICE_ID.
  - The 2026-07-10 Next Data Cache incident touched data-ingestion fetch clients, not billing — but caching of entitlement lookups in Next route handlers is worth a glance.
  - Webhook tests (499 LOC) are the largest file and document expected event handling.

Apply the Universal Rails above. Fixes go on branch grok/billing. Findings per the
output contract: max 10 ranked findings, max 3 patches per reply, end with the
could-not-verify list and the one-line domain verdict.
```

## Shard 2 — Data ingestion & cron pipeline  ·  branch `grok/ingestion`  ·  ~3,100 LOC

```
MISSION (shard: ingestion): audit "Data ingestion & cron pipeline" — these files and ONLY these files
(fetch individually from https://raw.githubusercontent.com/Beexly/Sports/main/<path>):

   1. packages/ingestion-pipeline/src/process-sport.ts
   2. packages/ingestion-pipeline/src/settle-sport.ts
   3. packages/ingestion-pipeline/src/refresh-odds.ts
   4. packages/ingestion-pipeline/src/freeze-slate-commitments.ts
   5. packages/ingestion-pipeline/src/settlement-snapshots.ts
   6. packages/ingestion-pipeline/src/source-snapshot.ts
   7. packages/ingestion-pipeline/src/quiet-board.ts
   8. packages/ingestion-pipeline/src/owner-alert.ts
   9. packages/data-ingestion/src/odds-api-client.ts
  10. packages/data-ingestion/src/espn-results-client.ts
  11. packages/data-ingestion/src/odds-failover.ts
  12. packages/data-ingestion/src/fetch-failover.ts
  13. packages/data-ingestion/src/no-store-fetch.ts
  14. packages/data-ingestion/src/source-registry.ts
  15. packages/data-ingestion/src/source-health.ts
  16. packages/data-ingestion/src/freshness-schedule.ts
  17. apps/web/app/api/cron/refresh-odds/route.ts
  18. apps/web/app/api/cron/settle-picks/route.ts

READ FIRST (hotspots, in this order):
  - packages/ingestion-pipeline/src/settle-sport.ts
      Pick settlement/grading against real results — honesty gate for the public track record; grading errors corrupt calibration and pricing-ladder proofs
  - packages/ingestion-pipeline/src/process-sport.ts
      Largest orchestrator (612 loc): full per-sport pipeline; concurrency, partial-failure handling, and ordering all live here
  - packages/ingestion-pipeline/src/freeze-slate-commitments.ts
      Point-of-no-return commitment of picks before games start — immutability/timing bugs let picks be changed after the fact
  - packages/data-ingestion/src/no-store-fetch.ts
      Tiny but critical: forces cache:'no-store' on ingestion fetches — center of the 2026-07-10 Next Data Cache staleness incident; verify every client uses it
  - packages/data-ingestion/src/odds-api-client.ts
      Primary paid data source (The Odds API): quota use, error handling, timestamp/freshness validation of odds
  - apps/web/app/api/cron/settle-picks/route.ts
      Cron entry point — check auth (CRON_SECRET), idempotency/overlap protection, and whether failures are surfaced

DOMAIN CONTEXT:
  - No file exceeds 700 lines (max is process-sport.ts at 612).
  - 2026-07-10 incident: Next.js Data Cache served stale odds because fetch defaults cached; fix is no-store-fetch.ts + fetch-failover.ts — auditor should confirm all clients (odds-api-client, espn-results-client, kalshi-client, nflverse-source) route through it.
  - Skip: __tests__ dirs, *.test.ts files (colocated tests exist for failover, source-registry, quiet-board, grading — useful only as spec reference), index.ts barrels, and nflverse/openfootball/reddit/team-rates sources unless data-honesty of secondary signals is in scope.
  - Rights/clearance enforcement (clearance-engine, source-rights-registry) lives in apps/web/lib/scraping, outside this scope, but source-registry.ts should reference it.
  - Cron backfill-* routes are small and lower-risk; refresh-odds and settle-picks are the money paths.

Apply the Universal Rails above. Fixes go on branch grok/ingestion. Findings per the
output contract: max 10 ranked findings, max 3 patches per reply, end with the
could-not-verify list and the one-line domain verdict.
```

## Shard 3 — Prediction engine  ·  branch `grok/engine`  ·  ~4,900 LOC

> **Size note:** this shard is large. If the conversation strains, run it as TWO conversations: files 1–9 first, then files 10–18 (repeat the rails + mission header in each).

```
MISSION (shard: engine): audit "Prediction engine" — these files and ONLY these files
(fetch individually from https://raw.githubusercontent.com/Beexly/Sports/main/<path>):

   1. packages/prediction-engine/src/scoring.ts
   2. packages/prediction-engine/src/index.ts
   3. packages/prediction-engine/src/calibration-map.ts
   4. packages/prediction-engine/src/probability-calibration.ts
   5. packages/prediction-engine/src/calibration-apply.ts
   6. packages/prediction-engine/src/calibration-sequence.ts
   7. packages/prediction-engine/src/calibration-commitment.ts
   8. packages/prediction-engine/src/evidence-readiness-matrix.ts
   9. packages/prediction-engine/src/readiness.ts
  10. packages/prediction-engine/src/clv.ts
  11. packages/prediction-engine/src/clv-capture.ts
  12. packages/prediction-engine/src/clv-decomposition.ts
  13. packages/prediction-engine/src/pick-proof-receipt.ts
  14. packages/prediction-engine/src/proof-of-record.ts
  15. packages/prediction-engine/src/settlement.ts
  16. packages/prediction-engine/src/kelly.ts
  17. packages/prediction-engine/src/conviction-tier.ts
  18. packages/prediction-engine/src/platform-config.ts

READ FIRST (hotspots, in this order):
  - packages/prediction-engine/src/scoring.ts
      Core confidence/edge scoring (988 lines) — every pick's number originates here; math errors flow straight to paying customers
  - packages/prediction-engine/src/calibration-map.ts
      Maps raw scores to calibrated 0-100 confidence; honesty of the platform's headline claims depends on it (with probability-calibration.ts and calibration-apply.ts)
  - packages/prediction-engine/src/evidence-readiness-matrix.ts
      Readiness gates deciding whether picks may ship at all — a bypassed or mis-ordered gate publishes unproven picks (pair with readiness.ts)
  - packages/prediction-engine/src/clv-capture.ts
      CLV computation feeds the ESTABLISHED pricing-ladder milestone (verified CLV >=52.4%) — a money/proof path (with clv.ts, clv-decomposition.ts)
  - packages/prediction-engine/src/pick-proof-receipt.ts
      Cryptographic-style proof receipts and record commitments; tamper-evidence claims live here (with proof-of-record.ts, calibration-commitment.ts, pedersen-ledger.ts)
  - packages/prediction-engine/src/settlement.ts
      Grades picks against results; grading bugs corrupt calibration, track record, and every downstream milestone

OVERSIZED (>700 lines — fetch each alone, never alongside other files):
  - packages/prediction-engine/src/scoring.ts
  - packages/prediction-engine/src/index.ts
  - packages/prediction-engine/src/game-context.ts
  - packages/prediction-engine/src/metrics/core/metric-birth-certificate-registry.ts

DOMAIN CONTEXT:
  - Scope is packages/prediction-engine/src: ~240 files, ~43k LOC total (incl.
  - tests).
  - Large sub-trees intentionally left out of the top-18: src/metrics/** (per-metric NFL indices + fixtures — mostly formulaic, low audit value except metrics/core/metric-birth-certificate-registry.ts at 736 lines), src/expected-metrics/**, src/nfl/**, src/gse-score/** (no-bet governor logic there may interest a gating audit: gse-score/gse-action-score.ts, gse-score/no-bet-strength.ts), and estimators (ml-estimator.ts 591L, tweedie-baseline.ts, poisson.ts, linear-thompson.ts).
  - Related proof machinery not in top-18: pedersen-ledger.ts, anytime-ledger.ts, slate-commitment.ts, signal-ledger.ts, provenance.ts.
  - Fixture files (*-fixtures.ts, *-fixture-data.ts) are test data — skip.
  - The 2026-07-10 Next Data Cache incident touched data-ingestion fetch clients, not this package; but platform-config.ts has a stale-data gate (see __tests__/platform-config-stale-gate.test.ts) worth checking for freshness enforcement.
  - Oversized files (>700 lines) should be fetched individually: scoring.ts (988), index.ts (957, the public API surface/re-exports plus logic), game-context.ts (752), metrics/core/metric-birth-certificate-registry.ts (736).

Apply the Universal Rails above. Fixes go on branch grok/engine. Findings per the
output contract: max 10 ranked findings, max 3 patches per reply, end with the
could-not-verify list and the one-line domain verdict.
```

## Shard 4 — Public API honesty & authz  ·  branch `grok/public-api`  ·  ~2,130 LOC

```
MISSION (shard: public-api): audit "Public API honesty & authz" — these files and ONLY these files
(fetch individually from https://raw.githubusercontent.com/Beexly/Sports/main/<path>):

   1. apps/web/app/api/picks/route.ts
   2. apps/web/app/api/picks/daily-slate/route.ts
   3. apps/web/app/api/picks/[id]/explain/route.ts
   4. apps/web/app/api/picks/[id]/audit/route.ts
   5. apps/web/app/api/performance/route.ts
   6. apps/web/app/api/verify/route.ts
   7. apps/web/app/api/verify/slate/route.ts
   8. apps/web/app/api/cipher/verify/route.ts
   9. apps/web/app/api/blog/route.ts
  10. apps/web/app/api/board/state/route.ts
  11. apps/web/app/api/board/passes/route.ts
  12. apps/web/app/api/health/route.ts
  13. apps/web/app/api/admin/dashboard/route.ts
  14. apps/web/app/api/admin/trigger-refresh/route.ts
  15. apps/web/app/api/dev/state/route.ts
  16. apps/web/app/api/cockpit/journal/route.ts
  17. apps/web/app/api/cockpit/journal/[id]/submit/route.ts
  18. apps/web/app/api/cockpit/journal/[id]/retract/route.ts

READ FIRST (hotspots, in this order):
  - apps/web/app/api/picks/route.ts
      Main picks endpoint (266 LOC): server-side tier gating of premium picks/confidence scores — the core paywall honesty gate.
  - apps/web/app/api/performance/route.ts
      Public track-record/accuracy claims (123 LOC) with no auth/session references — verify numbers are computed from graded picks, not massaged.
  - apps/web/app/api/admin/dashboard/route.ts
      722 LOC admin surface — check admin role enforcement, not just session presence; largest file in scope.
  - apps/web/app/api/picks/daily-slate/route.ts
      Free-tier '1 pick/day' enforcement and freshness/timestamp validation; leakage of premium fields likely here.
  - apps/web/app/api/picks/[id]/audit/route.ts
      324 LOC audit/provenance trail — versioning honesty and whether premium factor data leaks to free users.
  - apps/web/app/api/dev/state/route.ts
      Dev/debug endpoint plus admin/trigger-refresh — check they are gated in production (env check vs real authz).

OVERSIZED (>700 lines — fetch each alone, never alongside other files):
  - apps/web/app/api/admin/dashboard/route.ts

DOMAIN CONTEXT:
  - ~110 route files in scope; most are thin 9-25 LOC wrappers delegating to lib code (intelligence/*, nflverse/*) — skip those.
  - Routes with zero auth/session references: performance, board/passes, verify — may be intentionally public (track record is meant to be public per CLAUDE.md) but check for premium data leakage.
  - Caching (unstable_cache/revalidate) appears only in cipher/verify and promotions routes; note the 2026-07-10 Next Data Cache incident touched data-ingestion fetch clients, so cached responses could serve stale or cross-user data.
  - cockpit/* routes (journal submit/retract, content review, bot-outbox/preview 396 LOC) are the internal operator surface — verify they aren't publicly reachable.
  - Actual auth/entitlement logic likely lives in apps/web/lib (auth/entitlements) — auditor may need to follow imports from picks/route.ts.

Apply the Universal Rails above. Fixes go on branch grok/public-api. Findings per the
output contract: max 10 ranked findings, max 3 patches per reply, end with the
could-not-verify list and the one-line domain verdict.
```

## Shard 5 — Prisma schema & query performance  ·  branch `grok/db`  ·  ~6,000 LOC

> **Size note:** this shard is large. If the conversation strains, run it as TWO conversations: files 1–9 first, then files 10–18 (repeat the rails + mission header in each).

```
MISSION (shard: db): audit "Prisma schema & query performance" — these files and ONLY these files
(fetch individually from https://raw.githubusercontent.com/Beexly/Sports/main/<path>):

   1. packages/db/prisma/schema.prisma
   2. packages/db/src/index.ts
   3. packages/db/src/neon-serverless-adapter.ts
   4. packages/db/prisma/migrations/20260708000000_add_hot_path_indexes/migration.sql
   5. packages/db/prisma/migrations/20260522165000_add_game_current_edge_index/migration.sql
   6. apps/web/lib/cockpit/jarvis-data.ts
   7. apps/web/lib/jarvis/memory/actions.ts
   8. apps/web/lib/jarvis/memory/decisions.ts
   9. apps/web/lib/jarvis/intelligence-state.ts
  10. apps/web/lib/dashboard/load-performance.ts
  11. apps/web/lib/performance/public-performance-policy.ts
  12. apps/web/lib/performance/public-clv-policy.ts
  13. apps/web/lib/performance/settlement-health.ts
  14. apps/web/lib/performance/clv-coverage.ts
  15. apps/web/lib/community/moderation-actions.ts
  16. apps/web/lib/board/state.ts
  17. apps/web/lib/stripe.ts
  18. apps/web/lib/scoring/player-composite.ts

READ FIRST (hotspots, in this order):
  - packages/db/prisma/schema.prisma
      2448-line schema, ~60+ models; check indexes vs actual query filters (Pick, Game, CLV, subscription models) and missing composite indexes
  - apps/web/lib/cockpit/jarvis-data.ts
      Heaviest query fan-out in the app (12 Prisma calls) feeding the cockpit dashboard — N+1 / unbounded findMany risk
  - apps/web/lib/performance/public-performance-policy.ts
      Public track-record/honesty gate computed from DB aggregates — correctness + query cost on money-adjacent trust claims
  - apps/web/lib/stripe.ts
      Money path: subscription/entitlement queries; check transaction/consistency around webhook-driven writes
  - packages/db/src/neon-serverless-adapter.ts
      Connection/adapter layer for serverless Postgres — pooling, cold-start, and singleton behavior determine all query perf
  - packages/db/prisma/migrations/20260708000000_add_hot_path_indexes/migration.sql
      Recent (2 days old) hot-path index migration — verify it matches the queries it claims to cover and is in schema.prisma too

OVERSIZED (>700 lines — fetch each alone, never alongside other files):
  - packages/db/prisma/schema.prisma

DOMAIN CONTEXT:
  - Schema is one 2448-line file (fetch alone).
  - 26 migrations; most are small additive SQL — only the two index migrations listed are perf-relevant, skip the seed/budget migrations.
  - Query call sites in apps/web/lib are individually small (130-400 LOC); heaviest clusters are cockpit/jarvis-data.ts and jarvis/memory/*.
  - packages/db/src/index.ts exports the Prisma client singleton; neon-serverless-adapter.ts handles serverless Postgres connections.
  - Known context: a 2026-07-10 Next Data Cache incident touched data-ingestion fetch clients (out of this domain, but caching assumptions around DB-backed reads may be suspect).
  - Skip packages/db/node_modules, sample-picks.ts, and __tests__ unless verifying a finding.

Apply the Universal Rails above. Fixes go on branch grok/db. Findings per the
output contract: max 10 ranked findings, max 3 patches per reply, end with the
could-not-verify list and the one-line domain verdict.
```

## Shard 6 — Auth, sessions, RBAC, admin surface  ·  branch `grok/auth`  ·  ~1,700 LOC

```
MISSION (shard: auth): audit "Auth, sessions, RBAC, admin surface" — these files and ONLY these files
(fetch individually from https://raw.githubusercontent.com/Beexly/Sports/main/<path>):

   1. apps/web/lib/auth.ts
   2. apps/web/lib/auth/require-admin.ts
   3. apps/web/middleware.ts
   4. apps/web/lib/entitlements.ts
   5. apps/web/lib/api-entitlement.ts
   6. apps/web/lib/cron/authorize.ts
   7. apps/web/lib/api/v1/shadow-gateway.ts
   8. apps/web/lib/api-auth/middleware.ts
   9. apps/web/lib/api-auth/webhook-signature.ts
  10. apps/web/app/admin/layout.tsx
  11. apps/web/app/cockpit/layout.tsx
  12. apps/web/app/api/auth/[...nextauth]/route.ts
  13. apps/web/app/api/admin/trigger-refresh/route.ts
  14. apps/web/app/api/admin/dashboard/route.ts
  15. apps/web/app/api/dev/state/route.ts
  16. apps/web/app/api/admin/promotions/route.ts
  17. apps/web/app/api/admin/losses/[pickId]/draft/route.ts

READ FIRST (hotspots, in this order):
  - apps/web/lib/auth.ts
      NextAuth config incl. DEV_FAKE_ADMIN fake-session shortcut (4 references) — any prod leak of that env var grants admin
  - apps/web/lib/entitlements.ts
      Tier/entitlement resolution (money path); DEV_FAKE_ADMIN=true hands ELITE — check the prod guard actually holds
  - apps/web/middleware.ts
      Edge route gating for /admin, /cockpit, protected paths — check matcher gaps and reliance on client-visible cookies (see middleware-contract.test.ts)
  - apps/web/lib/auth/require-admin.ts
      Only 17 lines and it's the sole server-side admin gate — verify every /api/admin and /api/cockpit route actually calls it
  - apps/web/app/api/admin/dashboard/route.ts
      722-line admin API route; verify authz check at top and no data leakage on early-return paths
  - apps/web/lib/cron/authorize.ts
      Shared-secret auth for cron/job endpoints — check for timing-safe compare and unset-secret fail-open

OVERSIZED (>700 lines — fetch each alone, never alongside other files):
  - apps/web/app/api/admin/dashboard/route.ts

DOMAIN CONTEXT:
  - DEV_FAKE_ADMIN is the recurring risk theme: touched in lib/auth.ts, lib/entitlements.ts, app/api/dev/state/route.ts, and admin dashboard-view.tsx; existing tests entitlements-dev-admin.test.ts / require-admin.test.ts / admin-routes-gating.test.ts / middleware-contract.test.ts encode intended behavior.
  - lib/api-auth/* files are mostly tiny stubs/re-exports (real logic in lib/api/v1/shadow-gateway.ts, ~110 LOC, shadow-mode API-key gateway).
  - Skip apps/web/.next/** (build output) and the many cockpit UI component tests.
  - Cockpit UI components (components/cockpit/*) are presentational, not authz.
  - The 2026-07-10 Next Data Cache incident is a data-ingestion concern, not this domain, though cached fetches inside admin/cockpit routes could theoretically serve cross-user data — worth a glance in dashboard/route.ts.

Apply the Universal Rails above. Fixes go on branch grok/auth. Findings per the
output contract: max 10 ranked findings, max 3 patches per reply, end with the
could-not-verify list and the one-line domain verdict.
```

## Shard 7 — AI content pipeline & guardrails  ·  branch `grok/ai-content`  ·  ~2,900 LOC

```
MISSION (shard: ai-content): audit "AI content pipeline & guardrails" — these files and ONLY these files
(fetch individually from https://raw.githubusercontent.com/Beexly/Sports/main/<path>):

   1. apps/web/lib/content-engine/build-draft.ts
   2. apps/web/lib/content-engine/compliance.ts
   3. apps/web/lib/content-engine/readiness.ts
   4. apps/web/lib/content-engine/source-coverage.ts
   5. apps/web/lib/content-engine/templates.ts
   6. apps/web/lib/content/workflow.ts
   7. apps/web/lib/journal/claude.ts
   8. apps/web/lib/journal/prompts.ts
   9. apps/web/lib/journal/compliance.ts
  10. apps/web/lib/journal/public-guard.ts
  11. apps/web/lib/journal/compose.ts
  12. apps/web/lib/claude-api/messages.ts
  13. apps/web/lib/claude-api/internal-llm.ts
  14. apps/web/lib/claude-api/numeric-guard.ts
  15. apps/web/lib/claude-api/cost-monitor.ts
  16. scripts/guardrails/trust-gate.mjs
  17. scripts/guardrails/draft-only.mjs
  18. scripts/guardrails/no-unsupported-performance-claims.mjs

READ FIRST (hotspots, in this order):
  - apps/web/lib/content-engine/build-draft.ts
      Largest module; assembles AI drafts from data — the 'no fabricated stats' rule lives or dies here
  - apps/web/lib/claude-api/numeric-guard.ts
      Honesty gate that validates numbers in LLM output against source data; small but load-bearing
  - scripts/guardrails/trust-gate.mjs
      CI gate for unsupported accuracy/performance claims; check bypass conditions and pattern coverage
  - scripts/guardrails/draft-only.mjs
      Enforces AI content stays draft-only pre-review; publish-path escape hatch would be high impact
  - apps/web/lib/journal/claude.ts
      Direct Claude call path for journal generation — prompt injection surface and output validation
  - apps/web/lib/claude-api/cost-monitor.ts
      Money path: budget enforcement for LLM spend (with budget-store.ts/credit-pool.ts); check race conditions and fail-open behavior

DOMAIN CONTEXT:
  - No file exceeds 700 lines (max is build-draft.ts at 434).
  - Adjacent but out of core scope: apps/web/lib/claude-api/providers/* (bedrock/vertex/cerebras/aws-sigv4 dispatch, ~1100 LOC, has its own tests) and credit-pool/budget/usage stores — fetch cost-monitor.ts plus budget-store.ts/credit-pool.ts together if auditing spend caps.
  - Guardrail scanners in scripts/guardrails/ are regex-based .mjs CI checks (also secret-scan, model-freeze, claude-api-usage, commercial-copy-scan).
  - Journal review/publish HTTP surface is apps/web/app/api/cockpit/journal/* and /content/* routes (submit/retract/scan) — authz there is worth a look.
  - Skip *.test.ts, fixtures/, and scripts/guardrails/fixtures.
  - The 2026-07-10 Next Data Cache incident touched data-ingestion fetch clients, not this domain.

Apply the Universal Rails above. Fixes go on branch grok/ai-content. Findings per the
output contract: max 10 ranked findings, max 3 patches per reply, end with the
could-not-verify list and the one-line domain verdict.
```

## Shard 8 — Workers, Docker, CI/CD  ·  branch `grok/workers-ci`  ·  ~2,200 LOC

```
MISSION (shard: workers-ci): audit "Workers, Docker, CI/CD" — these files and ONLY these files
(fetch individually from https://raw.githubusercontent.com/Beexly/Sports/main/<path>):

   1. workers/data-refresh/src/index.ts
   2. workers/pick-generation/src/index.ts
   3. workers/content-publishing/src/index.ts
   4. workers/airwave-listener/src/dry-run.ts
   5. workers/data-refresh/Dockerfile
   6. workers/pick-generation/Dockerfile
   7. docker/Dockerfile
   8. docker/docker-compose.yml
   9. docker/oracle-vps/compose.yml
  10. docker/oracle-vps/deploy.sh
  11. docker/oracle-vps/Caddyfile
  12. .github/workflows/ci.yml
  13. .github/workflows/external-cron.yml
  14. .github/workflows/daily-smoke.yml
  15. .github/workflows/neon_workflow.yml
  16. scripts/deploy/migrate-if-configured.mjs
  17. scripts/vercel-skip-build.mjs
  18. scripts/check-deploy-readiness.mjs

READ FIRST (hotspots, in this order):
  - .github/workflows/external-cron.yml
      Scheduled cron hitting prod endpoints — check auth token handling, secret exposure, and what jobs it can trigger
  - workers/data-refresh/src/index.ts
      BullMQ job scheduling for real odds ingestion — concurrency, retry, and freshness/staleness handling
  - scripts/deploy/migrate-if-configured.mjs
      Runs DB migrations conditionally at deploy time — silent-skip and destructive-migration risk
  - scripts/vercel-skip-build.mjs
      Decides whether prod builds are skipped — a wrong path filter silently ships stale code (has adjacent test vercel-skip-build.test.mjs)
  - docker/oracle-vps/compose.yml
      Production VPS topology: env/secret injection, Redis exposure, restart policies; deploy.sh alongside
  - .github/workflows/ci.yml
      270-line pipeline — check which gates (tests/typecheck/guardrails) are actually blocking vs continue-on-error

DOMAIN CONTEXT:
  - All paths verified 2026-07-10.
  - workers/pick-generation/src/index.ts is a thin 18-line stub — heavy logic lives in packages/prediction-engine (other domain).
  - content-publishing worker has the only worker test (src/__tests__/index.test.ts).
  - fable-evidence.yml is a low-value evidence-report workflow; skip.
  - The large scripts/statking_*.py and guardrails/* families belong to other domains (scraping/guardrails) — do not fetch here.
  - Known context: the 2026-07-10 Next Data Cache incident touched data-ingestion fetch clients, so check whether data-refresh worker and external-cron freshness assumptions interact with cached fetches.

Apply the Universal Rails above. Fixes go on branch grok/workers-ci. Findings per the
output contract: max 10 ranked findings, max 3 patches per reply, end with the
could-not-verify list and the one-line domain verdict.
```

## Shard 9 — Cockpit / Jarvis owner OS  ·  branch `grok/cockpit`  ·  ~7,700 LOC

> **Size note:** this shard is large. If the conversation strains, run it as TWO conversations: files 1–9 first, then files 10–18 (repeat the rails + mission header in each).

```
MISSION (shard: cockpit): audit "Cockpit / Jarvis owner OS" — these files and ONLY these files
(fetch individually from https://raw.githubusercontent.com/Beexly/Sports/main/<path>):

   1. apps/web/app/cockpit/layout.tsx
   2. apps/web/app/cockpit/page.tsx
   3. apps/web/app/cockpit/memory/page.tsx
   4. apps/web/app/api/cockpit/jarvis/route.ts
   5. apps/web/app/api/cron/jarvis-snapshot/route.ts
   6. apps/web/lib/jarvis/agent-council.ts
   7. apps/web/lib/jarvis/capability-registry.ts
   8. apps/web/lib/jarvis/intelligence-state.ts
   9. apps/web/lib/jarvis/jarvis-decision-queue.ts
  10. apps/web/lib/jarvis/jarvis-operating-assessment.ts
  11. apps/web/lib/jarvis/ledgers.ts
  12. apps/web/lib/jarvis/routing-rules.ts
  13. apps/web/lib/jarvis/memory/actions.ts
  14. apps/web/lib/jarvis/memory/decisions.ts
  15. apps/web/lib/jarvis/memory/conflict.ts
  16. apps/web/lib/jarvis/memory/guards.ts
  17. apps/web/lib/cockpit/jarvis.ts
  18. apps/web/lib/cockpit/ask-jarvis.ts

READ FIRST (hotspots, in this order):
  - apps/web/app/cockpit/layout.tsx
      Sole authz gate for the entire /cockpit surface (session.user.role !== ADMIN redirect) — verify every /api/cockpit/* route re-checks it server-side, since layout gating alone doesn't protect the API
  - apps/web/lib/jarvis/memory/actions.ts
      Memory write path with state machine + guards — check for race/concurrency and guard-bypass on mutation
  - apps/web/lib/jarvis/jarvis-decision-queue.ts
      Owner-approval queue is built from listSeedAgentTasks() — seed data as source of truth may violate the no-fake-data rule and make approvals cosmetic
  - apps/web/lib/cockpit/ask-jarvis.ts
      884-line Claude API integration; check prompt/data honesty, cost controls, and that AI output isn't treated as source of truth
  - apps/web/lib/jarvis/agent-council.ts
      1722-line largest module; agent orchestration/consensus logic, likely hardcoded state and untested branches
  - apps/web/app/api/cron/jarvis-snapshot/route.ts
      Cron entry point — verify cron-secret auth and that snapshots aren't stale/cached (Next Data Cache incident precedent)

OVERSIZED (>700 lines — fetch each alone, never alongside other files):
  - apps/web/lib/jarvis/agent-council.ts
  - apps/web/app/cockpit/page.tsx
  - apps/web/lib/cockpit/ask-jarvis.ts

DOMAIN CONTEXT:
  - Cockpit is admin-only owner UI with ~25 subpages under apps/web/app/cockpit/ and ~20 API routes under apps/web/app/api/cockpit/ (journal, tasks, content review, api-costs override, bot-outbox) — each API route needs its own auth check, the layout only guards pages.
  - jarvis-decision-queue.ts and jarvis-owner-summary.ts are tiny wrappers over lib/tasks/agent-task-router seed tasks (potential fake-data smell).
  - Supporting cockpit libs: apps/web/lib/cockpit/jarvis-data.ts, jarvis-diff.ts, jarvis-history.ts, jarvis-alerts.ts, jarvis-audit-log.ts (each <300 LOC).
  - UI components in apps/web/components/cockpit/ are low audit value; skip public/immersive webp assets.
  - 2026-07-10 Next Data Cache incident touched data-ingestion fetch clients — cockpit routes reading readiness/snapshot data may share the same caching pitfall.

Apply the Universal Rails above. Fixes go on branch grok/cockpit. Findings per the
output contract: max 10 ranked findings, max 3 patches per reply, end with the
could-not-verify list and the one-line domain verdict.
```

## Shard 10 — Frontend pages, UX, a11y  ·  branch `grok/frontend`  ·  ~4,900 LOC

> **Size note:** this shard is large. If the conversation strains, run it as TWO conversations: files 1–9 first, then files 10–18 (repeat the rails + mission header in each).

```
MISSION (shard: frontend): audit "Frontend pages, UX, a11y" — these files and ONLY these files
(fetch individually from https://raw.githubusercontent.com/Beexly/Sports/main/<path>):

   1. apps/web/app/page.tsx
   2. apps/web/app/layout.tsx
   3. apps/web/app/pricing/page.tsx
   4. apps/web/app/picks/page.tsx
   5. apps/web/app/dashboard/page.tsx
   6. apps/web/app/proof/page.tsx
   7. apps/web/app/calibration/page.tsx
   8. apps/web/app/methodology/page.tsx
   9. apps/web/app/responsible-play/page.tsx
  10. apps/web/components/picks/pick-card.tsx
  11. apps/web/components/picks/evidence-audit-drawer.tsx
  12. apps/web/components/picks/line-freshness-badge.tsx
  13. apps/web/components/pricing/pricing-plans.tsx
  14. apps/web/components/pricing/subscribe-button.tsx
  15. apps/web/components/pricing/tier-gate-panel.tsx
  16. apps/web/components/ui/nav.tsx
  17. apps/web/components/ui/mobile-nav.tsx
  18. apps/web/components/ui/risk-disclosure.tsx

READ FIRST (hotspots, in this order):
  - apps/web/app/picks/page.tsx
      Core product page (681 lines): tier gating of picks/confidence must be server-side, not CSS-hidden; also freshness display honesty
  - apps/web/components/pricing/subscribe-button.tsx
      Money path: initiates Stripe checkout from the client; check plan/price selection can't be tampered with and loading/error states
  - apps/web/components/picks/pick-card.tsx
      628-line component rendering confidence scores and locked premium states; check no premium data leaks into props for free users and a11y of interactive bits
  - apps/web/app/pricing/page.tsx
      Marketing claims + pricing ladder copy: must match pricing-phases.ts single source of truth and avoid unsupported accuracy claims
  - apps/web/components/pricing/tier-gate-panel.tsx
      The visible paywall UI — verify it's presentation-only over server-enforced gating, not the gate itself
  - apps/web/app/page.tsx
      Landing page: track-record/accuracy claims must be data-backed; hero a11y and contrast on the dark theme

DOMAIN CONTEXT:
  - App router is very large (60+ route dirs incl.
  - many experimental/vanity routes: airwave, cipher, fable, gsn, observatory, etc.) — skip those and the extensive /admin/statking tree (separate admin/ops domain).
  - components/ui has small colocated tests (count-up.test.ts, data-table.test.ts, tabs.test.ts) — not audit targets.
  - No file in scope exceeds 700 lines (largest: picks/page.tsx 681, evidence-audit-drawer.tsx 686 — borderline, fetch individually if context-tight).
  - Key honesty rules from CLAUDE.md: no frontend-only paywalls, no unsupported accuracy claims, dark-theme WCAG contrast is a known concern.
  - The 2026-07-10 Next Data Cache incident was in data-ingestion fetch clients, not these pages, but pages consuming stale cached picks/odds timestamps are worth a glance (line-freshness-badge.tsx).

Apply the Universal Rails above. Fixes go on branch grok/frontend. Findings per the
output contract: max 10 ranked findings, max 3 patches per reply, end with the
could-not-verify list and the one-line domain verdict.
```

## Shard 11 — Types package & weakest-test hunt  ·  branch `grok/types-tests`  ·  ~4,300 LOC

> **Size note:** this shard is large. If the conversation strains, run it as TWO conversations: files 1–7 first, then files 8–13 (repeat the rails + mission header in each).

```
MISSION (shard: types-tests): audit "Types package & weakest-test hunt" — these files and ONLY these files
(fetch individually from https://raw.githubusercontent.com/Beexly/Sports/main/<path>):

   1. packages/types/src/index.ts
   2. packages/types/src/ladder.ts
   3. packages/types/src/heartbeat.ts
   4. packages/types/src/__tests__/entitlements.test.ts
   5. packages/data-ingestion/src/context-enrichment.ts
   6. packages/data-ingestion/src/config.ts
   7. apps/web/lib/cron/authorize.ts
   8. workers/airwave-listener/src/dry-run.ts
   9. apps/web/lib/api-auth/index.ts
  10. apps/web/lib/api-auth/quota-window.ts
  11. apps/web/lib/cache/public-read-model-policy.ts
  12. packages/prediction-engine/src/index.ts
  13. packages/prediction-engine/src/scoring.ts

READ FIRST (hotspots, in this order):
  - packages/types/src/index.ts
      743-line grab-bag containing runtime logic (getEntitlements paywall matrix, computePickGrade) not just types; only a 117-line test covers it — entitlement bugs here become server-side paywall bugs everywhere
  - packages/data-ingestion/src/context-enrichment.ts
      570 LOC with ZERO tests — largest untested file feeding the prediction engine; violates the 'no stale/fake data' rules if enrichment is wrong
  - apps/web/lib/cron/authorize.ts
      authz gate for cron/job endpoints with no dedicated test — a bypass lets anyone trigger jobs
  - packages/types/src/ladder.ts
      pricing-ladder (FOUNDING→AUTHORITY) types/constants shared across billing; no test in the types package itself — drift vs pricing-phases.ts is a money-path risk
  - packages/data-ingestion/src/config.ts
      137 LOC untested config/env parsing for the ingestion layer (Odds API keys, freshness settings) — silent misconfig = stale data
  - workers/airwave-listener/src/dry-run.ts
      187 LOC untested worker entry path — dry-run vs live behavior divergence risk

OVERSIZED (>700 lines — fetch each alone, never alongside other files):
  - packages/types/src/index.ts
  - packages/prediction-engine/src/scoring.ts
  - packages/prediction-engine/src/index.ts
  - packages/prediction-engine/src/game-context.ts

DOMAIN CONTEXT:
  - Test coverage is unusually broad overall (440 test files in apps/web/__tests__, ~70 in prediction-engine), so the weakest links are the exceptions above.
  - Money/honesty paths (stripe-webhook-route, pricing-phases, scraping-clearance, entitlements-enforcement, calibration) all HAVE dedicated tests — skip them for the under-tested hunt; they belong to other domains.
  - packages/types has exactly one test file (entitlements.test.ts, 117 lines) for 964 LOC of source, and index.ts mixes runtime logic with type defs.
  - apps/web/lib/api-auth/* files are tiny (1-31 LOC each, likely stubs) — worth a quick look for placeholder rate-limit.ts (1 line).
  - Known context: the 2026-07-10 Next Data Cache incident touched data-ingestion fetch clients, making the untested context-enrichment.ts/config.ts extra relevant.

Apply the Universal Rails above. Fixes go on branch grok/types-tests. Findings per the
output contract: max 10 ranked findings, max 3 patches per reply, end with the
could-not-verify list and the one-line domain verdict.
```

## Shard 12 — Underused-asset verification  ·  branch `grok/underused`  ·  ~4,300 LOC

> **Size note:** this shard is large. If the conversation strains, run it as TWO conversations: files 1–9 first, then files 10–18 (repeat the rails + mission header in each).

```
MISSION (shard: underused): audit "Underused-asset verification" — these files and ONLY these files
(fetch individually from https://raw.githubusercontent.com/Beexly/Sports/main/<path>):

   1. packages/prediction-engine/src/clv-capture.ts
   2. packages/prediction-engine/src/clv.ts
   3. apps/web/lib/tracker/clv.ts
   4. apps/web/lib/intelligence/clv-calibration.ts
   5. apps/web/lib/content-engine/templates.ts
   6. apps/web/lib/content-engine/build-draft.ts
   7. apps/web/lib/content-engine/compliance.ts
   8. packages/data-ingestion/src/kalshi-client.ts
   9. packages/data-ingestion/src/espn-results-client.ts
  10. packages/data-ingestion/src/openfootball-source.ts
  11. packages/data-ingestion/src/nflverse-source.ts
  12. packages/data-ingestion/src/reddit-narrative-source.ts
  13. apps/web/lib/jarvis/memory/actions.ts
  14. apps/web/lib/jarvis/memory/guards.ts
  15. apps/web/lib/jarvis/memory/conflict.ts
  16. scripts/backtest/player-projection-backtest.ts
  17. apps/web/app/api/verify/route.ts
  18. apps/web/lib/proof/load-proof-of-record.ts

READ FIRST (hotspots, in this order):
  - packages/prediction-engine/src/clv-capture.ts
      Core CLV capture logic feeding the proof-gated pricing ladder milestone (verified CLV >=52.4%) — a money/honesty path
  - apps/web/lib/intelligence/clv-calibration.ts
      Largest CLV surface (383 LOC); calibration math errors here corrupt the public track record
  - apps/web/app/api/verify/route.ts
      Public proof-receipt verification endpoint — external trust surface; check hash integrity and what it leaks
  - apps/web/lib/jarvis/memory/actions.ts
      Jarvis memory write path (375 LOC) with guards.ts/conflict.ts gating — check write authz, state transitions, conflict handling
  - packages/data-ingestion/src/reddit-narrative-source.ts
      Rights-sensitive adapter — must respect clearance-engine / source-rights-registry posture (no scraping without clearance)
  - apps/web/lib/content-engine/build-draft.ts
      Content generation from data — check the no-fabricated-stats rule and compliance.ts gating actually blocks unsupported claims

DOMAIN CONTEXT:
  - All files verified to exist; none exceed 700 lines, so nothing needs individual fetching.
  - lib/statking/backtesting/index.ts is a 1-line stub ('foundation' status) — skip it; the real backtest harness is scripts/backtest/player-projection-backtest.ts plus eval/edge-lab/run-clv-report.ts.
  - Proof receipt DB support is in migration 20260622173000_add_pick_proof_receipt; hash helper is apps/web/lib/performance/proof-hash.ts (32 LOC).
  - Extensive test coverage exists (packages/*/src/__tests__ and apps/web/__tests__ clv-*.test.ts) — use it to check claimed vs actual behavior.
  - Known context: a 2026-07-10 Next Data Cache incident touched data-ingestion fetch clients, so pay attention to fetch caching options (cache/revalidate) in the ESPN/kalshi/nflverse/openfootball clients.
  - CLAUDE.md rules: no fake data, freshness validation, and rights-gated scraping (reddit source must carry RightsSnapshot via clearance engine).

Apply the Universal Rails above. Fixes go on branch grok/underused. Findings per the
output contract: max 10 ranked findings, max 3 patches per reply, end with the
could-not-verify list and the one-line domain verdict.
```


## Coverage map (so nothing falls through shard boundaries)

The 12 shards jointly cover: money (1, 6), data truth (2, 3, 5), public honesty (4, 7, 10),
operations (8, 9), quality substrate (11), and unrealized value (12). Cross-shard seams an
auditor should not assume someone else owns: entitlement checks inside cron routes (1×2),
calibration values rendered by frontend (3×10), Prisma query shapes in API routes (4×5).
If a finding sits on a seam, file it in the shard you found it from and name the seam.

## After all 12 shards

Collect every per-shard report into docs/ops/GROK_SHARD_AUDIT_REPORT_<date>.md, merge the
underused-asset tables, and rank the combined findings CRITICAL → SMALL. Small PRs merge
first. Anything touching readiness gates, pricing, or public claims gets founder eyes
line-by-line regardless of CI status.
