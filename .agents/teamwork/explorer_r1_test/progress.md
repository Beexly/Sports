# Progress - explorer_r1_test

- Status: In Progress
- Last visited: 2026-10-12T03:42:20Z
- Current step: Diagnosing root Vitest scanning into .worktrees and isolating process-sport.test.ts

## Key Discoveries
1. Root `package.json` has NO `vitest.config.ts` or `vitest.workspace.ts`.
2. When `vitest run packages/ingestion-pipeline/src/__tests__/process-sport.test.ts` is executed from root `C:\Users\Garrett\Sports`, Vitest treats the path argument as a pattern match across all subdirectories.
3. Vitest's default exclude does NOT exclude `.worktrees/**`.
4. As a result, Vitest found 9 copies of `process-sport.test.ts` (1 in active repo + 8 in `.worktrees/**`), executing 735 tests instead of 1 suite. 3 test files in stale `.worktrees` failed!
5. Now checking test suite behavior inside `packages/ingestion-pipeline`.
