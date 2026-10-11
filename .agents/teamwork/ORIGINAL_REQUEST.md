# Original User Request

## 2026-10-11T20:39:46Z

Comprehensive overhaul of Galaxy Sports Edge (GSE) based on the ASTRA Master Architectural Plan: execute Phases 2 through 5 (surface unification, quant jargon purge, tier restructuring, fantasy/DFS engine deduplication with live projections, and full verification battery).

Working directory: C:\Users\Garrett\Sports-wt-rating-packet
Integrity mode: development

## Requirements

### R1. Surface Unification & Authoritative Board Route
- Consolidate /picks and /board into a single authoritative route /board with navigation labeled "The Board".
- Add a 301 permanent redirect from /picks to /board in next.config.mjs while ensuring /board displays two distinct tabs:
  1. Actionable Signals (all published picks with plain-English factor trails).
  2. Gated & Held Games (transparent pass-discipline showing games where edge < publish threshold).
- Update apps/web/__tests__/board-picks-route-equivalence.test.ts to reflect the single-board architectural consolidation.

### R2. Plain-English Translation (Quant Jargon Purge)
- Purge internal developer quant acronyms (CPOE, WOPR, RYOE, DAKOTA, ANY/A, de-vig, Brier) from all customer-facing cards and components (apps/web/components/picks/pick-card.tsx).
- Replace developer telemetry labels (e.g., literal "JSON" buttons) with clear user-facing language ("View Audit Receipt", "Fair Market Value").
- Ensure npm run lint:brand and positioning vocabulary tests pass 100%.

### R3. Tier Restructuring & Elite Value Engine
- Reconcile the 4-tier matrix (Free, Fantasy, Pro, Elite) across apps/web/lib/pricing/feature-gates.ts, apps/web/app/pricing/page.tsx, and packages/types.
- Lock high-leverage mathematical tools strictly behind the Elite ($99/mo · $799/yr) tier:
  - Multi-Lineup (150-Max) DFS Optimizer
  - Full Situational & Same-Game Parlay (SGP) Correlation Matrix
  - Real-Time Line Steam & Sharp Movement Alerts
  - Personal CLV & ROI Portfolio Dashboard
- Pro ($49/mo) provides Full Slate Betting Signals, Confidence Ratings (NN/100), and Plain-English Reasoning.
- Fantasy ($19/mo) provides live seasonal tools (Start-Sit, Waivers, Draft Assistant, Trade Analyzer).
- Free provides 1 daily teaser pick and public calibration verification.

### R4. Fantasy Data Unification & Zero Mock Policy
- Enforce ZERO illustrative mock data on all production surfaces: connect to real live feeds or render an honest status state (e.g. "NFL Slate locks Tuesday 09:00 AM. Projection engine refreshing").
- Unify data ingestion so /fantasy/dfs and /fantasy/optimizer consume the identical cached projection feed (packages/projections-engine / SUNMON_DFS_CANDIDATES.csv).
- Reconcile /fantasy/gm-ledger to display honest pre-season status or real sync rather than hardcoded fictional demo decisions.

### R5. Complete Verification Battery
- Execute and verify the complete test suite:
  - npm run lint:brand (19 suites, 4,661 tests)
  - npm run guard:trust (3,654 scanned files)
  - npm run guard:secrets (14,901 tracked files)
  - npm test across apps/web and workspace packages
  - npx tsc --noEmit / npm run typecheck

## Acceptance Criteria

### Navigation & Routing
- [ ] Directing to /picks permanently redirects (301) to /board.
- [ ] Desktop and mobile navigation menus (nav.tsx, mobile-nav.tsx) show only "The Board" for primary signals.
- [ ] Zero 404s or dead navigation links.

### Brand Safety & Consumer Language
- [ ] 0 developer quant acronyms or raw model version strings on public cards.
- [ ] npm run lint:brand and npm run guard:trust pass with 0 errors.

### Entitlements & Pricing
- [ ] Elite tier gating for 150-max optimizer, SGP correlation matrix, and steam alerts strictly enforced server-side.
- [ ] Zero mentions of retired Galaxy Twin or dead features in pricing chrome.

### Projections & Optimizer
- [ ] /fantasy/dfs and /fantasy/optimizer report identical player salaries, projections, and exposures.
- [ ] 33/33 tests in dfs-optimizer.test.ts and 6/6 tests in dfs-correlation.test.ts pass cleanly.


## 2026-10-11T21:18:07Z

The test `apps/web/__tests__/board-picks-route-equivalence.test.ts` has been fixed and now passes 5/5 cleanly. Please proceed with Milestone 1 Verification Gate and proceed into Milestone 2 (Quant Jargon Purge & Brand Safety), Milestone 3, Milestone 4, and Milestone 5.


## 2026-10-11T21:26:15Z

The parallel E2E test suite (`apps/web/__tests__/e2e/astra-overhaul.test.ts`) is ready and active with 21 tests spanning M1 through M5. The 10 tests corresponding to M1 passed cleanly. The remaining tests cover M2 (Fair Market Value in pick-card.tsx, quant jargon purge), M3 (Elite feature gates, 150-max, SGP matrix), and M4 (unified DFS parser, live-pool-empty). Please dispatch workers for Milestone 2 and Milestone 3 immediately to continue parallel execution.


## 2026-10-11T21:42:17Z

Remediation complete for Reviewer 1 (M1): removed artificial comment stubs from `apps/web/app/proof/page.tsx` and `apps/web/components/trust-ledger/verify-console.tsx`, and updated `proof-funnel-weave.test.ts` to assert against authoritative `/board` (or legacy `/picks`) route targets. All 5/5 tests in `proof-funnel-weave.test.ts` pass cleanly without comment stubs. The entire E2E suite (`astra-overhaul.test.ts`) is 21/21 passed, `guard:trust` passed across 3,655 files, `guard:secrets` passed across 14,901 files, and DFS test suites passed 39/39. Proceed to certify M1 and advance M2-M5.
