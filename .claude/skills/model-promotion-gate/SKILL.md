---
name: model-promotion-gate
description: Three-leg evaluation contract deciding challenger eligibility without re-labeling history or promoting noise.
effort: medium
allowed-tools: Read, Grep, Glob, Bash(npm run *), Bash(npx tsx *), Bash(npx vitest*), Bash(node scripts/*)
---

# Model promotion gate

## Purpose
Evaluates whether challenger **K** is eligible to replace champion **C** for a market family (`docs/frontier/MODEL_PROMOTION_GATE_CONTRACT.md`). Outputs **eligibility only** — flipping `MODEL_VERSION` remains a human owner decision.

## Anti-DEC-062 Required Tests
1. **Identity fixed point:** `K === C => d_i = 0 => NOT_ELIGIBLE`.
2. **Oracle promotes Leg 1:** outcome oracle clears Leg 1 (proves harness can promote genuine skill).

## The Three Legs
| Leg | Requirement |
|---|---|
| **1 — Paired calibration superiority** | Paired Brier differential on identical events, Empirical-Bernstein LCB `> delta_prac` |
| **2 — CLV non-inferiority** | Market-anchored closing-line value non-inferiority (rules out stale-line mirage) |
| **3 — Procedural integrity** | Pre-registered params, leak-free walk-forward split, fixed event universe |

## Commands & Touchpoints
```powershell
npm run guard:model-freeze
npm run calibration:offline
npx vitest run --minWorkers=1 --maxWorkers=2 --root packages/prediction-engine src/promotion/__tests__
npx tsx scripts/ops/verify-shadow-pipeline.ts
npx tsx scripts/ops/compare-shadow-vs-live.ts
```
- `packages/prediction-engine/src/promotion/` (`evaluate.ts`, `empirical-bernstein.ts`, `clv-non-inferiority.ts`, `integrity.ts`)
- `apps/web/lib/decision-genome/candidate-ledger.ts`
- Related skills: `calibration-pipeline`, `autonomy-kernel` (kernel never promotes)

## Guardrails & Completion Criteria
- Resolve `guard:model-freeze` only via a `CalibrationProposal` row (`IMPLEMENTED`), `docs/calibration-proposals/<slug>.md` (`status: IMPLEMENTED`), or unchanged weights in `FROZEN.md` — never weaken the guard.
- Report honest `insufficient-sample` verdicts when `n < nMin`; never skip identity/oracle tests or treat shadow output (`priced: false`) as live picks.
- Done when `npm run guard:model-freeze`, `npm run calibration:offline`, and `src/promotion/__tests__` exit `0`.
