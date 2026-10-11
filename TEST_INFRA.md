# TEST_INFRA — Test Infrastructure Specification

**Project:** Galaxy Sports Edge (GSE) Comprehensive Overhaul (ASTRA Master Architectural Plan)  
**Test Suite:** ASTRA 4-Tier Opaque-Box E2E Test Battery  
**Target File:** `apps/web/__tests__/e2e/astra-overhaul.test.ts`  
**Working Directory:** `C:\Users\Garrett\Sports-wt-rating-packet`  
**Date:** 2026-10-11  

---

## 1. Test Environment & Runner Configuration

- **Test Framework:** Vitest v2.1.9 with `@vitejs/plugin-react`
- **Environment:** `jsdom` (Next.js 14 / React 18 compatible)
- **Configuration File:** `apps/web/vitest.config.ts`
- **Setup Files:** `apps/web/vitest.setup.ts`, `apps/web/vitest.server-only-stub.ts`
- **Test Timeout:** 60,000ms
- **Execution Command:**
  ```bash
  npm run test --workspace=apps/web -- __tests__/e2e/astra-overhaul.test.ts
  ```

---

## 2. Test Architecture: 4-Tier Opaque-Box Methodology

The E2E test battery is designed following a strict 4-tier opaque-box methodology, deriving all expected outputs exclusively from `ORIGINAL_REQUEST.md` and `PROJECT.md § Feature Inventory` & `Interface Contracts`:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          ASTRA 4-TIER BATTERY                             │
├───────────────────────────────────────────────────────────────────────────┤
│ Tier 1: Feature Coverage (R1-R4)                                          │
│   • R1: 301 Redirect /picks -> /board, 2-Tab /board, Nav Menu Unification│
│   • R2: Quant Jargon Purge (CPOE, WOPR, DAKOTA, trueProb, Fair Market)   │
│   • R3: 4-Tier Matrix ($0, $19, $49, $99), Daily Pick Limit 1, Elite Gating│
│   • R4: 686 Real NFL Players CSV, Unified DFS Feed, Zero Mock Policy     │
├───────────────────────────────────────────────────────────────────────────┤
│ Tier 2: Boundary & Corner Cases                                           │
│   • Query Param Preservation (?sport=nfl&date=2026-10-12)                │
│   • Unknown Tab Fallback to 'signals'                                     │
│   • Pick Limits: 0 allowed, 1 reached, 2 gated/paywalled                │
│   • Optimizer Lineup Slider: 1-20 (Non-Elite) vs 1-150 (Elite)            │
│   • LivePoolEmpty Honest State on unkeyed/empty feed                      │
├───────────────────────────────────────────────────────────────────────────┤
│ Tier 3: Cross-Feature Interactions                                        │
│   • /board Teaser to /pricing Upgrade Funnel                              │
│   • Multi-Surface Entitlement Coherence across all 4 tiers simultaneously │
├───────────────────────────────────────────────────────────────────────────┤
│ Tier 4: Real-World Application Scenarios                                  │
│   • Full End-to-End Visitor Journey: Bookmark -> /board -> Factors ->     │
│     Held Games -> Pricing -> Unified Fantasy Tools                        │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Coverage Matrix & Authoritative Specifications

