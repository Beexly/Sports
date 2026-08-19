# Deployment timeline — 2026-08-07 evening (CDT)

| When (approx) | SHA / deploy | State | What |
|---------------|--------------|-------|------|
| ~28m earlier | `cd61502d` waitlist + free-spine + webhook | **Ready** (prod) | Last known-good before allow-list |
| ~3m | `6c9c848` fix/autonomy-allowlist-sot (PR #373 preview) | **Error** | Type error build |
| ~3m | `48756564` #373 squash → main | **Error** | Same: `RUN_GENERATE_DRAFTS` not on `AutonomyActionKind` |
| concurrent | Redeploy of `cd61502d` | Building → **Ready** | Production stayed on prior good SHA |
| ~9:29p | `e9bc3c48` action-kind fix | **Ready** (prod) | Unblocked #373; 5-path allow-list live |
| founder | `PUBLIC_PICKS_ENABLED=true` | Live env | Gate open; surface still kill-switch dark until oddsInserted SUCCESS |

## Why #373 failed

```
execute-autonomy-cycle.ts: Type error:
  'RUN_GENERATE_DRAFTS' does not exist in type Partial<Record<AutonomyActionKind, string>>
```

Allow-list SoT listed 5 crons; TypeScript union only had 3 execute kinds. Fix: extend `AutonomyActionKind` + planner queue.

## Current production (post-fix)

- SHA: `e9bc3c48…`
- Autonomy: EXECUTE, 5 safe targets
- Public picks gate: **ON**
- `/api/picks`: 503 `stale_data` until odds-inserting run within 240m SLA
