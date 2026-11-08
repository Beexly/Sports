#!/usr/bin/env python3
"""
Unit Tests for GSE End-to-End Causal Looped Funnel Engine & 8-Month `/session-librarian`
Integrator (`tests/unit/test_gse_causal_looped_funnel_engine.py`).
"""

from __future__ import annotations

import pytest

from intelligence.funnel.gse_causal_looped_funnel_engine import (
    CANONICAL_PROJECTIONS_OUT_PATH,
    DFS_LOOPED_FUNNEL_OUT_PATH,
    DISCREPANCIES_OUT_PATH,
    FUNNEL_RECEIPT_OUT_PATH,
    REPO_ROOT,
    SESSION_LIBRARIAN_8MONTH_EXCAVATION_LEDGER,
    FunnelSequenceViolationError,
    GSECausalLoopedFunnelEngine,
    apply_gse_lab_situational_mills,
    execute_pass1_foundational_and_arxiv_equations,
    execute_pass2_market_conformal_and_discrepancy_equations,
    execute_pass3_dfs_specific_equations_on_pool_entry,
)


def test_session_librarian_8month_excavation_ledger_completeness() -> None:
    surfaces = SESSION_LIBRARIAN_8MONTH_EXCAVATION_LEDGER["surfaces_audited"]
    assert surfaces["hermes_state_db"]["total_sessions_scanned"] == 2840
    assert surfaces["antigravity_conversation_summaries_db"]["total_conversations_scanned"] == 584
    assert surfaces["typescript_corpus_modules"]["total_ts_corpus_modules"] == 630
    assert surfaces["gse_lab_20260919_discovery_mills"]["total_lab_files_scanned"] == 40
    assert surfaces["hermes_plans_and_coach_mindset_cadence"]["tuesday_v1_sealed_coach_mindset_tau"] == 0.42


def test_hard_sequence_gates_prevent_dfs_or_optimization_before_projections() -> None:
    engine = GSECausalLoopedFunnelEngine()

    # 1. Cannot run Stage 2 (Projections) before Stage 1 (Equations -> Metrics -> Stats)
    with pytest.raises(FunnelSequenceViolationError):
        engine.stage2_build_layered_context_situational_simulations_to_canonical_projections(
            write_artifacts=False
        )

    # 2. Cannot build DFS Player Pools (Stage 3B) before Canonical Projections (Stage 2)
    with pytest.raises(FunnelSequenceViolationError):
        engine.stage3b_derive_dfs_player_pools_from_canonical_projections()

    # 3. Cannot construct DFS Lineups (Stage 4) before Canonical Projections & Player Pools
    with pytest.raises(FunnelSequenceViolationError):
        engine.stage4_construct_optimized_dfs_lineups()

    # 4. Cannot run Iterative Lineup Optimization Testing (Stage 5) before Canonical Projections & Lineups
    with pytest.raises(FunnelSequenceViolationError):
        engine.stage5_run_iterative_lineup_optimization_testing_loop(write_artifacts=False)

    # Lock Stage 1 only -> Stage 3B, Stage 4, Stage 5 MUST STILL fail until Stage 2 Projections are locked!
    engine.stage1_compile_equations_to_metrics_to_stats(write_artifacts=False)
    with pytest.raises(FunnelSequenceViolationError):
        engine.stage3b_derive_dfs_player_pools_from_canonical_projections()
    with pytest.raises(FunnelSequenceViolationError):
        engine.stage5_run_iterative_lineup_optimization_testing_loop(write_artifacts=False)


def test_pass1_arxiv_and_book_equations_and_gse_lab_mills() -> None:
    p1 = execute_pass1_foundational_and_arxiv_equations(
        home_team="DET",
        away_team="MIA",
        pass_block_win_rate=0.66,
        motion_rate=0.64,
        starter_exit_hazard=0.04,
        fourth_down_go_rate=0.28,
    )
    assert p1["inverse_mdp_tau_sealed"] == 0.42
    assert p1["hmm_pass_blocking_gamma_25s"] > 0.55
    assert p1["yac_conservation_of_momentum_bonus_yds"] > 0.0

    # Test 15-19 mph Wind Mill graduation from gse-lab-20260919
    wind_mill = apply_gse_lab_situational_mills(
        wind_mph=17.0,
        temp_f=22.0,
        is_dome=False,
        pass_epa_prior=0.08,
        rush_epa_prior=0.04,
    )
    assert wind_mill["wind_15_19_mill_triggered"] is True
    assert wind_mill["cold_a29_mill_triggered"] is True
    assert abs(wind_mill["wind_completion_rate_delta"] - (-0.0150)) < 1e-6
    assert abs(wind_mill["wind_epa_per_dropback_delta"] - (-0.0652)) < 1e-6
    assert abs(wind_mill["walk_forward_optimal_pass_weight_w_star"] - 0.55) < 1e-6


