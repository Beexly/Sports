"""Wave 25 Workstreams 2-4 situational, tracking, biomechanics and FWL tests."""

from __future__ import annotations

import math
import random

import pytest

from gse_engine.memory.wave25_situational_tracking_biomech_fwl_suite import (
    air_density_kg_m3,
    beta_binomial_light_box,
    dawid_skene_em,
    dirichlet_multinomial_shell_shrinkage,
    dpi_hidden_yardage,
    evaluate_wave25_workstreams_bridge,
    fwl_partial_coefficient,
    hawkes_social_immediacy_and_market_absorption,
    k08_shared_frailty_pocket_survival,
    k14_rule_in_snap_attenuation,
    k16_rk4_ball_flight,
    k24_referee_crew_shrinkage,
    kyle_lambda_liquidity_devig,
    larcker_zakolyukina_deception_score,
    mjs_plus_unequal_variance_shrinkage,
    reply_tree_spoof_probability,
    romano_wolf_stepdown,
    sequential_brier_reputation,
    wbgt_q4_metabolic_decay,
)


def test_romano_wolf_monotone_and_deflates() -> None:
    rng = random.Random(1)
    boot = [[rng.gauss(0, 1) for _ in range(3)] for _ in range(999)]
    res = romano_wolf_stepdown([3.5, 2.0, 0.3], boot)
    p = res["adjusted_p"]
    assert p[0] <= p[1] <= p[2]
    assert p[0] < 0.01 and p[2] > 0.5
    assert res["z_defl"][0] > res["z_defl"][2]


def test_light_box_definition_firewall() -> None:
    g = beta_binomial_light_box(9, 80, definition="gse_light_box")
    assert g["prior_mean"] == 0.0853
    assert math.isclose(g["posterior_mean"], (0.0853 * 50 + 9) / 130)
    n = beta_binomial_light_box(40, 80, definition="ngs_lt7")
    assert n["prior_mean"] == 0.515
    with pytest.raises(ValueError):
        beta_binomial_light_box(1, 2, definition="mixed")


def test_dirichlet_shells_sum_to_one() -> None:
    post = dirichlet_multinomial_shell_shrinkage([1, 2, 3, 4, 5, 6], [1, 1, 1, 1, 1, 1])
    assert math.isclose(sum(post), 1.0)
    with pytest.raises(ValueError):
        dirichlet_multinomial_shell_shrinkage([1, 2], [1, 1])


def test_mjs_plus_shrinks_noisier_groups_more() -> None:
    res = mjs_plus_unequal_variance_shrinkage(
        {"WR_X": 3.0, "WR_Slot": 1.0, "TE_Inline": -1.0, "TE_Move": 2.0, "RB": 0.0},
        {"WR_X": 0.1, "WR_Slot": 0.1, "TE_Inline": 2.0, "TE_Move": 0.1, "RB": 0.1},
    )
    assert res["shrinkage"]["TE_Inline"] > res["shrinkage"]["WR_X"]
    assert all(0.0 <= b <= 1.0 for b in res["shrinkage"].values())
    with pytest.raises(ValueError):
        mjs_plus_unequal_variance_shrinkage({"a": 1.0}, {"a": 1.0})


def test_spoof_hawkes_and_social_zero_gradient() -> None:
    hi = reply_tree_spoof_probability(
        account_age_days=5, verified=False, reply_depth=4, quote_ratio=0.9,
        duplicate_text_share=0.9,
    )
    lo = reply_tree_spoof_probability(
        account_age_days=3000, verified=True, reply_depth=0, quote_ratio=0.0,
        duplicate_text_share=0.0,
    )
    assert hi > 0.9 > 0.1 > lo
    hk = hawkes_social_immediacy_and_market_absorption(
        [0.0, 0.5], t_now=1.0, window=0.5, mu=0.1, alpha=0.5, beta=1.5, tau_absorb=1.0
    )
    expected = 0.1 * 0.5 + sum(
        (0.5 / 1.5) * (math.exp(-1.5 * (1.0 - t)) - math.exp(-1.5 * (1.5 - t))) for t in (0.0, 0.5)
    )
    assert math.isclose(hk["compensator"], expected)
    assert hk["stage2_gradient"] == 0.0


def test_dawid_skene_recovers_reliable_annotators() -> None:
    truth = [0, 1, 2, 3] * 6
    labels = []
    for i, t in enumerate(truth):
        noisy = (t + 1) % 4 if i % 3 == 0 else t
        labels.append({0: t, 1: t, 2: noisy})
    res = dawid_skene_em(labels)
    assert res["map_states"][:4] == ["FullGo", "SnapCapped", "ActiveDecoy", "InactiveOut"]
    assert res["confusion"][0][0][0] > res["confusion"][2][0][0]


def test_deception_and_reputation() -> None:
    assert larcker_zakolyukina_deception_score([1, 1, 1, 1, 0, 0]) > 0.9
    with pytest.raises(ValueError):
        larcker_zakolyukina_deception_score([1.0])
    good = sequential_brier_reputation([0.9, 0.9, 0.9], [1, 1, 1])
    bad = sequential_brier_reputation([0.9, 0.9, 0.9], [0, 0, 0])
    assert good["reputation"] > 0.5 > bad["reputation"]


