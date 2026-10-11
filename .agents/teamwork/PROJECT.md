# Project: Galaxy Sports Edge (GSE) Comprehensive Overhaul (Phases 2-5)

## Architecture
Galaxy Sports Edge is a multi-package, Next.js full-stack sports analytics and betting intelligence application:
- `apps/web`: Next.js 14 App Router frontend and server runtime (pages, API routes, React UI components, pricing, fantasy workspace).
- `packages/types`: Core shared domain types, subscription tiers (`FREE`, `FANTASY`, `PRO`, `ELITE`), viewer entitlements.
- `packages/prediction-engine`: Mathematical modeling, true probability calculation, calibration curves, edge discovery.
- `packages/ingestion-pipeline`: Odds ingestion, market data synchronization, sport processing.
- `dfs/genie_acq2/sunmon_154470/`: Real deterministic DraftKings salary and Pinnacle projection feed (`SUNMON_DFS_CANDIDATES.csv`, 686 real NFL players).

### Data Flow
1. Routing: `next.config.mjs` handles 301 redirects (`/picks` -> `/board`).
2. Authoritative Board: `/board` SSR loads actionable signals (`fetchSlate`, `fetchPicks`) and transparent pass discipline (`loadBoardPasses`, `loadBoardState`).
3. Pricing & Entitlements: `getViewerEntitlements(session)` evaluates user tier server-side, enforcing locks for high-leverage Elite tools.
4. Fantasy Projections: `apps/web/lib/dfs/unified-slate.ts` parses `SUNMON_DFS_CANDIDATES.csv` into unified `DfsPlayer` objects shared identically by `/fantasy/dfs` and `/fantasy/optimizer`.
5. Honest States: Zero mock data on production surfaces; displays honest status states (e.g., slate lock or pre-season status) when live data is pending.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | 301 Redirect /picks -> /board | Add permanent 301 redirect in `next.config.mjs` redirects array | M1 | survey |
| 2 | Authoritative /board Consolidation | Single route `/board` with 2 tabs: Actionable Signals and Gated & Held Games | M1 | survey |
| 3 | Runtime Redirect in /picks/page.tsx | `redirect('/board')` while preserving exported types for 20 static test suites | M1 | survey |
| 4 | Navigation Menu Updates | Remove `/picks`, label trigger "The Board", fix duplicate function definitions in `nav.tsx` and update `mobile-nav.tsx` | M1 | survey |
| 5 | Route Equivalence Test Overhaul | Re-architect `board-picks-route-equivalence.test.ts` into a 5-assertion suite verifying single-board consolidation | M1 | survey |
| 6 | Eliminate Public /picks Links | Update links in `proof`, `sealed`, `pricing`, `verify-console`, `command-palette`, `brand.ts`, `sports-jsonld.ts` | M1 | survey |
| 7 | Quant Jargon Purge on Pick Cards | Replace `Ranking P`, `Market fair`, `trueProb`, and Shin de-vig disclosure with plain-English consumer labels | M2 | survey |
| 8 | Quant Jargon Purge in Lab Tables | Replace `DAKOTA`, `CPOE`, `WOPR`, `ANY/A`, and `Brier` in `engine-view.tsx`, `player-lab-table.tsx`, `nflverse`, `bet-tracker` | M2 | survey |
| 9 | Telemetry Label Replacement | Replace literal "JSON" links in `trends/page.tsx`, `weather`, `mlb`, `nhl` with "View Audit Receipt" / "View Data Feed" | M2 | survey |
| 10 | Raw Model Version Strings Cleanup | Format raw version strings with clean release labels on customer cards and boards | M2 | survey |
| 11 | Brand Safety & Positioning Lint | Verify 100% pass on `npm run lint:brand` (19 suites, 4,661 tests) and `npm run guard:trust` | M2 | survey |
| 12 | 4-Tier Matrix Alignment | Harmonize `SubscriptionTier` and `ValueTierId` in `packages/types`, `value-architecture.ts`, `feature-gates.ts` | M3 | survey |
| 13 | Free Tier Teaser Limit | Enforce `dailyPickLimit: 1` in `packages/types` entitlements | M3 | survey |
| 14 | Elite Entitlements Definition | Add `canUseDfsOptimizer150`, `canUseSgpCorrelation`, `canGetSteamAlerts`, `canUseClvLedger` strictly for ELITE | M3 | survey |
| 15 | Server-Side Gating for 150-Max DFS | Add `requireEliteApi()` and gate 150-lineup generation server-side | M3 | survey |
| 16 | Server-Side Gating for SGP Matrix & Steam | Gate full situational SGP matrix and real-time line steam alerts strictly behind Elite | M3 | survey |
| 17 | Pricing Chrome Reconciliation | Update `/pricing` page with 4 tiers ($0, $19/mo, $49/mo, $99/mo), zero mentions of retired Galaxy Twin | M3 | survey |
| 18 | Unified DFS Projection Feed Parser | Build unified parser for `SUNMON_DFS_CANDIDATES.csv` (686 real players, actual DK salaries) | M4 | survey |
| 19 | DFS Surface Synchronization | Connect `/fantasy/dfs` and `/fantasy/optimizer` to the identical projection feed for 100% data parity | M4 | survey |
| 20 | Zero Mock Policy Enforcement | Replace fictional fallback pools (`PLAYERS`, `DFS_SLATE`) with honest status states (`LivePoolEmpty`) | M4 | survey |
| 21 | GM Ledger Honest Status State | Replace 7 fictional demo decisions with honest pre-season status and real Sleeper league sync | M4 | survey |
| 22 | Ingestion & Engine Syntax Fixes | Fix TS1005 object literal syntax in `process-sport.ts` and duplicate `LedgerEntry` export in `prediction-engine` | M5 | survey |
| 23 | Vitest Neon DB Mock Stub | Configure Vitest stub alias in `vitest.config.ts` for `@neondatabase/serverless` | M5 | survey |
| 24 | Complete Verification Battery Pass | Execute and verify `npm run lint:brand`, `guard:trust`, `guard:secrets`, `npm test` (33/33, 6/6), and `typecheck` | M5 | survey |
| 25 | Dual-Track E2E Test Suite | Design and execute 4-tier opaque-box E2E test battery validating R1-R5 acceptance criteria | E2E | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Surface Unification & Authoritative Board Route | Features 1-6 (redirects, board consolidation, nav, route equivalence test, links) | none | DONE |
| 2 | M2: Plain-English Translation (Quant Jargon Purge) | Features 7-11 (pick-card, lab tables, telemetry labels, model versions, brand lint) | none | DONE |
| 3 | M3: Tier Restructuring & Elite Value Engine | Features 12-17 (4-tier matrix, entitlements, server-side gating for 4 Elite tools) | none | DONE |
| 4 | M4: Fantasy Data Unification & Zero Mock Policy | Features 18-21 (unified CSV parser, /fantasy/dfs & /optimizer parity, honest empty states, GM ledger) | none | IN_PROGRESS |
| 5 | M5: Complete Verification Battery & Final Milestone | Features 22-24 (syntax fixes, test passes, typecheck clean, E2E validation) | M1, M2, M3, M4 | IN_PROGRESS |
| E2E | E2E Testing Track | Feature 25 (Opaque-box E2E test suite covering Tiers 1-4 requirements) | none (parallel) | IN_PROGRESS |

