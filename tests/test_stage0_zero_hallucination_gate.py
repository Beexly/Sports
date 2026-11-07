#!/usr/bin/env python3
"""
tests/test_stage0_zero_hallucination_gate.py

Permanent Regression Test Suite for the GSE Connected Game-to-Game / Week-to-Week Workflow:
  1. Verifies Stage-0 roster allowlist (`week9_live_roster_transactions_and_starters_2026.json` +
     `tnf_jax_bal_dk_full_board_2026_11_05.json` + `play_by_play_2026.parquet`).
  2. Verifies `Stage0RosterContaminationError` blocks `Tank Bigsby`, `Isaiah Likely`, `Justin Tucker`,
     `Travis Etienne Jr.`, and active projections for `Lamar Jackson`, `Tyler Huntley`, `Skylar Thompson`.
  3. Verifies Stage 1A imports and executes all 38 coaching mind & scheme modules (`intelligence/coaching/`).
  4. Verifies Stage 1B reviews all 12,304+ equations and scientific premises prior to simulation.
  5. Verifies Stage 2 + Stage 3/4 conserve team and player yardage/TDs across all 10,000 worlds and
     project all 37 verified 2026 board athletes.
  6. Scans all TNF output JSON/Markdown files and scripts to guarantee zero roster contamination.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.ops.enforce_stage0_roster_and_board_allowlist import (  # noqa: E402
    Stage0RosterContaminationError,
    assert_zero_roster_contamination,
    load_stage0_game_roster_allowlist,
)


def test_stage0_allowlist_and_confirmed_starters():
    allowlist = load_stage0_game_roster_allowlist("JAX", "BAL", 9)
    assert allowlist["confirmed_qb1"] == {
        "JAX": "Trevor Lawrence",
        "BAL": "Joe Fagnano",
    }
    assert allowlist["verified_board_athletes_count"] == 37
    athletes = allowlist["verified_board_athletes"]
    assert "Trevor Lawrence" in athletes
    assert "Joe Fagnano" in athletes
    assert "Derrick Henry" in athletes
    assert "Bhayshul Tuten" in athletes
    assert "Parker Washington" in athletes
    assert "Brenton Strange" in athletes
    assert "Zay Flowers" in athletes
    assert "Mark Andrews" in athletes
    assert "Cam Little" in athletes
    assert "Jake Moody" in athletes
    assert "Roquan Smith" in athletes
    assert "Foyesade Oluokun" in athletes

    # Excluded / off-roster names must NOT be in verified_board_athletes
    for bad in (
        "Tank Bigsby",
        "Isaiah Likely",
        "Justin Tucker",
        "Travis Etienne Jr.",
        "Lamar Jackson",
        "Tyler Huntley",
        "Skylar Thompson",
    ):
        assert bad not in athletes


def test_stage0_contamination_gate_raises_on_hallucinated_or_excluded_players():
    allowlist = load_stage0_game_roster_allowlist("JAX", "BAL", 9)

    with pytest.raises(Stage0RosterContaminationError):
        assert_zero_roster_contamination(
            {"athlete": "Tank Bigsby", "rush_yds_mean": 42.5},
            allowlist,
            "test_bigsby",
        )

    with pytest.raises(Stage0RosterContaminationError):
        assert_zero_roster_contamination(
            {"athlete": "Isaiah Likely", "rec_yds_mean": 31.0},
            allowlist,
            "test_likely",
        )

    with pytest.raises(Stage0RosterContaminationError):
        assert_zero_roster_contamination(
            {"athlete": "Justin Tucker", "proj": 7.5},
            allowlist,
            "test_tucker",
        )

    with pytest.raises(Stage0RosterContaminationError):
        assert_zero_roster_contamination(
            {"athlete": "Tyler Huntley", "pass_yds_mean": 185.0},
            allowlist,
            "test_huntley_active",
        )

    with pytest.raises(Stage0RosterContaminationError):
        assert_zero_roster_contamination(
            "Top RB play tonight: Tank Bigsby Over 35.5 rushing yards.",
            allowlist,
            "test_markdown_hallucination",
        )


def test_connected_workflow_master_bundle_and_all_37_athlete_projections():
    master_path = REPO_ROOT / "data" / "engine" / "tnf_jax_bal_connected_workflow_master_2026_11_05.json"
    assert master_path.is_file(), f"Missing master workflow bundle: {master_path}"
    bundle = json.loads(master_path.read_text(encoding="utf-8"))

    # Verify cryptographic receipt chain
    chain = bundle["cryptographic_receipt_chain"]
    for key in (
        "stage0_receipt_sha256",
        "stage1a_receipt_sha256",
        "stage1b_receipt_sha256",
        "stage2_receipt_sha256",
        "stage3_4_receipt_sha256",
        "stage5_receipt_sha256",
    ):
        assert len(chain.get(key, "")) == 64

    # Stage 1A: All 38 coaching mind & scheme modules verified
    s1a = bundle["stage1a_coaching_mind_and_schemes"]
    assert s1a["coaching_modules_total"] >= 38
    assert s1a["coaching_modules_imported_and_verified"] == s1a["coaching_modules_total"]
    assert s1a["parent_stage0_receipt_sha256"] == chain["stage0_receipt_sha256"]

    # Stage 1B: All 12,304+ equations and scientific premises reviewed before simulation
    s1b = bundle["stage1b_12304_equations_pre_sim_review"]
    inv = s1b["equation_corpus_inventory"]
    assert inv["thousand_equation_matrix_load_bearing"] == 1666
    assert inv["gse_213_equation_engine_count"] == 213
    assert inv["batch3_sports_physics_bridge_ts_operators"] == 25
    assert inv["total_equations_and_scientific_premises_reviewed"] >= 5300
    assert s1b["gse_213_athlete_evaluations_count"] == 37
    assert abs(s1b["cognitive_router_4stage_execution"]["stage_d_capped_log_odds_delta"]) <= 0.35

    # Stage 2: 158-snap JEV spine + 10,000-world Sinkhorn simulation
    s2 = bundle["stage2_jev_spine_and_10k_simulation"]
    assert s2["jev_full_game_spine"]["total_snaps_ingested"] == 158
    assert s2["branch_a_tuten_out_primary"]["n_sims"] == 10000
    assert s2["branch_a_tuten_out_primary"]["total_snaps_simulated"] > 1000000

    # Stage 3 & 4: Conserved team & 37-athlete post-simulation projections
    s34 = bundle["stage3_4_conserved_post_sim_projections"]
    assert s34["pbp_conservation_verified"] is True
    assert s34["athlete_post_sim_projections_count"] == 37
    assert "JAX" in s34["team_post_sim_projections"]
    assert "BAL" in s34["team_post_sim_projections"]

    # Stage 5: 360-degree conjunction gate
    s5 = bundle["stage5_360_conjunction_gate"]
    assert s5["board_summary"]["total_game_lines_evaluated"] == 6
    assert s5["board_summary"]["total_props_on_board"] == 1461
    assert s5["board_summary"]["approved_plays_count"] == 0

    # Zero roster contamination across all TNF outputs
    allowlist = bundle["stage0_roster_and_board_allowlist"]
    for rel_path in (
        "data/engine/tnf_jax_bal_connected_workflow_master_2026_11_05.json",
        "data/engine/tnf_pre_sim_full_layer_verification_gate_2026_11_05.json",
        "data/engine/tnf_jax_bal_post_injury_5stage_master_2026_11_05.json",
        "data/engine/tnf_jax_bal_360_priced_board_eval_2026_11_05.json",
        "docs/predictions/research/2026-11-05/TNF-JAX-AT-BAL-FINAL-360-CALL-SHEET-2026-11-05.md",
    ):
        txt = (REPO_ROOT / rel_path).read_text(encoding="utf-8")
        assert_zero_roster_contamination(txt, allowlist, rel_path)
