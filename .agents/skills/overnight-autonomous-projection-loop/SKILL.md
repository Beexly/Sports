---
name: overnight-autonomous-projection-loop
description: Orchestrate overnight corpus ingestion, modeling, walk-forward calibration, and regression verification ahead of gated morning delivery.
metadata:
  source-workflow: workflows/overnight-autonomous-projection-loop.md
  loop-mode: loop-me
---

# Overnight Autonomous Projection & Verification Loop

## When to Use
- Continuous overnight intelligence mining, walk-forward calibration/ablation, and guardrail stress-testing prior to `07:30 AM CST` (`America/Chicago`).
- Executing the morning `07:30 AM CST` fresh injury/weather/board pull via `python scripts/ops/run_0730_cst_fresh_pull_and_email_dispatch.py` (strictly `not_before_0730_cst: true`).

## When Not to Use
- Dispatching live production emails or publishing unverified morning picks prior to `07:30 AM CST`.
- Bypassing `scripts/guardrails/trust-gate.mjs`, `apps/mobile/scripts/lint-rules.js`, or `scripts/wiring/run_charge_regression_suite.py`.

## Execution Workflow
1. **Phase A — Continuous Overnight Engineering (`Before 07:30 AM CST`):** Mine/verify corpus and external research signals, wire into `intelligence/` and `packages/prediction-engine/`, run walk-forward calibration & ablation benchmarks, and commit verified progress live with trainer-ready feeds under `brain/feeds/<YYYY-MM-DD>/`.
2. **Phase B — Gated Fresh Pull (`>= 07:30 AM CST`):** Run `python scripts/ops/run_0730_cst_fresh_pull_and_email_dispatch.py` after `07:30 AM CST` to pull active `nflverse` rosters/injuries, weather, and DraftKings board data under Odds API credit caps.
3. **Phase C — Walk-Forward OOS & Pre-Sim Gates:** Verify `python tests/verify_out_of_sample_calibration.py --enforce-gate`, `python scripts/calibration/run_frozen_ablation_ladder.py` (`evaluation/frozen/score_walkforward_calibration_v1.py`), and `python scripts/ops/verify_and_wire_all_layers_before_sim.py` (`sims=0`).
4. **Phase D — Guardrails & Delivery:** Verify `node scripts/guardrails/trust-gate.mjs`, `node apps/mobile/scripts/lint-rules.js`, `python scripts/wiring/verify_armed_workflows.py --check-armed`, and write dated morning deliverable under `docs/engine/research/<YYYY-MM-DD>/`.

## Completion Criteria
Done when all pre-sim, calibration, guardrail, mobile-lint, and web build checks pass exit `0` after the final edit with timestamp discipline verified.
