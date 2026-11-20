"""
Tests for Stream 15Y: Causal FTN Box-Count, Blitz & Charting Engine.
"""

from __future__ import annotations

from intelligence.coaching.causal_box_shell_and_charting_engine import (
    compute_causal_15y_box_charting_profiles,
    evaluate_causal_15y_box_charting_matchup,
    evaluate_causal_15y_walkforward_oos,
)


def test_stream_15y_causality_and_outlier_hygiene() -> None:
    p_w4 = compute_causal_15y_box_charting_profiles(as_of_week=4)
    p_w10 = compute_causal_15y_box_charting_profiles(as_of_week=10)
    assert p_w4["as_of_week"] == 4
    assert p_w10["as_of_week"] == 10
    assert p_w4["teams_count"] == 32
    # FTN 2026 contains outlier n_blitzers (52, 63); verify clipped <= 7
    assert p_w10["outliers26_clipped"] >= 2
    assert p_w10["max_clean_blitz_26"] <= 7
    assert p_w4["teams"]["KC"] != p_w10["teams"]["KC"]


def test_stream_15y_swap_symmetry_and_null_holds() -> None:
    fwd = evaluate_causal_15y_box_charting_matchup("IND", "HOU")
    rev = evaluate_causal_15y_box_charting_matchup("HOU", "IND")

    assert fwd["stream_15y_away_iwt_null_edge"] == 0.0
    assert fwd["stream_15y_home_iwt_null_edge"] == 0.0
    assert abs(fwd["stream_15y_away_rush_box_edge"] - rev["stream_15y_home_rush_box_edge"]) < 1e-6
    assert abs(fwd["stream_15y_away_catchable_edge"] - rev["stream_15y_home_catchable_edge"]) < 1e-6
    assert abs(fwd["stream_15y_away_def_blitz_rate"] - rev["stream_15y_home_def_blitz_rate"]) < 1e-6
    assert abs(fwd["stream_15y_net_box_charting_diff"] + rev["stream_15y_net_box_charting_diff"]) < 1e-6


def test_stream_15y_walkforward_oos_gate_and_honest_nulls() -> None:
    oos = evaluate_causal_15y_walkforward_oos(eval_weeks=range(4, 11))
    assert oos["n_team_games"] >= 200
    assert oos["all_promoted_components_beat_baseline"] is True
    comps = oos["components"]
    for name in ("off_rush_box_res", "off_catchable", "def_catchable_allowed", "def_blitz_rate", "def_light_box_rate"):
        assert comps[name]["beats_baseline"] is True
        assert comps[name]["beats_raw"] is True
        assert comps[name]["production_weight"] == 1.0
    for null_name in ("off_iwt", "def_box_res"):
        assert comps[null_name]["beats_baseline"] is False
        assert comps[null_name]["production_weight"] == 0.0