| Tier | Test Identifier | Requirement / Feature | Authoritative Source | Target Module(s) |
|---|---|---|---|---|
| 1 | `T1.R1.F1` | 301 Permanent Redirect `/picks` -> `/board` | `ORIGINAL_REQUEST.md` § R1; `PROJECT.md` Feature 1 | `apps/web/next.config.mjs` |
| 1 | `T1.R1.F3` | Server-Side Runtime Redirect in `/picks/page.tsx` | `ORIGINAL_REQUEST.md` § R1; `PROJECT.md` Feature 3 | `apps/web/app/picks/page.tsx` |
| 1 | `T1.R1.F2` | Authoritative `/board` Dual-Tab Consolidation | `ORIGINAL_REQUEST.md` § R1; `PROJECT.md` Feature 2 | `apps/web/app/board/page.tsx` |
| 1 | `T1.R1.F4` | Desktop & Mobile Navigation Menu Unification | `ORIGINAL_REQUEST.md` § R1; `PROJECT.md` Feature 4 | `components/ui/nav.tsx`, `mobile-nav.tsx` |
| 1 | `T1.R1.F6` | Public Navigation Surfaces Link Purge | `ORIGINAL_REQUEST.md` § R1; `PROJECT.md` Feature 6 | `app/pricing/page.tsx`, `lib/brand.ts` |
| 1 | `T1.R2.F7` | Customer Pick Card Quant Acronym Purge | `ORIGINAL_REQUEST.md` § R2; `PROJECT.md` Feature 7 | `components/picks/pick-card.tsx` |
| 1 | `T1.R2.F9` | Telemetry Labels Replacement | `ORIGINAL_REQUEST.md` § R2; `PROJECT.md` Feature 9 | `pick-card.tsx`, `app/trends/page.tsx` |
| 1 | `T1.R3.F12` | 4-Tier Matrix Alignment | `ORIGINAL_REQUEST.md` § R3; `PROJECT.md` Feature 12 | `packages/types`, `value-architecture.ts` |
| 1 | `T1.R3.F13` | Free Tier Teaser Pick Limit (`dailyPickLimit === 1`) | `ORIGINAL_REQUEST.md` § R3; `PROJECT.md` Feature 13 | `packages/types/src/index.ts` |
| 1 | `T1.R3.F14-16` | Elite Tools Server-Side Gating (150-Max, SGP, Steam, CLV) | `ORIGINAL_REQUEST.md` § R3; `PROJECT.md` Features 14-16 | `packages/types`, `lib/api-entitlement.ts` |
| 1 | `T1.R4.F18` | Candidate DFS Dataset (686 Real NFL Players) | `ORIGINAL_REQUEST.md` § R4; `PROJECT.md` Feature 18 | `dfs/genie_acq2/sunmon_154470/SUNMON_DFS_CANDIDATES.csv` |
| 1 | `T1.R4.F19` | Unified DFS Projections Parity | `ORIGINAL_REQUEST.md` § R4; `PROJECT.md` Feature 19 | `app/fantasy/dfs/page.tsx`, `optimizer-workspace.tsx` |
| 1 | `T1.R4.F20-21` | Zero Mock Policy & Honest States | `ORIGINAL_REQUEST.md` § R4; `PROJECT.md` Features 20-21 | `live-pool-empty.tsx`, `app/fantasy/gm-ledger/page.tsx` |
| 2 | `T2.1` | Query Parameter Preservation on 301 Redirect | `DISPATCH.md` Tier 2; `PROJECT.md` § M1 | `next.config.mjs` |
| 2 | `T2.2` | Invalid /board Tab Fallback to 'signals' | `DISPATCH.md` Tier 2; `PROJECT.md` § M1 | `app/board/page.tsx` |
| 2 | `T2.3` | Free Tier Pick Limit Boundary States (0, 1, 2) | `DISPATCH.md` Tier 2; `PROJECT.md` § M3 | `packages/types/src/index.ts` |
| 2 | `T2.4` | DFS Optimizer Lineup Slider Limits (20 vs 150) | `DISPATCH.md` Tier 2; `PROJECT.md` § M3 | `packages/types`, `lib/pricing/feature-gates.ts` |
| 2 | `T2.5` | Empty Pool Graceful Handling (`LivePoolEmpty`) | `DISPATCH.md` Tier 2; `PROJECT.md` § M4 | `components/fantasy/live-pool-empty.tsx` |
| 3 | `T3.1` | `/board` to `/pricing` Upgrade Navigation Funnel | `DISPATCH.md` Tier 3; `PROJECT.md` | `app/board/page.tsx`, `app/pricing/page.tsx` |
| 3 | `T3.2` | Multi-Surface Coherent Entitlement State | `DISPATCH.md` Tier 3; `PROJECT.md` § M3 | `packages/types/src/index.ts` |
| 4 | `T4.1` | End-to-End Real-World Visitor Journey | `DISPATCH.md` Tier 4; `ORIGINAL_REQUEST.md` | Entire unified stack |

---

## 4. Test Execution & Initial Baseline Results

- **Total Test Cases:** 21
- **Passed:** 6 tests (Pre-existing infrastructure & verified components)
  - `Feature 6`: Public navigation surfaces link purge
  - `Feature 18`: `SUNMON_DFS_CANDIDATES.csv` 686 real NFL players verification
  - `Feature 20 & 21 (partial)`: `LivePoolEmpty` component existence
  - `T2.5`: Empty player pool handling without crashing
  - `T3.1`: `/board` upgrade CTAs route to `/pricing`
- **Failed (Red Baseline):** 15 tests (Directly corresponding to features currently being implemented across Milestones M1, M2, M3, and M4)

### Failure Attribution:
1. **Milestone 1 (worker_m1_1)**:
   - `Feature 1`: Redirect `/picks` -> `/board` in `next.config.mjs`
   - `Feature 2`: 2-tab structure in `app/board/page.tsx`
   - `Feature 3`: Runtime redirect in `app/picks/page.tsx`
   - `Feature 4`: Nav menus updated to "The Board"
   - `T2.1`: Query parameter preservation on redirect
   - `T2.2`: Tab fallback handling on `/board`
   - `T4.1`: End-to-end journey (blocked by M1 steps)
2. **Milestone 2 (Planned)**:
   - `Feature 7`: Quant acronym purge on `pick-card.tsx`
   - `Feature 9`: "Fair Market Value" and "View Audit Receipt" labels
3. **Milestone 3 (Planned)**:
   - `Feature 12`: 4-tier matrix alignment (`FANTASY` in `VALUE_TIERS`)
   - `Feature 13`: `dailyPickLimit === 1` for Free tier
   - `Feature 14-16`: Elite tools gating (`canUseDfsOptimizer150`, `canUseSgpCorrelation`, etc.)
   - `T2.3`: Pick limit boundaries
   - `T2.4`: Slider limits (150-max)
   - `T3.2`: Multi-surface entitlement coherence
4. **Milestone 4 (Planned)**:
   - `Feature 19`: Unified DFS feed wired to `/fantasy/dfs` and `/optimizer`
   - `Feature 21`: `/fantasy/gm-ledger` zero mock policy enforcement
