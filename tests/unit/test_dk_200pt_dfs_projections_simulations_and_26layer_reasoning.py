#!/usr/bin/env python3
"""
Exhaustive Unit Tests for Every Section of the 26-Layer Situational Reasoning Stack,
7-Surface Omniverse Knowledge Ingestion, 10,000-World Simulations, 360-Degree Projections
(Picks / Props / Parlays / SGPs), and DraftKings 200+ Point Championship DFS Engine.
"""

from __future__ import annotations

from intelligence.dfs.dk_200pt_situational_dfs_and_projection_engine import (
    FRONTIER_30_DFS_AND_PROJECTION_EQUATIONS,
    RECEIPT_PATH,
    apply_lesson_l1_and_l2_environment_scalars,
    construct_and_verify_200pt_dk_championship_portfolio,
    run_complete_omniverse_reasoning_simulation_projection_and_200pt_dfs_suite,
)


def test_lesson_l1_and_l2_environment_scalars_and_30_frontier_equations() -> None:
    assert len(FRONTIER_30_DFS_AND_PROJECTION_EQUATIONS) == 30

    # L-1: Justin Jefferson 1.8% ownership in 28 mph crosswind + 90% precip is NOT a clean environment
    jj = apply_lesson_l1_and_l2_environment_scalars(
        base_projection=19.8,
        usage_boost=2.4,
        ceiling=34.5,
        ownership=0.018,
        implied_team_total=19.5,
        wind_mph=28.0,
        precip_prob=0.90,
        has_severe_suppressor=True,
    )
    assert not jj["is_clean_environment"]
    assert jj["total_suppressor_drag"] > 4.0
    assert jj["l1_contrarian_clawback"] > 10.0

    # L-2: DK Metcalf role boost on an 18.0 implied team total is scaled down (< 0.75x)
    dkm = apply_lesson_l1_and_l2_environment_scalars(
        base_projection=14.2,
        usage_boost=4.0,
        ceiling=27.0,
        ownership=0.013,
        implied_team_total=18.0,
        wind_mph=8.0,
        precip_prob=0.10,
        has_severe_suppressor=False,
    )
    assert dkm["environment_scalar_l2"] < 0.75
    assert dkm["scaled_usage_boost"] < 3.0

    # Clean indoor shootout (28.5 ITT, 0 mph wind): usage boost is amplified (> 1.20x) and zero clawback
    clean = apply_lesson_l1_and_l2_environment_scalars(
        base_projection=22.5,
        usage_boost=3.5,
        ceiling=38.0,
        ownership=0.065,
        implied_team_total=28.5,
        wind_mph=0.0,
        precip_prob=0.0,
        has_severe_suppressor=False,
    )
    assert clean["is_clean_environment"]
    assert clean["environment_scalar_l2"] > 1.20
    assert clean["l1_contrarian_clawback"] == 0.0


def test_every_section_of_26_layer_reasoning_and_360_projections_and_200pt_dfs() -> None:
    receipt = run_complete_omniverse_reasoning_simulation_projection_and_200pt_dfs_suite(
        game_id="2024_10_CIN_BAL",
        write_receipt=True,
    )
    assert receipt["status"] == "PASS"
    assert RECEIPT_PATH.exists()

    # 1. All 7 Omniverse Surfaces verified
    surfaces = receipt["seven_omniverse_surfaces"]
    assert len(surfaces) == 7
    for s_name, s_val in surfaces.items():
        assert s_val["verified"] is True, f"Surface {s_name} failed verification"

    # 2. All 26 Context Layers verified individually and summing to 21,419 equations
    ctx = receipt["context_26_layers_summary"]
    assert ctx["layers_populated_count"] == 26
    assert ctx["all_26_layers_verified"] is True
    assert ctx["total_equations_executed_across_layers"] == 21419
    assert ctx["l12_to_l13_to_l21_dependency_verified"] is True
    assert ctx["l26_market_entered_last_and_weight_le_0_08"] is True
    assert len(ctx["per_layer_audit"]) == 26

    # 3. All 5 Reasoning Tracks across L1-L5 + 7 Weekly Cycle Steps + 279 Families
    rsn = receipt["reasoning_5_tracks_and_7_steps_summary"]
    assert rsn["dependency_order"] == [
        "offensive_line",
        "coaching_scheme",
        "scheme_matchup",
        "qb_behavior",
        "trust_signals",
    ]
    assert set(rsn["synthesis_levels_verified"]) == {"L1", "L2", "L3", "L4", "L5"}
    assert len(rsn["weekly_cycle_7_steps_verified"]) == 7
    assert rsn["families_consumed"] == 279
    assert rsn["equations_evaluated_total"] == 21419
    assert rsn["book_equations_executed_count"] > 0

    # 4. 360-Degree Picks, Props, Parlays & SGPs Conjunction Gate + -300 Heavy-Juice Trap Gate
    p360 = receipt["projections_360_picks_props_parlays_sgps"]
    assert p360["market_categories_covered_count"] == 7
    assert p360["pass_discipline_verified"] is True
    assert p360["heavy_juice_minus_300_trap_blocked"] is True
    assert p360["published_tickets_count"] == 7
    assert p360["passed_tickets_count"] == 3
    sgp = p360["correlated_sgp_analysis"]
    assert sgp["correlated_copula_prob"] > sgp["naive_independent_prob"]
    assert sgp["publishAllowed"] is True

    # 5. DraftKings 200+ Point Championship DFS Portfolio + Wave-2 Lineup-vs-Field Contest Simulations
    dfs = receipt["draftkings_200pt_championship_dfs"]
    assert dfs["total_dfs_and_projection_equations_wired"] == 30
    w2 = dfs["wave2_lineup_vs_field_contest_simulation_summary"]
    assert w2["candidate_lineups_simulated"] == 120
    assert w2["opponent_field_lineups_simulated"] == 500
    assert w2["total_lineup_world_evaluations"] == 6200000
    assert w2["portfolio_combined_top1pct_world_coverage"] > 0.05
    assert dfs["portfolio_lineups_count"] >= 3
    assert dfs["all_lineups_clear_200pt_championship_ceiling"] is True
    assert dfs["max_cvar_099_championship_dk_pts"] >= 200.0
    assert dfs["max_joint_p99_shootout_dk_pts"] >= 200.0
    for lu in dfs["lineups"]:
        assert lu["valid_dk_9_slot_roster"] is True
        assert lu["total_salary"] <= 50000
        assert lu["cvar_099_championship_dk_pts"] >= 200.0
        assert lu["joint_p99_shootout_dk_pts"] >= 200.0
        assert lu["wave2_lineup_vs_field_simulation"]["sim_top_1pct_finish_rate"] > 0.0
        assert lu["wave2_lineup_vs_field_simulation"]["sim_200pt_exceedance_prob"] > 0.0
