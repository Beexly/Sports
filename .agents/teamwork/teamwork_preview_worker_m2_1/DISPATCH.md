# DISPATCH: Milestone 2 Worker (Plain-English Translation / Quant Jargon Purge)

## Mission
Implement Milestone 2 (Plain-English Translation / Quant Jargon Purge & Brand Safety) according to the blueprint in `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_explorer_survey_2\handoff.md` and requirements in `ORIGINAL_REQUEST.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Working Directory
`C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_worker_m2_1`

## Inputs
- `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\ORIGINAL_REQUEST.md`
- `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\PROJECT.md`
- `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_explorer_survey_2\handoff.md` (Detailed line-by-line blueprint)
- `apps/web/__tests__/e2e/astra-overhaul.test.ts` (E2E tests for M2)

## Exclusive File Boundaries
You exclusively own and may edit the following files:
- `apps/web/components/picks/pick-card.tsx`
- `apps/web/components/picks/devig-method-disclosure.tsx`
- `apps/web/components/intelligence/engine-view.tsx`
- `apps/web/components/players/player-lab-table.tsx`
- `apps/web/app/nflverse/page.tsx`
- `apps/web/components/tracker/bet-tracker.tsx`
- `apps/web/app/trends/page.tsx`
- `apps/web/app/weather/page.tsx`
- `apps/web/app/mlb/page.tsx`
- `apps/web/app/nhl/page.tsx`
- `apps/web/components/picks/verify-pick-button.tsx`
- `apps/web/components/picks/evidence-audit-drawer.tsx`
- `apps/web/components/performance/calibration-panel.tsx`

DO NOT edit files outside this list (specifically do not edit pricing page, board page, or fantasy components).

## Implementation Checklist
1. **`pick-card.tsx`**:
   - Replace `"Ranking P"` with `"Model Edge Rating"`
   - Replace `"Market fair:"` with `"Fair Market Value:"`
   - Replace `"trueProb {(...)}%"` with `"Win Probability: {(...)}%"`
2. **`devig-method-disclosure.tsx`**:
   - Replace `"Shin de-vig: ..."` with `"Adjusted Market Consensus: ..."`
   - Replace `"— this price depends on de-vig method; we rank on the proportional number."` with `"— adjusted for bookmaker margin using Shin's method; ranked by standard market consensus."`
3. **`verify-pick-button.tsx` & `evidence-audit-drawer.tsx`**:
   - Replace raw version string displays with clean release labels / "Audit Receipt Build"
   - In `evidence-audit-drawer.tsx`, standardize button label to `"View Audit Receipt"`
4. **`engine-view.tsx`**:
   - Replace `DAKOTA` and `CPOE` with `"Pass Efficiency"` / `"Quarterback efficiency combining EPA and completion quality"`
   - Replace `WOPR` with `"Opportunity Share"` / `"Combined target and air-yards share"`
   - Replace `ANY/A` with `"Adj Yds/Att"` / `"Adjusted net yards per attempt"`
5. **`player-lab-table.tsx` & `nflverse/page.tsx`**:
   - Replace `WOPR` with `"Opp Share"`
6. **`bet-tracker.tsx`**:
   - Replace raw `label="Brier"` with `label="Calibration Error"`
7. **Telemetry Buttons / Links**:
   - In `app/trends/page.tsx`: replace the 3 literal `"JSON"` links with `"View Audit Receipt"`
   - In `weather/page.tsx`, `mlb/page.tsx`, `nhl/page.tsx`: replace `"View as JSON"` with `"View Data Feed"`
8. **Verification**:
   - Run `npm run lint:brand` (19 suites, 4,661 tests)
   - Run `npm run guard:trust` (3,654 scanned files)
   - Run `npm run test --workspace=apps/web -- __tests__/e2e/astra-overhaul.test.ts`
   - Verify that all M2 E2E tests pass.
9. Write `handoff.md` and report completion to Project Orchestrator via `send_message`.


## 2026-10-11T21:27:20Z
You are Milestone 2 Worker (Plain-English Translation / Quant Jargon Purge).
Working directory: C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_worker_m2_1
Read DISPATCH.md in your directory and ORIGINAL_REQUEST.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement:
1. pick-card.tsx: 'Ranking P' -> 'Model Edge Rating', 'Market fair:' -> 'Fair Market Value:', 'trueProb' -> 'Win Probability:'.
2. devig-method-disclosure.tsx: Shin de-vig disclosure to plain English ('Adjusted Market Consensus').
3. verify-pick-button.tsx & evidence-audit-drawer.tsx: clean release labels, 'View Audit Receipt'.
4. engine-view.tsx: DAKOTA/CPOE -> 'Pass Efficiency', WOPR -> 'Opportunity Share', ANY/A -> 'Adj Yds/Att'.
5. player-lab-table.tsx & nflverse/page.tsx: WOPR -> 'Opp Share'.
6. bet-tracker.tsx: Brier -> 'Calibration Error'.
7. trends/page.tsx, weather, mlb, nhl: literal 'JSON' buttons -> 'View Audit Receipt' / 'View Data Feed'.
8. Verify with npm run lint:brand, npm run guard:trust, and npm run test --workspace=apps/web -- __tests__/e2e/astra-overhaul.test.ts.
Write handoff.md and notify me via send_message.
