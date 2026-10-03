# Launch Blockers — The Single Document the Owner Reads Before Deciding to Launch

**Phase:** 9.5 — Launch Blockers: The Three Una udited Axes
**Source:** consolidated from every Phase 9.5 artifact + `handoff/DEPLOY_READINESS.md`
**Auditor:** GSE sprint executor (automated agent, non-lawyer, non-accountant)
**Date:** 2026-08-16
**Method:** read-only analysis only — every item below traces to a finding produced by a real task (a handoff/*.md report, an audit, a test suite, or a direct commit). No claim here is an assumption.

---

## 0. How to read this

This file is the single document the owner reads before deciding to launch. It is structured three ways:

1. **BLOCKING** — cannot ship without it. Sorted by revenue- or trust-loss if shipped without it (top = worst), not by technical severity.
2. **RISK ACCEPTED** — can ship, but the owner should knowingly accept it.
3. **POST-LAUNCH** — genuinely can wait.

Then: **ONLY THE OWNER CAN DO THESE** — short, specific owner-gated actions (legal sign-off, production keys, real test purchase, merge/deploy decision, launch timing).

A finding is BLOCKING only if it traces to a real task result. Perfectionism that pads the blocking list has a real cost: the owner is losing revenue every day the site is unlaunched. The line between "blocking" and "risk accepted" is whether the owner would say "I did not sign up for this exposure" if a paying customer were harmed by it.

---

## 1. BLOCKING — cannot launch, sorted by revenue/trust lost if shipped

### 1.1 [BLOCKING] Age-gating absent at signup/checkout — a subscriber can be underage

**Traces to:** P9.5-07 `handoff/LEGAL_SURFACE_AUDIT.md`, §8 (verdict ABSENT), lines 290-305.
**Evidence:**
- `packages/db/prisma/schema.prisma:2062` — `minimumAge Int @default(21)` exists only on the `Promotion` model (sportsbook affiliate offers), **not** on the `User` model.
- `User` model (schema.prisma:23-44) has `name, email, emailVerified, image, role, createdAt, updatedAt` — **no birthDate/dateOfBirth field** (verified by grep across `apps/web/app/auth/`, `apps/web/app/checkout/`, `apps/web/lib/auth/`, `apps/web/lib/billing/`, schema.prisma).
- No age-gate checkbox, modal, or interstitial at `/auth/signin` or at the checkout API (`apps/web/app/api/subscriptions/checkout/`).
- No middleware enforcing age before subscription creation.
- The Terms state the age requirement (`terms/page.tsx:63-71`) but enforce nothing.

**Why BLOCKING (trust + regulatory):** GSE is a sports-adjacent paid product. A paying subscriber who is underage (or who never confirms age) is a regulatory exposure the owner did not sign up for, and the Terms alone are not an enforcement mechanism. This is the product's own doctrine (P9.5-07: "This is a LAUNCH BLOCKER per GSE's own doctrine").

**Specific fix:** Add a DoB/age field to the `User` model + a required age-gate step in the signup and checkout flows, enforced server-side before Stripe checkout session creation. Schema + auth flow change → change proposal required.

---

### 1.2 [BLOCKING] Charge refunds do not revoke entitlement

**Traces to:** P9.5-06 `handoff/SPRINT_JOURNAL.md` (2026-08-16T03:34:00Z), and the existing entry in this file at §REFUND GAP.
**Evidence:**
- `apps/web/app/api/webhooks/stripe/route.ts` handles `customer.subscription.*` and `invoice.*` events, but has **no `charge.refunded` handler**.
- P9.5-06 added 6 entitlement tests (full suite: 12 P9.5-05+06, 52 existing stripe-webhook tests → 58 pass). The refund gap is documented in the test coverage gap section of this file: "No existing test exercises `charge.refunded`. The P9.5-06 test suite explicitly does NOT assert a revocation on refund — instead it documents the gap."
- Real behavior (verified by test): `customer.subscription.deleted` → downgrades to FREE/CANCELED (correct); `cancel_at_period_end` → sub stays ACTIVE until Stripe's `deleted` event (correct, Stripe lifecycle); `invoice.payment_failed` → PAST_DUE + 7-day grace (correct); `charge.refunded` → **not handled** (no revocation).

**Why BLOCKING (revenue integrity):** A full refund — which can occur after cancellation or in dispute resolution — leaves the member with paid-tier access in the DB until the subscription row changes on its own schedule. No entitlement is *granted* by the refund path (so it is not a security hole), but it is a revenue-integrity risk: the owner is paying for a revocation that doesn't happen.

**Specific fix:** Add a `charge.refunded` handler in `route.ts` that (1) retrieves charge metadata for userId/customerId, (2) if full refund → tier→FREE, status→CANCELED, canceledAt→now(), (3) if partial → tier downgrade only or log for manual review. OR: if refunds only occur post-cancellation (sub already CANCELED when the refund arrives), document this as an accepted risk and close the blocker. A test exercising `charge.refunded` → revocation is required for closure.

---

### 1.3 [BLOCKING] Entity-graph migration is unapplied — merging to main can fail the production build

**Traces to:** `handoff/DEPLOY_READINESS.md` §2, §5.1, §6 (commit `9cfb91b1`).
**Evidence:**
- Commit `9cfb91b1`: adds two Prisma models (`EntityType`, `Entity`, `EntityEdge`) to `packages/db/prisma/schema.prisma` (lines 3814-3904) and an additive migration `packages/db/prisma/migrations/20260813200000_add_entity_graph/migration.sql` (87 lines: 1 CREATE TYPE, 2 CREATE TABLE, 8 CREATE INDEX, 2 ADD CONSTRAINT FK; zero ALTER/DROP/backfill).
- The commit message explicitly says **"migration NOT applied"**; the Phase 2 scope guard (SPRINT_QUEUE.md lines 508-510) confirms: "a DB migration requires explicit owner approval before `db:migrate deploy`."
- `vercel.json` (line 3) build command runs `node scripts/deploy/migrate-if-configured.mjs`, which runs `prisma migrate deploy` in production context (`migrate-if-configured.mjs:236-238`) and **fails closed** on DB errors (`lines 22-34`).
- `git diff --name-only origin/main..HEAD` shows the migration file is new to this branch (origin/main does not contain it).

**Why BLOCKING (availability):** If the migration is not already applied to the production Neon database, the Vercel build-time `migrate deploy` step will either apply it (if DB is reachable) or fail the production build (by design — fail-closed, the #70 outage class). Merging without resolving this risks a broken deploy. The code itself doesn't read the new tables yet, but the build gate is strict.

**Specific fix (owner-only):** Run `prisma migrate deploy` (or `npm run db:migrate`) against production Neon first, OR confirm the production migration ledger is already reconciled via `docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md`. Nothing in this branch auto-applies it correctly in the owner's absence because it requires the owner's explicit sign-off per the scope guard.

---

### 1.4 [BLOCKING] No error visibility if Sentry DSN is absent in production — currently unverified from repo

**Traces to:** P9.5-09 `handoff/OBSERVABILITY_READINESS.md`; INCIDENT_RUNBOOK.md §9.
**Evidence:**
- `apps/web/lib/observability/sentry.ts` reads `SENTRY_DSN` (server) / `NEXT_PUBLIC_SENTRY_DSN` (client); if neither is set, it is a **clean no-op** (`captureError` is guarded by `!_initialized`; the code only logs `observability: not wired (no DSN)`).
- `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` are in `.env.local` but **NOT documented in `apps/web/.env.example`** (OBSERVABILITY_READINESS.md §2, lines 73-82). Any Vercel env rebuild starting from `.env.example` ships without a Sentry DSN → zero error visibility.
- P9.5-09's §6 (2026-08-16, boolean-only Vercel env check, no values displayed): `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` **ARE** set in Vercel production (confirmed by a boolean check of Vercel env, not a value read). So Sentry IS live today. **However:** `board-fill` route did NOT call `captureError` before the fix in `2db4b9a3`; it now reports failures to Sentry.
- The `health-alert` cron (`*/15 * * * *`) is the only repo-level alert delivery; it POSTs to `HEALTH_ALERT_WEBHOOK_URL` **if set** — confirmed ABSENT in Vercel production (OBSERVABILITY_READINESS.md §6). So degraded health is detectable (`/api/health` 503) but not push-delivered except via Sentry for crashes.

**Why BLOCKING (operational):** The launch gate (P9.5-09) is "errors are visible in prod." Sentry is confirmed ON in prod today, but the DSN is undocumented in `.env.example`, so a new Vercel environment or env rebuild could silently drop it. Combined with the absent webhook URL, the "3 AM board stop" scenario (OBSERVABILITY_READINESS.md §3) only surfaces via Sentry (crash visibility) — not via a push alert to a human. The repo's own finding: "if the board silently stopped refreshing at 3am, the answer is: nothing surfaces to a human automatically" when DSN + webhook are both unset.

**Specific fix (partly owner, partly repo):** (a) Document `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` in `apps/web/.env.example`; (b) set `HEALTH_ALERT_WEBHOOK_URL` in Vercel production (or wire an external monitor per INCIDENT_RUNBOOK.md §2 line 110: "Point Better Stack / Cronitor / UptimeRobot at `/api/health`"). The Sentry DSN confirm-on-prod is owner-side and already done; the `.env.example` documentation is a repo change.

---

### 1.5 [BLOCKING] Public-claims gap: `/about` asserts a "30-minute odds ingestion cadence" the code does not enforce

**Traces to:** P9.5-08 `handoff/CLAIMS_TRUTH_AUDIT.md` §1 (verdict UNSUPPORTED), DEPLOY_READINESS §RISK (cadence not backed by a constant).
**Evidence:**
- `/about` principle 01 claims: "Live odds from dozens of sportsbooks, ingested on a 30-minute cadence."
- The codebase `TrustClaim` registry (`apps/web/lib/trust-claims.ts:96`) entry `methodology.odds-ingestion` is APPROVED but its `reviewNote` explicitly reads: **"No claim about update frequency in seconds."** The registry refuses to bless a cadence.
- `packages/prediction-engine/src/constants.ts` and `readiness.ts` contain **no `INGESTION_CADENCE` constant or enforced interval**. `loadEngineStory` (`apps/web/lib/engine/load-engine-story.ts`) records `lastSuccessAt` but does not assert a cadence.
- `FORCE_NO_BET_IF_STALE` (default OFF) reads freshness but does not define 30m.

**Why BLOCKING (truth claim, deceptive-advertising risk):** GSE's whole pitch is honesty (P9.5-08 framing). A specific numeric cadence that the code does not enforce is the sort of claim a competitor could challenge as deceptive if ingestion ever drifts slower. The registry already anticipated this by refusing to bless a frequency; the about-page copy contradicts the registry. The product's own doctrine (§11 "no certainty theater / banned-phrase guard") treats false-precision claims as launch-worthy.

**Specific fix:** Replace the "30-minute" figure in `/about` with the registry's approved wording: "We ingest live odds from multiple sportsbooks on a regular schedule and score every available matchup" (`trust-claims.ts`). No numeric cadence is backed by an enforced constant. Copy change only.

---

### ~~1.6 [BLOCKING] next-auth/@auth/core vulnerable advisories~~ — CORRECTED 2026-08-16, ALREADY FIXED, not blocking

**This item was WRONG when written and is removed from BLOCKING.** It relied on `handoff/npm-audit.json`,
a snapshot committed 2026-08-12 (`c766ecb2`) — a full day *before* commit `34182a4b` (2026-08-13,
"fix(security): patch critical auth CVEs") actually patched this exact dependency. Verified directly,
just now: root `package-lock.json` shows `@auth/core: "0.41.3"` (the patched version this item itself
says is the fix target), and a fresh `npm audit --omit=dev --json` run right now shows **zero** hits for
GHSA-7rqj-j65f-68wh, GHSA-8fpg-xm3f-6cx3, or GHSA-xmf8-cvqr-rfgj — all three are resolved. The fresh
audit does show 2 unrelated HIGH advisories (Next.js major-version bump, transitive postcss) — both
already known and already classified owner-gated/change-proposal elsewhere (`REMEDIATION_ROADMAP.md`,
GSE-SEC-059/060/003), out of scope for this doc.

**Lesson:** a read-only audit task read a stale artifact instead of re-running the check live. Applies
directly to Phase 10's "confidently wrong claim" hunt doctrine — this is exactly that bug class, caught
before it reached the owner as a false blocker.

---

## 2. RISK ACCEPTED — can launch, but owner should knowingly accept

### 2.1 [RISK ACCEPTED] Rate limiting covers 40.3% of API routes; no shared (cross-instance) rate counter

**Traces to:** P9.5-11 `handoff/SCALE_LIMITS.md` §2; P9-related `handoff/RATE_LIMIT_COVERAGE.md`.
**Evidence:**
- 176 `route.ts` files under `apps/web/app/api/`; 71 protected (via `consumeRateLimit` / `consumePublicFormRateLimit` / `requirePremiumApiRateLimited` / `rateLimitB2b`); 105 unprotected. Coverage = 71/176 = 40.3%.
- No middleware-based rate limiting (`apps/web/middleware.ts` contains zero rate-limit references — verified).
- The default limiter (`consumeRateLimit`, `apps/web/lib/api/rate-limit.ts:33`) stores buckets in a **module-level `Map`** (`rate-limit.ts:19`) — **per-Vercel-instance memory**. `REDIS_URL` exists in `.env` (`redis://localhost:6379`) but is **not wired** into `rate-limit.ts` (no Redis import or call in that file).
- Consequence: during a spike, Vercel spins up many instances; each tracks its own bucket, so the effective global limit is `per_instance_limit × instances`, not a true ceiling.
- **CORRECTED 2026-08-16 (Opus verification of SCALE_LIMITS.md):** the "no shared counter" framing above is not universal — a durable, cross-instance **Postgres-backed** rate limiter (`PostgresDurableRateLimiter`) is already live in production for `waitlist`, `contests/enter`, `cipher/verify`, `v1/signals`, `v1/probabilities`, and both B2B routes (5-6 of the 71 "protected" routes). The per-instance gap is real for the *rest* of the 71, just not all of them. See `SCALE_LIMITS.md` §9 for the full correction, including two wrong Vercel platform-default numbers (timeout, response cap) elsewhere in that report that materially changed its risk ranking.

**Risk if accepted:** 105 routes (including several anonymous GETs that hit paid APIs or heavy compute — see P9.5-11 §3 list: `/api/brief`, `/api/decision-genome`, `/api/performance`, `/api/dfs/salaries`, `/api/moderation/anonymous-report`, 10 `gse/v1/*` routes, 3 `human/*` routes, etc.) have zero throttle. A distributed attacker or a viral traffic spike can abuse them for DoS or denial-of-wallet.

**Fix if accepted later:** Wire Redis (or a durable store) into the rate limiter before any LLM-backed route goes live; add `consumeRateLimit` to remaining public/unauthenticated POSTs and any LLM surface. Not a code-correctness bug — a defense-in-depth gap.

---

### 2.2 [RISK ACCEPTED] "7 sports" coverage claim is supported by enumeration, but the on-site FAQ may list a count that can drift

**Traces to:** P9.5-08 `CLAIMS_TRUTH_AUDIT.md` §12.
**Evidence:**
- `/pricing` FAQ (line 222) lists the seven leagues explicitly (NFL, NCAAF, NBA, NCAAB, MLB, NHL, MLS) — a fixed enumeration, not a numeric count claim. This is honest by construction (if a league is dropped, the list must be edited).
- `packages/prediction-engine/src/team-rates.ts` `isPoissonValidSport` / `dixon-coles.ts` `isDixonColesValidSport` each enumerate these sport keys.
- This is recorded as SUPPORTED (by enumeration). It is in RISK ACCEPTED only as a maintenance note: any future "N sports" count claim must be backed by an enforced constant, not copy.

---

### 2.3 [RISK ACCEPTED] Privacy Policy lacks a general data-retention schedule and a CCPA "Do Not Sell" opt-out

**Traces to:** P9.5-07 `LEGAL_SURFACE_AUDIT.md` §2.3 (verdict PARTIAL), §2.9 (verdict ABSENT), §2.8 (verdict PARTIAL).
**Evidence:**
- Retention: `privacy/page.tsx:64-69` addresses profile-data deletion ("delete your profile within 30 days") but **does NOT state a general retention period for logs/analytics data**. The draft `docs/legal/PRIVACY_REVIEW_PROFILES_PRESENCE.md:31-34` proposes "messages 12 months, then purge" but is for a not-yet-shipped live-rooms feature.
- CCPA Do Not Sell: `privacy/page.tsx:59` states "We do not sell personal data" but includes **no statutory "Do Not Sell My Personal Information" opt-out link/page** (required by CCPA §1798.135).
- Cookie/tracking-tech: the policy says "we do not use third-party advertising trackers" but describes **no cookie policy or tracking-technology use** beyond that — a PARTIAL gap.

**Risk if accepted:** Below the bar for a full regulatory violation (the product is a paid subscription with minimal tracking and no ad-tech), but a paying customer in a regulated jurisdiction could file a complaint. This is a legal-review item, not a code change.

---

### 2.4 [RISK ACCEPTED] Duplicate community-moderation policy file in `docs/legal/`

**Traces to:** P9.5-07 `LEGAL_SURFACE_AUDIT.md` §10.2.
**Evidence:**
- `docs/legal/COMMUNITY_MODERATION_POLICY.md` (83 lines, "ADOPTED as written policy", complete launch checklist).
- `docs/legal/community-moderation-policy.md` (64 lines, identical core principles, different abbreviated launch sequence).
Two versions of the same policy in the same directory with different content and status.

**Risk if accepted:** Governance hygiene only — a reader may not know which is authoritative. Not a legal defect, but a documentation-consistency issue.

---

### 2.5 [RISK ACCEPTED] The 30-minute odds cadence claim contradiction is editorial, not a performance/win-rate claim

**Traces to:** P9.5-08 `CLAIMS_TRUTH_AUDIT.md` §1, §Overall verdict.
**Evidence:**
- 11 of 12 enumerated claims are SUPPORTED. The one UNSUPPORTED claim (#1, the 30-minute cadence on `/about`) is a specific cadence figure in illustrative copy, not a performance/win-rate claim, and contradicts the product's own approved trust language.
- Precision notes on items 3 ("64% calibrated confidence") and 5 (Edge Index) are terminological, describing the system's intent, not a false public-facing number — the public never sees the raw confidence number (calibration adjustments are OFF by default, `platform-config.ts:174`).

**Risk if accepted:** Low. A specific cadence figure that ingestion might not hold. Recorded here as accepted-editorial only because the headline (trust claims) is otherwise sound.

---

### 2.6 [RISK ACCEPTED] Large single merge to main (186 commits)

**Traces to:** `handoff/DEPLOY_READINESS.md` §RISK ACCEPTED #1, §5.1.
**Evidence:**
- Per `docs/ops/DEPLOYMENT_TIMELINE_2026-08-07.md` (lines 1-26), a single large merge is realistic but carries rollout risk. The same doc records `6c9c848` failing with a TypeScript error: `'RUN_GENERATE_DRAFTS' does not exist in type Partial<Record<AutonomyActionKind, string>>'`.
- `TYPE_LINT_DEBT.md` (P7-06) shows residual type/lint debt.

**Risk if accepted:** A merge-time type mismatch could fail the production build (the `check-deploy-readiness.mjs` gate runs at build time). The owner should confirm the latest commit on this branch typechecks before merging.

---

### 2.7 [RISK ACCEPTED] Stripe Terms-consent ordering + canonical-host configuration

**Traces to:** `handoff/DEPLOY_READINESS.md` §RISK ACCEPTED #2, #3.
**Evidence:**
- If `STRIPE_TERMS_CONSENT_ENABLED` is set to `"true"` before configuring the Terms-of-Service URL in the Stripe Dashboard, every new subscription checkout 500s (`CLAUDE.md` lines 101-104, `.env.example` lines 103-117).
- Canonical host must be `www.galaxysportsedge.com`. If `NEXTAUTH_URL`/`NEXT_PUBLIC_APP_URL` are set to the apex instead of `www`, OAuth callbacks and post-checkout redirects break silently.

**Risk if accepted:** Misconfiguration-driven checkout failures. These are owner-actions at deploy time, not code defects.

---

## 3. POST-LAUNCH — genuinely can wait

### 3.1 [POST-LAUNCH] Entity-graph tables have no consumers

**Traces to:** `handoff/DEPLOY_READINESS.md` §POST-LAUNCH #1, §4.
**Evidence:** Commit `9cfb91b1` explicitly states: "Nothing reads these tables yet; the primitive lands before any consumer." Grep for `prisma.entity` / `EntityEdge` in `apps/web/lib` and `packages/`: zero code hits. The `entities`/`entity_edges` tables are latent schema — no behavior depends on them.

### 3.2 [POST-LAUNCH] Public-surface feature flags default to `false`

**Traces to:** `handoff/DEPLOY_READINESS.md` §POST-LAUNCH #2, §4.
**Evidence:** `PUBLIC_PICKS_ENABLED`, `PERFORMANCE_STATS_ENABLED`, etc. are all `false` by default (`.env.example` lines 289-294). The public site renders honest empty states ("Collecting"/"Gated"/"accruing") until the owner opens them deliberately.

### 3.3 [POST-LAUNCH] Shared (cross-instance) rate limiting + full rate-limit coverage

**Traces to:** P9.5-11 `SCALE_LIMITS.md` §8 (gaps), §5 (failure ordering under 10k/hour).
**Evidence:** The repo documents the per-instance in-memory limiter gap and the 105 unprotected routes as known limits, not hidden surprises. Under 10k/hour, the first failure is the per-instance rate limiter + unprotected routes (SCALE_LIMITS.md §7 "what breaks first" rank 1); the second is DB connection exhaustion (no `connection_limit` set). Both are defense-in-depth hardening, not launch gates — they only bite under a real traffic spike or a targeted DoS, and the highest-risk public anonymous routes were already rate-limited in P9-03/P9-04/P9-05 (`consumeRateLimit` + `clientIp` on `clv`, `picks`, `board/state`, `sources/catalog`, `verify`, `verify/slate`, `proof/receipts`, `picks/[id]/audit`).

### 3.4 [POST-LAUNCH] CCPA cookie/tracking-tech policy + log-retention schedule

**Traces to:** P9.5-07 `LEGAL_SURFACE_AUDIT.md` §2.3, §2.8.
**Evidence:** Below the threshold of a trust failure for a paid, minimal-tracking subscription product. These are legal-polish items (cookie section, retention schedule text), not code defects.

### 3.5 [POST-LAUNCH] Duplicate community-moderation policy doc

**Traces to:** P9.5-07 §10.2. Governance hygiene, not a launch blocker.

### 3.6 [POST-LAUNCH] Remove the `DEV_FAKE_ADMIN` escape hatch

**Traces to:** `AUDIT_FINDINGS.md` GSE-SEC-011. Currently hard-gated to `NODE_ENV !== "production"` in BOTH `middleware.ts:82` and `auth.ts:104` (double gate). A post-launch cleanup, not a launch gate.

### 3.7 [POST-LAUNCH] The free `the-odds-api.com` key status is unverified at this instant

**Traces to:** P9.5-00 `ODDS_API_TIER_DECISION.md` §7 (VERIFY) + §8 (independent correction).
**Evidence:** Repo ops docs (`docs/ops/FREE_MODE_INGESTION_HEALTH.md:10`, `docs/ops/CURRENT_STATE.md:11`) state `THE_ODDS_API_KEY` was intentionally deactivated around 2026-07-25, and both `refresh-odds` and `settle-picks` route handlers short-circuit to a zero-credit free path when no key is present. This was NOT checked against live Vercel env vars from the repo (no dashboard access). If the key is currently off, production credit burn is $0 right now and the Business-tier purchase is a "if/when we turn it back on" decision, not an urgent one. **Owner confirmation of live Vercel env state is the gating step.**

---

## 4. ONLY THE OWNER CAN DO THESE

These are short, specific, and explicitly owner-gated. No agent should perform them.

1. **Production DB migration** — Apply the entity-graph migration `20260813200000_add_entity_graph` to production Neon (`prisma migrate deploy` / `npm run db:migrate` against production), OR confirm the migration ledger is already reconciled per `docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md`. This is the Phase 2 scope-guard decision (SPRINT_QUEUE.md lines 508-510); nothing in this branch auto-applies it correctly without the owner's sign-off. → BLOCKING (1.3)

2. **Production env vars** — Set the 17 required Production env vars in the Vercel dashboard (Stripe live keys + webhook secret + price IDs, Google OAuth, Neon `DATABASE_URL`/`DIRECT_URL`, `ANTHROPIC_API_KEY`, `REDIS_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `THE_ODDS_API_KEY`). Per `CLAUDE_OWNER_LAUNCH_HANDOFF.md` §P1. → BLOCKING (deploy cannot proceed without them)

3. **Stripe webhook endpoint** — Confirm the production webhook endpoint at `https://www.galaxysportsedge.com/api/webhooks/stripe` includes `checkout.session.expired` (and that the signing secret matches `STRIPE_WEBHOOK_SECRET`). Per `docs/ops/STRIPE_GO_LIVE_CHECKLIST.md` §3. → BLOCKING-adjacent

4. **Age-gating enforcement** — Either (a) ship the age-gate code (DoB on `User` model + signup/checkout enforcement — a change proposal) and configure legal-age validation at checkout, OR (b) document the underage-subscription gap as an explicitly accepted risk before taking money. → BLOCKING (1.1)

5. **`charge.refunded` handling** — Decide: build the refund-revocation handler in `route.ts` (with a test), OR document "refunds only occur post-cancellation so the sub is already CANCELED" as an accepted risk and close the blocker. → BLOCKING (1.2)

6. **Age-gating at signup/checkout** (legal) — Human legal review of the age-gating implementation once built. The auditor is not a lawyer.

7. **Legal counsel review** — Terms / Privacy / Responsible-Play / CCPA "Do Not Sell" / cookie policy / data-retention schedule. GSE-SEC-001-level advisories aside, the legal surface is PRESENT-but-incomplete (P9.5-07). → RISK ACCEPTED (2.3), escalates to BLOCKING if counsel flags material gaps

8. **Terms-of-service consent ordering** — Configure the Stripe Dashboard Terms-of-Service URL BEFORE setting `STRIPE_TERMS_CONSENT_ENABLED=true` (else every new checkout 503s). → RISK ACCEPTED (2.7)

9. **Canonical host** — Set `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` to `www.galaxysportsedge.com` (not the apex). → RISK ACCEPTED (2.7)

10. **Real test purchase** — Make a real (test-mode, Stripe test card) purchase end-to-end and confirm the member is granted the correct tier, then self-serve-cancel and confirm revocation. → owner-only (never real money / never real cards; Stripe TEST mode + documented test card numbers only)

11. **Confirm `THE_ODDS_API_KEY` live state** — Verify whether the Odds API key is actually on or off in live Vercel production (the repo cannot read Vercel env values). If off, current spend is $0 and the Business-tier purchase is not time-urgent. → POST-LAUNCH-adjacent (3.7)

12. **Merge + deploy decision / timing** — Confirm the latest commit typechecks (residual type debt exists, `TYPE_LINT_DEBT.md`), then merge to `main` and confirm Vercel production reflects `main`'s SHA via `/api/ops/public-surface-truth` → `deployment.sha`. 186 commits land at once. → RISK ACCEPTED (2.6)

13. **Sentry DSN + alert webhook documentation** — Add `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` and `HEALTH_ALERT_WEBHOOK_URL` to `apps/web/.env.example` so a future env rebuild cannot silently drop error visibility. (Sentry is confirmed ON in prod today; this is the documentation fix.) → BLOCKING-doc (1.4)

---

## 5. VERIFY

- **BLOCKING** (5 items — a 6th, next-auth/@auth/core, was corrected out 2026-08-16 as already-fixed; see 1.6): each traces to a real Phase 9.5 artifact or a direct commit (`9cfb91b1`, `cd4e77d6`, `2db4b9a3`) — not an assumption. P9.5-07 (legal, 27 findings), P9.5-08 (claims, 12 claims), P9.5-09 (observability), P9.5-10 (runbook), P9.5-11 (scale), DEPLOY_READINESS.md (DB migration + env contract), P9.5-06 (refund gap), P9.5-05 (entitlement tests).
- **RISK ACCEPTED** (7 items): each is a gap the owner can knowingly accept at launch.
- **POST-LAUNCH** (7 items): each is genuine post-launch work.
- **ONLY THE OWNER CAN DO THESE** (13 items): all owner-gated by nature (legal sign-off, production keys, migration approval, real purchase, merge/deploy, canonical host).
- The BLOCKING list is sorted by revenue-or-trust-loss-if-shipped (top = worst), per the task instruction: "Sort BLOCKING by how much money or trust is lost if shipped without it — not by technical severity." The age-gating gap (1.1) and refund revocation gap (1.2) sit atop because they are customer-harm exposures the owner did not sign up for; the migration gate (1.3) and observability gap (1.4) follow because a failed build or silent error collapse are availability failures; the claims gap (1.5) and the unpatched auth advisories (1.6) are deceptive-advertising/auth-integrity risks that a competitor or attacker could exploit.

> Coverage audit by a non-lawyer. Legal adequacy requires human legal review. This document consolidates findings produced by Phase 9.5 tasks; it does not re-derive them.
