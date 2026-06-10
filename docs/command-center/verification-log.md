# Verification Log

Date: 2026-06-09

## Commands Run

- `git status --short`
- `git diff --stat`
- `git diff --name-only`
- `git rev-parse --show-toplevel`
- `git branch --show-current`
- `git remote -v`
- `git log --oneline -1`
- `npm.cmd run test --workspace=apps/web -- __tests__/board-gate-decisions.test.ts __tests__/promotions-public-payload.test.ts __tests__/health-route.test.ts __tests__/entitlements-dev-admin.test.ts __tests__/prod-probe-script.test.ts __tests__/lib-file-header.test.ts`
- `npm.cmd run guard:trust`
- `npm.cmd run build`
- `npm.cmd test`
- `npx.cmd next start -p 3211`
- `Invoke-WebRequest http://localhost:3211/...` route matrix
- `$env:APP_URL='http://localhost:3211'; node scripts/prod-probe.mjs`
- Public static bundle `rg` scans for secrets/method leakage patterns.
- In-app browser screenshot capture for desktop/mobile public routes.
- `rg -n "Player Lab|player lab|PlayerLab|GSE Rating|gse rating|roster truth|current roster" apps packages docs -g '!docs/research/**' -g '!reports/**'`

## Passing Evidence

- Build: PASS.
- Full tests: PASS, 168 files, 2,095 tests.
- Public route matrix: critical public pages return 200.
- Public static bundle scan: no checked sensitive patterns found after rebuild.
- Screenshots: 14 captured, no framework error overlay found in manifest.

## Failing Evidence

- Prod probe: FAIL because `/api/ready` and `/api/ready?check=ingestion-freshness` return 503.

## Local Server

Production build was tested on:

`http://localhost:3211`

The server was started only for local verification. It should not be treated as deployed production.
