"""
Causal Walk-Forward, Swap-Symmetry, and Honest Null-Hold Tests for Stream 15V
(`causal_turnover_and_early_down_regression_engine.py`).
"""

from __future__ import annotations

import math

from intelligence.coaching.causal_turnover_and_early_down_regression_engine import (
    compute_causal_15v_early_down_profiles,
    evaluate_causal_15v_early_down_matchup,
    evaluate_causal_15v_walkforward_oos,
)


def test_stream_15v_profiles_cover_32_teams_and_are_strictly_causal() -> None:
    w4 = compute_causal_15v_early_down_profiles(as_of_week=4)
    w9 = compute_causal_15v_early_down_profiles(as_of_week=9)
    assert w4["as_of_week"] == 4
    assert w9["as_of_week"] == 9
    assert w4["teams_count"] >= 32
    assert w9["teams_count"] >= 32
    for team in ("KC", "BUF", "IND", "HOU"):
        assert team in w4["teams"]
        assert team in w9["teams"]
        assert w9["teams"][team]["n_ed_clean_snaps"] >= w4["teams"][team]["n_ed_clean_snaps"]


def test_stream_15v_swap_symmetry_antisymmetry_and_fallback() -> None:
    ab = evaluate_causal_15v_early_down_matchup("IND", "HOU", {"is_indoor": True}, as_of_week=9)
    ba = evaluate_causal_15v_early_down_matchup("HOU", "IND", {"is_indoor": True}, as_of_week=9)
    alias_ab = evaluate_causal_15v_early_down_matchup("IND", "HST", {"is_indoor": True}, as_of_week=9)

    pairs = [
        ("stream_15v_away_ed_clean_epa_edge", "stream_15v_home_ed_clean_epa_edge"),
        ("stream_15v_away_ed_sr_edge", "stream_15v_home_ed_sr_edge"),
        ("stream_15v_away_fumble_luck_null_edge", "stream_15v_home_fumble_luck_null_edge"),
    ]
    for ka, kh in pairs:
        assert abs(ab[ka] - ba[kh]) < 1e-6
        assert abs(ab[kh] - ba[ka]) < 1e-6
        assert abs(ab[ka] - alias_ab[ka]) < 1e-6
        assert -0.18 <= ab[ka] <= 0.18
        assert -0.18 <= ab[kh] <= 0.18

    assert abs(ab["stream_15v_net_early_down_diff"] + ba["stream_15v_net_early_down_diff"]) < 1e-6

    unk = evaluate_causal_15v_early_down_matchup("ZZZ", "YYY", as_of_week=9)
    assert unk["stream_15v_away_ed_clean_epa_edge"] == 0.0
    assert unk["stream_15v_net_early_down_diff"] == 0.0


def test_stream_15v_walkforward_oos_honest_promotion_and_null_fumble_luck() -> None:
    oos = evaluate_causal_15v_walkforward_oos(eval_weeks=tuple(range(4, 11)))
    assert oos["n_team_games"] >= 200
    ed = oos["ed_clean_epa"]
    sr = oos["ed_success_rate"]
    fl = oos["fumble_luck_residual"]

    assert ed["beats_all_baselines"] is True
    assert ed["mse_stream_15v_ed_clean"] < oos["mse_league_baseline"]
    assert ed["mse_stream_15v_ed_clean"] < oos["mse_raw_unshrunk"]
    assert ed["mse_stream_15v_ed_clean"] < oos["mse_raw_epa_eb"]
    assert ed["oos_corr"] > 0.35

    assert sr["beats_league_baseline"] is True
    assert sr["oos_corr"] > 0.25

    assert math.isfinite(fl["mse_fumble_luck_only"])
    assert fl["beats_raw_epa_eb"] is False
    assert oos["all_promoted_components_beat_baseline"] is True
