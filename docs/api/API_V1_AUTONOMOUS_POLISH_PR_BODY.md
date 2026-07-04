# API v1 Autonomous Polish Hardening PR Body

## Summary

Adds a focused hardening pass for the local-only API v1 shadow stack:

- hostile invalid durable fixture coverage
- runtime table-count validation in the fixture simulator
- reviewer merge checklist
- top-level stack navigation
- explicit CI job for the API v1 boundary guard

## Safety Notes

- No API v1 route.
- No Prisma schema edit.
- No migration.
- No env var.
- No credential.
- No provider call.
- No database execution.
- No AWS/account mutation.
- No billing or partner-account action.

## Verification

```bash
npm.cmd run test --workspace=apps/web -- api-v1-boundary-guard.test.ts api-v1-durable-rehearsal-plan.test.ts api-v1-durable-fixture-report.test.ts api-v1-durable-fixture-simulator.test.ts api-v1-dormant-durable-adapter-interface.test.ts api-v1-durable-adapter-harness.test.ts api-v1-db-schema-proposal.test.ts api-v1-persistence.test.ts api-v1-consumer-registry.test.ts api-v1-shadow-seam.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
npm.cmd run test --workspaces --if-present -- --reporter=dot
git diff --check
```

## Remaining Blocker

Live PR creation still requires GitHub CLI authentication. Database-adjacent implementation remains blocked until the owner approves a disposable database target and rehearsal scope.
