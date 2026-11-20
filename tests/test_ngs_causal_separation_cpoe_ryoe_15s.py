"""
Unit, causal-separation, bounds, swap-symmetry/antisymmetry, and OOS tests for
`ngs_causal_separation_cpoe_ryoe_engine.py` (Stream 15S).
"""

from __future__ import annotations

import math

from intelligence.coaching.ngs_causal_separation_cpoe_ryoe_engine import (
    compute_causal_15s_ngs_profiles,
    evaluate_causal_15s_ngs_matchup,
    evaluate_causal_15s_walkforward_oos,
)


def test_stream_15s_ngs_profiles_cover_32_teams_and_are_strictly_causal() -> None:
    w4 = compute_causal_15s_ngs_profiles(as_of_week=4)
    w9 = compute_causal_15s_ngs_profiles(as_of_week=9)
    assert w4["available"] is True and w9["available"] is True
    assert w4["team_count"] == 32 and w9["team_count"] == 32
    assert w4["teams"]["BUF"] != w9["teams"]["BUF"]

    for tm, prof in w9["teams"].items():
        assert len(tm) in (2, 3)
        for k in ("ngs_pass_cpoe_z", "ngs_rec_sep_yacoe_z", "ngs_rush_ryoe_z"):
            v = float(prof[k])
            assert math.isfinite(v)
            assert -3.0 <= v <= 3.0


def test_stream_15s_swap_symmetry_antisymmetry_and_fallback() -> None:
    ab = evaluate_causal_15s_ngs_matchup("IND", "HOU", {"is_indoor": True, "wind_mph": 0.0}, as_of_week=9)
    ba = evaluate_causal_15s_ngs_matchup("HOU", "IND", {"is_indoor": True, "wind_mph": 0.0}, as_of_week=9)
    alias_ab = evaluate_causal_15s_ngs_matchup("IND", "HST", {"is_indoor": True, "wind_mph": 0.0}, as_of_week=9)
    assert ab == alias_ab
    for ka, kh in (
        ("stream_15s_away_ngs_pass_cpoe_edge", "stream_15s_home_ngs_pass_cpoe_edge"),
        ("stream_15s_away_ngs_rec_sep_yacoe_edge", "stream_15s_home_ngs_rec_sep_yacoe_edge"),
        ("stream_15s_away_ngs_rush_ryoe_edge", "stream_15s_home_ngs_rush_ryoe_edge"),
    ):
        assert abs(ab[ka] - ba[kh]) < 1e-6
        assert abs(ab[kh] - ba[ka]) < 1e-6
    assert abs(ab["stream_15s_net_ngs_skill_diff"] + ba["stream_15s_net_ngs_skill_diff"]) < 1e-6

    unk = evaluate_causal_15s_ngs_matchup("ZZZ", "YYY", as_of_week=9)
    assert unk["stream_15s_away_ngs_pass_cpoe_edge"] == 0.0
    assert unk["stream_15s_net_ngs_skill_diff"] == 0.0


def test_stream_15s_walkforward_oos_reports_honestly() -> None:
    oos = evaluate_causal_15s_walkforward_oos(eval_weeks=tuple(range(4, 11)))
    assert set(oos["families"].keys()) == {"pass_cpoe", "rec_sep_yacoe", "rush_ryoe"}
    for fstats in oos["families"].values():
        assert fstats["n_obs"] >= 150
        assert math.isfinite(fstats["wmse_stream_15s_ngs"])
    assert oos["families"]["pass_cpoe"]["beats_baseline"] is True
    assert oos["families"]["rush_ryoe"]["beats_baseline"] is True
