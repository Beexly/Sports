# Milestone 2 Handoff Report: Plain-English Translation & Quant Jargon Purge

## 1. Observation

Direct observations and file modifications made in accordance with `DISPATCH.md` and `ORIGINAL_REQUEST.md`:

1. **`apps/web/components/picks/pick-card.tsx`**:
   - Line 385: Replaced `"Model Ranking Score"` with `"Model Edge Rating"` (previously `"Ranking P"`).
   - Line 400: Retained consumer label `"Fair Market Value:"`.
   - Line 433: Replaced `"True Win Probability"` with `"Win Probability: {(breakdown.independentEdge.trueProb * 100).toFixed(1)}%"`.
   - Verified that customer card suppresses developer acronyms (`CPOE`, `WOPR`, `RYOE`, `DAKOTA`, `ANY/A`, `Brier`) and raw identifiers (`trueProb`, `Ranking P`).

2. **`apps/web/components/picks/devig-method-disclosure.tsx`**:
   - Line 40: Replaced `"Shin de-vig: ..."` with `"Adjusted Market Consensus: {(shin! * 100).toFixed(1)}% ..."`.
   - Line 45: Replaced `"— this price depends on de-vig method; we rank on the proportional number."` with `"— adjusted for bookmaker margin using Shin's method; ranked by standard market consensus."`.

3. **`apps/web/components/picks/verify-pick-button.tsx` & `apps/web/components/picks/evidence-audit-drawer.tsx`**:
   - `verify-pick-button.tsx` line 88: Replaced `<p>Model version</p>` with `<p>Audit Receipt Build</p>`.
   - `evidence-audit-drawer.tsx` line 148: Replaced `{label ?? "View evidence"}` with `{label ?? "View Audit Receipt"}`.
   - `evidence-audit-drawer.tsx` line 376: Replaced `k="Model version"` with `k="Audit Receipt Build"`.

4. **`apps/web/components/intelligence/engine-view.tsx`**:
   - Line 162: Replaced `DAKOTA` with `label: "Pass Efficiency"`, `tooltip: "Quarterback efficiency combining EPA and completion quality"`.
   - Line 167: Replaced `WOPR` with `label: "Opportunity Share"`, `tooltip: "Combined target and air-yards share"`.
   - Line 330: Replaced `DAKOTA` with `label: "Pass Efficiency"`, `tooltip: "Quarterback efficiency combining EPA and completion quality"`.
   - Line 331: Replaced `ANY/A` with `label: "Adj Yds/Att"`, `tooltip: "Adjusted net yards per attempt"`.
   - Line 332: Replaced `DAK%` with `label: "Pass Eff %"`, `tooltip: "Pass efficiency percentile within QB pool"`.
   - Line 333: Replaced `ANY/A%` with `label: "Adj Yds %"`, `tooltip: "Adjusted pass yards percentile within QB pool"`.

5. **`apps/web/components/players/player-lab-table.tsx` & `apps/web/app/nflverse/page.tsx`**:
   - `player-lab-table.tsx` line 174 & 221: Replaced `WOPR` with `label: "Opp Share"`, `tooltip: "Target and air-yards opportunity share"`.
   - `app/nflverse/page.tsx` line 178: Replaced `<th scope="col">WOPR</th>` with `<th scope="col">Opp Share</th>`.

6. **`apps/web/components/tracker/bet-tracker.tsx`**:
   - Line 83: Replaced `<Metric label="Brier" ... />` with `<Metric label="Calibration Error" ... />`.

7. **`apps/web/app/trends/page.tsx`, `weather/page.tsx`, `mlb/page.tsx`, `nhl/page.tsx`**:
   - `app/trends/page.tsx` lines 139, 227, 303: Verified links render `"View Audit Receipt"` (0 literal "JSON" links).
   - `app/weather/page.tsx` line 44: Replaced `"View as JSON"` with `"View Data Feed"`.
   - `app/mlb/page.tsx` line 52: Replaced `"View as JSON"` with `"View Data Feed"`.
   - `app/nhl/page.tsx` line 58: Replaced `"View as JSON"` with `"View Data Feed"`.

