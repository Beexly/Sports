"""
Causal Walk-Forward, Swap-Symmetry, and Honest Null-Hold Tests for Stream 15U
(`causal_pace_and_penalty_discipline_engine.py`).
"""

from __future__ import annotations

import math

from intelligence.coaching.causal_pace_and_penalty_discipline_engine import (
    compute_causal_15u_pace_and_penalty_profiles,
    evaluate_causal_15u_pace_matchup,
    evaluate_causal_15u_walkforward_oos,
)


def test_stream_15u_profiles_cover_32_teams_and_are_strictly_causal() -> None:
    w4 = compute_causal_15u_pace_and_penalty_profiles(as_of_week=4)
    w9 = compute_causal_15u_pace_and_penalty_profiles(as_of_week=9)
    assert w4["as_of_week"] == 4
    assert w9["as_of_week"] == 9
    assert w4["teams_count"] >= 32
    assert w9["teams_count"] >= 32
    for team in ("KC", "BUF", "IND", "HOU"):
        assert team in w4["teams"]
        assert team in w9["teams"]
        assert w9["teams"][team]["n_neutral_snaps"] >= w4["teams"][team]["n_neutral_snaps"]
        assert w9["teams"][team]["n_games"] >= w4["teams"][team]["n_games"]


def test_stream_15u_swap_symmetry_invariance_and_fallback() -> None:
    ab = evaluate_causal_15u_pace_matchup("IND", "HOU", {"is_indoor": True}, as_of_week=9)
    ba = evaluate_causal_15u_pace_matchup("HOU", "IND", {"is_indoor": True}, as_of_week=9)
    alias_ab = evaluate_causal_15u_pace_matchup("IND", "HST", {"is_indoor": True}, as_of_week=9)

    pairs = [
        ("stream_15u_away_neutral_pace_edge", "stream_15u_home_neutral_pace_edge"),
        ("stream_15u_away_play_volume_edge", "stream_15u_home_play_volume_edge"),
        ("stream_15u_away_penalty_null_edge", "stream_15u_home_penalty_null_edge"),
    ]
    for ka, kh in pairs:
        assert abs(ab[ka] - ba[kh]) < 1e-6
        assert abs(ab[kh] - ba[ka]) < 1e-6
        assert abs(ab[ka] - alias_ab[ka]) < 1e-6
        assert -0.18 <= ab[ka] <= 0.18
        assert -0.18 <= ab[kh] <= 0.18

    assert abs(ab["stream_15u_net_tempo_volume_diff"] + ba["stream_15u_net_tempo_volume_diff"]) < 1e-6
    assert abs(ab["stream_15u_game_expected_plays_delta"] - ba["stream_15u_game_expected_plays_delta"]) < 1e-6

    unk = evaluate_causal_15u_pace_matchup("ZZZ", "YYY", as_of_week=9)
    assert unk["stream_15u_away_neutral_pace_edge"] == 0.0
    assert unk["stream_15u_net_tempo_volume_diff"] == 0.0


def test_stream_15u_walkforward_oos_honest_promotion_and_null_penalty() -> None:
    oos = evaluate_causal_15u_walkforward_oos(eval_weeks=tuple(range(4, 11)))
    pace = oos["neutral_pace"]
    plays = oos["off_play_volume"]
    pen = oos["team_penalty_rate"]

    assert pace["n_team_games"] >= 200
    assert pace["beats_baseline_and_raw"] is True
    assert pace["mse_stream_15u_eb"] < pace["mse_league_baseline"]
    assert pace["mse_stream_15u_eb"] < pace["mse_raw_team"]
    assert pace["oos_corr"] > 0.0

    assert plays["n_team_games"] >= 200
    assert plays["beats_baseline_and_raw"] is True
    assert plays["mse_stream_15u_eb"] < plays["mse_league_baseline"]
    assert plays["mse_stream_15u_eb"] < plays["mse_raw_team"]
    assert plays["oos_corr"] > 0.1

    # Honest null audit: team penalty rate fails OOS MSE vs league baseline
    assert pen["n_team_games"] >= 200
    assert math.isfinite(pen["mse_stream_15u_eb"])
    assert pen["beats_baseline"] is False

    assert oos["all_promoted_components_beat_baseline"] is True
