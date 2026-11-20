"""
Causal Walk-Forward, Swap-Symmetry, and Honest Null-Hold Tests for Stream 15T
(`causal_redzone_and_fourth_down_engine.py`).
"""

from __future__ import annotations

import math

from intelligence.coaching.causal_redzone_and_fourth_down_engine import (
    compute_causal_15t_redzone_and_4th_profiles,
    evaluate_causal_15t_redzone_4th_matchup,
    evaluate_causal_15t_walkforward_oos,
)


def test_stream_15t_profiles_cover_32_teams_and_are_strictly_causal() -> None:
    w4 = compute_causal_15t_redzone_and_4th_profiles(as_of_week=4)
    w9 = compute_causal_15t_redzone_and_4th_profiles(as_of_week=9)
    assert w4["as_of_week"] == 4
    assert w9["as_of_week"] == 9
    assert w4["teams_count"] >= 32
    assert w9["teams_count"] >= 32
    # Later causal cutoff incorporates Weeks 4-8 snaps and must advance counts monotonically
    for team in ("KC", "BUF", "IND", "HOU"):
        assert team in w4["teams"]
        assert team in w9["teams"]
        assert w9["teams"][team]["n_full_snaps"] >= w4["teams"][team]["n_full_snaps"]


def test_stream_15t_swap_symmetry_antisymmetry_and_fallback() -> None:
    ab = evaluate_causal_15t_redzone_4th_matchup("IND", "HOU", {"is_indoor": True}, as_of_week=9)
    ba = evaluate_causal_15t_redzone_4th_matchup("HOU", "IND", {"is_indoor": True}, as_of_week=9)
    alias_ab = evaluate_causal_15t_redzone_4th_matchup("IND", "HST", {"is_indoor": True}, as_of_week=9)

    pairs = [
        ("stream_15t_away_rz_td_edge", "stream_15t_home_rz_td_edge"),
        ("stream_15t_away_fourth_go_aggression", "stream_15t_home_fourth_go_aggression"),
        ("stream_15t_away_fourth_conv_edge", "stream_15t_home_fourth_conv_edge"),
        ("stream_15t_away_rz_only_null_edge", "stream_15t_home_rz_only_null_edge"),
    ]
    for ka, kh in pairs:
        assert abs(ab[ka] - ba[kh]) < 1e-6
        assert abs(ab[kh] - ba[ka]) < 1e-6
        assert abs(ab[ka] - alias_ab[ka]) < 1e-6
        assert -0.18 <= ab[ka] <= 0.18
        assert -0.18 <= ab[kh] <= 0.18

    assert abs(ab["stream_15t_net_rz_4th_diff"] + ba["stream_15t_net_rz_4th_diff"]) < 1e-6

    unk = evaluate_causal_15t_redzone_4th_matchup("ZZZ", "YYY", as_of_week=9)
    assert unk["stream_15t_away_rz_td_edge"] == 0.0
    assert unk["stream_15t_net_rz_4th_diff"] == 0.0


def test_stream_15t_walkforward_oos_honest_promotion_and_null_rz_only() -> None:
    oos = evaluate_causal_15t_walkforward_oos(eval_weeks=tuple(range(4, 11)))
    rz = oos["redzone_td_full_prior"]
    fgo = oos["fourth_down_go_aggression"]
    fcv = oos["fourth_down_conversion"]

    assert rz["n_drives"] >= 600
    assert rz["beats_baseline"] is True
    assert rz["brier_full_prior"] < rz["brier_cell_baseline"]
    assert rz["log_loss_full_prior"] < rz["log_loss_cell_baseline"]
    # Honest null audit: naive RZ-only without full-play EPA prior fails cell baseline
    assert rz["rz_only_beats_baseline"] is False

    assert fgo["n_decisions"] >= 1400
    assert fgo["beats_baseline"] is True
    assert math.isfinite(fgo["brier_stream_15t_eb"])

    assert fcv["n_go_plays"] >= 250
    assert fcv["beats_baseline"] is True
    assert oos["all_promoted_components_beat_baseline"] is True
