---
name: continuous-corpus-ingestion-and-wiring-loop
description: Ingest external papers, books, and technical sources under INGEST-AND-LEARN rules, compile math kernels into intelligence/, and wire with unit tests.
metadata:
  source-workflow: workflows/continuous-corpus-ingestion-and-wiring-loop.md
  loop-mode: loop-me
---

# Continuous Corpus Ingestion & Autonomous Wiring Loop

## When to Use
- New papers, repositories, books, or datasets arrive in `docs/<bucket>/research/<YYYY-MM-DD>/` or an external research corpus.
- Compiling mathematical estimators, conformal heads, shrinkage priors, or RTP models into `intelligence/` and wiring them into the simulation/DFS spine.

## When Not to Use
- Post-game settlement grading and pathwise calibration updates (use `continuous-post-game-learning-and-pathwise-calibration-loop`).
- Game-day DraftKings MME lineup generation (use `dk-200pt-dfs-contest-simulation-loop`).

## Execution Workflow
1. **License & Provenance Quarantine (`INGEST-AND-LEARN`):** Record commercial/restrictive sources in `docs/<bucket>/research/<YYYY-MM-DD>/*.json` (`COMMERCIAL_USE_BLOCKED: true`, `LEARN_AND_REASON_ONLY: true`). Default untested sources to `UNTESTED - QUEUED FOR EVALUATION` (never `DEAD` without test evidence).
2. **Mathematical Synthesis (`WIRE-FIRST` & `MIND-FIRST`):** Implement clean vectorized Python modules under `intelligence/` using relative `Path(__file__)` roots — zero hardcoded host paths (`check_charge_9` Two-Host Rule). Emit trainer-ready learnings to `brain/feeds/<YYYY-MM-DD>/` (never write `brain/mind.jsonl` directly).
3. **Engine & DFS Wiring:** Wire into `scripts/ops/gse_coach_mind_simulator.py`, `scripts/ops/gse_connected_game_workflow.py`, `scripts/ops/verify_and_wire_all_layers_before_sim.py`, and `intelligence/dfs/` (`dk_200pt_situational_dfs_and_projection_engine.py`, `institutional_dfs_v2_portfolio.py`).
4. **Verification Gate:** Run unit tests (`python -m pytest tests/...`), `python scripts/ops/verify_and_wire_all_layers_before_sim.py`, and `python scripts/wiring/run_charge_regression_suite.py` + `python scripts/wiring/verify_armed_workflows.py --check-armed`.

## Brief & Completion Criteria
- Write dated summary + JSON receipt under `docs/<bucket>/research/<YYYY-MM-DD>/`.
- Done when all unit tests, pre-sim layer gate (`sims=0`), and charge checks exit `0`.
