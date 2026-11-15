# Week 10 Sunday Launch -- Ethos Overnight Orchestration Spec

## Problem Statement
Ahead of Sunday `2026-11-15` NFL Week 10 (`NE vs DET` Munich at `08:30 AM CST`, 7 Early games at `12:00 PM CST`, 3 Afternoon games, `PIT @ CIN` SNF, and `LAC @ BAL` MNF), verified Wave 21 corpus closure, Saturday 4:00 PM ET roster/IR/credential fixes (`PR #1275`), Stage-D/F evidence upgrades (`PR #1273`), and Motif Batches 16-17+ / PM Sweep Deltas sit across unmerged branches while Week 10 pre-snap spines are stale (>18h, Nov 13) and zero Week 10 DraftKings DFS packets exist. Meanwhile `C:\` has ~5.3 GB free headroom and cloud VM spend must remain `$0.00/hr`.

## Solution
Using an isolated clean worktree (`C:\Users\Garrett\Sports-wt-triage`) with zero-copy `mklink /J` junctions and same-volume hardlinks, consolidate `origin/main` (`ff6095f10`), `AUTON-MAIN-LIVE-22` (`57fbd104c`), `PR #1275` (`61e55e41a`), `PR #1273` (`91b6eaa21`), Motif Tier-B Batches 16-17+ (`854758652`), and Motif 2026-11-14 PM Sweep Deltas (`6f1137dd8`). Rebuild fresh post-Saturday-4PM-ET snap-by-snap spines (`<= $0.35` spend cap) and all `13/13` cryptographic 6-stage Connected Game Workflow dossiers (`NE @ DET` FIRST), generate the 5-slate live DraftKings Week 10 DFS suite (`Munich Showdown`, `Sunday Main Classic`, `Sun-Mon Expanded 14-Core`, `SNF`, `MNF`) plus the `WSH @ NYG` TNF Learning-Loop autopsy and guardrail-clean Airwave copy, clear triple-layer adversarial reviews (`Claude Advisor`, Matt Two-Axis `/code-review`, `Santa-Method B & C`) plus `36/36` repo guardrails, ship to `origin/main` + Vercel `READY`, and maintain overnight scheduled monitoring until Sunday `07:00 AM CST`.

## User Stories
1. As the founder waking at `07:00 AM CST` Sunday, I want a single-page brief summarizing verified `NE @ DET` Munich readiness, all `13/13` Stage-5 plays and honest `PASS` verdicts, staged DraftKings CSVs, and `$0.00/hr` cloud spend confirmation so I can act immediately before `08:30 AM CST` kickoff.
2. As an operator running live DraftKings DFS lineups, I want every Week 10 Classic and Showdown lineup hydrated exclusively from Stage 3/4 conserved `10,000`-world projections with `0` `Out`/`IR`/`Doubtful`/pull-list players and exact salary/positional legality.
3. As a risk-conscious reviewer, I want all customer-facing copy free of `%` confidence formatting, voided legacy Week-8 and pre-Week-8 banner strings, internal pipeline jargon, leaked paid picks, and Unicode em/en-dashes, with public and calibration feature flags remaining fail-closed (`false`).
4. As a fleet coordinator working alongside Hermes and Motif, I want every consolidation commit rebased onto latest `origin/main`, every trainer feed written only to `brain/feeds/2026-11-15/*.jsonl`, and every completion logged to `Beexly/agent-bus` without file collisions.

## Implementation Decisions
- Integrate `57fbd104c` (`feat/autonomous-workflows-and-corpus-wiring-2026-11-13`) onto `origin/main` (`ff6095f10`), resolving only the `HANDOFF.md` merge conflict so both `GAP-07 CLOSED` and `AUTON-MAIN-LIVE-22` / `WP-8` / `Wave 21` are preserved.
- Cherry-pick/port the `PR #1275` (`61e55e41a`) delta on top (leaked credential redaction in `foundry/artifacts/primitives/7a0424aeb245e002.json`, Sat 4PM ET `week10_live_roster_transactions_and_starters_2026.json` with ASCII dashes, clock injection & parallel `check-nflverse-currency.ts` fixes).
- Port strictly non-conflicting engine modules from `PR #1273` (`91b6eaa21`: Stage-D `corpus-adapter.ts` `applyCorpusShrink`, Stage-F two-sided home/away pricing, odds cadence fix) without disturbing `generate-signal-slate.ts` or `packages/prediction-engine/vitest.config.ts`.
- Import Motif Batch 16-17+ (`854758652`) primitives and `2026-11-14` PM Sweep Deltas (`6f1137dd8`), scrub any Unicode dashes, Gatekeeper-validate, and emit trainer feeds to `brain/feeds/2026-11-15/`.
- Refresh live DraftKings 360 boards and Week 10 pre-snap spines (`NE @ DET` first; reuse any fresh post-Wave-21 Hermes spines on `origin` if present), run `run_week10_full_slate_connected_workflow.py --n-sims 10000`, and verify `connected-workflow-dossier-guard.py`.
- Discover live Week 10 DraftKings DraftGroup IDs dynamically from `draftkings.com/lobby/getcontests?sport=NFL`, build `scripts/dfs/build_week10_all_slates_dfs_packets.py` using `scipy.optimize.milp` (`solve_showdown_dfs_milp.py` / `dfs_stochastic_milp_optimizer.py`), and write CSVs/JSONs under `data/dfs/`.

## Testing Decisions & Pre-Agreed Seams
Tests assert external behavior at four public seams (never internal mocks or tautological snapshots):
- **Seam 1 (`preflight_live_roster_injury_gate.require_week` & `load_stage0_game_roster_allowlist`):** Verifies Saturday `2026-11-14` Week 10 roster freshness, explicit clock injection (`today`), and strict blocking of `Out`/`IR`/`Doubtful` athletes plus leaked credential redaction (`pytest tests/test_stage0_zero_hallucination_gate.py`).
- **Seam 2 (`packages/prediction-engine` Evidence Stage D/F & `mind-reasoning.mutation-v2.spec.ts`):** Verifies shrink-only corpus grounding, two-sided de-vig edge bounds, and zero regressions (`npm --prefix packages/prediction-engine run typecheck` + `vitest run` + `node --import tsx --test`).
- **Seam 3 (`execute_connected_game_workflow(week=10, n_sims=10000)` & `connected-workflow-dossier-guard.py`):** Verifies `13/13` SHA-256 receipt chains, conserved box scores, snap-by-snap spine freshness `<= 18h`, and zero Stage-0 roster contamination.
- **Seam 4 (`solve_dk_showdown_milp` & `build_week10_all_slates_dfs_packets.py`):** Verifies live Week 10 DraftKings DraftGroup schemas, `<= $50,000` salary cap, positional legality, `0` excluded/pull-list/decoy Cash players, and Stage 3/4 dossier `master_bundle_sha256` provenance (`pytest tests/test_week10_360_dfs_and_stage0_gates.py`).

## Out of Scope
- Modifying `generate-signal-slate.ts` confidence calibration math.
- Flipping `PUBLIC_PICKS_ENABLED`, `LIVE_BOARD`, `PERFORMANCE_STATS_ENABLED`, `PUBLISH_LEDGER`, or `CALIBRATION_ADJUSTMENTS_ENABLED`.
- Booting paid GCP/AWS VMs or auto-emailing DraftKings CSVs unattended.
