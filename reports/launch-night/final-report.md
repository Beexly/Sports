# Launch Night — Final Report

**Date:** 2026-05-18
**Branch (in repo):** `sports-intelligence-os-phase-9-ci`
**Working folder:** `C:\Users\Garrett\Documents\Claude\Projects\AI Sports`

## What changed

### Routes added/changed

- **Customer**
  - `apps/web/app/dashboard/page.tsx` — win-rate, record, and 14-day stats are now driven by `evaluatePublicPerformancePolicy()`. When the policy blocks performance, the dashboard renders the `dashboard-performance-collecting` notice ("collecting baseline data") and never shows a record/win-rate badge. Bootstrap picks in the recent list are tagged with a `Bootstrap` badge so they cannot be visually confused with canonical results.
- **Admin**
  - `apps/web/app/admin/dashboard/dashboard-view.tsx` — header now links to both `/cockpit` and `/cockpit/history` and explains the split between raw operator console and synthesized Jarvis view.
- **Cockpit**
  - `apps/web/app/cockpit/page.tsx` — top section now renders the full Jarvis Launch Assessment (status badge, one-sentence assessment, sectional health grid, public-performance policy summary, safety warnings, phase warnings, external-config warnings, recommended next actions, phase matrix).
  - `apps/web/app/cockpit/history/page.tsx` — **new** forensic pick ledger (last 100 picks, full per-row eligibility breakdown, filterable by result/bootstrap/eligibility/learning).
  - `apps/web/app/cockpit/layout.tsx` — sidebar nav adds `/cockpit/history` and relabels overview as "Jarvis launch assessment".
- **API**
  - `apps/web/app/api/picks/daily-slate/route.ts` — `recentRecord` is now gated on `canExposePerformanceStats`, closing a leak where a 7-day record could surface on `/picks` while the performance gate was closed.

### Jarvis

- **File:** `apps/web/lib/cockpit/jarvis.ts` (pure synthesizer, no I/O) + `apps/web/lib/cockpit/jarvis-data.ts` (DB loader).
- **Inputs:** readiness gates, public-performance policy, ingestion summary (last attempt/success, recent failures), settlement summary (last settledAt, settled in 24h, pending count), historical pick counts (canonical/bootstrap/pending, W/L/P/V, published/featured), signal coverage (snapshot/signal/data quality), explicit phase-layer manifest, and missing-external-config list.
- **Outputs:** `launchStatus` (`LAUNCH_READY` | `LAUNCH_READY_PENDING_EXTERNAL_CONFIG` | `NOT_READY_DATA` | `NOT_READY_VALIDATION` | `NOT_READY_SAFETY` | `UNKNOWN`), `oneSentenceAssessment`, `confidenceLevel`, sectional health for 11 surfaces, readiness-gate summary, safety warnings, missing-phase warnings, external-config warnings, recommended next actions, and a 9-entry phase matrix.
- **Limitations:** the layer manifest in `jarvis-data.ts` is updated by hand when a phase ships; this is intentional (runtime `fs.existsSync` was rejected as fragile across deploy environments). Ingestion/settlement health is computed from time-since-last with fixed thresholds (`>24h` red, `>6h` amber for ingestion; `>36h` red, `>12h` amber for settlement) and not yet adaptive.

### Historical pick observability

- **Route:** `/cockpit/history`.
- **Data source:** `db.pick` joined to `game.sport` and `signalSnapshot` (eligibleForLearning, isBootstrap, dataQualityScore).
- **Fields rendered per row:** generated/at, matchup, sport, type, selection, line, confidence, grade, risk, model version, bookmaker count, edge score, consensus%, result, settledAt, flags (bootstrap/internal/featured/canonical), public-performance eligibility, learning eligibility, snapshot presence, exclusion reasons.
- **Eligibility rules (in `apps/web/lib/cockpit/history.ts`):**
  - **Excluded** when: performance gate is OFF; `isBootstrap=true`; `isPublished=false`; result is `PENDING`; result is `VOID`; result is settled but `settledAt` is missing.
  - **Learning eligible** only when: snapshot's `eligibleForLearning=true`, pick is canonical, and result is WIN/LOSS/PUSH.

### Readiness / public safety

