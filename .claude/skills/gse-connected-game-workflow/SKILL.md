---
name: gse-connected-game-workflow
description: Use when generating, auditing, simulating, or reviewing any NFL game pick, player prop, parlay, SGP, projection, or call-sheet dossier, or when running pregame roster/injury/coaching/equation checks.
version: 2.0.0
metadata:
  hermes:
    tags: [nfl, gse, predictions, props, simulation, stage0, jev, workflow]
---

# GSE Connected 6-Stage Game Workflow

## Overview

Every NFL game analysis, projection, player prop, SGP, or call-sheet dossier MUST be produced by the cryptographic 6-stage connected workflow (`Stage 0 -> Stage 1A -> Stage 1B -> Stage 2 -> Stage 3/4 -> Stage 5`). Each stage hashes its parent stage's SHA-256 receipt so no stage can be skipped, re-ordered, or fabricated from LLM memory.

**Violating the letter of the rules is violating the spirit of the rules.**

## The Iron Law

```
NO GAME PICK, PROP, PROJECTION, OR DOSSIER WITHOUT RUNNING:
python scripts/ops/gse_connected_game_workflow.py --away <AWAY> --home <HOME> --week <WEEK>
FIRST.
```

Write a markdown dossier or pick summary before running the connected workflow? **Delete it. Start over.**

**No exceptions:**
- Do not write a prose summary "while waiting" for simulation scripts
- Do not pull rosters, depth charts, or injuries from LLM pretraining memory
- Do not use Gaussian shortcuts (`rng.normal`) around a static mean
- Do not cite single-sided book prices without two-sided Class B de-vigged `marketFairProb`
- Delete means delete

## When to Use

- Generating or updating an NFL game preview, call-sheet, or post-injury master dossier
- Pricing or recommending any NFL side, spread, total, quarter/half derivative, player prop, Anytime/First TD, IDP sack, or SGP
- Auditing a slate after late injury/inactive news or roster transactions
- Running pregame coaching, equation, or simulation checks

## Positive Recipe: Exact 6-Stage Cryptographic Chain

Execute the connected pipeline via `python scripts/ops/gse_connected_game_workflow.py --away <AWAY> --home <HOME> --week <WEEK>`, which enforces and chains every stage below:

### Stage 0 — Roster, Transaction & Contamination Gate (`stage0_receipt_sha256`)
- Runs `scripts/ops/enforce_stage0_roster_and_board_allowlist.py` (`build_stage0_gate_receipt` + `assert_zero_roster_contamination`).
- Builds the 32-team dynamic active allowlist strictly from `data/nflverse/rosters_2026.csv`, `data/nflverse/injuries_2026.csv`, `data/nflverse/play_by_play_2026.parquet`, `data/engine/week9_live_roster_transactions_and_starters_2026.json`, and the live DraftKings board.
- Hard-blocks traded, IR, retired, or off-roster hallucinations (e.g., `Tank Bigsby`, `Isaiah Likely`, `Tyler Huntley`, `Lamar Jackson` when `Out`) by raising `Stage0RosterContaminationError` (`RuntimeError`).
- Verifies true per-player 2026 `player_gp` (never dividing injured/returning players by team GP).

### Stage 1A — 38 Coaching Modules + 39 Python Intelligence Subpackages & 31+ Datasets (`stage1a_receipt_sha256`)
- Chains `parent_stage0_receipt_sha256`.
- Executes all `38` `intelligence/coaching/*.py` modules (`compute_tendencies`, `dc_pressure`, `pressure_answer`, `proe`, `redzone`, `script_elasticity`, `tempo`, `fourth_down`, `two_minute`, etc.) on verified 2026 PBP & FTN charting.
- Runs `scripts/ops/run_python_25_intelligence_domains.py`, connecting all `39` `intelligence/*` Python subpackages (`443` Python files), `31+` local datasets (`ftn_charting_2026.parquet` `18,019` rows, `11` Step-N market parquets, `10` nflverse 2026 feeds), BDB2025 `16,124`-play pre-snap coverage shells (`post_throw_epa_bayes`), and Downloads architecture/whitening/social/radio/DFS kernels.

