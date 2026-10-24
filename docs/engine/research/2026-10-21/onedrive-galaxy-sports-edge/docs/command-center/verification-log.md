# Verification Log

As of: 2026-06-09

## Commands Run

| Command | Result |
| --- | --- |
| `git rev-parse --show-toplevel; git branch --show-current; git status --short; git diff --stat; git log --oneline --decorate --all -n 80` | Git resolves to parent `C:/Users/Garrett`, branch `master`; this workspace is not a clean app repo. |
| `Get-ChildItem` directory count for `docs`, `reports`, `apps`, `app`, `pages`, `components`, `lib`, `data`, `scripts`, `prisma`, `public`, `styles` | `docs` and `reports` present, `apps` empty, app source dirs missing. |
| `rg --files -g '!node_modules' -g '!.git'` | Confirmed visible docs/reports/logs corpus. |
| `rg` project keyword scan | Confirmed extensive prior research/build queues and no visible app implementation tree. |
| Current web roster canary refresh | Rico Dowdle verified on Steelers official player page; Najee Harris not found on Chargers active roster and must be treated as unresolved/free-agent canary unless a current official signing source is found. |
| `node reports\codex\generate-command-center.mjs` | Generated command center with 758 visible artifacts indexed, 20 departments, 26 training manuals, 125 opportunities, and 90 master build cards. |
| `node reports\codex\command-center\validate-command-center.mjs` | Passed: 190 files, 90 cards, 90 JSONL rows, 0 duplicate IDs, 0 missing duplicate-gate fields. |
| Secret pattern scan with `rg` | No matches found in `docs/command-center`, command-center generator, or validator. |

## Checks Not Run

| Check | Reason |
| --- | --- |
| Typecheck | No `package.json` or app source visible in this workspace. |
| Lint | No app package/scripts visible. |
| Unit/integration tests | No test suite visible. |
| Build | No app package/build script visible. |
| Playwright/browser screenshots | No runnable app/dev server visible. |
| Runtime route probes | No app server/routes visible. |
| DB/Prisma validation | No `prisma` directory or DB config visible. |

## Current Verification Status

The command-center docs and build queue are validated. The product itself is not launch-verified from this workspace.

<!-- REAL_APP_EVIDENCE_START -->

## Real App Verification Run - 2026-06-09

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

<!-- REAL_APP_EVIDENCE_END -->
