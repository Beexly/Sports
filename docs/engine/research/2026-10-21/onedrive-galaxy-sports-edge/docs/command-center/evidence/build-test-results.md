# Build and Test Results

As of: 2026-06-09

| Command | Result | Notes |
| --- | --- | --- |
| npm.cmd run typecheck | PASS | All workspace packages completed. |
| npm.cmd run lint | PASS | @sports/web ESLint max-warnings=0 passed. |
| npm.cmd run test:brand-safety | PASS | 19 files, 727 tests passed. |
| npm.cmd run test:cockpit | PASS | 25 files, 224 tests passed. |
| npm.cmd test | FAIL | 3 failures: two guardrail subprocess tests and one missing file header. |
| npm.cmd run guard:trust | PASS | Direct trust-gate command passed. |
| npm.cmd run guard:claude-api | PASS | Direct direct-Claude-API usage command passed. |
| npm.cmd run build | PASS with warnings | Next build completed but logged Prisma auth failures. |
| node scripts/prod-probe.mjs | FAIL | /api/health did not return 200. |
| node scripts/regenerate-launch-snapshots.mjs | FAIL | / returned 500; 8 snapshots succeeded. |

Launch interpretation: build/lint/typecheck are strong, but full tests and route probes are red. Do not launch.
