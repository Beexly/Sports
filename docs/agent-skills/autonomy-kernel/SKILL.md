---
name: autonomy-kernel
description: Operate the autonomous plan→act→verify cycle without ever flipping a public gate or inventing data.
---

# Autonomy kernel

## Purpose
`planAutonomyCycle()` decides what the system does next. It is a **pure,
deterministic** function — no LLM in the decision path — so every cycle is
reproducible and testable. The executor then runs *only* the subset of that plan
marked safe to run unattended.

Two files, one boundary:

| File | Role |
|---|---|
| `apps/web/lib/autonomy/operating-kernel.ts` | Decides. Pure. Emits an ordered `AutonomyAction[]`. |
| `apps/web/lib/autonomy/execute-autonomy-cycle.ts` | Acts. Runs only `autonomousSafe && !requiresOwner`. |

Every action carries two independent flags. **Both** are checked before anything
runs (`executableTargetFor`: `if (!action.autonomousSafe || action.requiresOwner) return null`):

- `autonomousSafe` — safe to run with no human present
- `requiresOwner` — needs a founder decision regardless

## Commands
```bash
# The kernel's own tests — run these before touching either file
npx vitest run apps/web/__tests__/autonomy-kernel.test.ts
npx vitest run apps/web/__tests__/autonomy-executor.test.ts

# Cron entry points that call the kernel
#   apps/web/app/api/cron/autonomy-cycle/route.ts
#   apps/web/app/api/cron/health-alert/route.ts
npm run nova:cycle:dry      # dry run, no side effects
npm run nova:cycle          # real cycle
npm run guardrails          # includes ai-control-plane sealing + trust gate
```

## How to read a plan
`AutonomySeverity` is `P0 | P1 | P2 | P3 | OK`. `AutonomyActionKind` is a closed
union — 14 kinds today, from `RUN_FREE_SETTLE` and `RUN_REFRESH_ODDS_FREE`
through `HOLD_PUBLIC_GATES` and `NO_OP_HEALTHY`. A healthy system plans
`NO_OP_HEALTHY`; that is a success state, not a stall.

## Extending it
Add capability by widening `AutonomyActionKind` and returning the new action from
`planAutonomyCycle()` — **not** by adding a side effect inside the kernel. The
kernel must stay pure; if it starts doing I/O it stops being testable and the
whole safety argument collapses.

For an action to become executable, it needs an entry in
`EXECUTABLE_CRON_TARGETS` **and** both flags set correctly. Default a new action
to `requiresOwner: true` and only relax it once you can state, in the PR, what
the worst case is if it fires at 3am with nobody watching.

## Related
- `apps/web/lib/autonomy/safe-cron-targets.ts` — the allowlist of reachable jobs
- `apps/web/lib/autonomy/settlement-learning.ts`, `revenue-ladder.ts`
- `docs/frontier/MODEL_PROMOTION_GATE_CONTRACT.md` — promotion is a *separate*
  gate; the kernel never promotes a model (see the `model-promotion-gate` skill)
- `docs/agent-skills/deploy-readiness/SKILL.md`

## Do-not-dos
- Do **not** flip `LIVE_BOARD` / `PUBLISH_LEDGER` / `PUBLIC_PICKS` /
  `PERFORMANCE_STATS` from the kernel. The file header states it never does;
  keep it true.
- Do **not** invent scores, auto-publish, or place bets.
- Do **not** put an LLM call in `planAutonomyCycle()`. Determinism is the feature.
- Do **not** set `autonomousSafe: true` on anything that writes to a public
  surface, moves money, or mutates settled results.
- Do **not** bypass the two-flag check in the executor "just for this one action."
- Do **not** widen `EXECUTABLE_CRON_TARGETS` without a test proving the target is
  idempotent under repeat firing.