def test_pass2_market_conformal_discrepancies_and_heavy_juice_firewall() -> None:
    p2 = execute_pass2_market_conformal_and_discrepancy_equations(
        gse_projected_home_pts=27.5,
        gse_projected_away_pts=21.0,
        book_spread_home=-3.0,
        book_total_line=44.5,
        home_ml_american=-285,
        away_ml_american=230,
    )
    # GSE Total = 48.5 vs Book 44.5 -> +4.0 discrepancy -> OVER + Conformal Residual Flagged
    assert abs(p2["gse_canonical_total"] - 48.5) < 1e-4
    assert abs(p2["total_discrepancy_pts"] - 4.0) < 1e-4
    assert p2["grok2_conformal_diagnostic_residual_flagged"] is True
    assert p2["recommended_total_action"] == "OVER"
    assert p2["heavy_juice_firewall_blocked"] is True


def test_pass3_dfs_specific_equations_on_pool_entry() -> None:
    p3 = execute_pass3_dfs_specific_equations_on_pool_entry(
        projected_median_dk_pts=19.5,
        projected_p90_dk_pts=27.8,
        projected_p99_dk_pts=35.4,
        dk_salary=6800,
        qre_field_ownership=0.11,
        stack_correlation_rho=0.55,
        feedback_leverage_adjustment=1.25,
    )
    assert p3["value_per_1k"] > 2.5
    assert p3["gpp_top_heavy_prize_utility_2505_08342"] > 15.0
    assert p3["qre_ownership_leverage_delta"] > 0.0
    assert p3["dfs_pass3_composite_score"] > 25.0


def test_end_to_end_causal_looped_funnel_and_iterative_optimization_convergence() -> None:
    engine = GSECausalLoopedFunnelEngine()
    receipt = engine.run_complete_causal_looped_funnel(
        num_optimization_iterations=6,
        worlds_per_iteration=1500,
        write_artifacts=True,
    )
    assert receipt["status"] == "VERIFIED_AND_LOCKED"
    assert receipt["stage1_summary"]["books_compiled"] == 503
    assert receipt["stage1_summary"]["equations_compiled"] == 21419
    assert receipt["stage1_summary"]["total_metrics_feeding_stats"] == 114
    assert receipt["stage2_summary"]["week9_games_projected"] == 15
    assert len(receipt["stage2_summary"]["canonical_projections_lock_hash"]) == 64
    assert receipt["stage3a_summary"]["games_evaluated"] == 15
    assert receipt["stage3a_summary"]["prop_tickets_evaluated"] >= 200
    assert receipt["stage3b_summary"]["total_pool_players"] == 135
    assert receipt["stage4_and_stage5_summary"]["lineups_constructed"] == 6
    assert receipt["stage4_and_stage5_summary"]["monotonic_cvar_improvement_verified"] is True
    assert receipt["stage4_and_stage5_summary"]["cvar_099_improvement_dk_pts"] > 0.0

    assert CANONICAL_PROJECTIONS_OUT_PATH.exists()
    assert DISCREPANCIES_OUT_PATH.exists()
    assert DFS_LOOPED_FUNNEL_OUT_PATH.exists()
    assert FUNNEL_RECEIPT_OUT_PATH.exists()


def test_two_host_portability_no_hardcoded_host_paths() -> None:
    src_path = REPO_ROOT / "intelligence" / "funnel" / "gse_causal_looped_funnel_engine.py"
    text = src_path.read_text(encoding="utf-8")
    forbidden_win = "C:" + "\\Users\\Garrett"
    forbidden_posix = "/Users/" + "Garrett"
    assert forbidden_win not in text
    assert forbidden_posix not in text