### Stage 1B — TypeScript Prediction & MCP Equation Engines (`stage1b_receipt_sha256`)
- Chains `parent_stage1a_receipt_sha256`.
- Runs `npx tsx scripts/ops/run_ts_prediction_and_mcp_engines.ts` and writes `data/engine/tnf_<away>_<home>_ts_engines_telemetry_<date>.json`:
  - `packages/mcp-equations-server/src/mcp-cognitive-router.ts`: Evaluates all `1,666` executable equation modules (`buildContextMask` 288-bit mask $\to$ `stageC` Spectral Cluster Orthogonalization $\to$ `stageD` Cross-Equation Jacobian Coupling & Positive-Part James-Stein Shrinkage with $|\Delta\text{log-odds}| \le 0.35$).
  - `packages/prediction-engine/src/nfl/master-situational-reasoning-aggregator.ts`: Executes `22/22` situational streams (`0` skipped) and `77` zero-orphan situational modules (`51` catalog signals).
  - `packages/prediction-engine/src/nfl/x-situational-80-rules.ts`: Evaluates all `80/80` anti-misleading-stats situational rules.
  - `packages/prediction-engine/src/equations/index.ts`: Runs the `213` Equation Engine across all active athletes.
  - `packages/prediction-engine/src/models/wireable-dispatch.ts`: Audits `173` wireable modules and `196` registered models.

### Stage 2 — Full-Game Snap-by-Snap JEV + 10,000-World Sinkhorn Coach-Mind PBP Simulation (`stage2_receipt_sha256`)
- Chains `parent_stage1b_receipt_sha256`.
- Drives every snap from `Q1 15:00` through `Q4 0:00` (`~158` snaps) sequentially through `jevkit.client.ask()` (`~typesafe/jev-latest`) for `off_play_call`, `def_shell_call`, `target_carrier`, `snap_outcome`, and `pressure_disruption`.
- Feeds the JEV snap spine + Sinkhorn-Knopp optimal transport (`sinkhorn_reallocate_weights`) into `scripts/ops/gse_coach_mind_simulator.py` across `10,000` worlds (`~1.33M+` simulated snaps), including explicit injury contingency branches when key starters are Questionable.

### Stage 3 & 4 — Conserved Post-Simulation Box-Score Allocation & Full 360 Derivatives (`stage3_4_receipt_sha256`)
- Chains `parent_stage2_receipt_sha256`.
- Runs `allocate_conserved_box_score` and `assert_pbp_conservation` so sum of player rushing/receiving/passing yards and TDs equals team totals in every single simulated world (`max_diff < 1e-6`).
- Populates `derivatives_and_exotics_360`:
  - `quarters_and_halves_team_projections` (`1Q`, `2Q`, `3Q`, `4Q`, `1H`, `2H` spreads, totals, moneylines, team totals)
  - `first_quarter_and_first_half_player_projections` (`1Q` & `1H` passing, rushing, receiving yards, receptions)
  - `longest_play_projections` (longest completion, longest reception, longest rush quantiles)
  - `touchdown_scorer_probabilities` (`Anytime TD`, `First TD`, `2+ TDs` Poisson/NegBin probabilities & fair American odds)
  - `idp_pass_rush_sack_projections` (individual pass-rush sack rates, `P(>=0.5 sacks)`, `P(>=1.0 sacks)`, tackles + assists)

### Stage 5 — Two-Sided Class B Market De-Vig, Conjunction Gate & Pre-Commit Guard (`stage5_receipt_sha256`)
- Chains `parent_stage3_4_receipt_sha256`.
- Compares post-reasoning probabilities **LAST** against two-sided Class B de-vigged `marketFairProb`. Any market lacking two-sided prices or failing the conjunction gate is marked **`PASS` (`publishAllowed: false`)** with a dynamic `gate_reason` string interpolated from live simulated probabilities.
- Formats all confidence outputs strictly as integer `XX/100` (never `%`).
- Attaches the Dual-Panel Official Ledger (`Panel A`: `15,947` historical replay; `Panel B`: `16-5` · `76.2%` · `+10.45u` New Engine Official Ledger with Wilson 95% CI `[54.9%, 89.4%]`).
- Passes `assert_zero_roster_contamination` on the final JSON and Markdown dossier, and is enforced at commit time by `.githooks/pre-commit` (`scripts/ops/connected-workflow-dossier-guard.py`).