def test_k08_frailty_survival_and_tracking_coupling() -> None:
    ol = [(4.0, 2.0)] * 5
    base = k08_shared_frailty_pocket_survival(2.0, ol)
    assert math.isclose(base["cumulative_hazard"], 5 * (2.0 / 4.0) ** 2)
    assert math.isclose(base["pocket_survival"], (1 + 0.5 * 1.25) ** (-2.0))
    open_sep = k08_shared_frailty_pocket_survival(2.0, ol, separation_yds=6.0)
    assert open_sep["pocket_survival"] > base["pocket_survival"]
    with pytest.raises(ValueError):
        k08_shared_frailty_pocket_survival(1.0, ol[:4])


def test_k14_rule_in_never_raises_snaps() -> None:
    for h in (0.0, 0.1, 0.25, 0.4, 0.9):
        out = k14_rule_in_snap_attenuation(h, 0.8)
        assert out["snap_multiplier"] <= 1.0
        assert out["snap_share"] <= 0.8
    assert k14_rule_in_snap_attenuation(0.6, 0.8)["snap_multiplier"] < 1.0


def test_k24_and_dpi() -> None:
    res = k24_referee_crew_shrinkage({"a": (20, 1), "b": (90, 9)}, prior_games=8.0)
    assert math.isclose(res["league_rate"], 11.0)
    assert res["crew_rates"]["a"] < 20.0
    assert dpi_hidden_yardage(1.0, 16.0) == 16.0


def test_k16_flight_physics() -> None:
    calm = k16_rk4_ball_flight(speed_mps=24.0, launch_deg=35.0)
    head = k16_rk4_ball_flight(speed_mps=24.0, launch_deg=35.0, wind_mps=6.0)
    tail = k16_rk4_ball_flight(speed_mps=24.0, launch_deg=35.0, wind_mps=-6.0)
    high = k16_rk4_ball_flight(speed_mps=24.0, launch_deg=35.0, altitude_m=1609.0)
    assert tail["range_m"] > calm["range_m"] > head["range_m"]
    assert high["range_m"] > calm["range_m"]
    vac = k16_rk4_ball_flight(speed_mps=20.0, launch_deg=45.0, cd=0.0, dt=0.0005)
    assert math.isclose(vac["range_m"], 20.0**2 / 9.81, rel_tol=2e-3)
    assert air_density_kg_m3(1609.0) < air_density_kg_m3(0.0)


def test_wbgt_decay() -> None:
    assert wbgt_q4_metabolic_decay(20.0, 4) == 1.0
    assert wbgt_q4_metabolic_decay(30.0, 1) == 1.0
    assert math.isclose(wbgt_q4_metabolic_decay(30.0, 4), 1.0 - 0.006 * 6 * 2)


def test_fwl_matches_full_regression_coefficient() -> None:
    rng = random.Random(5)
    n = 200
    mkt = [rng.gauss(0, 3) for _ in range(n)]
    x = [0.5 * m + rng.gauss(0, 1) for m in mkt]
    y = [1.0 * m + 0.8 * xi + rng.gauss(0, 1) for m, xi in zip(mkt, x, strict=True)]
    fwl = fwl_partial_coefficient(y, x, [mkt])
    assert abs(fwl["partial_slope"] - 0.8) < 0.15
    assert fwl["t_stat"] > 5.0
    noise = [rng.gauss(0, 1) for _ in range(n)]
    null = fwl_partial_coefficient(y, noise, [mkt, x])
    assert abs(null["t_stat"]) < 3.5


def test_kyle_lambda_compliance_hold_and_devig() -> None:
    res = kyle_lambda_liquidity_devig(0.48, 0.54, order_imbalance=0.2, kyle_lambda=0.08)
    assert res["cleared"] is False and res["compliance_hold"] is True
    assert 0.48 <= res["kyle_lambda_fair_prob"] <= 0.54
    with pytest.raises(PermissionError, match="POLYMARKET_COMPLIANCE_HOLD"):
        kyle_lambda_liquidity_devig(0.48, 0.54, live_execution_requested=True)


def test_bridge_has_18_plus_finite_scalars() -> None:
    res = evaluate_wave25_workstreams_bridge(
        away_clean_epa=0.02, home_clean_epa=0.08, effective_wind_mph=16.0,
        is_short_week=True, is_indoor=False,
    )
    assert res["scalars_verified_count"] >= 28
    assert res["all_scalars_finite"] is True
    assert res["fwl_orthogonal_verified"] is True
    assert res["k14_rule_in_only"] is True
    assert res["polymarket_cleared"] is False
    assert res["social_stage2_gradient"] == 0.0
    assert res["live_stage2_weight"] == 0.0
    assert math.isclose(res["scalars"]["banzhaf_pressure_wind"], 0.1)
