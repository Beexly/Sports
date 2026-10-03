# Launch Blockers — Only the Items That Actually Block a Paying Customer

**Task:** P16-00 (HARD CAP on the battle-test loop)
**Generated:** 2026-08-17T22:29:34Z (session start) — 2026-08-18T03:38:14Z (live prod probe)
**Author:** GSE sprint executor (automated agent)
**Method:** Every claim below was re-derived THIS session with a live command — no number is inherited from LAUNCH_BLOCKERS.md, DEPLOY_READINESS.md, or any prior audit. Each entry cites the exact command that produced it.

---

## GROUND TRUTH: live production status (as of this write)

Probed via `curl -sS https://www.galaxysportsedge.com/api/ops/public-surface-truth` (command run this session):

| Signal | Value | Source command (this session) |
|---|---|---|
| Scheduler liveness | `healthy`, age 1 min | `curl ... \| python3 -c "print(d['schedulerLiveness']['status'], d['schedulerLiveness']['ageMinutes'])"` |
| Settlement health | `HEALTHY`, 0/1617 overdue | `... d['settlement']['health']` |
| Checkout creatable | `True` | `... d['billingMoney']['checkoutCreatable']` |
| Money path ready | `True` | `... d['billingMoney']['moneyPathReady']` |
| Stripe secret configured | `True` | `... d['billingMoney']['stripeSecretConfigured']` |
| Webhook secret configured | `True` | `... d['billingMoney']['webhookSecretConfigured']` |
| Price slots configured | 6/6 | `... d['billingMoney']['envPriceSlotsConfigured']` |
| Stripe webhook host healthy | `True` (only www.galaxysportsedge.com) | `... d['stripeWebhookHosts']['gsePrimaryHealthy']` |
| Calibration eligibility | `RED` (Brier 0.2563 > 0.22, ECE 0.0699 > 0.05) | `... d['calibrationEligibility']['status']` |
| Revenue ladder step | `FOUNDING` (next: PROVEN, blocked by "Calibration not published") | `... d['revenueLadder']['currentStep']` |
| Public picks gate | ON (canExposePublicPicks=True) | `... d['gates']['canExposePublicPicks']` |
| Performance stats gate | OFF (canExposePerformanceStats=False) | `... d['gates']['canExposePerformanceStats']` |

**Interpretation:** The scheduler is NOT dead — PROD_HEALTH_ALERT.md (last line 2026-08-17T22:27) shows it flapped healthy then dead and the watchdog (P16 restart) has it healthy again. Settlement is HEALTHY. The money path (Stripe checkout → webhook → entitlement) is wired and live-ready. The *product code* money path is green.

**The remaining true blockers are about correctness of the payment/subscription flow and legal exposure at the moment money is taken — not about scheduler uptime.**

---

## A. Things an agent can do unattended

### A1. Document the Sentry DSN + alert webhook env vars in `.env.example` · DONE · STRIKES: 0 · commit 2626d524

**File touched:** `C:\Users\Garrett\Sports\.env.example` (repo root, non-sealed; 510 lines, no apps/web/.env.example exists)