## Interface Contracts

### M1: /board Tab Navigation Contract
- Route: `/board`
- Query Params:
  - `tab=signals` (default): Renders "Actionable Signals" (`SlateBar`, `PaywallBanner`, filters, `PickCard` grid).
  - `tab=held`: Renders "Gated & Held Games" (Metrics tiles, `BoardLane`s, `PassListItem`s).
- Redirect: `/picks` -> `/board` (HTTP 301 permanent).

### M3: Entitlements & Gating Contract
- `packages/types/src/index.ts`:
  ```ts
  export type SubscriptionTier = "FREE" | "FANTASY" | "PRO" | "ELITE";
  export interface Entitlements {
    tier: SubscriptionTier;
    dailyPickLimit: number | null; // 1 for Free, null for Pro/Elite
    canUseDfsOptimizer150: boolean; // Elite only
    canUseSgpCorrelation: boolean;  // Elite only
    canGetSteamAlerts: boolean;     // Elite only
    canUseClvLedger: boolean;       // Elite only
    ...
  }
  ```

### M4: Unified DFS Projection Feed Contract
- `apps/web/lib/dfs/unified-slate.ts`:
  ```ts
  export interface DfsPlayer {
    id: string;
    name: string;
    pos: "QB" | "RB" | "WR" | "TE" | "DST";
    salary: number;
    proj: number;
    floor: number;
    ceiling: number;
    own: number;
    team: string;
    opp: string;
  }
  export function getUnifiedDfsSlate(): DfsPlayer[] | null;
  ```
- Both `apps/web/app/fantasy/dfs/page.tsx` and `apps/web/components/fantasy/optimizer-workspace.tsx` consume `getUnifiedDfsSlate()`.

## Code Layout
- `apps/web/next.config.mjs`: Next.js config & redirects
- `apps/web/app/board/page.tsx`: Consolidated single authoritative board
- `apps/web/app/picks/page.tsx`: Server component runtime redirect to `/board`
- `apps/web/components/ui/nav.tsx`: Desktop navigation
- `apps/web/components/ui/mobile-nav.tsx`: Mobile navigation
- `apps/web/components/picks/pick-card.tsx`: Customer pick card
- `apps/web/components/picks/devig-method-disclosure.tsx`: Margin disclosure component
- `apps/web/components/intelligence/engine-view.tsx`: Engine metrics table
- `apps/web/components/players/player-lab-table.tsx`: Player laboratory table
- `apps/web/components/tracker/bet-tracker.tsx`: Personal portfolio tracker
- `apps/web/app/trends/page.tsx`: Trends page telemetry links
- `packages/types/src/index.ts`: Core subscription and entitlement types
- `apps/web/lib/pricing/value-architecture.ts`: Commercial tier architecture
- `apps/web/lib/pricing/feature-gates.ts`: Feature flags and tier requirements
- `apps/web/lib/api-entitlement.ts`: Server-side API gating middleware
- `apps/web/app/pricing/page.tsx`: Pricing comparison page
- `apps/web/lib/dfs/unified-slate.ts`: Unified DFS projection CSV parser
- `apps/web/app/fantasy/dfs/page.tsx`: DFS lineup generator page
- `apps/web/components/fantasy/optimizer-workspace.tsx`: Optimizer workspace component
- `apps/web/app/fantasy/gm-ledger/page.tsx`: GM decision ledger page
- `apps/web/lib/fantasy/gm-ledger.ts`: GM ledger data logic
- `packages/ingestion-pipeline/src/process-sport.ts`: Ingestion pipeline sport processing
- `packages/prediction-engine/src/index.ts`: Prediction engine exports
- `apps/web/vitest.config.ts`: Vitest test configuration
