"""
Tests for Stream 16A: Causal 3rd-Down Defense Survival, CPOE & Special Teams Engine.
"""

from __future__ import annotations

from intelligence.coaching.causal_third_down_cpoe_st_engine import (
    compute_causal_16a_3d_cpoe_st_profiles,
    evaluate_causal_16a_3d_cpoe_st_matchup,
    evaluate_causal_16a_walkforward_oos,
)


def test_stream_16a_causality_and_profiles() -> None:
    p_w4 = compute_causal_16a_3d_cpoe_st_profiles(as_of_week=4)
    p_w10 = compute_causal_16a_3d_cpoe_st_profiles(as_of_week=10)
    assert p_w4["as_of_week"] == 4
    assert p_w10["as_of_week"] == 10
    assert p_w4["teams_count"] == 32
    assert p_w4["teams"]["KC"] != p_w10["teams"]["KC"]


def test_stream_16a_swap_symmetry_and_deep_shot_null_holds() -> None:
    fwd = evaluate_causal_16a_3d_cpoe_st_matchup("IND", "HOU")
    rev = evaluate_causal_16a_3d_cpoe_st_matchup("HOU", "IND")

    assert fwd["stream_16a_away_deep_shot_null_edge"] == 0.0
    assert fwd["stream_16a_home_deep_shot_null_edge"] == 0.0
    assert abs(fwd["stream_16a_away_def_3d_edge"] - rev["stream_16a_home_def_3d_edge"]) < 1e-6
    assert abs(fwd["stream_16a_away_cpoe_edge"] - rev["stream_16a_home_cpoe_edge"]) < 1e-6
    assert abs(fwd["stream_16a_away_st_epa_edge"] - rev["stream_16a_home_st_epa_edge"]) < 1e-6
    assert abs(fwd["stream_16a_net_3d_cpoe_st_diff"] + rev["stream_16a_net_3d_cpoe_st_diff"]) < 1e-6


def test_stream_16a_walkforward_oos_gate_and_honest_nulls() -> None:
    oos = evaluate_causal_16a_walkforward_oos(eval_weeks=range(4, 11))
    assert oos["n_team_games"] >= 200
    assert oos["all_promoted_components_beat_baseline"] is True
    comps = oos["components"]
    for name in ("def_3d_res", "off_cpoe", "def_cpoe", "off_mid_rate", "off_st_epa"):
        assert comps[name]["beats_baseline"] is True
        assert comps[name]["production_weight"] == 1.0
    for null_name in ("off_deep_rate", "def_deep_rate"):
        assert comps[null_name]["beats_baseline"] is False
        assert comps[null_name]["production_weight"] == 0.0
