# Command Center Next Actions

As of: 2026-06-09

## Current Recommendation

Do not launch. The command-center docs are now source-verified, but the app is blocked by runtime, DB, test, prod-probe, and roster-scope issues.

## Required Before Launch

1. Confirm the authoritative app clone and branch.
2. Fix DB/auth runtime failures.
3. Fix /, /board, /api/health, /api/board/state, /api/promotions.
4. Fix full npm.cmd test failures.
5. Rerun route/screenshot probes.
6. Prove or remove roster/player-product claims.
7. Keep promotions shell-only until legal/compliance and data approval.

See docs/command-center/build-queue/REAL_APP_NEXT_ACTIONS.md for the Claude-ready sequence.
