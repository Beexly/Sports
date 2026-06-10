# P0 Launch Blocker Closure Report

Date: 2026-06-09

## Executive Result

The verified runnable app is no longer failing with the original public 500/error-card behavior in local production mode. The route/API fixes are in place, tests pass, and build passes.

Launch remains NO-GO because `/api/ready` still fails dependency checks and Player Lab/current roster scope is not verified.

## Closed

- Homepage production error card replaced by successful render.
- `/board` 500 replaced by controlled degraded state.
- `/api/board/state` 500 replaced by structured degraded payload.
- `/api/promotions` 500 replaced by empty degraded public payload.
- `/api/health` split into liveness/readiness semantics.
- Test suite repaired.
- Build repaired.
- Public static bundle scan completed.
- `DEV_FAKE_ADMIN` guarded from production and removed from client-visible copy.

## Root-Caused But Not Closed

- `/api/ready` fails because DB and ingestion dependencies are unavailable.
- Player Lab/current roster truth is not wired to verified current roster ingestion.
- Dirty tree remains high-risk and must be staged deliberately.

## Verification

- `npm.cmd test`: PASS, 168 files and 2,095 tests.
- `npm.cmd run build`: PASS.
- `node scripts/prod-probe.mjs`: FAIL only because `/api/ready` and ingestion freshness return 503.
- Route runtime matrix: public critical routes return 200; `/cockpit` redirects; `/api/ready` returns 503.
- Screenshots captured for seven critical public pages at desktop and mobile sizes.

## Final Recommendation

Do not deploy. First make production-like DB/ingestion readiness green, resolve Player Lab/current-roster scope, and stage only the reviewed P0 patch subset from the mixed working tree.
