---
name: gse-connected-game-workflow
description: Use when generating, auditing, simulating, or reviewing any NFL game pick, player prop, parlay, SGP, projection, or call-sheet dossier, or running pregame checks.
effort: medium
allowed-tools: Read, Grep, Glob, Bash(python scripts/*), Bash(npx tsx *), Bash(node scripts/*), Bash(pytest *)
---

# GSE Connected 6-Stage Game Workflow

## Overview & Iron Law
```
NO GAME PICK, PROP, PROJECTION, OR DOSSIER WITHOUT RUNNING:
python scripts/ops/gse_connected_game_workflow.py --away <AWAY> --home <HOME> --week <WEEK>
FIRST.
```
Each stage cryptographically hashes its parent SHA-256 receipt so no stage can be skipped, reordered, or fabricated from model memory. Never fabricate rosters/injuries from memory, use `rng.normal` shortcuts around static means, price single-sided props without Class B de-vigged `marketFairProb`, or hand-write Markdown dossiers ahead of the pipeline.

## 6-Stage Cryptographic Chain

### Stage 0 — Roster, Transaction & Contamination Gate (`stage0_receipt_sha256`)
- Runs `scripts/ops/enforce_stage0_roster_and_board_allowlist.py` (`build_stage0_gate_receipt`, `assert_zero_roster_contamination`).
- Sources active allowlists strictly from `data/nflverse/rosters_2026.csv`, `data/nflverse/injuries_2026.csv`, `data/nflverse/pbp_2026_w1_w10.parquet` (or full `intelligence/coaching/data/play_by_play_2026.parquet`), `data/nflverse/week{WEEK}_live_roster_transactions_and_starters_2026.json`, and live DraftKings boards.
- Verifies true per-player 2026 `player_gp` (never dividing injured/returning players by team games played).

### Stage 1A — Coaching Modules & Python Intelligence Domains (`stage1a_receipt_sha256`)
- Chains `parent_stage0_receipt_sha256`.
- Runs `intelligence/coaching/*.py` (`compute_tendencies`, `dc_pressure`, `pressure_answer`, `proe`, `redzone`, `script_elasticity`, `tempo`, Stream 15N FTN/snap, Stream 15O PFR 39-table priors, and walk-forward OOS-gated causal Streams 15P–15Z: L-RAPM pos vuln, OL pressure survival, kicker air-density physics, NGS CPOE/RYOE, RZ compression/4th-down, neutral pace/play-volume, early-down clean EPA, dynamic HFA/rest/cold decay, Air/YAC pass + rush SR, FTN box-count/blitz/catchable charting, and OL snap continuity/sack/1H-2H splits) plus `scripts/ops/run_python_25_intelligence_domains.py`.

### Stage 1B — TypeScript Prediction & MCP Equation Engines (`stage1b_receipt_sha256`)
- Chains `parent_stage1a_receipt_sha256` and runs `npx tsx scripts/ops/run_ts_prediction_and_mcp_engines.ts`:
  - `packages/mcp-equations-server/src/mcp-cognitive-router.ts` (`buildContextMask` -> `stageC` spectral orthogonalization -> `stageD` Jacobian coupling & Positive-Part James-Stein shrinkage, $|\Delta\text{log-odds}| \le 0.35$)
  - `packages/prediction-engine/src/nfl/master-situational-reasoning-aggregator.ts` (`22/22` streams, `0` skipped)
  - `packages/prediction-engine/src/nfl/x-situational-80-rules.ts` (`80/80` firewall rules)
  - `packages/mcp-equations-server/src/thousand-equation-registry.ts`
  - `packages/prediction-engine/src/wireable-dispatch.ts`

### Stage 2 — Full-Game Snap-by-Snap JEV + 10,000-World Sinkhorn PBP Simulation (`stage2_receipt_sha256`)
- Chains `parent_stage1b_receipt_sha256`.
- Evaluates snap transitions sequentially through `jevkit.client.ask()` (`~typesafe/jev-latest`) and Sinkhorn-Knopp optimal transport (`sinkhorn_reallocate_weights`) in `scripts/ops/gse_coach_mind_simulator.py` (`10,000` worlds, explicit Questionable contingency branches, zero Sims gate verified via `scripts/ops/verify_and_wire_all_layers_before_sim.py`).

### Stage 3 & 4 — Conserved Post-Simulation Allocation & 360 Derivatives (`stage3_4_receipt_sha256`)
- Chains `parent_stage2_receipt_sha256`, enforces `allocate_conserved_box_score` & `assert_pbp_conservation` (`max_diff < 1e-6`), and populates `derivatives_and_exotics_360` (`1Q-4Q`, `1H/2H`, `1Q/1H` player props, longest plays, TD probabilities, IDP sacks/tackles).

### Stage 5 — Class B Market De-Vig, Conjunction Gate & Guardrail (`stage5_receipt_sha256`)
- Compares post-reasoning probabilities **last** against two-sided Class B de-vigged `marketFairProb`; missing two-sided quotes or failed conjunction checks emit `PASS` (`publishAllowed: false`) with dynamic `gate_reason`.
- Formats confidence strictly as integer `XX/100` (never `%`).
- Derives standing ledger banners strictly from `apps/web/lib/ledger/public-record.ts` / `/record` (`verifiedLedger`). Never cite voided historical batches, pre-Week-8 subsets, or un-anchored legacy snapshots as an active standing record.
- Verified at commit time by `scripts/guardrails/connected-workflow-dossier-guard.py`.

### Stage 6 — Customer-Facing Web, Social & Live Production Gate
- Plain-English football film/matchup prose on public surfaces (`apps/web/`, X/IG) with zero internal pipeline jargon and zero leaked paywalled picks/legs.
- Verify `node scripts/guardrails/trust-gate.mjs`, `node apps/mobile/scripts/lint-rules.js`, and `python scripts/guardrails/connected-workflow-dossier-guard.py` before pushing live to `origin/main`.

## Rationalization Table

| Excuse | Reality |
|---|---|
| "I already know starters and injuries from memory." | Pretraining memory hallucinates traded/IR players; Stage 0 CSV/Parquet allowlists are mandatory. |
| "I'll run a quick Python heuristic instead of `tsx`." | Toy substitutes yield `0.0000` James-Stein shrinkage and skip `mcp-cognitive-router.ts` and the `22` streams. Run `run_ts_prediction_and_mcp_engines.ts`. |
| "The user only asked for one prop or quick lean." | Single-prop numbers break team target/carry conservation unless allocated via `allocate_conserved_box_score`. |
| "Only a single-sided book price exists." | Unpaired prices cannot be Class B de-vigged and MUST emit `PASS (publishAllowed: false)`. |
| "I'll hand-edit the markdown dossier directly." | Hand-edited markdown creates stale prose mismatches and is blocked by `connected-workflow-dossier-guard.py`. |

## Red Flags — STOP and Start Over

- Mentioning any NFL player before `enforce_stage0_roster_and_board_allowlist.py` passes
- Seeing `stage_d_james_stein_shrinkage == 0.0` or `streams_skipped_count > 0`
- Using `rng.normal` shortcuts instead of `allocate_conserved_box_score`
- Formatting confidence with `%` or citing voided/un-anchored records instead of `verifiedLedger`
- Skipping `python scripts/ops/verify_and_wire_all_layers_before_sim.py` or `connected-workflow-dossier-guard.py`
