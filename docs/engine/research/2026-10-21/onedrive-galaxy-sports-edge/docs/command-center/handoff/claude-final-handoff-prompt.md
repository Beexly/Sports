# Claude Final Handoff - Real App Source Verified

As of: 2026-06-09

## Real App Repo

- Path: C:\Users\Garrett\Sports
- Branch observed: safety/sports-wip-2026-06-04
- Remote observed: https://github.com/BeeXly/Sports.git
- Dirty state observed: 62 entries

## Commands Already Run

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

## Results

- typecheck: PASS
- lint: PASS
- brand-safety tests: PASS
- cockpit tests: PASS
- full npm.cmd test: FAIL, 3 failures
- build: PASS with Prisma auth errors
- prod-probe: FAIL
- screenshots: captured for static routes; home shows error; picks desktop timed out

## Route Problems

- / returns 500.
- /board returns 500.
- /api/health returns 503.
- /api/board/state returns 500.
- /api/promotions returns 500.

## First Fix Cards

1. BUILD-REALAPP-006
2. BUILD-REALAPP-002
3. BUILD-REALAPP-001
4. BUILD-REALAPP-003
5. BUILD-REALAPP-004
6. BUILD-REALAPP-005
7. BUILD-REALAPP-007
8. BUILD-REALAPP-011
9. BUILD-REALAPP-012
10. BUILD-REALAPP-015

## Boundaries

- Do not deploy without approval.
- Do not touch live Stripe or affiliate links without approval.
- Do not expose founder-only methodology.
- Do not revert unrelated dirty changes.
- Do not claim launch readiness until prod-probe, full tests, screenshots, and roster-scope decisions are green.
