---
name: continuous-post-game-learning-and-pathwise-calibration-loop
description: Grade finished NFL slates via free-first settlement, audit pre-play vs realized residuals, update walk-forward calibration, and emit trainer feeds.
metadata:
  source-workflow: workflows/continuous-post-game-learning-and-pathwise-calibration-loop.md
  loop-mode: loop-me
---

# Continuous Post-Game Learning & Pathwise Calibration Loop

## When to Use
- Official `nflverse` play-by-play and ESPN free-first settlement feeds complete after `TNF`, `Sunday`, `SNF`, or `MNF`.
- Auditing pre-snap / full-game distributional residuals and running walk-forward calibration ablations.

## When Not to Use
- Ingesting new external papers/books (use `continuous-corpus-ingestion-and-wiring-loop`).
- Pre-lock DraftKings GPP portfolio construction (`dk-200pt-dfs-contest-simulation-loop`).

## Execution Workflow
1. **Free-First Settlement (`settlement-free-path`):** Grade settled markets via ESPN/consensus free runner without consuming paid Odds API quota for completed games.
2. **Residual Audit:** Compare pre-game trajectory expectations, PROE/blitz tendencies, and player availability denominators (`player_gp`) against realized play-by-play outputs.
3. **Walk-Forward Calibration & Ablation:** Evaluate strictly causal time-blocked folds via `scripts/calibration/run_frozen_ablation_ladder.py`, `intelligence/coaching/gse_proprietary_metrics_benchmark_and_optimizer.py`, and `npm run calibration:offline` without touching `MODEL_VERSION` or live promotion weights unless cleared by `model-promotion-gate`.
4. **Trainer Feed & Agent-Bus Sync:** Write dated post-mortem notes to `docs/predictions/research/<YYYY-MM-DD>/`, emit trainer-ready JSONL records to `brain/feeds/<YYYY-MM-DD>/` (single-writer rule: never write `brain/mind.jsonl`), and log completion notes in `Beexly/agent-bus/outbox/`.

## Completion Criteria
Done when calibration checks (`verify_out_of_sample_calibration.py --enforce-gate`), frozen ablation ladder, and unit tests exit `0`, with any candidate promotion logged cleanly as eligibility only.
