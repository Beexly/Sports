"""
Unit, causal-leakage, bounds, exact swap-symmetry, and walk-forward OOS tests for
`ftn_role_zone_pressure_hazard_engine.py` (Stream 15Q).
"""

from __future__ import annotations

import math

from intelligence.coaching.ftn_role_zone_pressure_hazard_engine import (
    compute_causal_15q_profiles,
    evaluate_causal_15q_matchup,
    evaluate_causal_15q_walkforward_oos,
)


def test_stream_15q_profiles_cover_32_teams_and_are_strictly_causal() -> None:
    w4 = compute_causal_15q_profiles(as_of_week=4)
    w9 = compute_causal_15q_profiles(as_of_week=9)
    assert w4["available"] is True
    assert w9["available"] is True
    assert w4["team_count"] == 32
    assert w9["team_count"] == 32
    assert w9["train_pass_plays"] > w4["train_pass_plays"]
    assert w4["teams"]["HOU"]["off_ol_protection_z"] != w9["teams"]["HOU"]["off_ol_protection_z"]

    # Blitz and heavy pass rush covariates increase non-QB-fault pressure hazard
    betas = w9["pressure_cov_betas"]
    assert betas["is_blitz"] > 0.0
    assert betas["heavy_rush"] > 0.0

    for tm, prof in w9["teams"].items():
        assert len(tm) in (2, 3)
        for k in (
            "off_ol_protection_z",
            "def_dl_pressure_z",
            "off_scheme_lift_z",
            "def_scheme_vuln_z",
            "eb_snap_continuity_z",
        ):
            val = float(prof[k])
            assert math.isfinite(val)
            assert -3.0 <= val <= 3.0


def test_stream_15q_swap_symmetry_antisymmetry_and_fallback() -> None:
    ab = evaluate_causal_15q_matchup("IND", "HOU", {"is_indoor": True, "wind_mph": 0.0}, as_of_week=9)
    ba = evaluate_causal_15q_matchup("HOU", "IND", {"is_indoor": True, "wind_mph": 0.0}, as_of_week=9)
    alias_ab = evaluate_causal_15q_matchup("IND", "HST", {"is_indoor": True, "wind_mph": 0.0}, as_of_week=9)

    assert ab == alias_ab
    for ka, kh in (
        ("stream_15q_away_pressure_survival_edge", "stream_15q_home_pressure_survival_edge"),
        ("stream_15q_away_motion_pa_edge", "stream_15q_home_motion_pa_edge"),
        ("stream_15q_away_eb_continuity_edge", "stream_15q_home_eb_continuity_edge"),
    ):
        assert abs(ab[ka] - ba[kh]) < 1e-6
        assert abs(ab[kh] - ba[ka]) < 1e-6
    assert abs(ab["stream_15q_net_scheme_hazard_diff"] + ba["stream_15q_net_scheme_hazard_diff"]) < 1e-6
    assert -0.025 <= ab["stream_15q_away_pressure_survival_edge"] <= 0.025
    assert -0.025 <= ab["stream_15q_away_motion_pa_edge"] <= 0.025
    assert -0.020 <= ab["stream_15q_away_eb_continuity_edge"] <= 0.020

    unk = evaluate_causal_15q_matchup("ZZZ", "YYY", as_of_week=9)
    assert unk["stream_15q_away_pressure_survival_edge"] == 0.0
    assert unk["stream_15q_net_scheme_hazard_diff"] == 0.0


def test_stream_15q_walkforward_oos_evaluates_cleanly() -> None:
    oos = evaluate_causal_15q_walkforward_oos(eval_weeks=tuple(range(4, 11)))
    assert oos["n_pass_plays"] >= 5000
    assert oos["pressure_hazard_beats_baseline"] is True
    assert oos["pressure_hazard_beats_raw_team"] is True
    assert oos["brier_stream_15q_irls"] < oos["brier_baseline_mean"]
    assert oos["log_loss_stream_15q_irls"] < oos["log_loss_baseline_mean"]
