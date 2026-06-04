# VALIDATION FAILURE DIAGNOSIS (2026-05-27)

## Commands run
1. `npm run lint` (failed due PowerShell execution policy)
2. `npm.cmd run lint` (pass)
3. `npm.cmd run build` (pass)
4. `npm.cmd run typecheck` (initial fail)
5. `npm.cmd run build; npm.cmd run typecheck` (pass after rerun)
6. `npm.cmd run test` (pass)
7. `npm.cmd run test:smoke` (fail: script missing)

## Exact errors observed
- Environment invocation issue:
  - `npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system.`
- Typecheck initial failure (`TS6053`):
  - Missing `.next/types/**` entries referenced by `apps/web/tsconfig.json` include pattern.
  - Example:
    - `error TS6053: File 'C:/Users/Garrett/Sports/apps/web/.next/types/app/about/page.ts' not found.`
- Smoke test config gap:
  - `npm error Missing script: "test:smoke"`

## Diagnosis
- Lint: green when using `npm.cmd`.
- Build: green (Next.js build succeeds). During static generation, Prisma logs auth failures against localhost, but build still completes.
- Typecheck: first run fails with TS6053, then passes after explicit build rerun. This matches build-artifact order issue.
- Test: green (`154` files, `1806` tests passed).
- test:smoke: missing script in root package scripts (config gap).

## Recommended next actions
1. Standardize Windows invocation in runbook: use `npm.cmd` in PowerShell-restricted environments.
2. Keep validation order as `build -> typecheck` (or adjust tsconfig/script design later with explicit owner approval).
3. For `test:smoke` gap (no package edit in this pass), choose one:
   - add `test:smoke` script in a later approved patch,
   - or update validation checklist to match existing scripts,
   - or document smoke as manual `scripts/smoke-prod.sh`/CI workflow step.