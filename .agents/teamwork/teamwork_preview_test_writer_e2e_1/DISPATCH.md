# DISPATCH: E2E Test Writer (Opaque-Box E2E Testing Battery)

## Mission
Design and construct the comprehensive opaque-box E2E test suite derived strictly from user requirements in `ORIGINAL_REQUEST.md` and `PROJECT.md § Feature Inventory`.
Publish `TEST_INFRA.md` and `TEST_READY.md`.

## Working Directory
`C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_test_writer_e2e_1`

## Inputs
- `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\ORIGINAL_REQUEST.md`
- `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\PROJECT.md`

## Scope Boundaries
- **Exclusively Owned Files**:
  - `apps/web/__tests__/e2e/` (new test suite files)
  - `C:\Users\Garrett\Sports-wt-rating-packet\TEST_INFRA.md`
  - `C:\Users\Garrett\Sports-wt-rating-packet\TEST_READY.md`
- Do NOT modify production application source code files.

## Methodology & Requirements
Follow the 4-tier opaque-box test case design methodology:
1. **Tier 1 — Feature Coverage**: Tests verifying each of the core requirements (R1-R4) in isolation:
   - 301 redirect `/picks` -> `/board`
   - `/board` 2-tab structure (Actionable Signals & Gated/Held Games)
   - Navigation links pointing to `/board` (no `/picks` links)
   - Quant acronym suppression on public cards (CPOE, WOPR, RYOE, DAKOTA, ANY/A, de-vig, Brier)
   - Developer telemetry labels replaced ("View Audit Receipt", "Fair Market Value")
   - Tier matrix: Free (1 teaser pick), Fantasy ($19/mo), Pro ($49/mo), Elite ($99/mo)
   - Elite server-side gating for 150-max optimizer, SGP correlation matrix, steam alerts, CLV dashboard
   - Unified DFS projections between `/fantasy/dfs` and `/optimizer`
   - Honest empty / pre-season status states (zero fictional mock players/decisions)
2. **Tier 2 — Boundary & Corner Cases**:
   - Query parameter propagation (`/picks?sport=nfl&date=2026-10-12` -> `/board?sport=nfl&date=2026-10-12`)
   - Invalid tab values fallback to default tab
   - Free tier pick limit boundaries
   - DFS optimizer slider boundaries (1-20 for non-elite, up to 150 for elite)
   - Empty player pool handling (`LivePoolEmpty`)
3. **Tier 3 — Cross-Feature Interactions**:
   - Navigation from `/board` signals to pricing upgrade flow
   - Entitlement checks across multiple feature surfaces simultaneously
4. **Tier 4 — Real-World Application Scenarios**:
   - Complete visitor journey from landing/nav to viewing Actionable Signals, inspecting Factor Trails, reviewing Gated/Held games, and navigating pricing.

## Deliverables
1. Write the test suite in `apps/web/__tests__/e2e/astra-overhaul.test.ts`.
2. Write `C:\Users\Garrett\Sports-wt-rating-packet\TEST_INFRA.md` following the template in `PROJECT.md`.
3. Run the tests to establish baseline: `npm run test --workspace=apps/web -- __tests__/e2e/astra-overhaul.test.ts`.
4. When complete, create `C:\Users\Garrett\Sports-wt-rating-packet\TEST_READY.md` summarizing the test runner command and coverage.
5. Report completion to the Project Orchestrator via `send_message`.


## 2026-10-11T21:04:26Z
You are the E2E Test Writer for the Galaxy Sports Edge (GSE) architectural overhaul.
Your working directory is: C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_test_writer_e2e_1
Read C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_test_writer_e2e_1\DISPATCH.md, C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\PROJECT.md, and C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\ORIGINAL_REQUEST.md.

Design and implement the comprehensive 4-tier opaque-box E2E test suite for R1-R4 in apps/web/__tests__/e2e/astra-overhaul.test.ts.
Create TEST_INFRA.md and TEST_READY.md.
Run tests via: npm run test --workspace=apps/web -- __tests__/e2e/astra-overhaul.test.ts.
Document coverage and results in handoff.md and notify me via send_message.
