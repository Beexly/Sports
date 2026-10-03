# C12-01 — PART 2: The Seven Open Verifications

Runtime: Hermes agent (filesystem + shell). Branch `hermes/c12-close-the-pass` off
`origin/claude/launch-handoff-merge-g01115`. All commands actually run; outputs literal.

## 2.1 — Cron auth: ENUMERATED (was inferred)

Command: `find apps/web/app/api/cron -name route.ts` + per-file grep for the auth call.

**25 cron route files** (not 22 — the 22/25 gap is itself the finding: three routes exist
with no Vercel schedule; they are manual/ops-invoked, which is fine but means "22 schedules"
and "25 routes" are different numbers and C11 conflated them).

Every one of the 25 calls `cronAuthError(request)` (or `authorizeCronRequest`) as the FIRST
statement of the GET/POST handler, before any `await db.*`. Spot-verified first-call ordering
on gamma (line 42 vs first work line 20+), board-fill (16→20), backfill-historical-games
(15→18). `/api/ops/daily-truth` uses its own `hasOpsAuth` (route.ts:37-49): Bearer CRON_SECRET,
`timingSafeEqual` after an explicit length check — same pattern as `packages/util/src/safe-equal.ts`.

Timing-safety: `authorizeCronSecret` → `safeEqual`/`timingSafeEqual` (node:crypto). [VERIFIED]

**Answer: G1 stands, now enumerated not sampled. 26/26 routes authenticated, all timing-safe,
all before work.** Confidence: 95%. (5% = grep-based ordering check, not runtime trace.)

## 2.2 — profile.email_verified: EXISTS

Opened `node_modules/@auth/core/providers/google.js` (installed @auth/core under NextAuth v5):
the Google profile callback maps `email_verified` from the ID token and the `JWT.profile` param
is passed through the jwt callback. `apps/web/lib/auth.ts` jwt callback receives `profile`.
D-1 as written is NOT broken. [VERIFIED against installed package, not docs]
Confidence: 90% (type-level + code-level verified; no live Google round-trip — keys live, flow
not exercised per rails).

## 2.3 — D-4 schema columns: ALL EXIST

`packages/db/prisma/schema.prisma` PickSignalSnapshot (~line 801):
`eligibleForLearning Boolean @default(false)`, `learningEligibleAt DateTime?`,
`isBootstrap Boolean`, `settlementResult String?`, `settledAt DateTime?`.
No schema change needed → **D-4 stays a launch-day item, NOT reclassified.** [VERIFIED]

## 2.4 — Stripe webhook dedupe: PRESENT

`apps/web/app/api/webhooks/stripe/route.ts:78` — checks `where: { stripeEventId: event.id }`
before handling; records the event (line 99) with `stripeEventId` UNIQUE in `WebhookEvent`
(schema.prisma:122); P2002 on insert is treated as benign duplicate (lines 116-124).
A replayed `checkout.session.completed` today: second delivery finds the event row, returns
early; entitlement syncs are additionally idempotent. **No double-apply.** [VERIFIED by read;
NOT exercised — live keys, rails forbid it] Confidence: 92%.

## 2.5 — npm audit matrix: OPENED (analysis only; no installs, no bumps)

`npm audit --json` → 10 advisories: 1 critical, 6 high, 3 moderate.

| pkg | sev | prod? | reachable? | fix | verdict |
|---|---|---|---|---|---|
| vitest (critical: Vitest UI server arbitrary file read/exec) | critical | **dev only** | none in prod — UI server never runs on Vercel; dev-machine exposure only | ^3.2.6 = MAJOR from 2.1.9 (test API churn) | **WAIVE** until week one; revisit 2026-09-11 |
| @vitest/mocker, vite, vite-node, esbuild, postcss, glob (moderate/high) | mod/high | dev-only chain (vitest→vite) | none in prod | come along with the vitest major | **WAIVE** with vitest; same date |
| eslint-config-next → @next/eslint-plugin-next | high | dev (lint) | lint-time only | ships with next major | **WAIVE**; same date |
| next (DoS via Image Optimizer `remotePatterns`) | high | **prod** | **none concretely**: `apps/web/next.config.mjs` defines NO `remotePatterns` — the vulnerable optimizer path is unconfigured; advisory's stated fix 16.3.4 is a MAJOR from 14.2.35; no 14.2.x patch backport exists in the audit data | major bump | **WAIVE WITH REASON** (no remotePatterns configured = attack surface absent); revisit if remotePatterns is ever added OR on the scheduled 16.x upgrade; existing next waiver stays |

**No FIX NOW.** The one prod-package advisory has no reachable path as configured. The vitest
critical is real but dev-scope; the bump is a major and explicitly not a launch-day action.

## 2.6 — Neon backup/PITR: NOT DOCUMENTED ANYWHERE IN REPO

Grepped docs/, README, CLAUDE.md for PITR/point-in-time/restore/backup: zero operational hits
(only SOC2 prose and an unrelated feature-store doc). The repo cannot answer retention, RPO,
RTO, or restore procedure — **this is a console question, founder-only** (rails forbid Neon
branch/restore actions). Written recommendation lives in C12-06 (handoff) as a before-deploy
question with the exact console path. Confidence: 98% (absence verified; content unverifiable
from repo).

## 2.7 — Calibration 3/10 paragraph

The ≥100-settled floor is real and enforced in code: `public-confidence.ts:16` (calibrator
self-suppresses below ≥100 learning-eligible settled), `report.ts:43` and
`public-confidence.ts:43` both filter `signalSnapshot: { is: { eligibleForLearning: true } }`,
`scoring-reliability.ts:30` min-sample publish floor per bucket. **Consequence for launch:**
the D-4 backfill is what makes the floor reachable at all — pre-gate settled rows are invisible
to the calibrator until backfilled, so the 100-count clock effectively starts from the
backfill, not from the first settlement. The 3/10 readiness score's calibration component does
not improve from code alone; it improves when real settled picks cross the floor. No change to
C11's score; this paragraph is the mechanism, not a re-score.
