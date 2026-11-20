"""
Unit and empirical optimization tests for FootballXOs 16-hub playbook engine
and live `core_nfl_schemes_and_systems` integration.
"""

from __future__ import annotations

import random

from intelligence.coaching import core_nfl_schemes_and_systems as core_schemes
from intelligence.coaching.footballxos_16_category_playbook_engine import (
    EAGER_STABILITY_PRIORS,
    FOOTBALLXOS_16_HUB_CATALOG,
    MAX_LOG_ODDS_CLAMP,
    compute_dynamic_kickoff_35_hidden_yardage_ep,
    compute_rmit_football_drag_coefficient,
    debias_expert_projection_and_score_stack,
    evaluate_pre_snap_playbook_and_split_field_overlay,
    shrink_player_metric_by_stability,
)


def test_all_16_footballxos_hubs_cataloged_and_http_verified() -> None:
    assert len(FOOTBALLXOS_16_HUB_CATALOG) == 16
    offense_hubs = [h for h in FOOTBALLXOS_16_HUB_CATALOG if h.side == "offense"]
    defense_hubs = [h for h in FOOTBALLXOS_16_HUB_CATALOG if h.side == "defense"]
    assert len(offense_hubs) == 7
    assert len(defense_hubs) == 9
    assert all(h.http_status == 200 and h.listing_count > 0 for h in FOOTBALLXOS_16_HUB_CATALOG)
    assert sum(h.listing_count for h in offense_hubs) == 244
    assert sum(h.listing_count for h in defense_hubs) == 281


def test_core_nfl_schemes_and_systems_live_bridge_and_clamps() -> None:
    res = evaluate_pre_snap_playbook_and_split_field_overlay(
        offensive_scheme="SHANAHAN_MCVAY_OUTSIDE_ZONE",
        defensive_front="4_2_5_SPLIT_FIELD",
        coverage_shell="COVER_4_QUARTERS",
        offensive_formation="3X1_TRIPS",
        down=2,
        ydstogo=5.0,
        penny_51_walk_down=True,
        rushers_weak_slide=4,
        protection_adjustment="TOM",
        wind_speed_mph=18.0,
        crosswind_yaw_deg=60.0,
        is_counter_or_gap_run=True,
    )
    assert res["hub_count_verified"] == 16
    assert res["core_route_concepts_wired"] == len(core_schemes.ROUTE_CONCEPTS_MATRIX)
    assert res["gruden_formations_wired"] == len(core_schemes.GRUDEN_AND_FOURTH_FILM_FORMATIONS)
    assert res["down_distance_buckets_wired"] == len(core_schemes.DOWN_AND_DISTANCE_PRIORS)
    assert res["split_field_check"] == "POACH_SOLO"
    assert res["penny_51_mitigation_ypc_delta"] == -0.52
    assert abs(res["clamped_log_odds_delta"]) <= MAX_LOG_ODDS_CLAMP + 1e-9
    assert abs(sum(res["off_play_call_probs"].values()) - 1.0) < 1e-4
    assert abs(sum(res["def_shell_call_probs"].values()) - 1.0) < 1e-4
    assert "TOM" in res["protection_rule"]


def test_kickoff_35_hidden_yardage_and_rmit_drag_physics() -> None:
    ko = compute_dynamic_kickoff_35_hidden_yardage_ep(
        expected_landing_zone_start_yardline=27.0,
        landing_zone_execution_rate=0.85,
        hangtime_sec=3.4,
    )
    assert ko["touchback_rule_yardline"] == 35.0
    assert ko["kickoff_ep_advantage_per_kick"] > 0.50

    cd0 = compute_rmit_football_drag_coefficient(wind_speed_mph=20.0, crosswind_yaw_deg=0.0)
    cd90 = compute_rmit_football_drag_coefficient(wind_speed_mph=20.0, crosswind_yaw_deg=90.0)
    assert abs(cd0["cd"] - 0.19) < 1e-3
    assert abs(cd90["cd"] - 0.775) < 1e-3
    assert cd90["deep_pass_completion_delta"] < cd0["deep_pass_completion_delta"]


def test_empirical_shrinkage_and_jayanti_debiasing_optimizations() -> None:
    rng = random.Random(20261119)
    mse_raw = 0.0
    mse_shrunk = 0.0
    n_players = 400
    for _ in range(n_players):
        true_val = rng.gauss(0.0, 0.045)
        y1 = true_val + rng.gauss(0.0, 0.095)
        y2 = true_val + rng.gauss(0.0, 0.095)
        s = shrink_player_metric_by_stability("RYOE", y1, 0.0, sample_size=85.0)
        assert s["reliability_r"] == EAGER_STABILITY_PRIORS["RYOE"][0]
        mse_raw += (y1 - y2) ** 2
        mse_shrunk += (s["shrunk_estimate"] - y2) ** 2

    mse_gain = (mse_raw - mse_shrunk) / mse_raw
    assert mse_gain >= 0.25

    sq_expert = 0.0
    sq_debiased = 0.0
    for _ in range(250):
        true_pts = rng.gauss(18.0, 4.5)
        algo_proj = true_pts + rng.gauss(0.0, 2.1)
        hype = rng.gauss(0.0, 1.0)
        expert = true_pts + 1.15 * hype + rng.gauss(0.0, 2.9)
        d = debias_expert_projection_and_score_stack(
            expert_consensus_proj=expert,
            pure_algorithmic_proj=algo_proj,
            position_group="QB",
            expert_hype_skew_z=hype,
            week=16,
        )
        assert d["playoff_week_multiplier"] == 1.2
        sq_expert += (expert - true_pts) ** 2
        sq_debiased += (d["debiased_projection"] - true_pts) ** 2

    assert (sq_debiased ** 0.5) < (sq_expert ** 0.5) * 0.85
