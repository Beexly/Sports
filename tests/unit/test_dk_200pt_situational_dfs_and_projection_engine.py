#!/usr/bin/env python3
"""
Unit tests for `intelligence/dfs/dk_200pt_situational_dfs_and_projection_engine.py`.
Covers the 30 Frontier DFS & Projection Equations (`EQ-DFS-01..30`), Standing Lessons `L-1`
and `L-2` environment scalars, 360-Degree Picks/Props/Parlays/SGP evaluation with the
`-250` / `-300+` Heavy-Juice Sportsbook Firewall, and Two-Wave `200+` Pt DraftKings DFS
championship portfolio construction.
"""

from __future__ import annotations

from intelligence.dfs.dk_200pt_situational_dfs_and_projection_engine import (
    FRONTIER_30_DFS_AND_PROJECTION_EQUATIONS,
    RECEIPT_PATH,
    apply_lesson_l1_and_l2_environment_scalars,
    construct_and_verify_200pt_dk_championship_portfolio,
    evaluate_360_degree_picks_props_parlays_and_sgps,
    run_complete_omniverse_reasoning_simulation_projection_and_200pt_dfs_suite,
)


def test_frontier_30_dfs_equations_catalog_completeness() -> None:
    assert len(FRONTIER_30_DFS_AND_PROJECTION_EQUATIONS) == 30
    eq_ids = [eq["eq_id"] for eq in FRONTIER_30_DFS_AND_PROJECTION_EQUATIONS]
    assert eq_ids[0] == "EQ-DFS-01"
    assert eq_ids[-1] == "EQ-DFS-30"
    assert len(set(eq_ids)) == 30
    for eq in FRONTIER_30_DFS_AND_PROJECTION_EQUATIONS:
        assert eq.get("name")
        assert eq.get("domain")
        assert eq.get("formula_latex")
        assert len(eq.get("citations", [])) >= 1


def test_l1_and_l2_environment_scalars_boundary_and_edge_cases() -> None:
    # Extreme low implied total (<= 15.0): floor scalar 0.50, negative usage boost unscaled
    low_itt = apply_lesson_l1_and_l2_environment_scalars(
        base_projection=12.0,
        usage_boost=-1.5,
        ceiling=20.0,
        ownership=0.05,
        implied_team_total=14.0,
        wind_mph=22.0,
        precip_prob=0.80,
        has_severe_suppressor=True,
    )
    assert low_itt["environment_scalar_l2"] == 0.50
    assert low_itt["scaled_usage_boost"] == -1.5
    assert low_itt["total_suppressor_drag"] > 5.0
    assert low_itt["is_clean_environment"] is False

    # High shootout total (> 30.0): ceiling scalar 1.35, zero suppressor drag
    high_itt = apply_lesson_l1_and_l2_environment_scalars(
        base_projection=20.0,
        usage_boost=4.0,
        ceiling=36.0,
        ownership=0.08,
        implied_team_total=31.5,
        wind_mph=0.0,
        precip_prob=0.0,
        has_severe_suppressor=False,
    )
    assert high_itt["environment_scalar_l2"] == 1.35
    assert high_itt["scaled_usage_boost"] == 5.4
    assert high_itt["total_suppressor_drag"] == 0.0
    assert high_itt["l1_contrarian_clawback"] == 0.0
    assert high_itt["is_clean_environment"] is True


def test_360_board_conjunction_gate_and_heavy_juice_firewall() -> None:
    res = evaluate_360_degree_picks_props_parlays_and_sgps(
        context_packet={},
        reasoning_trace={
            "final_reasoning_delta": 0.12,
            "l4_l5_deterministic_audit": {"all_5_tracks_l4_l5_verified": True},
            "market_entered_last_and_smallest": {"entered_last": True, "applied_weight": 0.05},
        },
    )
    assert res["market_categories_covered_count"] == 7
    assert res["evaluated_tickets_count"] == 10
    assert res["published_tickets_count"] == 7
    assert res["passed_tickets_count"] == 3
    assert res["pass_discipline_verified"] is True
    assert res["heavy_juice_minus_300_trap_blocked"] is True

    passed_by_id = {t["ticket_id"]: t for t in res["passed_tickets"]}
    assert "TKT-GATE-REGRESSION-PASS-08" in passed_by_id
    assert "TKT-HEAVY-JUICE-MINUS-320-TRAP-09" in passed_by_id
    assert "TKT-SOLO-SOURCE-PASS-10" in passed_by_id


def test_200pt_dk_championship_portfolio_and_full_omniverse_suite() -> None:
    dfs_res = construct_and_verify_200pt_dk_championship_portfolio(seed=42, num_sims=2000)
    assert dfs_res["total_dfs_and_projection_equations_wired"] == 30
    assert dfs_res["all_lineups_clear_200pt_championship_ceiling"] is True
    assert dfs_res["max_cvar_099_championship_dk_pts"] >= 200.0
    assert dfs_res["max_joint_p99_shootout_dk_pts"] >= 200.0

    suite_res = run_complete_omniverse_reasoning_simulation_projection_and_200pt_dfs_suite(
        game_id="2024_10_CIN_BAL",
        write_receipt=False,
    )
    assert suite_res["status"] == "PASS"
    assert suite_res["context_26_layers_summary"]["layers_populated_count"] == 26
    assert suite_res["context_26_layers_summary"]["total_equations_executed_across_layers"] == 21419
    assert suite_res["reasoning_5_tracks_and_7_steps_summary"]["families_consumed"] == 279
    assert RECEIPT_PATH.exists()

    # Verify no layer has status == "UNKNOWN", salary caps are respected across all 120 X_cand & 500 X_field lineups,
    # L-1/L-2 scalars applied to player pool, and context_packet metadata attached to 360 board tickets
    for _l_key, layer_entry in suite_res["context_26_layers_summary"]["per_layer_audit"].items():
        assert layer_entry["status"] == "EXECUTED"
    assert dfs_res["lessons_l1_and_l2_verification"]["pool_players_l1_l2_evaluated_count"] > 0
    w2_summary = dfs_res["wave2_lineup_vs_field_contest_simulation_summary"]
    assert w2_summary["all_candidate_lineups_salary_cap_and_roster_valid"] is True
    assert w2_summary["all_opponent_field_lineups_salary_cap_and_roster_valid"] is True
    assert w2_summary["max_candidate_lineup_salary"] <= 50000
    assert w2_summary["max_opponent_field_lineup_salary"] <= 50000
    for tkt in suite_res["projections_360_picks_props_parlays_sgps"]["published_tickets"]:
        assert tkt["game_id"] == "2024_10_CIN_BAL"
        assert "CIN@BAL" in tkt["matchup"]