- `/performance` (page.tsx): already correctly short-circuits to `<PerformanceBootstrapState />` when `canExposePerformanceStats=false`. Verified — no change needed.
- `/dashboard`: **fixed.** Previously computed a raw 14-day record/win-rate; now driven by the public-performance policy.
- `/api/performance`: already gated and bootstrap-excluded — verified, no change needed.
- `/api/picks/daily-slate`: **fixed.** `recentRecord` no longer surfaces when `canExposePerformanceStats=false`.
- `/api/picks`: already gated and bootstrap-excluded — verified, no change needed.
- `/picks` (page.tsx): inherits gating via `/api/picks` 503 + bootstrap filter. No change needed.

### Tests added

- `apps/web/__tests__/public-performance-policy.test.ts` (6 cases).
- `apps/web/__tests__/jarvis.test.ts` (6 cases incl. NOT_READY_SAFETY classification, ingestion-RED, no auto-bet/auto-publish in recommendations, phase matrix shape).
- `apps/web/__tests__/history-eligibility.test.ts` (6 cases).
- `apps/web/__tests__/dashboard-performance-gate.test.ts` (5 source-level invariants for the dashboard, daily-slate, and performance API).

The existing `apps/web/__tests__/cockpit-routes.test.ts` walks `app/cockpit/**` and automatically asserts admin-gating on the new `/cockpit/history` page.

### Docs

- `docs/launch-observatory.md` — full operator-facing map of customer/admin/cockpit surfaces, Jarvis behavior, historical-pick field reference, bootstrap vs canonical, public-performance policy, operator checklist, known limitations, env vars, validation recipe.
- `reports/launch-night/observability-audit.md` — Phase 0 inventory and gap analysis.
- `reports/launch-night/final-report.md` — this document.

## Phase status matrix (deterministic, evidence-based)

| Phase | Status | Evidence |
|---|---|---|
| Phase 1 — Audit/Baseline | implemented | `reports/launch-night/observability-audit.md` |
| Phase 2 — Trust Cleanup | implemented | `apps/web/lib/trust-claims.ts`, `apps/web/__tests__/public-copy-scanner.test.ts` |
| Phase 3 — Performance Gating | implemented | `packages/prediction-engine/src/readiness.ts`, `apps/web/lib/performance/public-performance-policy.ts` (new), gated routes |
| Phase 4 — Promotions | implemented | `apps/web/app/promotions/`, `apps/web/app/cockpit/promotions/`, Promotion model |
| Phase 5 — Daily Brief | implemented | `apps/web/app/brief/`, `apps/web/lib/brief/compose.ts`, DailyBrief models |
| Phase 6 — Calibration | implemented | `apps/web/app/cockpit/calibration/`, `apps/web/lib/calibration/compute.ts`, CalibrationProposal |
| Phase 7 — Cockpit/Admin Dashboard | implemented | `apps/web/app/cockpit/page.tsx` (with Jarvis), `apps/web/app/cockpit/history/page.tsx` (new), `apps/web/app/admin/dashboard/` |
| Phase 8 — Draft-Only Content Engine | implemented | `apps/web/lib/content-engine/`, `apps/web/app/cockpit/content/`, ContentDraft |
| Phase 9 — CI/Deployment Hardening | partial | `.github/workflows/ci.yml` exists (modified); trust/model-freeze/draft-only guardrail scripts referenced in `package.json` but not yet wired into a passing CI gate in this sandbox |

## Validation

Local validation could not be executed inside this sandbox. The blockers are the same ones recorded in the prior-session memory:

- `node_modules/` is partially populated and the sandbox kernel rejects `unlink` on every inode → `npm install`, `npx vitest`, and direct binaries (esbuild segfaults, tsc fails to resolve its own `lib/tsc.js`) cannot run.
- `.git/index.lock` is held and the sandbox kernel rejects `unlink` → `git add` / `git commit` / `git push` cannot run.

Validation status:

| Check | Status |
|---|---|
| `npm run lint` | NOT RUN — sandbox blocker |
| `npm run typecheck` | NOT RUN — sandbox blocker |
| `npm run test` | NOT RUN — sandbox blocker |
| `npm run build` | NOT RUN — sandbox blocker |
| `npm run db:generate` | NOT RUN — sandbox blocker |
| Source-level review | DONE — files inspected via Read; existing route-smoke test auto-covers `/cockpit/history` admin gate; new test files target the policy/jarvis/history/dashboard invariants explicitly |