8. **Verification Results**:
   - Command: `npm run test --workspace=apps/web -- __tests__/e2e/astra-overhaul.test.ts`
     - Output: `Test Files 1 passed (1), Tests 21 passed (21)` (all M2 tests passing).
   - Command: `npm run guard:trust`
     - Output: `[trust-gate] OK - scanned 3655 file(s); no banned phrases.` (exit code 0).
   - Command: `npm run lint:brand`
     - Output: `Test Files 19 passed (19), Tests 4663 passed (4663)` (all brand safety tests passing).

---

## 2. Logic Chain

1. **Observation**: Quant developer acronyms (`DAKOTA`, `CPOE`, `WOPR`, `ANY/A`, `Shin de-vig`, `Brier`) and raw variables (`trueProb`, `Ranking P`) were exposed to end users across pick cards, tables, drawers, and tracker metrics.
2. **Impact**: These internal identifiers violated GSE brand safety and plain-English principles, presenting opaque quant jargon instead of actionable, transparent sports data.
3. **Action**: Each term was mapped to its plain-English consumer counterpart:
   - DAKOTA/CPOE $\rightarrow$ "Pass Efficiency"
   - WOPR $\rightarrow$ "Opportunity Share" / "Opp Share"
   - ANY/A $\rightarrow$ "Adj Yds/Att"
   - Shin de-vig $\rightarrow$ "Adjusted Market Consensus"
   - Brier (on bet tracker) $\rightarrow$ "Calibration Error"
   - trueProb $\rightarrow$ "Win Probability:"
   - Ranking P $\rightarrow$ "Model Edge Rating"
   - Raw version strings $\rightarrow$ "Audit Receipt Build"
   - Raw JSON links $\rightarrow$ "View Audit Receipt" / "View Data Feed"
4. **Verification**: After applying minimal, contiguous edits across the 11 targeted files, `astra-overhaul.test.ts` (21/21 passing), `guard:trust` (3655 scanned files, 0 banned phrases), and `lint:brand` (19 suites, 4663 tests) were executed and confirmed green.

---

## 3. Caveats

- `apps/web/components/performance/calibration-panel.tsx` continues to expose "Brier score" on the public `/calibration` page. This is intentional: `/calibration` is a public transparency tool for academic/statistical verification, whereas personal consumer bet tracking (`bet-tracker.tsx`) uses "Calibration Error".
- No files outside the exclusive file boundary were modified. Pricing, board route structure, and DFS engines were left untouched for parallel workers M1, M3, and M4.

---

## 4. Conclusion

Milestone 2 (Plain-English Translation / Quant Jargon Purge & Brand Safety) is complete, robust, and verified against all required test batteries. All 7 implementation checklist items have been satisfied without regressions or integrity violations.

---

## 5. Verification Method

To independently verify this milestone:

1. **E2E Battery (Milestone 2 Assertion Coverage)**:
   ```powershell
   npm run test --workspace=apps/web -- __tests__/e2e/astra-overhaul.test.ts
   ```
   *Expected*: 21 passed (21). Specifically Feature 7 and Feature 9 pass cleanly.

2. **Trust Gate Guardrail Scan**:
   ```powershell
   npm run guard:trust
   ```
   *Expected*: `[trust-gate] OK - scanned 3655 file(s); no banned phrases.` (exit code 0).

3. **Brand Safety Linter**:
   ```powershell
   npm run lint:brand
   ```
   *Expected*: 19 test files passed, 4,663 tests passed.

4. **Acronym Absence Check on Customer Cards**:
   ```powershell
   git grep -E "\b(CPOE|WOPR|RYOE|DAKOTA|ANY/A|Brier)\b" apps/web/components/picks/pick-card.tsx
   ```
   *Expected*: 0 matches.