## Quick Reference

| Stage | Script / Entrypoint | Required Receipt Key | Key Invariant |
|---|---|---|---|
| **Stage 0** | `scripts/ops/enforce_stage0_roster_and_board_allowlist.py` | `stage0_receipt_sha256` | `0` off-roster/IR hallucinations; verified 2026 `player_gp` |
| **Stage 1A** | `scripts/ops/run_python_25_intelligence_domains.py` | `stage1a_receipt_sha256` | `38/38` coaching modules + `39` subpackages + `31+` datasets |
| **Stage 1B** | `npx tsx scripts/ops/run_ts_prediction_and_mcp_engines.ts` | `stage1b_receipt_sha256` | `1,666` equations (`stageD` JS shrinkage `> 0.90`), `22/22` streams, `80/80` rules |
| **Stage 2** | `scripts/ops/gse_coach_mind_simulator.py` | `stage2_receipt_sha256` | `158`-snap JEV spine + `10,000`-world (`~1.33M` snaps) Sinkhorn PBP |
| **Stage 3/4** | `scripts/ops/gse_connected_game_workflow.py` | `stage3_4_receipt_sha256` | Exact PBP yardage/TD conservation + full 360 derivatives/exotics |
| **Stage 5** | `scripts/ops/connected-workflow-dossier-guard.py` | `stage5_receipt_sha256` | Two-sided Class B de-vig, dynamic `gate_reason`, `XX/100` confidence, Dual-Panel Ledger |

## Rationalization Table

| Excuse | Reality |
|---|---|
| "I already know the starters and rosters from training data." | LLM pretraining memory hallucinates traded/IR players (e.g., Tank Bigsby, Isaiah Likely, Lamar Jackson when Out). Stage 0 CSV/Parquet allowlist is mandatory. |
| "I'll just run a quick Python heuristic instead of invoking `tsx` for the TypeScript engines." | A Python toy substitute produced `0.0000` James-Stein shrinkage and disconnected `1,666` MCP equations and `22` situational streams. Always run `npx tsx scripts/ops/run_ts_prediction_and_mcp_engines.ts`. |
| "The user only asked for one prop or a quick lean, so I don't need the full 6-stage workflow." | Single-prop projections violate team target/carry conservation unless allocated from the `10,000`-world conserved box score. Run the full workflow. |
| "A prop only has a one-sided Over price, so I'll estimate the implied probability with a rough vig haircut." | Single-sided props cannot be Class B de-vigged and MUST be marked `PASS (publishAllowed: false, UNPRICEABLE_SINGLE_SIDED_PROP)`. |
| "I'll write the markdown dossier directly and fill in the numbers from an earlier run." | Hand-edited markdown introduces stale hardcoded strings (e.g., `42.1%` in prose vs `33.2%` in JSON) and is blocked by `.githooks/pre-commit`. Always render from `gse_connected_game_workflow.py`. |
| "I'll report confidence as `68%` so it reads naturally." | Publishing confidence as `%` is strictly forbidden across web, mobile, and dossiers. Always format as integer `XX/100` (e.g., `50/100`). |

## Red Flags — STOP and Start Over

- About to mention any NFL player name before running `enforce_stage0_roster_and_board_allowlist.py`
- Writing or editing a `docs/predictions/research/<date>/*.md` dossier by hand instead of rendering via `gse_connected_game_workflow.py`
- Seeing `stage_d_james_stein_shrinkage == 0.0` or `streams_skipped_count > 0`
- Using `rng.normal` for player yardage instead of `allocate_conserved_box_score`
- Formatting confidence with a `%` sign or omitting either panel of the Dual-Panel Official Ledger (`15,947` replay + `16-5` Wilson CI)

**All of these mean: Delete the unverified output and run `python scripts/ops/gse_connected_game_workflow.py` + `pytest tests/test_gse_connected_workflow_v2_full_repo.py`.**
