"""
Unit, ISA physics monotonicity, causal separation, exact swap-symmetry, and walk-forward OOS
evaluation tests for `kicker_air_density_weather_hazard_engine.py` (Stream 15R).
"""

from __future__ import annotations

import math

from intelligence.coaching.kicker_air_density_weather_hazard_engine import (
    STADIUM_ELEVATION_FT,
    compute_isa_air_density_ratio,
    evaluate_causal_15r_kicker_matchup,
    evaluate_causal_15r_walkforward_oos,
    fit_causal_15r_kicker_model,
    predict_fg_make_prob,
)


def test_stream_15r_isa_air_density_and_causal_fit() -> None:
    # Mile-high warm air is thinner than cold sea-level air
    rho_den = compute_isa_air_density_ratio(temp_f=70.0, elevation_ft=STADIUM_ELEVATION_FT["DEN"])
    rho_ne_cold = compute_isa_air_density_ratio(temp_f=25.0, elevation_ft=STADIUM_ELEVATION_FT["NE"])
    assert 0.78 < rho_den < 0.86
    assert rho_ne_cold > 1.04

    p_den = predict_fg_make_prob(53.0, "DEN", "KC", roof="outdoors", temp_f=65.0, wind_mph=3.0, as_of_week=10)
    p_ne_windy = predict_fg_make_prob(53.0, "NE", "KC", roof="outdoors", temp_f=25.0, wind_mph=18.0, as_of_week=10)
    assert p_den > p_ne_windy

    w4 = fit_causal_15r_kicker_model(as_of_week=4)
    w10 = fit_causal_15r_kicker_model(as_of_week=10)
    assert w4["available"] is True and w10["available"] is True
    assert w10["train_fg_attempts"] > w4["train_fg_attempts"]
    assert w4["team_kicker_z"] != w10["team_kicker_z"]


def test_stream_15r_swap_symmetry_antisymmetry_and_fallback() -> None:
    ab = evaluate_causal_15r_kicker_matchup("IND", "HOU", {"is_indoor": True, "wind_mph": 0.0}, as_of_week=10)
    ba = evaluate_causal_15r_kicker_matchup("HOU", "IND", {"is_indoor": True, "wind_mph": 0.0}, as_of_week=10)
    alias_ab = evaluate_causal_15r_kicker_matchup("IND", "HST", {"is_indoor": True, "wind_mph": 0.0}, as_of_week=10)
    assert ab == alias_ab
    assert abs(ab["stream_15r_away_kicker_edge"] - ba["stream_15r_home_kicker_edge"]) < 1e-6
    assert abs(ab["stream_15r_home_kicker_edge"] - ba["stream_15r_away_kicker_edge"]) < 1e-6
    assert abs(ab["stream_15r_net_kicker_diff"] + ba["stream_15r_net_kicker_diff"]) < 1e-6
    assert -0.020 <= ab["stream_15r_away_kicker_edge"] <= 0.020

    unk = evaluate_causal_15r_kicker_matchup("ZZZ", "YYY", as_of_week=10)
    assert unk["stream_15r_away_kicker_edge"] == 0.0
    assert unk["stream_15r_net_kicker_diff"] == 0.0


def test_stream_15r_walkforward_oos_reports_honestly() -> None:
    oos = evaluate_causal_15r_walkforward_oos(eval_weeks=tuple(range(4, 11)))
    assert oos["n_fg_attempts"] >= 400
    assert math.isfinite(float(oos["brier_stream_15r_physics"]))
    assert math.isfinite(float(oos["log_loss_stream_15r_physics"]))
    assert oos["beats_distance_baseline"] is True
    assert oos["ece_stream_15r_physics"] < oos["ece_distance_baseline"]
