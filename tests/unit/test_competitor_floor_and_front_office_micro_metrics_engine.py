#!/usr/bin/env python3
"""
Unit Tests for Competitor-Floor & Front-Office 92-Metric Superset Engine
(`tests/unit/test_competitor_floor_and_front_office_micro_metrics_engine.py`).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from intelligence.metrics.competitor_floor_and_front_office_micro_metrics_engine import (
    DOMAIN_8_METRIC_MAP,
    METRICS_DATA_OUT_PATH,
    METRICS_RECEIPT_OUT_PATH,
    REPO_ROOT,
    compute_catch_point_leverage_delta,
    compute_disguise_decay_and_hitch_penalty,
    compute_pff_elusive_rating,
    compute_pocket_collapse_vector_shoelace,
    compute_rb_micro_blocking_segregation,
    compute_rb_receiving_regression_and_yprr_tier,
    compute_ryoe_distribution_and_unfair_yards,
    compute_tracking_vector_delta_mesh_gap,
    compute_true_box_count_spacing_delta,
    compute_true_opportunity_value_score,
    evaluate_competitor_floor_and_front_office_92_metrics,
    get_competitor_floor_and_front_office_micro_metrics_signal,
)
from intelligence.reasoning.layers.layer_registry import build_context_packet
from intelligence.reasoning.reasoning_workflow_assembler import execute_reasoning_workflow


def test_domain_8_registry_contains_exact_92_unique_metrics() -> None:
    all_metrics = []
    for dom, metrics in DOMAIN_8_METRIC_MAP.items():
        assert len(metrics) >= 5, f"Domain {dom} has too few metrics"
        all_metrics.extend(metrics)
    assert len(all_metrics) == 92
    assert len(set(all_metrics)) == 92


def test_exact_pff_elusive_rating_formula() -> None:
    # (MTF / (Designed Runs + Receptions)) * YCO/Att * 100
    # (21 / (80 + 20)) * 4.0 * 100 = 0.21 * 4.0 * 100 = 84.0
    val = compute_pff_elusive_rating(
        missed_tackles_forced=21.0,
        designed_runs=80.0,
        receptions=20.0,
        yards_after_contact_per_attempt=4.0,
    )
    assert abs(val - 84.0) < 1e-6


def test_exact_true_opportunity_value_score_tovs_formula() -> None:
    # TOVS = (Rush * 0.6) + (RZ * 1.2) + (GL * 2.4) + (Targets * 1.5)
    # (15 * 0.6) + (3 * 1.2) + (2 * 2.4) + (6 * 1.5) = 9.0 + 3.6 + 4.8 + 9.0 = 26.4
    tovs = compute_true_opportunity_value_score(
        rush_attempts=15.0,
        red_zone_carries=3.0,
        goal_line_carries=2.0,
        targets=6.0,
    )
    assert abs(tovs - 26.4) < 1e-6


def test_exact_true_box_count_spacing_delta_formula() -> None:
    # (Defenders in Box / Offensive Blockers in Box) * Avg Defender Dist from LOS
    # (7 / 6) * 4.2 = 4.9
    bsd = compute_true_box_count_spacing_delta(
        defenders_in_box=7.0,
        offensive_blockers_in_box=6.0,
        avg_defender_distance_from_los_yds=4.2,
    )
    assert abs(bsd - 4.9) < 1e-6


def test_tracking_vector_delta_mesh_gap_and_34yd_baseline() -> None:
    compressed = compute_tracking_vector_delta_mesh_gap(
        ball_carrier_xy_yds=(0.0, 0.0),
        nearest_unblocked_defender_xy_yds=(2.0, 1.5),  # 2.5 yds < 3.4 yds baseline
        efficiency_epa_per_rush=0.12,
    )
    assert abs(compressed["mesh_gap_yards"] - 2.5) < 1e-6
    assert abs(compressed["mesh_gap_millimeters"] - 2286.0) < 1e-2
    assert compressed["operates_under_compressed_space"] is True
    assert compressed["front_office_talent_weight_multiplier"] > 1.0


def test_ryoe_distribution_isolates_system_back_from_chunk_creator() -> None:
    # System back: many +1.2 to +2.0 carries, zero > +5.0 carries
    sys_samples = [1.4, 1.6, 1.2, 1.8, 0.2, -0.3, 1.5, 0.4, -0.2, 1.3]
    sys_res = compute_ryoe_distribution_and_unfair_yards(sys_samples)
    assert sys_res["consistency_rate_gt_plus_1"] >= 0.50
    assert sys_res["boom_rate_gt_plus_5"] == 0.0
    assert sys_res["runner_archetype"] == "SYSTEM_BACK"

    # True chunk creator: multiple explosive > +5.0 carries
    chunk_samples = [6.5, 8.2, 1.4, 1.8, -0.5, 0.3, 5.4, 1.2, 0.1, -0.4]
    chunk_res = compute_ryoe_distribution_and_unfair_yards(chunk_samples)
    assert chunk_res["boom_rate_gt_plus_5"] >= 0.20
    assert chunk_res["runner_archetype"] == "TRUE_CHUNK_CREATOR"


def test_micro_blocking_segregation_and_rb_yprr_tiers() -> None:
    ol_carried = compute_rb_micro_blocking_segregation(
        ybc_per_att=2.15,  # > 1.8 yds elite OL scheme threshold
        shed_time_survival_sec=2.05,
        carries_block_lost_under_15s_rate=0.14,
        defensive_penetration_depth_yds=-0.20,
        raw_success_rate=0.48,
    )
    assert ol_carried["elite_ol_scheme_penalty_triggered"] is True

    # RB YPRR Tiers (<0.90, 1.00-1.50, >=1.85)
    t3 = compute_rb_receiving_regression_and_yprr_tier(150.0, 200.0, 8.0, 32.0)
    assert t3["rb_yprr"] < 0.90
    assert "TIER_3" in t3["rb_yprr_tier"]

    t1 = compute_rb_receiving_regression_and_yprr_tier(420.0, 210.0, 28.0, 22.0)
    assert t1["rb_yprr"] >= 1.85
    assert "TIER_1" in t1["rb_yprr_tier"]
    assert t1["designated_rate_over_league_baseline"] > 0.0


def test_catch_point_leverage_disguise_decay_and_shoelace_pcv() -> None:
    lev = compute_catch_point_leverage_delta(
        ball_velocity_vec=(10.0, 5.0, 0.0),
        wr_pos_vec=(20.0, 12.0, 1.0),
        db_pos_vec=(19.8, 11.7, 1.0),
    )
    assert lev["catch_point_leverage_delta"] > 0.0
    assert lev["ball_placed_away_from_db_leverage"] is True

    disg = compute_disguise_decay_and_hitch_penalty(195.0, extra_hitch_rate=0.08)
    assert disg["is_elite_disguise_processor"] is True

    # Pocket polygon shrinking from 4x4 (16 sq yds) to 3x3 (9 sq yds) over 2.0s => PCV = 3.5 > 1.5
    pcv = compute_pocket_collapse_vector_shoelace(
        blocker_polygon_xy_t0=[(0.0, 0.0), (4.0, 0.0), (4.0, 4.0), (0.0, 4.0)],
        blocker_polygon_xy_t20=[(0.0, 0.0), (3.0, 0.0), (3.0, 3.0), (0.0, 3.0)],
        delta_t_sec=2.0,
    )
    assert abs(pcv["area_t0_sq_yds"] - 16.0) < 1e-4
    assert abs(pcv["area_t20_sq_yds"] - 9.0) < 1e-4
    assert abs(pcv["pocket_collapse_vector_sq_yds_per_sec"] - 3.5) < 1e-4
    assert pcv["exceeds_15_sq_yds_per_sec_breakdown_threshold"] is True


def test_full_week9_evaluation_and_layer_workflow_wiring() -> None:
    report = evaluate_competitor_floor_and_front_office_92_metrics(write_artifacts=True)
    assert report["total_metrics_implemented"] == 92
    assert report["books_compiled_count"] == 503
    assert report["equations_compiled_count"] == 21419
    assert report["week9_games_count"] == 15
    assert METRICS_DATA_OUT_PATH.exists()
    assert METRICS_RECEIPT_OUT_PATH.exists()

    sig = get_competitor_floor_and_front_office_micro_metrics_signal("2026_09_JAX_BAL")
    assert sig["total_metrics_active"] == 92
    assert "L12_trench_warfare_and_pass_rush" in sig["layer_signal_injections"]
    assert "L21_qb_processing_and_pressure" in sig["layer_signal_injections"]

    pkt = build_context_packet(
        {
            "game_id": "2026_09_JAX_BAL",
            "home_team": "BAL",
            "away_team": "JAX",
            "kickoff_utc": "2026-11-08T18:00:00Z",
            "as_of": "2026-11-08T05:00:00Z",
        },
        write_to_disk=False,
    )
    assert "competitor_floor_92_metrics_l12" in pkt["layers"]["L12_trench_matchup_ol_vs_dl"]["signals"]
    assert "competitor_floor_92_metrics_l21" in pkt["layers"]["L21_qb_processing_and_pressure"]["signals"]

    trace = execute_reasoning_workflow(pkt, write_to_disk=False)
    s3_priors = trace["stage3_pre_sim_situational_priors"]
    assert s3_priors["competitor_floor_92_metrics_active"] == 92
    assert s3_priors["books_503_compiled_into_stats"] == 503
    assert s3_priors["equations_21419_compiled_into_stats"] == 21419


def test_two_host_portability_no_hardcoded_host_paths() -> None:
    src_path = REPO_ROOT / "intelligence" / "metrics" / "competitor_floor_and_front_office_micro_metrics_engine.py"
    text = src_path.read_text(encoding="utf-8")
    forbidden_win = "C:" + "\\Users\\Garrett"
    forbidden_posix = "/Users/" + "Garrett"
    assert forbidden_win not in text
    assert forbidden_posix not in text
