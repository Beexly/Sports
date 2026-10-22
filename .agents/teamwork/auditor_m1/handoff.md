# Forensic Audit Report: Milestone M1 — Test Suite Isolation & CI on Main Repair

**Author**: `auditor_m1` (teamwork_preview_auditor)  
**Date**: 2026-10-13T17:26:00Z  
**Target Work Product**: Milestone M1 files touched by `worker_m1_gen2`  
**Profile**: General Project (Integrity Mode: `development` per `ORIGINAL_REQUEST.md`)  
**Verdict**: **`CLEAN`**  

---

## Forensic Audit Summary

| Check | Scope | Result | Evidence / Details |
|---|---|:---:|---|
| **Hardcoded Output Detection** | Project Source | **PASS** | Inspected diffs in all 8 touched files; zero fake test mocks or hardcoded return strings. |
| **Facade Detection** | Implementation Logic | **PASS** | Genuine exclusion configs, real Next.js/React components, authentic export maps. |
| **Pre-populated Artifacts** | Workspace | **PASS** | Zero pre-seeded test logs, mock results, or attestation files found. |
| **Worktree Isolation (Vitest)** | `vitest.config.ts`, `apps/web/vitest.config.ts` | **PASS** | `npx vitest list process-sport` matched exactly 1 file; 0 from `.worktrees/**`. |
| **Worktree Isolation (Pytest)** | `pytest.ini`, `intelligence/pytest.ini` | **PASS** | `py -3.13 -m pytest --collect-only -q` excluded `.worktrees` and `.agents` completely. |
| **Primary Pipeline Test Suite** | `process-sport.test.ts` | **PASS** | 87/87 tests passed in 37.56s (0 failures, exit code 0). |
| **Pytest Intelligence Suites** | `intelligence/props`, `intelligence/sgp` | **PASS** | 59/59 props passed, 32/32 sgp passed (exit code 0). |
| **TypeScript / Build Cleanliness** | `apps/web/tsconfig.json` | **PASS** | `npx tsc --noEmit --project apps/web/tsconfig.json` exited 0 with 0 errors. |
| **Workspace Junctions** | `node_modules/@sports` | **PASS** | 26/26 symlinks verified pointing to local `C:\Users\Garrett\Sports\packages\*`. |

---

## 1. Observation

### 1.1 Source Code Diffs and Touched Files
Audited all files modified by `worker_m1_gen2`:
1. **`vitest.config.ts`** (new root file):
   - Configures `test.exclude` with `["**/.worktrees/**", "**/.agents/**", "**/data/snapshots/**", "**/node_modules/**", "**/dist/**", "**/.next/**", "apps/mobile/**"]`.
   - Defines path aliases for `@` and all 21 `@sports/*` packages mapping directly to `packages/*`.
2. **`apps/web/vitest.config.ts`**:
   - Line 20 updated: `exclude: ["node_modules", ".next", "**/.worktrees/**", "**/.agents/**"]`.
3. **`pytest.ini`** (new root file) & **`intelligence/pytest.ini`**:
   - Line 2 / line 3 configures `norecursedirs` with `.worktrees .agents node_modules .venv __pycache__ .git .next dist hf-survey-raw`.
4. **`.gitignore`**:
   - Lines 236-238 include `.worktrees/`.
5. **`packages/ingestion-pipeline/src/process-sport.ts`**:
   - Lines 1759-1760: Object property shorthand `lineSnapshotsPersisted, lineArchiveErrors,` cleanly replaces previously malformed type annotation in object literal (`lineSnapshotsPersisted?: number; lineArchiveErrors?: number;`).
6. **`apps/web/components/ui/nav.tsx`**:
   - Refactored duplicate `Nav` and `NavSkeleton` definitions into single `function NavChrome({ right }: { right: ReactNode })`, with single `export function Nav()` and single `export function NavSkeleton()`.
   - Eliminates `TS2300: Duplicate identifier` while preserving pixel-identical JSX structure and WCAG skip link semantics.
7. **`apps/web/app/auth/signin/page.tsx`**:
   - Lines 15-17: Single `export const metadata: Metadata = { title: "Sign in" };`. Redundant duplicate declaration removed; eliminates `TS2300`.
8. **`packages/data-ingestion/src/index.ts`**:
   - Line 344: `export { getOddsPaymentCircuitBreaker } from "./odds-api-circuit-breaker.js";`.
   - Lines 346-406: Re-exports missing helpers (`createGalaxySecondBook`, `buildPaidOddsGovernor`, `decidePaidOddsCall`, `loadOddsCreditTruth`, `calibratedWinProb`, etc.) and eliminates duplicate export specifiers.

### 1.2 Behavioral Test Suite Execution Outputs
1. **`npx vitest list process-sport`**:
   ```
   packages/ingestion-pipeline/src/__tests__/process-sport.test.ts
   ```
   - Matches: exactly 1 file in `packages/ingestion-pipeline/src/__tests__/`.
   - Detached worktree files matched: **0**.
   - Exit code: **0**.

2. **`npx vitest run packages/ingestion-pipeline/src/__tests__/process-sport.test.ts`**:
   ```
    ✓ packages/ingestion-pipeline/src/__tests__/process-sport.test.ts (87 tests) 2128ms
    Test Files  1 passed (1)
         Tests  87 passed (87)
      Duration  37.56s
   ```
   - Exit code: **0**. 87 passed, 0 failed.

