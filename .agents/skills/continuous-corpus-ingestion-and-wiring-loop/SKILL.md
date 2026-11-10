---
name: continuous-corpus-ingestion-and-wiring-loop
description: Ingests external GitHub repositories, academic papers, PDFs, books, and technical URLs under INGEST-AND-LEARN provenance rules, compiles extracted mathematical kernels into vectorized Python modules, wires them into the 26-layer reasoning spine and 200+ Pt DraftKings DFS engine, and runs automated regression gates. Use when new research assets, URLs, or repositories are dropped into the workspace or dated research buckets.
metadata:
  source-workflow: workflows/continuous-corpus-ingestion-and-wiring-loop.md
  loop-mode: loop-me
---

# Continuous Corpus Ingestion, Quarantine & Autonomous Wiring Loop (`loop-me`)

## Loop Definition

A zero-checkpoint autonomous workflow that triggers whenever a new batch of GitHub repositories, PDFs, academic papers, theses, books, or technical URLs is dropped into the conversation or `docs/*/research/<YYYY-MM-DD>/`, quarantining restrictive-license assets under `INGEST-AND-LEARN` (`COMMERCIAL_USE_BLOCKED: true`, `LEARN_AND_REASON_ONLY: true`), compiling the extracted mathematical kernels into `intelligence/`, wiring them into the 26-layer reasoning spine and `200+` Pt DraftKings DFS engine, and running `pytest` plus the 10-charge regression suite.

## Use this skill when

- A user message or inbox drop contains new URLs, GitHub repository links, arXiv IDs, books, or local PDF paths (`~/Downloads/*.pdf`, `G:\My Drive\**`, `docs/*/research/<YYYY-MM-DD>/`).
- Quarantining external research or copyleft/commercial repositories under `INGEST-AND-LEARN` provenance flags before extracting mathematical kernels.
- Compiling newly ingested equations, statistical estimators, conformal prediction heads, Bayesian shrinkage priors, or biomechanical Return-to-Play (`RTP`) decay curves into `intelligence/` and wiring them into the 26-layer spine.

## Do not use this skill when

- Grading post-game realized NFL play-by-play outcomes or updating post-settlement calibration curves (use `continuous-post-game-learning-and-pathwise-calibration-loop`).
- Building game-day DraftKings MME lineup portfolios or executing late-swap contest simulations (use `dk-200pt-dfs-contest-simulation-loop`).
- Running pre-game 360-degree sportsbook prop sweeps or overnight `07:30 AM CST` production dispatches.

## Instructions

### 1. Trigger Conditions

- **Event Trigger:** Any user message or inbox drop containing new URLs, GitHub repository links, arXiv IDs, or local PDF paths (`~/Downloads/*.pdf`, `G:\My Drive\**`, `docs/*/research/<YYYY-MM-DD>/`).

### 2. Push Right (100% Autonomous Execution)

1. **License & Provenance Quarantine (`INGEST-AND-LEARN`):**
   - Record every external repository, book, and paper in the dated bucket manifest (`docs/<bucket>/research/<YYYY-MM-DD>/*.json`) with `COMMERCIAL_USE_BLOCKED: true` and `LEARN_AND_REASON_ONLY: true` for commercial/copyleft sources.
   - Never mark any untested item `DEAD` or `SKIP`; default to `UNTESTED — QUEUED FOR EVALUATION` until tested and cited.
2. **Mathematical & Algorithmic Synthesis (`WIRE-FIRST` & `MIND-FIRST`):**
   - Extract the underlying equations, statistical estimators, conformal prediction heads, Bayesian shrinkage priors, biomechanical RTP decay curves, or multi-agent harness patterns and implement clean, vectorized Python modules under `intelligence/`.
   - Enforce the **Two-Host Rule**: zero hardcoded local user paths (`C:\Users\Garrett`) inside any `intelligence/**/*.py` file (`check_charge_9`).
3. **Workflow & Engine Wiring:**
   - Connect the new module into the post-simulation projection and `200+` Pt DraftKings DFS pipeline (`intelligence/dfs/dk_200pt_situational_dfs_and_projection_engine.py` and `intelligence/dfs/full_stack_post_sim_projection_and_200pt_dfs_orchestrator.py`) and the 9-model worker fleet router (`python scripts/ops/zero_waste_model_router.py`).
4. **Automated Verification Gate:**
   - Create and run unit tests (`tests/unit/test_*.py`), `python scripts/wiring/run_charge_regression_suite.py` (`10/10 PASS`), and `python scripts/wiring/verify_armed_workflows.py --check-armed` (`9/9 ARMED`).

### 3. Checkpoint & Brief Delivery

- **Zero Human Checkpoint on Pass:** Interrupt the human **only** if a unit test, `check_charge_9` Two-Host portability check, or 10-charge regression assertion fails after automated remediation.
- **Brief Artifact:** Write a dated JSON receipt and markdown summary under `docs/<bucket>/research/<YYYY-MM-DD>/`.
- **Brief Contents:** Total sources ingested, executable functions wired, `pytest` pass count, and `check_charge_9` portability status (`0` violations).
