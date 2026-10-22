# App Verification Run

As of: 2026-06-09

## Result Summary

- typecheck: PASS
- lint: PASS
- brand-safety tests: PASS, 727 tests
- cockpit tests: PASS, 224 tests
- full npm.cmd test: FAIL, 3 failures
- trust guard direct: PASS
- Claude API guard direct: PASS
- build: PASS, but with Prisma auth errors during static generation
- local production start: PASS on http://localhost:3210 from apps/web
- prod-probe: FAIL
- snapshot regeneration: FAIL because / returned 500, but 8 of 9 requested snapshots were written

## Full Test Failures

1. __tests__/guardrails.test.ts - trust-gate exits 0 on a clean repo. The direct npm.cmd run guard:trust command passed.
2. __tests__/guardrails.test.ts - claude-api-usage exits 0 with direct calls limited to approved paths. The direct npm.cmd run guard:claude-api command passed.
3. apps/web/lib/cockpit/intelligence-control-plane.ts - expected /** file header; file starts with an import.

## Build Warning

npm.cmd run build completed and generated static pages, but emitted Prisma authentication errors for localhost database user sports. This is not clean launch evidence even though the build process exited successfully.

## Runtime Failure Root Cause

The local production server repeatedly logged PrismaClientInitializationError: authentication failed against database server localhost for user sports. This produced /api/health 503 and route/API failures.

## Commands Run

- Get-Content attached pasted-text.txt
- git rev-parse --show-toplevel; git branch --show-current; git remote -v
- candidate clone inventory across C:\Users\Garrett\Sports*
- Get-ChildItem apps/web/app, apps/web/components, apps/web/lib, scripts, packages/db/prisma, .github/workflows
- rg for BUILD, GSE Rating, Player Lab, roster, Najee, Rico, promotions, Stripe, auth, entitlement, demo, mock, method, weights
- npm.cmd run typecheck
- npm.cmd run lint
- npm.cmd run test:brand-safety
- npm.cmd run test:cockpit
- npm.cmd test
- npm.cmd run guard:trust
- npm.cmd run guard:claude-api
- npm.cmd run build
- npx.cmd next start -p 3210 from apps/web
- APP_URL=http://localhost:3210 node scripts/prod-probe.mjs
- manual Invoke-WebRequest route matrix
- APP_URL=http://localhost:3210 node scripts/regenerate-launch-snapshots.mjs
- npx.cmd playwright --version
- Playwright screenshot capture for home, pricing, promotions, methodology, brief, picks
- web verification of Najee Harris and Rico Dowdle against NFL/team sources