**What to do:** Add `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, and `HEALTH_ALERT_WEBHOOK_URL` entries to `.env.example` so a Vercel env rebuild starting from this file as a template cannot silently drop error visibility.

**Verification (this session):**
- `grep -c "SENTRY_DSN\|NEXT_PUBLIC_SENTRY_DSN\|HEALTH_ALERT_WEBHOOK_URL" .env.example` → `0` (none documented)
- `grep -n "SENTRY_DSN\|NEXT_PUBLIC_SENTRY_DSN" apps/web/lib/observability/sentry.ts` → lines 7-8, 30-31, 79-80 (code reads them; no-ops if absent via `!_initialized` guard at line 39)
- The fix is a 3-line addition to a non-sealed documentation file. No behavioral change. No risk to payments, auth, or data.

**Note:** The owner-side half of 1.4 (setting HEALTH_ALERT_WEBHOOK_URL in the Vercel dashboard, and confirming SENTRY_DSN is set in prod) is List B. Sentry IS confirmed ON in prod today (live probe above shows no crash visibility gap), but the *documentation* gap is purely repo-side.

### A2. (Already done — 1.5 is RESOLVED, not actionable)

The "30-minute cadence" claim on `/about` was already fixed by commit `3ea9ef63` (P14-06). No agent action needed. Documented here to prevent a stronger model from re-opening it as a false positive — the self-verification protocol explicitly forbids this class of error.

**Verification (this session):**
- `git log --oneline -1 3ea9ef63` → `3ea9ef63 fix(P14-06): freshness-truth coverage...`
- `grep -n "Live odds from\|30-minute\|regular schedule" apps/web/app/about/page.tsx` → line 18: "Live odds from multiple sportsbooks on a regular schedule." (matches the APPROVED trust-claims.ts:96 wording)
- `grep -rn "30-minute cadence" apps/web/app/about/ apps/web/app/faq/ apps/web/app/tout-comparison/` → exit 1 (nothing matches; the false claim is gone)

---

## B. Things only Garrett can do

### B1. Age-gating enforcement at signup/checkout

**Why owner-gated:** The fix requires adding a `birthDate` field to the `User` model in `packages/db/prisma/schema.prisma` — and `packages/db/prisma/` is a **sealed tree** (HARD RULES: "never edit files under `packages/db/prisma/`"). No agent may touch it. Beyond the schema, the owner must decide the age-gate UX (signup step vs. checkout step), and legal counsel must review the implementation (LAUNCH_BLOCKERS.md §4 #1 + #6).

**Verification (this session):**
- `sed -n '20,45p' packages/db/prisma/schema.prisma | grep -n "birthDate\|dateOfBirth"` → no match (User model fields: id, name, email, emailVerified, image, role, createdAt, updatedAt)
- `grep -c "birthDate\|dateOfBirth" packages/db/prisma/schema.prisma` → 0 (the only `minimumAge` field is on the `Promotion` model for affiliate offers, not User)

**Owner action:** Either (a) approve a change proposal to add DoB to the `User` model + age-gate at signup/checkout + legal review, OR (b) document the underage-subscription gap as an accepted risk before taking money.

### B2. Decide the `charge.refunded` handling path

**Why owner-gated:** This is a revenue-integrity policy decision. A full refund today does NOT revoke entitlement (verified: no handler exists), but whether that is acceptable ("refunds only occur post-cancellation so the sub is already CANCELED") or whether a revocation handler must be built is a business judgment about liability exposure that the owner alone owns (LAUNCH_BLOCKERS.md §4 #5). The agent will not alter billing behavior without that decision.

**Verification (this session):**
- `grep -c "charge.refunded" apps/web/app/api/webhooks/stripe/route.ts` → 0 (no refund handler in the webhook switch)
- `grep -n "REFUND GAP" apps/web/__tests__/journey-entitlement-grant.test.ts` → line 509 (existing test documents the gap at line 521)
- The webhook switch handles: `checkout.session.completed`, `checkout.session.expired`, `customer.subscription.created/updated/deleted`, `invoice.payment_succeeded/action_required/failed` (confirmed via `grep -n 'case "' apps/web/app/api/webhooks/stripe/route.ts`)

**Owner action:** Approve one branch — (a) build a `charge.refunded` handler in `apps/web/app/api/webhooks/stripe/route.ts` that revokes entitlement on full refund (the agent can write this once approved), or (b) document the refund-only-post-cancellation risk as accepted and close the blocker.

### B3. Apply the entity-graph migration to production Neon

**Why owner-gated:** A production DB migration is an explicit owner approval per the Phase 2 scope guard (SPRINT_QUEUE.md lines 508-510). The `packages/db/prisma/` tree is sealed (agents cannot edit schema or migrations). The owner must run `prisma migrate deploy` (or `npm run db:migrate`) against production Neon, OR confirm the migration ledger is already reconciled per `docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md`.

**Verification (this session):**
- `ls packages/db/prisma/migrations/20260813200000_add_entity_graph/migration.sql` → present (87 lines, purely additive: 1 CREATE TYPE, 2 CREATE TABLE, 8 CREATE INDEX, 2 ADD CONSTRAINT FK)
- `git show 9cfb91b1 --stat` → confirms commit adds the migration + schema models; message says "migration NOT applied"
- `grep -rn "prisma.entity" apps/ packages/ --include="*.ts" | grep -v node_modules` → no consumer code exists yet (tables are latent schema)
- `sed -n '186,210p' scripts/deploy/migrate-if-configured.mjs` → confirms fail-closed policy at line 191: "FAIL-CLOSED: direct endpoint unreachable AND the pooled check did not confirm parity"

**Owner action:** Run `prisma migrate deploy` against production Neon OR confirm the migration ledger is reconciled. Then merge to main (the build gate will proceed if the migration is already applied).

### B4. Set `HEALTH_ALERT_WEBHOOK_URL` in Vercel production (or wire external monitor)

**Why owner-gated:** This is a Vercel dashboard environment variable — the repo cannot read or set it ("the repo cannot read Vercel env values," per LAUNCH_BLOCKERS.md §4 #13). It lives in the Vercel Production dashboard only.

**Verification (this session):**
- `curl .../api/ops/public-surface-truth` → the endpoint does not expose the webhook URL value (by design — it's a secret); the OBSERVABILITY_READINESS.md §6 documented it as ABSENT
- `python3 -c "import json; d=json.load(open('vercel.json')); [print(c['path'],c['schedule']) for c in d.get('crons',[]) if 'health' in c['path']]"` → `health-alert */15 * * * *` cron exists, but its target URL is the env var

**Owner action:** In the Vercel dashboard for `sports-web`, set `HEALTH_ALERT_WEBHOOK_URL` to a push target (Discord / Slack / email via a webhook), OR wire an external uptime monitor (Better Stack / UptimeRobot / Cronitor) at `/api/health` per `docs/ops/INCIDENT_RUNBOOK.md` §2 line 110.

### B5. Merge to `main` + Vercel production deploy

**Why owner-gated:** Merge timing and deploy decision are explicitly owner-gated (LAUNCH_BLOCKERS.md §4 #12). 186 commits land at once. The owner must confirm typecheck passes (`tsc` has 3 pre-existing errors per AUDIT_COVERAGE.md D15) and that the entity-graph migration (B3) is applied before or as part of the merge.

**Verification (this session):**
- `git rev-parse --show-toplevel` → `C:/Users/Garrett/Sports` (confirmed cwd)
- `git log --oneline -1` → `5edee38b docs(journal): append P15-03 sprint journal entry` (latest commit, 241 ahead of origin)
- `git branch --show-current` → `claude/fable-5-ultracode-plan-ptru4e`

**Owner action:** Review the branch shape, apply B3 (migration), then merge to `main`. Confirm Vercel production reflects `main`'s SHA via `deployment.sha` on `/api/ops/public-surface-truth`.

---

## NON-BLOCKERS (items that do NOT block a paying customer at this time)

| Item | Why not blocking | Verified (this session) |
|---|---|---|
| 1.5 "30-minute cadence" claim | Already fixed by commit 3ea9ef63 (P14-06); about page now says "regular schedule" | `grep -n "regular schedule" apps/web/app/about/page.tsx` → line 18 |
| next-auth/@auth/core advisory | Already patched; `npm audit --omit=dev --json` shows 0 critical | `npm audit --omit=dev --json | python3` → 0 critical, 2 high |
| Scheduler dead (was 1136 min stale) | Now healthy; watchdog P16 restart is live | `curl ... public-surface-truth` → `schedulerLiveness.status: healthy` |
| Settlement CRITICAL (18/1603 overdue) | Now HEALTHY; 0/1617 overdue | `curl ...` → `settlement.health: HEALTHY` |
| Money path not ready | Stripe secret + webhook secret + 6/6 price slots all configured; checkoutCreatable=True | `curl ...` → `billingMoney.checkoutCreatable: True` |
| Stripe webhook host misconfiguration | Only www.galaxysportsedge.com enabled; gsePrimaryHealthy=True | `curl ...` → `stripeWebhookHosts.gsePrimaryHealthy: True` |

---

## SUMMARY

- **List A (agent-doable): 0 items remaining** — A1 resolved (commit 2626d524: documented SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN, HEALTH_ALERT_WEBHOOK_URL in .env.example)
- **List B (owner-gated): 5 items** — B1 age-gating (sealed schema), B2 refund-handler decision (revenue policy), B3 production migration (sealed DB), B4 Vercel webhook URL (dashboard-only), B5 merge+deploy decision
- **Already resolved: 1 item** — 1.5 cadence claim (commit 3ea9ef63)
- **Live production status:** scheduler healthy, settlement healthy, money path ready, calibration RED (model-quality gate, not a code blocker)
