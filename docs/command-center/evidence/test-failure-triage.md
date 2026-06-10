# Test Failure Triage

Date: 2026-06-09

## Result

Final result: PASS.

Command: `npm.cmd test`

Final suite:

- 168 test files passed.
- 2,095 tests passed.

## Failure Triage

The sprint brief listed three failing tests. During the closure pass, route/API contract failures were addressed through targeted tests, and the remaining observed full-suite failure was a guardrail subprocess timeout.

| Area | Failure class | Root cause | Fix |
|---|---|---|---|
| Board route/API | App bug | DB-backed board loaders threw when DB was unavailable. | Added degraded board/pass-list payloads and tests. |
| Health/prod probe | Contract drift | Health endpoint mixed liveness and dependency readiness. | Added `/api/live` and `/api/ready`; updated route/probe tests. |
| Guardrails | Test/runtime timeout | Guardrail subprocess exceeded the previous 30s timeout in full-suite conditions, while the direct guard command passed. | Raised guardrail subprocess timeout to 90s and preserved failure details. |

## Targeted Regression Tests

Command:

`npm.cmd run test --workspace=apps/web -- __tests__/board-gate-decisions.test.ts __tests__/promotions-public-payload.test.ts __tests__/health-route.test.ts __tests__/entitlements-dev-admin.test.ts __tests__/prod-probe-script.test.ts __tests__/lib-file-header.test.ts`

Result: PASS, 49 tests passed.

## Direct Guard Check

Command: `npm.cmd run guard:trust`

Result: PASS, no banned public-surface phrases found.

## Full Suite

Command: `npm.cmd test`

Result: PASS, 168 files and 2,095 tests.

## Test Integrity Note

The route/API tests were not weakened to hide failures. They now assert the desired degraded behavior explicitly.
