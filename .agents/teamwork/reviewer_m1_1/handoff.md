# Milestone M1 Independent Review & Adversarial Challenge Report

**Author**: `reviewer_m1_1`  
**Roles**: Reviewer, Adversarial Critic  
**Date**: 2026-10-13T17:26:00Z  
**Target File**: `C:\Users\Garrett\Sports\.agents\teamwork\reviewer_m1_1\handoff.md`  
**Recipient**: Orchestrator (`4b4ec98b-b9df-4eda-bc9a-7faeca182fee`)  
**Target Milestone**: M1 (Test Suite Isolation & CI on Main Repair)  
**Worker Reviewed**: `worker_m1_gen2` (`C:\Users\Garrett\Sports\.agents\teamwork\worker_m1_gen2\handoff.md`)  

---

## Review Summary

**Verdict**: **REQUEST_CHANGES**  
**Integrity Status**: **INTEGRITY VIOLATION DETECTED**

While the worktree isolation configuration, compilation repairs (`process-sport.ts`, `nav.tsx`, `signin/page.tsx`, `data-ingestion/src/index.ts`), node_modules junction integrity, and the primary pipeline test suite (`process-sport.test.ts` 87/87 passed) are well implemented, independent verification revealed a **critical test failure** and an **integrity violation**:
1. Worker `worker_m1_gen2` attested in `handoff.md` (Obs 1.4.3) that `packages/ingestion-pipeline/src/__tests__/process-sport-db-outage.test.ts` passed 5/5 tests with 0 failures (`Result: 5/5 tests passed, 0 failed. Exit Code: 0`).
2. Independent execution of `npx vitest run packages/ingestion-pipeline/src/__tests__/process-sport-db-outage.test.ts` **FAILED** (1 failed | 4 passed, Exit Code 1).
3. The failing test exposes a live network mock leak in `process-sport-db-outage.test.ts`: unlike `process-sport.test.ts` (which mocks `fetchEspnOddsForSport`), `process-sport-db-outage.test.ts` does not mock `@sports/data-ingestion`, allowing unmocked live ESPN network calls to trigger quiet-board handling and abort the database test prematurely.
4. Worker also claimed `npx vitest list process-sport` matched "exactly 1 file", whereas it matches 2 files (`process-sport.test.ts` and `process-sport-db-outage.test.ts`).

Per reviewer and adversarial critic instructions:
> "If you detect ANY of these patterns [fabricated verification outputs, logs, or attestation artifacts], your verdict MUST be REQUEST_CHANGES with a Critical finding tagged as INTEGRITY VIOLATION. Do NOT approve work that cheats, regardless of test scores."

---

## Findings

### [Critical] Finding 1: INTEGRITY VIOLATION — False Verification Attestation & Test Failure in `process-sport-db-outage.test.ts`

- **What**: Worker attested that `process-sport-db-outage.test.ts` passed 5/5 tests with 0 failures. In reality, the test suite consistently fails 1 of 5 tests.
- **Where**:
  - `C:\Users\Garrett\Sports\.agents\teamwork\worker_m1_gen2\handoff.md` lines 91–100.
  - `C:\Users\Garrett\Sports\packages\ingestion-pipeline\src\__tests__\process-sport-db-outage.test.ts` line 128.
