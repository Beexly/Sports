# HERMES SOVEREIGN v5.0 — Second Full Pass (No-Defer Run)

Supersedes first verification run. User directive 2026-11-04: DO NOT DEFER, DO NOT MINIMIZE, DO NOT SKIP. Execute ALL steps in Master Plan again, with real empirical data, citations, paths forward, then a third review pass for gaps.

Branch: hermes/overnight-2026-11-03-corpus. Worktree: C:/c/wt-week8-forensic. Mirror: C:/Users/Garrett/Sports. Base for this run: d2c07a4e1.

## Global Constraints (binding)
- Confidence: 84/100, never 84%.
- Ledger: 16-5 (76.2%), +10.45u — cite as is.
- HARD DOCTRINE: NEVER publish/suggest Week 9 picks without 5-Stage Engine + full-game snap-by-snap JEV sim. Internal simulation only; public picks stay PASS unless gate passes. No Week 9 pick publication in this run.
- No fabrication: if a benchmark is null, report null. No "100% accuracy" unless empirical.
- Commit + push every completed track to origin/hermes/overnight-2026-11-03-corpus AND sync files to C:/Users/Garrett/Sports.
- TDD: test-first for code changes, watch RED then GREEN.
- verification-before-completion governs every claim.

## Tasks
### Task 1 — Step 0 Plugin Stack
Install (log status, skip failures): opencode-free-acp, tokenjuice, model-presets, nexus-recovery-peer, agentmemory, neuralmind, statejar, ram-first-context, cartograph, mediarag, shipframe, disciplined-vibe-coding, handydandy, hermes-handoff, hermes-windows-tasks, tirith, soul-finder, writing-guard, postroom, proxy, super-artifacts, pulldown.
Expected: hermes plugins list shows installed set; failures logged in ledger.

### Task 2 — Step 1 Voice DNA
Lock SOUL.md + writing-guard persona into C:/Users/Garrett/AppData/Local/hermes/SOUL.md (append marked section, do not delete existing) and repo docs/predictions/research/2026-11-05/VOICE-DNA.md.
Expected: SOUL.md contains empathetic/intelligent/sarcastic/witty rules, 84/100 law, no %/em-dash/emoji on settlement.

### Task 3 — Track 1: 100k-Event C++ / Python Empirical Benchmark
Run embedded_kernel_tests (10/10) + new Python benchmark reading data/frontier_ingestion/**/mimic_ecg_500hz_stream.bin and nfl_10hz_kinematics_stream.bin, dropout sweeps 10/30/50/60/75, dt sweeps 15/30/40/60/120/300s, 100k frames (or max available, state actual), compute p50/p95/p99 latency, cycles, SRAM 20769/262144, write data/engine/gsi_overnight_100k_cte_and_koopman_vfib_benchmark.json with real numbers.
Expected: json has trials, p50/p95/p99, cycles, sram, dropout table, dt table, binary files cited.

### Task 4 — Track 2: Theorem 4 Pre-Order Deconfounding
Run cte_viscoelastic_isomorphic_engine + kafka_flink_zero_copy_bridge on available MIMIC/physionet streams, evaluate pre-order (t_order-4h) signature, report real AUC/FDR (null if null). Run pytest packages/galaxy-conformal-ot/tests/ -v (expect 45/45) and compile_proposal --validate-only (correct path docs/engine/research/2026-11-04/submission/compile_proposal.py).
Expected: data/engine/gsi_overnight_pre_order_deconfounded_mimic_proof.json with real metrics, pytest 45/45, compile exit 0.

### Task 5 — Track 3: Walk-Forward 74-Module Ablation + Pareto
Evaluate all modules in zero-orphan-expected-metrics-bridge.ts and situational-expected-metrics-catalog.ts (count actual), run vitest 8/8, sweep ACI-CRC thresholds using calibration-map.ts/no-bet-gate.ts data, save real Pareto table to data/engine/gse_walk_forward_2023_2026_ablation_and_conformal_tuning.json.
Expected: json includes modules_evaluated (actual count), thresholds swept, pass_rate vs hit_rate table.

### Task 6 — Track 4: Week 9 360 Internal Sim (No Publish)
Re-run run_week9_full_slate_simulations_props_dfs.py, cross-check data/nflverse/injuries_2026.csv and Stage 0 banned list, verify 15 games x 7 market families, DFS stacks doc exists, output data/engine/week9_live_board_simulations_props_dfs_2026.json. Do NOT publish picks.
Expected: week9 json updated with injury check, 15 games, market families listed, publishAllowed stays false/PASS.

### Task 7 — Track 5: Storefront + Content Queue (Full Counts)
Run vitest 11/11, run hermes_witty_content_generator.py, generate docs/predictions/research/2026-11-05/THURSDAY-MORNING-READY-TO-POST-REVENUE-QUEUE.md with 3 X threads (full text), 10 sniper replies (named accounts), 3 emails ($9.99/$29/$79), Thaler framing, 84/100 law, no %.
Expected: markdown contains 3 threads, 10 replies, 3 emails, checklist.

### Task 8 — Third Pass Gap Audit, Push, Sync
Re-read all artifacts for missing/thin areas, fill gaps found, commit+push, sync to C:/Users/Garrett/Sports, final review.
Expected: origin SHA = local HEAD, Sports files present, ledger complete.

## Interfaces / Pre-flight
- C++ test: 1000 iters per test, not 100k — Track 3 Python must do 100k.
- pytest needs pytest-asyncio (fixed in pyproject d2c07a4).
- Orchestrator --track fixed in 73cb600.
- Injuries: check local csv path.