## Durable repo state

- **Branch:** `sports-intelligence-os-phase-9-ci` (existing — not switched).
- **Commit:** **not created** — `.git/index.lock` blocked from inside the sandbox.
- **PR:** **not opened** — depends on commit/push.

All changes are persisted to the Windows-side filesystem at `C:\Users\Garrett\Documents\Claude\Projects\AI Sports`. The next operator can `git add` / `git commit` / `git push` once the sandbox ACL is cleared with the recipe in `handoff.md §8.11`.

## Remaining blockers (operator must clear before tonight's launch)

1. **Sandbox node_modules / index.lock** — run `handoff.md §8.11` recipe from outside the sandbox:
   ```bash
   rm -f .git/index.lock
   rm -rf node_modules _speedtest
   npm install
   ```
2. **Validation pass** — once node_modules is rebuilt:
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   ```
   Fix any failures before committing. Specific tests added in this pass:
   ```bash
   npx vitest run __tests__/public-performance-policy.test.ts
   npx vitest run __tests__/jarvis.test.ts
   npx vitest run __tests__/history-eligibility.test.ts
   npx vitest run __tests__/dashboard-performance-gate.test.ts
   ```
3. **Commit + push + PR**:
   ```bash
   git checkout -b feature/jarvis-launch-observatory
   git add .
   git commit -m "feat: add Jarvis launch cockpit and historical pick observability"
   git push -u origin feature/jarvis-launch-observatory
   # Open PR into main with the body from this report.
   ```
4. **Data readiness (independent of code)** — even if all checks pass, Jarvis will report `LAUNCH_READY_PENDING_EXTERNAL_CONFIG` or `NOT_READY_DATA` until canonical settled picks accumulate. The operator must:
   - Confirm `THE_ODDS_API_KEY`, `STRIPE_*`, `GOOGLE_*`, `ANTHROPIC_API_KEY` are populated in production env.
   - Run the data refresh worker to seed live ingestion.
   - Wait for at least `minSettledPicksForLearning` (default 25) canonical settled picks before flipping `PERFORMANCE_STATS_ENABLED=true`.

## Exact next operator actions (in order)

1. Open a terminal **outside** the sandbox; clear `.git/index.lock`, wipe and reinstall `node_modules` (recipe above).
2. Run `npm run lint && npm run typecheck && npm run test && npm run build`. Fix any failures.
3. Create branch `feature/jarvis-launch-observatory`, commit, push, open PR into `main` with the body summarized in this file.
4. Deploy to staging. Visit `/cockpit` while signed in as ADMIN; confirm the Jarvis Launch Assessment renders with live data and the launch status reads `LAUNCH_READY_PENDING_EXTERNAL_CONFIG` or better.
5. Visit `/cockpit/history`. Confirm the ledger lists picks with bootstrap/canonical flags and per-row exclusion reasons.
6. Visit `/dashboard` as a non-admin. Confirm record + win-rate are hidden behind the "collecting baseline data" message while `PERFORMANCE_STATS_ENABLED=false`.
7. Visit `/performance`. Confirm bootstrap state, no win-rate claims.
8. Only flip `PERFORMANCE_STATS_ENABLED=true` after the canonical sample reaches the threshold and Jarvis reports `canonicalHistoryStatus=GREEN`.

## Files added/changed (manifest)

**Added:**
- `apps/web/lib/performance/public-performance-policy.ts`
- `apps/web/lib/cockpit/jarvis.ts`
- `apps/web/lib/cockpit/jarvis-data.ts`
- `apps/web/lib/cockpit/history.ts`
- `apps/web/app/cockpit/history/page.tsx`
- `apps/web/__tests__/public-performance-policy.test.ts`
- `apps/web/__tests__/jarvis.test.ts`
- `apps/web/__tests__/history-eligibility.test.ts`
- `apps/web/__tests__/dashboard-performance-gate.test.ts`
- `docs/launch-observatory.md`
- `reports/launch-night/observability-audit.md`
- `reports/launch-night/final-report.md`

**Edited:**
- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/cockpit/page.tsx`
- `apps/web/app/cockpit/layout.tsx`
- `apps/web/app/admin/dashboard/dashboard-view.tsx`
- `apps/web/app/api/picks/daily-slate/route.ts`

Evidence-only. No "should work." No fake launch claims.