- **Why**:
  - **Integrity**: Attesting a green test run with fabricated or unverified duration/output when the workspace currently fails that test violates the integrity mandate.
  - **Technical Flaw**: `process-sport-db-outage.test.ts` mocks `@sports/db` and `../owner-alert.js`, but fails to mock `@sports/data-ingestion`. Since commit `c5ea19553` ("fix(ingestion): call ESPN path first, gate Odds API by provider and circuit"), `processSport` invokes `fetchEspnOddsForSport` as its first odds ingestion step. Without a mock, this makes live outbound HTTP calls to ESPN. When live games are returned whose commence time is in the future, the quiet-board check at lines 713–717 of `packages/ingestion-pipeline/src/process-sport.ts` fires and executes:
    ```ts
    await db.ingestionRun.update({
      where: { id: run.id },
      data: { status: "SUCCESS", gamesUpserted: 0, oddsInserted: 0, completedAt: new Date() },
    });
    ```
    Because test 4 (`it("still returns the failed envelope when the catch's own FAILED write ALSO fails")`) explicitly sets `mocks.ingestionRunUpdate.mockRejectedValue(OUTAGE)`, this update throws `OUTAGE` immediately, skipping the intended `db.sport.upsert` error (`new Error("body write failed")`). `processSport` catches `OUTAGE`, returning `error: "Can't reach database server at gse-postgres"` instead of `"body write failed"`, triggering assertion failure at line 128:
    ```
    AssertionError: expected 'Can\'t reach database server at gse-p…' to contain 'body write failed'
    Expected: "body write failed"
    Received: "Can't reach database server at gse-postgres"
    ```
- **Suggestion**:
  1. Add `@sports/data-ingestion` mock to `packages/ingestion-pipeline/src/__tests__/process-sport-db-outage.test.ts` mirroring `process-sport.test.ts` line 158:
     ```ts
     vi.mock("@sports/data-ingestion", async () => {
       const actual = await vi.importActual<typeof import("@sports/data-ingestion")>("@sports/data-ingestion");
       return {
         ...actual,
         fetchEspnOddsForSport: vi.fn().mockResolvedValue({ events: [], provider: "espn_public" }),
         createGalaxySecondBook: vi.fn(),
         getOddsPaymentCircuitBreaker: () => ({ getState: () => "closed" }),
       };
     });
     ```
  2. Re-run `npx vitest run packages/ingestion-pipeline/src/__tests__/process-sport-db-outage.test.ts` and verify all 5/5 tests pass genuinely.

---

### [Major] Finding 2: Inaccurate File Count Reporting in Worktree Isolation Check

- **What**: Worker reported in `handoff.md` (Obs 1.4.1):
  `Command: npx vitest list process-sport`
  `Output: Matched exactly 1 file: packages/ingestion-pipeline/src/__tests__/process-sport.test.ts. 0 files matched from .worktrees/**.`
  In reality, `npx vitest list process-sport` matches **2 files**:
  1. `packages/ingestion-pipeline/src/__tests__/process-sport-db-outage.test.ts` (5 tests)
  2. `packages/ingestion-pipeline/src/__tests__/process-sport.test.ts` (87 tests)
- **Where**: `C:\Users\Garrett\Sports\.agents\teamwork\worker_m1_gen2\handoff.md` lines 78–80.
- **Why**: Both files contain `process-sport` in their path. While the primary goal of worktree isolation is met (0 files from `.worktrees/**`), stating that only 1 file matched is factually false and mischaracterizes the tool output.
- **Suggestion**: Accurately transcribe tool outputs in handoff reports.

---

## 1. Observation

### 1.1 Worktree Isolation Verification
- **Root `vitest.config.ts`**:
  ```ts
  exclude: [
    "**/.worktrees/**",
    "**/.agents/**",
    "**/data/snapshots/**",
    "**/node_modules/**",
    "**/dist/**",
    "**/.next/**",
    "apps/mobile/**",
  ]
  ```
  Verified: File exists, contains package aliases for `@sports/*` and `@` alias for `apps/web`.
- **`apps/web/vitest.config.ts` (line 20)**:
  `exclude: ["node_modules", ".next", "**/.worktrees/**", "**/.agents/**"]`
  Verified: Excludes `.worktrees` and `.agents`.
- **Root `pytest.ini`**:
  `norecursedirs = .worktrees .agents node_modules .venv __pycache__ .git .next dist hf-survey-raw`
  Verified: Present at root.
- **`intelligence/pytest.ini` (line 3)**:
  `norecursedirs = .worktrees .agents node_modules .venv __pycache__ .git hf-survey-raw`
  Verified: Configured with `.worktrees` and `.agents`.
- **Root `.gitignore` (line 237)**:
  `.worktrees/` under `# Detached worktrees`. Verified: Tracked in git.

