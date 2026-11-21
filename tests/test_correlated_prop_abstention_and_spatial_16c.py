"""
Tests for Stream 16C: Correlated Prop Copula, Noisy-Input Abstention, Bayesian Kelly,
and Counterfactual NFL Ghosts / Step-and-Turn Spatial Evaluators.
"""

from __future__ import annotations

import math

import numpy as np
import pytest

from intelligence.calibration.correlated_prop_abstention_and_bayesian_kelly import (
    compute_bayesian_uncertainty_kelly,
    evaluate_correlated_qb_comp_yds_walkforward_oos,
    evaluate_noisy_input_abstention_gate,
    simulate_correlated_completions_and_yards,
)
from intelligence.coaching.spatial_ghosts_and_step_turn_evaluator import (
    evaluate_nfl_ghosts_counterfactual,
    simulate_step_and_turn_hypotheticals,
)


def test_correlated_comp_yds_copula_and_real_pbp_brier_gain() -> None:
    corr_res = simulate_correlated_completions_and_yards(
        mean_comp=22.5,
        sd_comp=4.5,
        mean_yds=255.0,
        sd_yds=55.0,
        line_comp=22.5,
        line_yds=255.5,
        rho=0.76,
        n_sims=25000,
        seed=42,
    )
    assert corr_res["p_both_over_correlated"] > corr_res["p_both_over_independent"] + 0.10

    ind_res = simulate_correlated_completions_and_yards(
        mean_comp=22.5,
        sd_comp=4.5,
        mean_yds=255.0,
        sd_yds=55.0,
        line_comp=22.5,
        line_yds=255.5,
        rho=0.0,
        n_sims=25000,
        seed=42,
    )
    assert abs(ind_res["p_both_over_correlated"] - ind_res["p_both_over_independent"]) < 0.02

    oos = evaluate_correlated_qb_comp_yds_walkforward_oos(eval_weeks=range(4, 11))
    assert oos["n_qb_games"] >= 100
    assert oos["correlated_brier"] < oos["independent_brier"]
    assert float(oos["empirical_rho_est"]) > 0.55


def test_noisy_input_abstention_fail_closed() -> None:
    clean = evaluate_noisy_input_abstention_gate(
        p_model=0.61,
        p_market_devig=0.52,
        epistemic_sigma=0.02,
        injury_noise_score=0.10,
        conformal_half_width=0.02,
    )
    assert clean["publish_allowed"] is True
    assert clean["decision"] == "PUBLISH"

    high_injury = evaluate_noisy_input_abstention_gate(
        p_model=0.61,
        p_market_devig=0.52,
        epistemic_sigma=0.02,
        injury_noise_score=0.80,
        conformal_half_width=0.02,
    )
    assert high_injury["publish_allowed"] is False
    assert high_injury["decision"] == "PASS"

    wide_uncert = evaluate_noisy_input_abstention_gate(
        p_model=0.61,
        p_market_devig=0.52,
        epistemic_sigma=0.08,
        injury_noise_score=0.10,
        conformal_half_width=0.06,
    )
    assert wide_uncert["publish_allowed"] is False
    assert wide_uncert["decision"] == "PASS"

    nan_case = evaluate_noisy_input_abstention_gate(
        p_model=float("nan"),
        p_market_devig=0.52,
        epistemic_sigma=0.02,
    )
    assert nan_case["publish_allowed"] is False
    assert nan_case["decision"] == "PASS"


def test_bayesian_kelly_shrinkage_and_ruin_reduction() -> None:
    # Uncertain positive EV posterior: mean 58/100 = 0.58 at decimal odds 1.95
    bk = compute_bayesian_uncertainty_kelly(alpha_post=29.0, beta_post=21.0, decimal_odds=1.95, seed=7)
    assert 0.0 < bk["bayesian_kelly_stake"] < bk["plugin_kelly_stake"]
    assert bk["bayesian_ruin_prob"] <= bk["plugin_ruin_prob"]

    # High sample certainty converges close to plugin Kelly (still capped at max_stake)
    tight = compute_bayesian_uncertainty_kelly(alpha_post=5800.0, beta_post=4200.0, decimal_odds=1.95, max_stake=0.25, seed=7)
    assert abs(tight["bayesian_kelly_stake"] - tight["plugin_kelly_stake"]) < 0.01

    neg_ev = compute_bayesian_uncertainty_kelly(alpha_post=45.0, beta_post=55.0, decimal_odds=1.91)
    assert neg_ev["bayesian_kelly_stake"] == 0.0


def test_nfl_ghosts_counterfactual_defender_valuation() -> None:
    # Defense wants LOWER offensive EPV; optimal defender sits near (0, 0) where EPV = 0.0
    rng = np.random.default_rng(123)
    ghosts = rng.normal(loc=(2.5, 2.5), scale=1.2, size=(120, 2))
    epv_fn = lambda xy: 0.25 * (xy[:, 0] ** 2 + xy[:, 1] ** 2)

    elite_db = evaluate_nfl_ghosts_counterfactual((0.4, 0.4), ghosts, None, epv_fn, seed=123)
    poor_db = evaluate_nfl_ghosts_counterfactual((4.5, 4.5), ghosts, None, epv_fn, seed=123)

    assert elite_db["defender_value_added"] > 0.0
    assert poor_db["defender_value_added"] < 0.0
    assert elite_db["ci_lo"] <= elite_db["defender_value_added"] <= elite_db["ci_hi"]


def test_step_and_turn_hypothetical_rollout() -> None:
    # gamma1 > 0 -> longer steps produce sharper concentration (smaller turn spread)
    res = simulate_step_and_turn_hypotheticals(
        x0=25.0,
        y0=26.6,
        bearing_rad=0.0,
        step_shape=4.0,
        step_scale=0.20,
        mu_turn_rad=0.0,
        gamma0=1.2,
        gamma1=2.0,
        n_hyp=400,
        seed=99,
        yardline_val_fn=lambda x, y: x - 0.05 * np.abs(y - 26.6),
        obs_next_xy=(26.4, 26.6),
    )
    assert len(res["hyp_x"]) == 400
    assert math.isclose(float(res["step_turn_kappa_corr"]), 1.0, abs_tol=0.15)
    disp = np.hypot(np.asarray(res["hyp_x"]) - 25.0, np.asarray(res["hyp_y"]) - 26.6)
    assert np.allclose(disp, np.asarray(res["step_lengths"]), atol=1e-6)
    assert float(res["delta_bar"]) > 0.0
