"""Unit & Red-Team Verification Suite for `BookEquationsToStatsCompiler` (16 Tests).

Verifies that all 503 corpus books (458 Mega-Sweep + 14 GSN DOCX + 25 Graduate Monographs
BK-01..25 + 6 Gap/Sovereign monographs) and all 21,419 equations across 279 families
compile directly into executable mathematical operators producing all 92 player/team
stats & micro-metrics across 32 NFL teams, 15 Week 9 games, and 128 players.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Dict

import pytest

from intelligence.metrics.book_equations_to_stats_compiler import (
    BOOK_DOMAIN_CROSSWALK_PATH,
    BOOK_DOMAINS_6,
    CANONICAL_92_STATS_AND_METRICS,
    COMPILED_STATS_OUTPUT_PATH,
    COMPILER_RECEIPT_OUTPUT_PATH,
    COMPLETE_458_BOOK_REGISTRY_PATH,
    EQUATION_INVENTORY_V2_PATH,
    MIND_EQUATIONS_JSONL_PATH,
    NFL_32_TEAMS,
    BookEquationsToStatsCompiler,
    compute_bayesian_fwl_and_causal_aipw_metrics,
    compute_biomechanics_kinematics_metrics,
    compute_info_theory_game_theory_and_hjb_metrics,
    compute_optimal_transport_and_quantile_metrics,
    compute_shoelace_polygon_area,
    compute_survival_and_point_process_metrics,
    compute_voronoi_and_continuum_geometry_metrics,
)

REPO_ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="module")
def compiled_week9_payload() -> Dict[str, Any]:
    compiler = BookEquationsToStatsCompiler()
    return compiler.compile_full_week9_dataset(write_artifacts=True)


def test_01_mind_book_and_equation_registries_503_books_and_21419_equations_synced(
    compiled_week9_payload: Dict[str, Any],
) -> None:
    """Verify 458/503 book registries and 21,419 equation inventories are synced with 0 unmapped items."""
    assert COMPLETE_458_BOOK_REGISTRY_PATH.exists()
    assert BOOK_DOMAIN_CROSSWALK_PATH.exists()
    assert EQUATION_INVENTORY_V2_PATH.exists()
    assert MIND_EQUATIONS_JSONL_PATH.exists()

    summary = compiled_week9_payload["corpus_and_equation_binding_summary"]
    assert summary["complete_503_corpus_books_count"] == 503
    assert summary["mega_sweep_458_books_count"] == 458
    assert summary["total_equations_compiled"] == 21419
    assert summary["active_equations_above_min_sample"] == 20019
    assert summary["held_equations_below_min_sample"] == 1400
    assert summary["canonical_equation_families_count"] == 279
    assert summary["operator_domains_count"] == 6
    assert summary["compiled_stats_and_micro_metrics_count"] == 92
    assert summary["unmapped_show_and_tell_books_count"] == 0
    assert summary["unmapped_show_and_tell_equations_count"] == 0


def test_02_medical_68_books_gsi_quarantine_zero_sports_spine_weight(
    compiled_week9_payload: Dict[str, Any],
) -> None:
    """Verify all 68 books-b-medical books are strictly quarantined from the sports spine."""
    reg_data = json.loads(COMPLETE_458_BOOK_REGISTRY_PATH.read_text(encoding="utf-8"))
    books = reg_data["books"]
    assert len(books) == 503

    med_books = [b for b in books if b["lane"] == "books-b-medical"]
    active_books = [b for b in books if b["sports_spine_import_permitted"] is True]
    assert len(med_books) == 68
    assert len(active_books) == 435

    for mb in med_books:
        assert mb["sports_spine_import_permitted"] is False
        assert mb["sports_spine_weight"] == 0.0


def test_03_domain1_biomechanics_kinematics_impulse_momentum_and_yco() -> None:
    """Verify BK-05 / BK-19 Lagrangian & impulse-momentum operators."""
    low_vel = compute_biomechanics_kinematics_metrics(
        mass_off_kg=98.0,
        mass_def_kg=108.0,
        vel_off_mps=7.2,
        vel_def_mps=8.5,
        closing_angle_rad=0.55,
        restitution_e=0.25,
        handoff_mesh_gap_yds=0.72,
        wr_pos_xy=(10.0, 5.0),
        db_pos_xy=(10.5, 5.2),
        ball_vel_xy=(18.0, 4.0),
        ol_anchor_force_n=1250.0,
        dl_bull_impulse_ns=780.0,
        eq_domain_signal=-0.05,
    )
    high_vel = compute_biomechanics_kinematics_metrics(
        mass_off_kg=104.0,
        mass_def_kg=102.0,
        vel_off_mps=9.6,
        vel_def_mps=8.0,
        closing_angle_rad=0.55,
        restitution_e=0.30,
        handoff_mesh_gap_yds=0.52,
        wr_pos_xy=(12.5, 6.0),
        db_pos_xy=(10.5, 5.2),
        ball_vel_xy=(18.0, 4.0),
        ol_anchor_force_n=1620.0,
        dl_bull_impulse_ns=610.0,
        eq_domain_signal=0.12,
    )

    assert len(low_vel) == 16
    assert high_vel["yards_after_contact_per_att"] > low_vel["yards_after_contact_per_att"]
    assert high_vel["pff_elusive_rating"] > low_vel["pff_elusive_rating"]
    assert high_vel["catch_point_leverage_delta"] > low_vel["catch_point_leverage_delta"]
    assert high_vel["pocket_anchor_depth_yds"] < low_vel["pocket_anchor_depth_yds"]
    assert abs(
        high_vel["tracking_vector_delta_mm"] - high_vel["tracking_vector_delta_yds"] * 914.4
    ) < 0.5


def test_04_domain2_shoelace_polygon_area_exact_geometric_identity() -> None:
    """Verify exact Gauss-Shoelace polygon area formula and Pocket Collapse Vector (PCV)."""
    # 6 yd x 4 yd rectangle -> exact area = 24.0 sq yds
    rect = [(-3.0, 0.0), (3.0, 0.0), (3.0, -4.0), (-3.0, -4.0)]
    assert math.isclose(compute_shoelace_polygon_area(rect), 24.0, rel_tol=1e-9)

    # Collapsed 4 yd x 3 yd rectangle -> exact area = 12.0 sq yds
    rect_collapsed = [(-2.0, 0.0), (2.0, 0.0), (2.0, -3.0), (-2.0, -3.0)]
    assert math.isclose(compute_shoelace_polygon_area(rect_collapsed), 12.0, rel_tol=1e-9)

    d2 = compute_voronoi_and_continuum_geometry_metrics(
        pocket_polygon_t0=rect,
        pocket_polygon_t1=rect_collapsed,
        dt_sec=1.5,
        box_defenders_count=6,
        box_area_sq_yds=48.0,
        personnel_code="11",
        wr_break_xy=(14.0, 9.0),
        db_break_xy=(11.2, 8.0),
        zone_defender_centroids=[(10.0, 6.0), (18.0, 12.0)],
        eq_domain_signal=0.0,
    )
    # (24.0 - 12.0) / 1.5 = 8.0 sq yds/sec
    assert math.isclose(d2["pocket_collapse_vector_sq_yds_per_sec"], 8.0, abs_tol=1e-4)
    assert math.isclose(d2["pocket_shoelace_area_sq_yds"], 12.0, abs_tol=1e-4)


def test_05_domain2_voronoi_box_spacing_ssp_burn_rate_and_zver() -> None:
    """Verify Voronoi box spacing delta, SSP, Burn Rate (> 2.0 yds vs Man), and ZVER."""
    light_box = compute_voronoi_and_continuum_geometry_metrics(
        pocket_polygon_t0=[(-3.0, 0.0), (3.0, 0.0), (3.0, -4.0), (-3.0, -4.0)],
        pocket_polygon_t1=[(-2.5, 0.0), (2.5, 0.0), (2.5, -3.5), (-2.5, -3.5)],
        dt_sec=1.5,
        box_defenders_count=5,
        box_area_sq_yds=48.0,
        personnel_code="11",
        wr_break_xy=(15.0, 10.0),
        db_break_xy=(12.0, 8.5),
        zone_defender_centroids=[(9.0, 5.0), (20.0, 14.0)],
        eq_domain_signal=0.08,
    )
    heavy_box = compute_voronoi_and_continuum_geometry_metrics(
        pocket_polygon_t0=[(-3.0, 0.0), (3.0, 0.0), (3.0, -4.0), (-3.0, -4.0)],
        pocket_polygon_t1=[(-2.5, 0.0), (2.5, 0.0), (2.5, -3.5), (-2.5, -3.5)],
        dt_sec=1.5,
        box_defenders_count=8,
        box_area_sq_yds=48.0,
        personnel_code="21",
        wr_break_xy=(12.5, 8.8),
        db_break_xy=(12.0, 8.5),
        zone_defender_centroids=[(12.2, 8.6), (13.0, 9.0)],
        eq_domain_signal=-0.05,
    )

    assert len(light_box) == 16
    assert light_box["true_box_count_spacing_delta"] > 0.0
    assert heavy_box["true_box_count_spacing_delta"] < 0.0
    assert light_box["stack_box_efficiency_rate_vs_personnel"] > heavy_box["stack_box_efficiency_rate_vs_personnel"]
    assert light_box["separation_at_separation_point_yds"] > 2.5
    assert light_box["burn_rate_vs_man"] > heavy_box["burn_rate_vs_man"]
    assert light_box["zone_void_exploitation_rate"] > heavy_box["zone_void_exploitation_rate"]


def test_06_domain3_cox_weibull_survival_prwr_and_shed_time() -> None:
    """Verify BK-04 / BK-11 Cox Proportional Hazards & Weibull Survival operators."""
    clean_pocket = compute_survival_and_point_process_metrics(
        weibull_scale_lambda_sec=3.10,
        weibull_shape_k=2.4,
        cox_linear_predictor_beta_x=-0.35,
        hawkes_base_mu=0.18,
        hawkes_alpha=0.12,
        hawkes_beta_decay=1.4,
        prior_stunt_timestamps_sec=(0.5,),
        eval_time_sec=2.2,
        eq_domain_signal=0.05,
    )
    high_pressure = compute_survival_and_point_process_metrics(
        weibull_scale_lambda_sec=2.35,
        weibull_shape_k=2.4,
        cox_linear_predictor_beta_x=0.45,
        hawkes_base_mu=0.35,
        hawkes_alpha=0.25,
        hawkes_beta_decay=1.1,
        prior_stunt_timestamps_sec=(0.4, 0.9, 1.4, 1.8),
        eval_time_sec=2.2,
        eq_domain_signal=-0.05,
    )

    assert len(clean_pocket) == 15
    assert high_pressure["true_pass_rush_win_rate_25s"] > clean_pocket["true_pass_rush_win_rate_25s"]
    assert clean_pocket["cox_pocket_survival_28s"] > high_pressure["cox_pocket_survival_28s"]
    assert clean_pocket["pressure_to_sack_survival_prob"] > high_pressure["pressure_to_sack_survival_prob"]
    assert clean_pocket["time_to_first_pressure_median_sec"] > high_pressure["time_to_first_pressure_median_sec"]


def test_07_domain3_hawkes_self_exciting_stunt_latency_and_disguise_decay() -> None:
    """Verify Hawkes self-exciting process intensity rises with clustered stunt events."""
    quiet = compute_survival_and_point_process_metrics(
        weibull_scale_lambda_sec=2.8,
        weibull_shape_k=2.2,
        cox_linear_predictor_beta_x=0.0,
        hawkes_base_mu=0.20,
        hawkes_alpha=0.22,
        hawkes_beta_decay=1.0,
        prior_stunt_timestamps_sec=(),
        eval_time_sec=2.0,
        eq_domain_signal=0.0,
    )
    clustered_stunts = compute_survival_and_point_process_metrics(
        weibull_scale_lambda_sec=2.8,
        weibull_shape_k=2.2,
        cox_linear_predictor_beta_x=0.0,
        hawkes_base_mu=0.20,
        hawkes_alpha=0.22,
        hawkes_beta_decay=1.0,
        prior_stunt_timestamps_sec=(1.2, 1.5, 1.8, 1.95),
        eval_time_sec=2.0,
        eq_domain_signal=0.0,
    )

    assert clustered_stunts["hawkes_blitz_contagion_intensity"] > quiet["hawkes_blitz_contagion_intensity"]
    assert clustered_stunts["stunt_loop_handoff_latency_ms"] > quiet["stunt_loop_handoff_latency_ms"]


def test_08_domain4_sinkhorn_knopp_optimal_transport_and_tovs() -> None:
    """Verify BK-01 / BK-06 Sinkhorn-Knopp optimal transport and TOVS."""
    ot_metrics = compute_optimal_transport_and_quantile_metrics(
        empirical_samples=[45.0, 58.0, 68.0, 76.0, 88.0, 104.0, 128.0],
        ol_baseline_mean=62.0,
        ol_baseline_std=14.0,
        cost_matrix_2x2=((0.10, 0.75), (0.65, 0.15)),
        source_marginal=(0.60, 0.40),
        target_marginal=(0.65, 0.35),
        sinkhorn_eps=0.20,
        eq_domain_signal=0.10,
    )
    assert len(ot_metrics) == 15
    assert 0.20 <= ot_metrics["true_opportunity_value_score"] <= 0.98
    assert ot_metrics["wasserstein_matchup_mismatch_distance"] > 0.0


def test_09_domain4_wasserstein2_distance_and_pinball_quantiles_p10_to_p90() -> None:
    """Verify Pinball quantile ordering (P10 <= P25 <= P50 <= P75 <= P90) and chunk creator isolation."""
    chunk_creator = compute_optimal_transport_and_quantile_metrics(
        empirical_samples=[52.0, 68.0, 82.0, 95.0, 112.0, 134.0, 165.0],
        ol_baseline_mean=64.0,
        ol_baseline_std=12.0,
        cost_matrix_2x2=((0.15, 0.65), (0.55, 0.20)),
        source_marginal=(0.55, 0.45),
        target_marginal=(0.60, 0.40),
        sinkhorn_eps=0.25,
        eq_domain_signal=0.12,
    )
    system_plodder = compute_optimal_transport_and_quantile_metrics(
        empirical_samples=[38.0, 44.0, 48.0, 51.0, 54.0, 58.0, 62.0],
        ol_baseline_mean=64.0,
        ol_baseline_std=12.0,
        cost_matrix_2x2=((0.15, 0.65), (0.55, 0.20)),
        source_marginal=(0.55, 0.45),
        target_marginal=(0.60, 0.40),
        sinkhorn_eps=0.25,
        eq_domain_signal=-0.04,
    )

    assert (
        chunk_creator["expected_yardage_p10"]
        <= chunk_creator["expected_yardage_p25"]
        <= chunk_creator["expected_yardage_p50"]
        <= chunk_creator["expected_yardage_p75"]
        <= chunk_creator["expected_yardage_p90"]
    )
    assert chunk_creator["consistency_rate_ryoe_gt_1"] > system_plodder["consistency_rate_ryoe_gt_1"]
    assert chunk_creator["boom_rate_ryoe_gt_5"] > system_plodder["boom_rate_ryoe_gt_5"]
    assert (
        chunk_creator["system_back_vs_chunk_creator_isolation_score"]
        > system_plodder["system_back_vs_chunk_creator_isolation_score"]
    )


def test_10_domain5_fwl_micro_blocking_segregation_strips_ol_ybc_above_18() -> None:
    """Verify FWL orthogonalization strips OL YBC/Att > 1.8 yds dominance from true RB talent."""
    # Two RBs with identical raw EPA (+0.10), but one has 3.1 YBC/Att (OL-carried) and one has 1.6 YBC/Att (self-created)
    ol_carried_rb = compute_bayesian_fwl_and_causal_aipw_metrics(
        raw_rb_epa_per_rush=0.10,
        ol_ybc_per_att=3.10,
        rb_total_target_share=0.15,
        passive_checkdown_fraction=0.72,
        cb_targets_allowed_rate=0.14,
        expected_cb_target_rate=0.18,
        raw_Signal_vector=(0.10, 0.05, 0.04),
        propensity_score_e=0.55,
        treated_outcome_y1=0.18,
        control_outcome_y0=0.04,
        mu1_hat=0.15,
        mu0_hat=0.05,
        active_player_gp=8,
        team_gp=8,
        eq_domain_signal=0.0,
    )
    true_talent_rb = compute_bayesian_fwl_and_causal_aipw_metrics(
        raw_rb_epa_per_rush=0.10,
        ol_ybc_per_att=1.60,
        rb_total_target_share=0.15,
        passive_checkdown_fraction=0.72,
        cb_targets_allowed_rate=0.14,
        expected_cb_target_rate=0.18,
        raw_Signal_vector=(0.10, 0.05, 0.04),
        propensity_score_e=0.55,
        treated_outcome_y1=0.18,
        control_outcome_y0=0.04,
        mu1_hat=0.15,
        mu0_hat=0.05,
        active_player_gp=8,
        team_gp=8,
        eq_domain_signal=0.0,
    )

    assert len(ol_carried_rb) == 15
    assert (
        true_talent_rb["micro_blocking_metric_segregation_rb_pure_epa"]
        > ol_carried_rb["micro_blocking_metric_segregation_rb_pure_epa"]
    )
    assert (
        true_talent_rb["scheme_independent_elusive_yards_per_touch"]
        > ol_carried_rb["scheme_independent_elusive_yards_per_touch"]
    )


def test_11_domain5_first_read_rb_target_isolation_from_72pct_passive_checkdowns() -> None:
    """Verify isolation of First-Read Designated RB Target Rate from 72% Passive Checkdowns."""
    d5 = compute_bayesian_fwl_and_causal_aipw_metrics(
        raw_rb_epa_per_rush=0.08,
        ol_ybc_per_att=2.10,
        rb_total_target_share=0.20,
        passive_checkdown_fraction=0.72,
        cb_targets_allowed_rate=0.13,
        expected_cb_target_rate=0.18,
        raw_Signal_vector=(0.08, 0.04, 0.03),
        propensity_score_e=0.60,
        treated_outcome_y1=0.16,
        control_outcome_y0=0.03,
        mu1_hat=0.14,
        mu0_hat=0.04,
        active_player_gp=6,
        team_gp=8,
        eq_domain_signal=0.0,
    )
    # 72% of 0.20 = 0.144 passive checkdown share; 28% of 0.20 = 0.056 first-read target rate
    assert math.isclose(d5["passive_checkdown_target_share_stripped"], 0.144, abs_tol=1e-4)
    assert math.isclose(d5["first_read_designated_rb_target_rate"], 0.056, abs_tol=1e-4)


def test_12_domain5_james_stein_csoe_tpr_and_robins_aipw_motion_lift() -> None:
    """Verify CSOE, TPR, Robins AIPW motion lift, and active_player_gp denominator enforcement."""
    lockdown_cb = compute_bayesian_fwl_and_causal_aipw_metrics(
        raw_rb_epa_per_rush=0.05,
        ol_ybc_per_att=2.0,
        rb_total_target_share=0.15,
        passive_checkdown_fraction=0.72,
        cb_targets_allowed_rate=0.10,
        expected_cb_target_rate=0.19,
        raw_Signal_vector=(0.12, 0.09, 0.08, 0.07),
        propensity_score_e=0.55,
        treated_outcome_y1=0.22,
        control_outcome_y0=0.02,
        mu1_hat=0.18,
        mu0_hat=0.04,
        active_player_gp=5,
        team_gp=8,
        eq_domain_signal=0.05,
    )
    assert lockdown_cb["target_prevention_rate_tpr"] > 0.20
    assert lockdown_cb["true_coverage_snaps_over_expected_csoe"] > 7.5
    assert lockdown_cb["aipw_causal_motion_epa_lift"] > 0.10
    assert lockdown_cb["injury_returning_player_gp_adjusted_share"] > 0.90


def test_13_domain6_mofo_vs_mofc_kl_divergence_nash_and_hjb_control() -> None:
    """Verify BK-07 / BK-12 / BK-16 Information Theory, Game Theory & HJB Stochastic Control."""
    d6 = compute_info_theory_game_theory_and_hjb_metrics(
        mofo_2high_epa=0.14,
        mofc_1high_epa=0.03,
        play_dist_p=(0.48, 0.32, 0.20),
        prior_dist_q=(0.34, 0.33, 0.33),
        payoff_matrix_2x2=((0.22, -0.05), (-0.04, 0.16)),
        sim_pressure_rate=0.34,
        eq_domain_signal=0.08,
        composite_book_delta=0.04,
    )
    assert len(d6) == 15
    assert d6["mofo_2high_vs_mofc_1high_structural_efficiency_delta"] > 0.10
    assert d6["pre_snap_formation_shannon_entropy_bits"] > 1.40
    assert d6["kl_divergence_tendency_breaker_index"] > 0.0
    assert -0.35 <= d6["compiled_pre_sim_log_odds_adjustment"] <= 0.35


def test_14_all_32_teams_15_week9_games_and_128_players_compiled_with_92_stats(
    compiled_week9_payload: Dict[str, Any],
) -> None:
    """Verify all 32 teams, 15 Week 9 games, and 128 players have all 92 finite compiled stats."""
    games = compiled_week9_payload["week9_games_compiled_stats"]
    teams = compiled_week9_payload["teams_32_compiled_stats"]
    players = compiled_week9_payload["players_128_compiled_stats"]

    assert len(games) == 15
    assert len(teams) == 32
    assert set(teams.keys()) == set(NFL_32_TEAMS)
    assert len(players) == 128

    for collection in (games.values(), teams.values(), players.values()):
        for pkt in collection:
            assert pkt["books_bound_count"] == 435
            assert pkt["equations_evaluated_count"] == 21419
            assert pkt["equations_active_count"] == 20019
            assert pkt["equations_held_below_min_sample_count"] == 1400
            assert len(pkt["domain_equation_signals"]) == len(BOOK_DOMAINS_6)

            stats_92 = pkt["compiled_92_stats"]
            assert len(stats_92) == 92
            for stat_name in CANONICAL_92_STATS_AND_METRICS:
                assert stat_name in stats_92
                val = float(stats_92[stat_name])
                assert math.isfinite(val), f"Non-finite {stat_name} on {pkt['entity_id']}"
            assert -0.35 <= float(stats_92["compiled_pre_sim_log_odds_adjustment"]) <= 0.35


def test_15_persisted_compiled_stats_and_receipt_artifacts_verified(
    compiled_week9_payload: Dict[str, Any],
) -> None:
    """Verify persisted JSON artifacts on disk."""
    assert COMPILED_STATS_OUTPUT_PATH.exists()
    assert COMPILER_RECEIPT_OUTPUT_PATH.exists()

    receipt = json.loads(COMPILER_RECEIPT_OUTPUT_PATH.read_text(encoding="utf-8"))
    assert receipt["receipt_id"] == "BOOK-EQUATIONS-TO-STATS-COMPILER-2026-11-07"
    assert receipt["status"] == "VERIFIED_PASS"
    assert receipt["corpus_and_equation_binding_summary"]["complete_503_corpus_books_count"] == 503
    assert receipt["corpus_and_equation_binding_summary"]["total_equations_compiled"] == 21419
    assert (
        receipt["corpus_and_equation_binding_summary"]["compiled_stats_and_micro_metrics_count"]
        == 92
    )


def test_16_two_host_rule_zero_literal_host_paths_in_intelligence_metrics() -> None:
    """Verify Two-Host Rule (`check_charge_9`): zero literal host paths in intelligence/metrics/."""
    forbidden_tokens = (
        "C:\\Users\\" + "Garrett",
        "C:/Users/" + "Garrett",
        "/Users/" + "Garrett",
    )
    metrics_dir = REPO_ROOT / "intelligence" / "metrics"
    py_files = list(metrics_dir.glob("*.py"))
    assert len(py_files) >= 1
    for py_file in py_files:
        text = py_file.read_text(encoding="utf-8")
        for tok in forbidden_tokens:
            assert tok not in text, f"Forbidden host path token in {py_file.name}"
