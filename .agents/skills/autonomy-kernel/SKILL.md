---
name: autonomy-kernel
description: Operate the deterministic plan-act-verify autonomy cycle without flipping public gates or inventing data.
effort: medium
allowed-tools: Read, Grep, Glob, Bash(npm run nova:cycle*), Bash(npm run guardrails*), Bash(npm run typecheck*), Bash(npm run lint*), Bash(npm run test*), Bash(node scripts/guardrails/*)
---

# Autonomy kernel

## Purpose
`planAutonomyCycle()` decides what runs next. It is a **pure, deterministic** function with zero LLM calls in the decision path. The executor runs *only* the subset cleared by both safety flags (`executableTargetFor`: `if (!action.autonomousSafe || action.requiresOwner) return null`).

| File | Role |
|---|---|
| `apps/web/lib/autonomy/operating-kernel.ts` | Decides. Pure. Emits an ordered `AutonomyAction[]`. |
| `apps/web/lib/autonomy/execute-autonomy-cycle.ts` | Acts. Runs only `autonomousSafe && !requiresOwner`. |
| `apps/web/lib/autonomy/safe-cron-targets.ts` | Allowlist of idempotent cron endpoints (`EXECUTABLE_CRON_TARGETS`). |
| `apps/web/lib/autonomy/settlement-learning.ts` | Settlement velocity & learning readiness metrics. |
| `apps/web/lib/autonomy/revenue-ladder.ts` | Revenue ladder & phase readiness checks. |

## Verification & Commands
```powershell
npx vitest run --minWorkers=1 --maxWorkers=2 apps/web/__tests__/autonomy-kernel.test.ts apps/web/__tests__/autonomy-executor.test.ts
npm run nova:cycle:dry
npm run guardrails
```
- Scheduled cron entrypoints: `apps/web/app/api/cron/autonomy-cycle/route.ts` and `apps/web/app/api/cron/health-alert/route.ts`.

## Reading & Extending Actions
- `AutonomySeverity` is `P0 | P1 | P2 | P3 | OK`. `AutonomyActionKind` is the closed union defined in `apps/web/lib/autonomy/operating-kernel.ts` (currently 27 action kinds, ending in `NO_OP_HEALTHY` when healthy).
- Extend capability by widening `AutonomyActionKind` and returning the action purely inside `planAutonomyCycle()` without adding I/O.
- Default every new `AutonomyAction` to `requiresOwner: true`; add an `EXECUTABLE_CRON_TARGETS` entry only with an idempotency test proving repeat-firing safety.
- See sibling skill `model-promotion-gate` (`docs/frontier/MODEL_PROMOTION_GATE_CONTRACT.md`) and `deploy-readiness`.

## Guardrails & Completion Criteria
- Never flip `LIVE_BOARD`, `PUBLISH_LEDGER`, `PUBLIC_PICKS_ENABLED`, or `PERFORMANCE_STATS` from the kernel or executor.
- Never invent scores, place wagers, add LLM calls to `planAutonomyCycle()`, or set `autonomousSafe: true` on public writes or money movement.
- Done when `autonomy-kernel.test.ts`, `autonomy-executor.test.ts`, `npm run nova:cycle:dry`, and `npm run guardrails` exit `0`.
