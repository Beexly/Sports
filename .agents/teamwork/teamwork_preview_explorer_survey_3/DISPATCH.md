# DISPATCH: Survey Explorer 3 (Fantasy Data Unification, Zero Mock Policy & Verification Battery)

## Mission
Investigate R4 (Fantasy Data Unification & Zero Mock Policy) and R5 (Complete Verification Battery) from ORIGINAL_REQUEST.md across the codebase.

## Working Directory
`C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_explorer_survey_3`

## Scope & Instructions
1. Read `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\ORIGINAL_REQUEST.md` thoroughly.
2. Investigate R4:
   - Identify all production surfaces currently using illustrative mock data.
   - Trace live feeds vs honest status states (e.g., "NFL Slate locks Tuesday 09:00 AM. Projection engine refreshing").
   - Trace `/fantasy/dfs` and `/fantasy/optimizer` data ingestion: how they currently load projections, identify `packages/projections-engine` and `SUNMON_DFS_CANDIDATES.csv` (or related cached files), and define how both pages consume the identical cached projection feed to ensure identical salaries, projections, and exposures.
   - Investigate `/fantasy/gm-ledger` and how to display honest pre-season status or real sync instead of hardcoded fictional demo decisions.
3. Investigate R5 & Testing:
   - Investigate test files: `dfs-optimizer.test.ts` (33 tests), `dfs-correlation.test.ts` (6 tests).
   - Investigate scripts in root `package.json` and `apps/web/package.json`:
     * `npm run lint:brand`
     * `npm run guard:trust`
     * `npm run guard:secrets`
     * `npm test`
     * `npx tsc --noEmit` / `npm run typecheck`
   - Run or inspect existing test runners, guards, and linters to identify baseline status, existing failures or pitfalls.
4. Output: Write your comprehensive survey report to `handoff.md` in your working directory. Send a message upon completion.


## 2026-10-11T20:42:15Z
You are Survey Explorer 3 for the Galaxy Sports Edge (GSE) architectural overhaul.
Your working directory is: C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_explorer_survey_3
Read your instructions in C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_explorer_survey_3\DISPATCH.md and C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\ORIGINAL_REQUEST.md.

Focus: R4 (Fantasy Data Unification & Zero Mock Policy) & R5 (Complete Verification Battery).
Investigate:
1. R4 Zero Mock Policy & Fantasy Data Unification:
   - Audit production surfaces for illustrative mock data.
   - Establish honest status states where live feeds are not active (e.g. 'NFL Slate locks Tuesday 09:00 AM. Projection engine refreshing').
   - Ingestion unification: how /fantasy/dfs and /fantasy/optimizer consume the identical cached projection feed (packages/projections-engine / SUNMON_DFS_CANDIDATES.csv) so both report identical player salaries, projections, and exposures.
   - Reconcile /fantasy/gm-ledger for honest pre-season status or real sync instead of fictional demo decisions.
2. R5 Complete Verification Battery:
   - Audit npm run lint:brand (19 suites, 4,661 tests)
   - Audit npm run guard:trust (3,654 scanned files)
   - Audit npm run guard:secrets (14,901 tracked files)
   - Audit npm test across apps/web and workspace packages (specifically dfs-optimizer.test.ts 33/33, dfs-correlation.test.ts 6/6, etc.)
   - Audit npx tsc --noEmit / npm run typecheck
   - Document any existing failures, root causes, and fix strategies.

Maintain progress.md in your working directory.
When complete, write your full findings and implementation blueprint to handoff.md in your working directory, and notify me with send_message.
