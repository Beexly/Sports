---
name: continuous-post-game-learning-and-pathwise-calibration-loop
description: Grades pre-snap expectations, quarter/half derivatives, player props, SGPs, and DFS projections against realized NFL play-by-play outcomes using free-first settlement, updates Blown-Lead Pathwise Calibration curves and 22-metric Positive-Part James-Stein weights, and publishes trainer-ready mind feeds. Use after TNF, Sunday Main Slate, SNF, or MNF final whistle when official nflverse and ESPN settlement feeds complete.
metadata:
  source-workflow: workflows/continuous-post-game-learning-and-pathwise-calibration-loop.md
  loop-mode: loop-me
---


# Continuous Post-Game Learning, Free-Path Settlement & Pathwise Calibration Loop (`loop-me`)

## Loop Definition

An autonomous post-game learning loop that grades every pre-snap expectation, quarter/half derivative, player prop, SGP, and DFS projection against realized NFL play-by-play outcomes (`THE LEARNING LOOP`), updates the Blown-Lead Pathwise Calibration curves (`arXiv:2602.10784v1`) and 4-fold Positive-Part James-Stein weights across the 22 proprietary GSE metrics (`M-GSE-01` .. `M-GSE-22`), and feeds trainer-ready records into the mind branch.

## Use this skill when

- Official `nflverse` play-by-play and ESPN free-first settlement feeds complete after `TNF`, `Sunday Main Slate`, `SNF`, or `MNF`.
- Auditing snap-by-snap and drive-by-drive residuals between pre-game distributional projections and realized NFL outcomes.
- Re-evaluating 4-fold time-blocked out-of-sample Positive-Part James-Stein + Ridge metric weights and Blown-Lead Pathwise Calibration curves (`arXiv:2602.10784v1`).

## Do not use this skill when

- Ingesting new external GitHub repositories, PDFs, or textbooks into the research corpus (use `continuous-corpus-ingestion-and-wiring-loop`).
- Generating pre-game DraftKings GPP lineups or running pre-lock 360-degree full-board prop call sheets.
- Consuming paid Odds API quota for settlement grading when the ESPN/consensus free-first grader (`settlement-free-path`) is available.

## Instructions

### 1. Trigger Conditions

- **Event Trigger:** Final whistle and official `nflverse` play-by-play plus ESPN free-first settlement feed completion after `TNF`, `Sunday Main Slate`, `SNF`, and `MNF`.

### 2. Push Right (Autonomous Pre-Checkpoint Execution)

1. **Free-First Settlement (`settlement-free-path`):** Grade all settled sides, totals, props, and derivatives via the ESPN/consensus free grader without burning paid Odds API quota.
2. **Snap-by-Snap & Drive-by-Drive Residual Audit:** Compare pre-play and pre-game distributional expectations against realized snap outcomes, coaching Tuesday-press-conference vs. Sunday-observed PROE/blitz rates, and Return-to-Play (`RTP`) injury efficiency curves.
3. **Pathwise Calibration & 22-Metric Weight Update:**
   - Run the Blown Lead Paradox stopping-time calibration audit (`arXiv:2602.10784v1`) on in-game win probability trajectories.
   - Re-evaluate 4-fold time-blocked out-of-sample Positive-Part James-Stein + Ridge weights (`intelligence/coaching/gse_proprietary_metrics_benchmark_and_optimizer.py`) and market calibration heads (`Brier Skill Score > 0` promotion gate).
4. **Trainer-Ready Mind Feed & Agent-Bus Sync:** Write structured post-mortem learning records to the repo (`docs/predictions/research/<YYYY-MM-DD>/`) and post an `.agent-bus/` completion notice (`DIRECT-TO-MIND/ENGINE`).

### 3. Checkpoint & Brief Delivery

- **Zero Human Checkpoint for Ingestion & Grading:** Runs 100% autonomously. A human checkpoint triggers **only** if a challenger calibration head clears the `model-promotion-gate` (`Brier Skill Score > 0` out-of-sample) and requests promotion into `data/calibration/market_calibration_heads_2026.json`.
- **Brief Artifact:** `docs/engine/research/2026-11-07/gse-proprietary-created-metrics-test-and-optimization-receipt.json`
- **Brief Contents:** Out-of-sample Log-Odds MSE, Brier Skill Score delta, DK 9-man lineup MAE, coaching statement-vs-reality residuals, and candidate weight updates awaiting promotion.
