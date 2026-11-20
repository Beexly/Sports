"""
Causal Walk-Forward, Swap-Symmetry, and Honest Raw-Noise Rejection Tests for Stream 15X
(`causal_air_yac_and_rush_success_engine.py`).
"""

from __future__ import annotations

from intelligence.coaching.causal_air_yac_and_rush_success_engine import (
    compute_causal_15x_air_yac_rush_profiles,
    evaluate_causal_15x_air_yac_rush_matchup,
    evaluate_causal_15x_walkforward_oos,
)


def test_stream_15x_profiles_cover_32_teams_and_are_strictly_causal() -> None:
    w4 = compute_causal_15x_air_yac_rush_profiles(as_of_week=4)
    w9 = compute_causal_15x_air_yac_rush_profiles(as_of_week=9)
    assert w4["as_of_week"] == 4
    assert w9["as_of_week"] == 9
    assert w4["teams_count"] >= 32
    assert w9["teams_count"] >= 32
    for team in ("KC", "BUF", "IND", "HOU"):
        assert team in w4["teams"]
        assert team in w9["teams"]
        assert w9["teams"][team]["n_pass_games"] >= w4["teams"][team]["n_pass_games"]


def test_stream_15x_swap_symmetry_antisymmetry_and_fallback() -> None:
    ab = evaluate_causal_15x_air_yac_rush_matchup("IND", "HOU", {"is_indoor": True}, as_of_week=9)
    ba = evaluate_causal_15x_air_yac_rush_matchup("HOU", "IND", {"is_indoor": True}, as_of_week=9)
    alias_ab = evaluate_causal_15x_air_yac_rush_matchup("IND", "HST", {"is_indoor": True}, as_of_week=9)

    pairs = [
        ("stream_15x_away_pass_air_yac_edge", "stream_15x_home_pass_air_yac_edge"),
        ("stream_15x_away_rush_sr_edge", "stream_15x_home_rush_sr_edge"),
        ("stream_15x_away_yac_raw_null_edge", "stream_15x_home_yac_raw_null_edge"),
    ]
    for ka, kh in pairs:
        assert abs(ab[ka] - ba[kh]) < 1e-6
        assert abs(ab[kh] - ba[ka]) < 1e-6
        assert abs(ab[ka] - alias_ab[ka]) < 1e-6
        assert -0.20 <= ab[ka] <= 0.20
        assert -0.20 <= ab[kh] <= 0.20

    assert abs(ab["stream_15x_net_air_rush_diff"] + ba["stream_15x_net_air_rush_diff"]) < 1e-6

    unk = evaluate_causal_15x_air_yac_rush_matchup("ZZZ", "YYY", as_of_week=9)
    assert unk["stream_15x_away_pass_air_yac_edge"] == 0.0
    assert unk["stream_15x_net_air_rush_diff"] == 0.0


def test_stream_15x_walkforward_oos_honest_promotion_and_raw_failure() -> None:
    oos = evaluate_causal_15x_walkforward_oos(eval_weeks=tuple(range(4, 11)))
    pa = oos["pass_air_yac_diff"]
    ru = oos["rush_eff_and_success"]

    assert pa["n_team_games"] >= 200
    assert pa["beats_all_baselines"] is True
    assert pa["raw_beats_baseline"] is False
    assert pa["mse_stream_15x_diff_air_yac"] < pa["mse_homogeneous_pass_eb"]
    assert pa["oos_corr"] > 0.35

    assert ru["n_team_games"] >= 200
    assert ru["beats_all_baselines"] is True
    assert ru["raw_beats_baseline"] is False
    assert ru["oos_corr_sr"] > ru["oos_corr_eb"] > 0.10
    assert oos["all_promoted_components_beat_baseline"] is True