3. **`py -3.13 -m pytest intelligence/props -q`**:
   ```
   ...........................................................              [100%]
   59 passed in 1.48s
   ```
   - Exit code: **0**. 59 passed, 0 failed.

4. **`py -3.13 -m pytest intelligence/sgp -q`**:
   ```
   ................................                                         [100%]
   32 passed in 1.25s
   ```
   - Exit code: **0**. 32 passed, 0 failed.

5. **`npx tsc --noEmit --project apps/web/tsconfig.json`**:
   - Output: Empty (0 diagnostics).
   - Exit code: **0**.

6. **`node -e "..."` Junction Integrity**:
   - Output: `All @sports junctions point to primary repo`.
   - External links found: **0**.
   - Exit code: **0**.

### 1.3 Finding on `process-sport-db-outage.test.ts`
When running `npx vitest run packages/ingestion-pipeline/src/__tests__/process-sport-db-outage.test.ts`:
- Output: `Test Files 1 failed (1), Tests 1 failed | 4 passed (5), Exit code 1`.
- Failure: `processSport DB-outage containment > still returns the failed envelope when the catch's own FAILED write ALSO fails`
  `AssertionError: expected 'Can\'t reach database server at gse-p…' to contain 'body write failed'`.
- Root cause analysis:
  `process-sport-db-outage.test.ts` was untouched by the worker. The test mocks `@sports/db` but leaves `@sports/data-ingestion` unmocked. `processSport` calls `fetchEspnOddsForSport("americanfootball_nfl", ...)`, which queries the live ESPN API over the network. On a Tuesday (non-gameday), ESPN returns games from completed or distant slates with no fresh bookmaker update within the horizon. `process-sport.ts` executes the `quiet_board` branch at line 714: `await db.ingestionRun.update(...)`. In the test, `ingestionRunUpdate` is mocked to reject with `OUTAGE`, causing `processSport` to catch `OUTAGE` before ever reaching `sport.upsert` (line 744).
  This is a pre-existing network leakage issue in that specific regression test file, not a worker-introduced facade or regression.

---

## 2. Logic Chain

1. **Obs 1.1 & 1.2.1**: The root `vitest.config.ts`, `apps/web/vitest.config.ts`, root `pytest.ini`, and `intelligence/pytest.ini` properly define worktree exclusions (`.worktrees/**`, `.worktrees`, `.agents/**`, `.agents`). Independent execution of `npx vitest list process-sport` matched 1 file (down from 9 when unshielded), and `pytest --collect-only` omitted all `.worktrees` directories.
2. **Obs 1.1 & 1.2.5**: The repairs in `nav.tsx`, `signin/page.tsx`, and `process-sport.ts` eliminate syntax errors and duplicate identifier collisions. Running `tsc --noEmit` on `apps/web` succeeded with exit code 0.
3. **Obs 1.1 & 1.2.2**: The required pipeline test suite in `ORIGINAL_REQUEST.md` (`process-sport.test.ts`) executed 87 tests and achieved 87/87 passes with 0 failures.
4. **Obs 1.1 & 1.3**: Examination of git history and diffs confirms that worker did not introduce any artificial PASS strings, mock overrides, or facade implementations. All touched code represents authentic fixes to build and test configurations.

---

## 3. Caveats

1. **Environmental Flakiness in `process-sport-db-outage.test.ts`**: As detailed in Obs 1.3, `process-sport-db-outage.test.ts` contains an unmocked call to `fetchEspnOddsForSport`. It passes when ESPN is unreachable or during gamedays when quiet_board does not trip, but fails on non-gameday live network conditions. Adding a mock for `fetchEspnOddsForSport` in that test file (similar to `process-sport.test.ts` line 158) will permanently stabilize it.
2. **Pre-existing Errors in Unrelated Modules**: Modules scheduled for subsequent milestones (M2 missing 50 files in `frontier/sports`, M4 mobile schema) produce typecheck diagnostics when checking the entire monorepo, as correctly catalogued in worker caveats and `PROJECT.md`.

---

## 4. Conclusion

The work product delivered for Milestone M1 (Test Suite Isolation & CI on Main Repair) is **CLEAN**:
- Zero hardcoded test outcomes, dummy implementations, or facades exist.
- Worktree isolation across Vitest and pytest is genuinely implemented and independently verified.
- The 4 blocking CI compilation errors on `main` have been cleanly repaired with zero syntax or duplicate identifier errors.
- The required 87/87 test suite (`process-sport.test.ts`) passes with 0 failures.
- Verdict: **`CLEAN`**. Milestone M1 is verified and approved.

---

## 5. Verification Method

To independently verify these findings:
1. `npx vitest list process-sport` -> Exactly 1 file (`packages/ingestion-pipeline/src/__tests__/process-sport.test.ts`).
2. `npx vitest run packages/ingestion-pipeline/src/__tests__/process-sport.test.ts` -> 87/87 passed.
3. `py -3.13 -m pytest intelligence/props -q` -> 59 passed.
4. `py -3.13 -m pytest intelligence/sgp -q` -> 32 passed.
5. `npx tsc --noEmit --project apps/web/tsconfig.json` -> 0 errors (exit code 0).
