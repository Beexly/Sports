# Progress — Survey Explorer 2

Last visited: 2026-10-11T20:54:00Z

## Status
Survey investigation for R2 (Quant Jargon Purge & Plain-English Translation) and R3 (Tier Restructuring & Elite Value Engine) is COMPLETE.

## Completed Tasks
- [x] 1. Investigate R2: `apps/web/components/picks/pick-card.tsx` and public pick components for quant acronyms (CPOE, WOPR, RYOE, DAKOTA, ANY/A, de-vig, Brier, model versions).
  - Identified: `pick-card.tsx` (Ranking P, Market fair, Shin de-vig via `devig-method-disclosure.tsx`, trueProb).
  - Identified: `engine-view.tsx` (DAKOTA, CPOE, WOPR, ANY/A, DAK%, ANY/A%).
  - Identified: `player-lab-table.tsx` (WOPR).
  - Identified: `nflverse/page.tsx` (WOPR).
  - Identified: `bet-tracker.tsx` (Brier).
  - Identified: `proof-explorer.tsx` & `calibration-panel.tsx` (Brier score).
  - Identified: `verify-pick-button.tsx`, `evidence-audit-drawer.tsx`, `board/page.tsx` (raw modelVersion strings).
- [x] 2. Investigate R2: Developer telemetry labels/buttons (e.g. literal 'JSON' buttons).
  - Identified: `apps/web/app/trends/page.tsx` (3 literal "JSON" links at lines 139, 227, 303).
  - Identified: `apps/web/app/weather/page.tsx`, `apps/web/app/mlb/page.tsx`, `apps/web/app/nhl/page.tsx` ("View as JSON").
  - Mapped clear user-facing language: "View Audit Receipt", "Fair Market Value", "Adjusted Market Consensus".
- [x] 3. Investigate R2: `npm run lint:brand` script, brand safety rules, test suites, positioning vocabulary requirements.
  - Verified: `npm run lint:brand` runs `test:brand-safety` (19 test suites, 4,661 tests) and passes 100% (61.75s).
  - Verified: `npm run guard:trust` scans 3,654 files with 0 violations.
  - Analyzed: `public-copy-scanner.test.ts`, `public-copy-scan-strong.test.ts`, `trust-claims.ts`, and `positioning-vocab.json`.
- [x] 4. Investigate R3: `apps/web/lib/pricing/feature-gates.ts`, `apps/web/app/pricing/page.tsx`, `packages/types` tier definitions.
  - Identified vocabulary misalignment: `packages/types` has `FREE`, `FANTASY`, `PRO`, `ELITE`. `value-architecture.ts` has `FREE`, `PRO`, `ELITE`, `OPERATOR` (`FANTASY` missing!). `feature-gates.ts` uses patch `TIER_ORDER: Record<ValueTierId | "FANTASY", number>`.
- [x] 5. Investigate R3: Trace 4-tier matrix: Free, Fantasy ($19/mo), Pro ($49/mo), Elite ($99/mo · $799/yr).
  - Documented full feature separation and pricing discrepancies against target matrix.
- [x] 6. Investigate R3: Elite gating for 150-max DFS optimizer, SGP correlation matrix, real-time line steam / sharp movement alerts, personal CLV & ROI dashboard.
  - Mapped each tool to its code locations, entitlement flags, and server-side endpoints.
- [x] 7. Investigate R3: Server-side gating verification vs client-side.
  - Traced `getViewerEntitlements` in `apps/web/lib/pricing/tier-access.ts`, `api-entitlement.ts`, `apps/web/app/track/page.tsx`, and `apps/web/app/fantasy/dfs/page.tsx`.
  - Identified need for `requireEliteApi()` in `api-entitlement.ts` and server-side gating for 150-max generation.
- [x] 8. Investigate R3: Check for mentions of retired Galaxy Twin or dead features in pricing chrome.
  - Verified 0 mentions of Galaxy Twin in public pricing chrome (`apps/web/app/pricing/page.tsx` and `components/pricing/`).
  - Confirmed `galaxy-twin` is disabled/hidden in `feature-gates.ts` as per C-332.
- [ ] 9. Synthesize findings and write comprehensive `handoff.md`.
- [ ] 10. Send completion message to parent orchestrator.
