"""
Causal Walk-Forward, Swap-Symmetry, and Honest Market-Efficiency Null-Hold Tests for Stream 15W
(`causal_rest_travel_and_market_hfa_engine.py`).
"""

from __future__ import annotations

import math

from intelligence.coaching.causal_rest_travel_and_market_hfa_engine import (
    compute_causal_15w_hfa_and_rest_profiles,
    evaluate_causal_15w_hfa_rest_matchup,
    evaluate_causal_15w_walkforward_oos,
)


def test_stream_15w_profiles_cover_32_teams_and_modern_hfa_decay() -> None:
    w4 = compute_causal_15w_hfa_and_rest_profiles(as_of_season=2026, as_of_week=4)
    w9 = compute_causal_15w_hfa_and_rest_profiles(as_of_season=2026, as_of_week=9)
    assert w4["teams_count"] >= 32
    assert w9["teams_count"] >= 32
    # Modern decayed dynamic HFA must sit materially below outdated 2.5-3.0pt rules
    assert 1.0 <= w9["dynamic_hfa_pts"] <= 2.2
    for team in ("KC", "BUF", "IND", "HOU"):
        assert team in w4["teams"]
        assert team in w9["teams"]
        assert w9["teams"][team]["eff_games"] >= w4["teams"][team]["eff_games"]


def test_stream_15w_swap_symmetry_neutral_site_and_fallback() -> None:
    ab = evaluate_causal_15w_hfa_rest_matchup("IND", "HOU", {"is_neutral_site": False})
    ba = evaluate_causal_15w_hfa_rest_matchup("HOU", "IND", {"is_neutral_site": False})
    alias_ab = evaluate_causal_15w_hfa_rest_matchup("IND", "HST", {"is_neutral_site": False})
    neu = evaluate_causal_15w_hfa_rest_matchup("IND", "HOU", {"is_neutral_site": True})

    pairs = [
        ("stream_15w_away_sched_resilience_edge", "stream_15w_home_sched_resilience_edge"),
        ("stream_15w_away_ats_null_override", "stream_15w_home_ats_null_override"),
    ]
    for ka, kh in pairs:
        assert abs(ab[ka] - ba[kh]) < 1e-6
        assert abs(ab[kh] - ba[ka]) < 1e-6
        assert abs(ab[ka] - alias_ab[ka]) < 1e-6
        assert -0.15 <= ab[ka] <= 0.15
        assert -0.15 <= ab[kh] <= 0.15

    assert abs(ab["stream_15w_net_sched_resilience_diff"] + ba["stream_15w_net_sched_resilience_diff"]) < 1e-6
    assert neu["stream_15w_dynamic_hfa_pts"] == 0.0
    assert ab["stream_15w_dynamic_hfa_pts"] > 1.0

    unk = evaluate_causal_15w_hfa_rest_matchup("ZZZ", "YYY")
    assert unk["stream_15w_away_sched_resilience_edge"] == 0.0
    assert unk["stream_15w_net_sched_resilience_diff"] == 0.0


def test_stream_15w_walkforward_oos_honest_promotion_and_closing_ats_null() -> None:
    oos = evaluate_causal_15w_walkforward_oos(eval_seasons=tuple(range(2021, 2027)))
    assert oos["n_games"] >= 1500
    sh = oos["structural_hfa_rest_cold"]
    ats = oos["closing_spread_ats_audit"]

    assert sh["beats_zero_and_legacy_25pt"] is True
    assert sh["margin_mse_stream_15w"] < sh["margin_mse_legacy_25pt"]
    assert sh["margin_mse_stream_15w"] < sh["margin_mse_zero"]
    assert sh["win_brier_stream_15w"] < sh["win_brier_legacy_25pt"]
    assert sh["win_brier_stream_15w"] < sh["win_brier_zero"]

    # Honest null audit: closing lines already price routine HFA/rest/cold
    assert ats["n_games_priced"] >= 1500
    assert math.isfinite(ats["ats_mse_causal_overlay"])
    assert ats["beats_closing_spread"] is False
    assert oos["all_promoted_components_beat_baseline"] is True
