"""
Tests for Stream 15Z: Causal OL Snap Continuity, Sack Resilience & 1H/2H Split Engine.
"""

from __future__ import annotations

from intelligence.coaching.causal_ol_continuity_and_half_splits_engine import (
    compute_causal_15z_ol_half_profiles,
    evaluate_causal_15z_ol_half_matchup,
    evaluate_causal_15z_walkforward_oos,
)


def test_stream_15z_causality_and_profile_count() -> None:
    p_w4 = compute_causal_15z_ol_half_profiles(as_of_week=4)
    p_w10 = compute_causal_15z_ol_half_profiles(as_of_week=10)
    assert p_w4["as_of_week"] == 4
    assert p_w10["as_of_week"] == 10
    assert p_w4["teams_count"] == 32
    assert p_w10["ol_continuity_rows"] >= 250
    assert p_w4["teams"]["KC"] != p_w10["teams"]["KC"]


def test_stream_15z_swap_symmetry_and_null_holds() -> None:
    fwd = evaluate_causal_15z_ol_half_matchup("IND", "HOU")
    rev = evaluate_causal_15z_ol_half_matchup("HOU", "IND")

    assert fwd["stream_15z_away_halftime_swing_null_edge"] == 0.0
    assert fwd["stream_15z_home_halftime_swing_null_edge"] == 0.0
    assert abs(fwd["stream_15z_away_ol_continuity_edge"] - rev["stream_15z_home_ol_continuity_edge"]) < 1e-6
    assert abs(fwd["stream_15z_away_sack_protection_edge"] - rev["stream_15z_home_sack_protection_edge"]) < 1e-6
    assert abs(fwd["stream_15z_away_first_half_edge"] - rev["stream_15z_home_first_half_edge"]) < 1e-6
    assert abs(fwd["stream_15z_net_ol_half_diff"] + rev["stream_15z_net_ol_half_diff"]) < 1e-6


def test_stream_15z_walkforward_oos_gate_and_honest_nulls() -> None:
    oos = evaluate_causal_15z_walkforward_oos(eval_weeks=range(4, 11))
    assert oos["n_team_games"] >= 200
    assert oos["all_promoted_components_beat_baseline"] is True
    comps = oos["components"]
    for name in ("ol_shared_prev_wk", "off_sack_rate", "def_sack_rate", "off_h1_epa", "def_h2_comp_epa"):
        assert comps[name]["beats_baseline"] is True
        assert comps[name]["production_weight"] == 1.0
    for null_name in ("raw_halftime_swing", "def_expl_allowed"):
        assert comps[null_name]["beats_baseline"] is False
        assert comps[null_name]["production_weight"] == 0.0