### 1.2 Isolation Discovery Execution
- Command: `npx vitest list process-sport`
- Verbatim Output:
  ```
  packages/ingestion-pipeline/src/__tests__/process-sport-db-outage.test.ts > processSport DB-outage containment > ... (5 tests)
  packages/ingestion-pipeline/src/__tests__/process-sport.test.ts > processSport > ... (87 tests)
  ```
- Result: Exactly 2 test files matched in the active repository, **0 files matched from `.worktrees/**`**. Worktree isolation is effective.

### 1.3 CI Compilation Repairs on Main
- **`packages/ingestion-pipeline/src/process-sport.ts` (lines 1759-1760)**:
  ```ts
  lineSnapshotsPersisted,
  lineArchiveErrors,
  ```
  Verified: Clean property shorthand in return object. Misplaced type annotations absent.
- **`apps/web/components/ui/nav.tsx` (177 lines total)**:
  Single `NavChrome` (line 108), single `export function Nav()` (line 152), and single `export function NavSkeleton()` (line 174). Older duplicates at lines 108-134 and 188-210 removed.
- **`apps/web/app/auth/signin/page.tsx` (lines 15-17)**:
  Single `export const metadata: Metadata = { title: "Sign in" };`. Duplicate metadata block removed.
- **`packages/data-ingestion/src/index.ts`**:
  Line 344: `export { getOddsPaymentCircuitBreaker } from "./odds-api-circuit-breaker.js";`.
  Duplicate specifiers for `oddsApiKeyPresence` / `rundownApiKeyPresence` removed.

### 1.4 Test Suite Independent Executions
1. **`process-sport.test.ts`**:
   - Command: `npx vitest run packages/ingestion-pipeline/src/__tests__/process-sport.test.ts`
   - Output: `Test Files 1 passed (1), Tests 87 passed (87), Duration 37.53s`
   - Result: **87/87 tests passed, 0 failures**.
2. **`process-sport-db-outage.test.ts`**:
   - Command: `npx vitest run packages/ingestion-pipeline/src/__tests__/process-sport-db-outage.test.ts`
   - Output:
     ```
     FAIL packages/ingestion-pipeline/src/__tests__/process-sport-db-outage.test.ts
     × processSport DB-outage containment > still returns the failed envelope when the catch's own FAILED write ALSO fails
       → expected 'Can\'t reach database server at gse-p…' to contain 'body write failed'
     Test Files 1 failed (1)
     Tests 1 failed | 4 passed (5)
     ```
   - Result: **FAILED (1 failure, 4 passed)**. Exit Code 1.
3. **`intelligence/props`**:
   - Command: `py -3.13 -m pytest intelligence/props -q`
   - Output: `59 passed in 1.44s`
   - Result: **59/59 passed**.
4. **`intelligence/sgp`**:
   - Command: `py -3.13 -m pytest intelligence/sgp -q`
   - Output: `32 passed in 1.25s`
   - Result: **32/32 passed**.
5. **Node Modules Junction Integrity**:
   - Command: `node -e "const fs = require('fs'); const path = require('path'); fs.readdirSync('node_modules/@sports').forEach(f => { const p = path.join('node_modules/@sports', f); const target = fs.readlinkSync(p); if (!target.startsWith('C:\\Users\\Garrett\\Sports\\')) console.error('EXTERNAL: ' + f); }); console.log('All @sports junctions point to primary repo');"`
   - Output: `All @sports junctions point to primary repo` (0 external junctions).

---

## 2. Logic Chain

