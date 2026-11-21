# Overnight GSE & GSI Intelligence, Engine Streams 16B/16C & Autonomy Optimization Plan (`2026-11-21`)

> **Worktree:** `C:\Users\Garrett\Sports-worktrees\overnight-goal-2026-11-21` (`feat/overnight-goal-2026-11-21` from `origin/main` `9feec3c13`)  
> **Skills Active:** `/deep-research`, `/writing-plans`, `/executing-plans`, `/autonomy-kernel` (`Beexly/Sports` has no `exercises/` directory; `/scaffold-exercises` noted N/A).

## Global Constraints
1. **Isolated Worktree Only:** Never modify `C:\Users\Garrett\Sports`; never push directly to `main`.
2. **DIRECT-TO-MIND / Single-Writer Rule:** Write trainer-ready JSONL feeds to `brain/feeds/2026-11-21/*.jsonl`; never write `brain/mind.jsonl` directly.
3. **ZERO PII & ZERO SECRETS IN GIT:** Strip personal finance/health/FSA/EEOC/address/phone/credential items from `GSE-MASTER-INVENTORY-2026-11-20-V2.md`; validate with `secret-scan.mjs --all` + diff regex scan.
4. **License & Clearance:** `s40537-025-01128-3.pdf` is CC-BY-NC-ND 4.0 (strictly learn-only / cite-only); `sportsref_download (10).xls` is learn/audit-only (`data/engine/sources/pfr_2026_punting.csv`); all causal walk-forward computations use cleared CC-BY-4.0 `nflverse` PBP parquets (`week < as_of_week`).
5. **Epistemic Walk-Forward Honesty:** Hold any Stream 16B component failing baseline OOS MSE at `production_weight = 0.0` (NULL HOLD).
6. **Autonomy & Public Gate Safety:** Never flip `LIVE_BOARD`, `PUBLISH_LEDGER`, `PUBLIC_PICKS_ENABLED`, or `PERFORMANCE_STATS`; never cite the voided Nov 5 Week 8 legacy batch record or legacy DB buckets as standing records.

## Tasks Summary
- **Task 0:** Isolated worktree `C:\Users\Garrett\Sports-worktrees\overnight-goal-2026-11-21` + `node_modules` junction + plan artifact.
- **Task 1:** Parse `sportsref_download (10).xls` -> `data/engine/sources/pfr_2026_punting.csv`; file dated research dossiers in `docs/arxiv-program/research/2026-11-21/`, `docs/data-sources/research/2026-11-21/`, `docs/engine/research/2026-11-21/`; emit `brain/feeds/2026-11-21/overnight_pdfs_xsweep150_punting_and_streams_16b_16c_feed.jsonl`.
- **Task 2 (Stream 16B TDD + 6-Point Wiring):** `intelligence/coaching/causal_sequencing_trench_punting_engine.py` (2nd-and-10 sequencing, clean-pocket EPA, behind-LOS share, Pipping-Gamón ridge Bradley–Terry dropback disruption, punting EPA + honest null holds) wired into `__init__.py`, `gse_coach_mind_simulator.py`, `gse_connected_game_workflow.py`, `verify_and_wire_all_layers_before_sim.py`, `evaluate_streams_15p_to_15x_joint_ablation.py`, and `verify_out_of_sample_calibration.py`.
- **Task 3 (Stream 16C TDD + GSI ADR-0003 Mirror):** `intelligence/calibration/correlated_prop_abstention_and_bayesian_kelly.py` (`@Rusty_Bill` correlated comp+yds copula + 2026 PBP OOS Brier check, `@SeqInference` noisy-input abstention gate, `@macro_synergy` Bayesian Beta-Kelly shrinkage), `intelligence/coaching/spatial_ghosts_and_step_turn_evaluator.py` (`NFL Ghosts` counterfactual EPV + `Step-and-Turn` Bayesian movement rollout), and `evaluation/gsi/biomechanical_step_turn_kinematics.py` (isolated ADR-0003 rule-in-only mirror).
- **Task 4:** Run Vitest autonomy & zero-orphan tests, `nova:cycle:dry`, `guardrails`, `lock:verify`, `verify:ledger`; audit Week 11 card + Nous sunset guard; harden `wolf-prime-v7/scripts/factory_drift.py` (deployed to `%LOCALAPPDATA%\hermes\scripts\factory_drift.py`).
- **Task 5:** Whole-branch verification, PII/secret audit, `git push -u origin feat/overnight-goal-2026-11-21`, fleet agent bus broadcast, and final report (`<!-- GOAL_COMPLETE -->`).