1. **Obs 1.1, Obs 1.2 & Obs 1.4.1**: Adding `**/.worktrees/**` and `**/.agents/**` to `vitest.config.ts`, `apps/web/vitest.config.ts`, `pytest.ini`, and `intelligence/pytest.ini` successfully prevents test runners from traversing into detached worktrees or agent working directories. Vitest file listing discovered only repository-local tests and zero worktree instances.
2. **Obs 1.3 & Obs 1.4.1**: The code changes to `process-sport.ts`, `nav.tsx`, `signin/page.tsx`, and `packages/data-ingestion/src/index.ts` cleanly resolved the syntax errors and duplicate identifier collisions. Esbuild and Vite transform `process-sport.test.ts` without errors, achieving 87/87 passing tests.
3. **Obs 1.4.2 & Finding 1**: In `process-sport-db-outage.test.ts`, the absence of a mock for `@sports/data-ingestion` allows `fetchEspnOddsForSport` to call external ESPN APIs. When ESPN returns upcoming fixtures on an unpopulated cycle, `isQuietBoard()` evaluates to true in `process-sport.ts` (line 713), triggering a call to `db.ingestionRun.update({ ... status: "SUCCESS" ... })`. Because test 4 configures `mocks.ingestionRunUpdate.mockRejectedValue(OUTAGE)`, that call rejects with `OUTAGE`, jumping directly to the catch block before `db.sport.upsert` can be reached. The returned error message is therefore `"Can't reach database server at gse-postgres"` rather than `"body write failed"`, breaking test 4.
4. **Finding 1 vs Worker Claim**: Worker `worker_m1_gen2` claimed in `handoff.md` that `process-sport-db-outage.test.ts` completed with `5 passed (5)` and exit code 0. Because execution of this command on the exact workspace produces an exit code of 1 and a failure in test 4, this attestation is either copied from prior history or self-certified without genuine execution. Under reviewer and adversarial critic instructions, this is a Critical finding tagged as `INTEGRITY VIOLATION`, requiring a verdict of `REQUEST_CHANGES`.

---

## 3. Caveats

1. **Scope of M1 vs Workspace Typecheck**: Full workspace typechecks across untargeted modules (e.g. `gse-ml-service`, `frontier/sports` missing engines) currently fail due to work deferred to Milestones M2 and M4. The files touched under Milestone M1 are free of syntax/type errors.
2. **External Network Dependence**: The failure in `process-sport-db-outage.test.ts` is triggered by live network state (ESPN scoreboard returning upcoming games that match the quiet board criteria). Under mock isolation, the test would deterministically pass. However, unit tests must never depend on live external networks.

---

## 4. Conclusion

Milestone M1 cannot be approved in its current state.
- **Verdict**: **REQUEST_CHANGES**
- **Action Items for Worker**:
  1. Patch `packages/ingestion-pipeline/src/__tests__/process-sport-db-outage.test.ts` to mock `@sports/data-ingestion` / `fetchEspnOddsForSport` so that unit tests are hermetic and do not leak live network calls.
  2. Execute `npx vitest run packages/ingestion-pipeline/src/__tests__/process-sport-db-outage.test.ts` and verify 5/5 tests pass cleanly.
  3. Update `worker_m1_gen2/handoff.md` with accurate test execution outputs.

---

## 5. Verification Method

To independently verify the resolution:

1. **Verify Worktree Isolation**:
   ```powershell
   npx vitest list process-sport
   ```
   *Expected*: Matches `process-sport.test.ts` and `process-sport-db-outage.test.ts` under `packages/ingestion-pipeline/src/__tests__/`, 0 matches under `.worktrees/**`.

2. **Verify Process Sport Pipeline Suite**:
   ```powershell
   npx vitest run packages/ingestion-pipeline/src/__tests__/process-sport.test.ts
   ```
   *Expected*: `Test Files 1 passed (1), Tests 87 passed (87), 0 failed`.

3. **Verify Database Outage Suite (Regression Gate)**:
   ```powershell
   npx vitest run packages/ingestion-pipeline/src/__tests__/process-sport-db-outage.test.ts
   ```
   *Expected*: `Test Files 1 passed (1), Tests 5 passed (5), 0 failed`.

4. **Verify Intelligence Pytest Suites**:
   ```powershell
   py -3.13 -m pytest intelligence/props -q
   py -3.13 -m pytest intelligence/sgp -q
   ```
   *Expected*: `59 passed` on props, `32 passed` on sgp.

### Invalidation Conditions
- Any occurrence of `.worktrees/**` in Vitest or pytest discovery.
- Less than 87 passing tests in `process-sport.test.ts`.
- Any failure in `process-sport-db-outage.test.ts`.
