"""Tests for Wave 51 Multi-Horizon Autonomous Regime Reasoning Supervisor."""

from __future__ import annotations

import math

import pytest

from gse_engine.reasoning.wave51_autonomous_regime_reasoning_supervisor import (
    CLINICAL_TO_SPORTS_WEIGHT,
    MAX_ABS_DELTA_LOG_ODDS,
    BitemporalLeakageError,
    SignalObservation,
    evaluate_autonomous_reasoning_decision,
)


def _calm_trajectory(steps: int = 24) -> list[list[float]]:
    traj: list[list[float]] = []
    for k in range(steps):
        t = k / float(steps)
        traj.append([0.15 * math.sin(t), 0.15 * math.cos(t), 0.05 * t])
    return traj


def test_bitemporal_leakage_raises_before_reasoning() -> None:
    obs = [
        SignalObservation(
            source_id="future-boxscore",
            family="pressure",
            prob=0.68,
            effective_at_utc="2026-11-19T18:00:00Z",
            observed_at_utc="2026-11-19T18:30:00Z",
        )
    ]
    with pytest.raises(BitemporalLeakageError):
        evaluate_autonomous_reasoning_decision(
            matchup_id="IND_AT_HOU",
            as_of_utc="2026-11-19T18:00:00Z",
            market_devig_prob=0.52,
            observations=obs,
            trajectory=_calm_trajectory(),
            n_ref=500,
            ess=250.0,
            koopman_damping_ratio=0.65,
        )


def test_barber_ess_abstain_forces_pass() -> None:
    obs = [
        SignalObservation(
            "p1",
            "pressure",
            0.65,
            "2026-11-19T16:00:00Z",
            "2026-11-19T17:00:00Z",
        ),
        SignalObservation(
            "p2",
            "coveragePersonnel",
            0.63,
            "2026-11-19T16:00:00Z",
            "2026-11-19T17:00:00Z",
        ),
    ]
    dec = evaluate_autonomous_reasoning_decision(
        matchup_id="IND_AT_HOU",
        as_of_utc="2026-11-19T18:00:00Z",
        market_devig_prob=0.50,
        observations=obs,
        trajectory=_calm_trajectory(),
        n_ref=1000,
        ess=50.0,
        koopman_damping_ratio=0.70,
    )
    assert dec.verdict == "PASS"
    assert dec.reason_code == "ESS_ABSTAIN"
    assert dec.regime == "ESS_ABSTAIN"


def test_high_js_divergence_triggers_contradiction_hold() -> None:
    obs = [
        SignalObservation(
            "trench",
            "pressure",
            0.82,
            "2026-11-19T16:00:00Z",
            "2026-11-19T17:30:00Z",
        ),
        SignalObservation(
            "weather",
            "weather",
            0.24,
            "2026-11-19T16:00:00Z",
            "2026-11-19T17:30:00Z",
        ),
    ]
    dec = evaluate_autonomous_reasoning_decision(
        matchup_id="MIA_AT_BUF",
        as_of_utc="2026-11-19T18:00:00Z",
        market_devig_prob=0.50,
        observations=obs,
        trajectory=_calm_trajectory(),
        n_ref=500,
        ess=300.0,
        koopman_damping_ratio=0.60,
    )
    assert dec.verdict == "PASS"
    assert dec.reason_code == "CONTRADICTION_HOLD"
    assert dec.max_pairwise_jsd > 0.14


def test_delta_log_odds_cap_and_fragile_edge_fail_closed() -> None:
    obs_extreme = [
        SignalObservation(
            "s1",
            "pressure",
            0.99,
            "2026-11-19T16:00:00Z",
            "2026-11-19T17:45:00Z",
        ),
        SignalObservation(
            "s2",
            "qbSkillScript",
            0.98,
            "2026-11-19T16:00:00Z",
            "2026-11-19T17:45:00Z",
        ),
    ]
    dec_cap = evaluate_autonomous_reasoning_decision(
        matchup_id="EXTREME_CAP",
        as_of_utc="2026-11-19T18:00:00Z",
        market_devig_prob=0.50,
        observations=obs_extreme,
        trajectory=_calm_trajectory(),
        n_ref=400,
        ess=350.0,
        koopman_damping_ratio=0.70,
    )
    assert abs(dec_cap.shrunk_delta_log_odds) <= MAX_ABS_DELTA_LOG_ODDS + 1e-12

    obs_marginal = [
        SignalObservation(
            "s1",
            "pressure",
            0.528,
            "2026-11-19T16:00:00Z",
            "2026-11-19T17:45:00Z",
        ),
        SignalObservation(
            "s2",
            "qbSkillScript",
            0.526,
            "2026-11-19T16:00:00Z",
            "2026-11-19T17:45:00Z",
        ),
    ]
    dec_marginal = evaluate_autonomous_reasoning_decision(
        matchup_id="FRAGILE",
        as_of_utc="2026-11-19T18:00:00Z",
        market_devig_prob=0.50,
        observations=obs_marginal,
        trajectory=_calm_trajectory(),
        n_ref=400,
        ess=350.0,
        koopman_damping_ratio=0.70,
    )
    assert dec_marginal.verdict == "PASS"
    assert dec_marginal.reason_code == "COUNTERFACTUAL_FRAGILE"


def test_robust_aligned_signals_clear_play_with_zero_stake_and_ruo_isolation() -> None:
    obs = [
        SignalObservation(
            "trench",
            "pressure",
            0.62,
            "2026-11-19T16:00:00Z",
            "2026-11-19T17:45:00Z",
        ),
        SignalObservation(
            "coverage",
            "coveragePersonnel",
            0.60,
            "2026-11-19T16:00:00Z",
            "2026-11-19T17:45:00Z",
        ),
        SignalObservation(
            "script",
            "qbSkillScript",
            0.61,
            "2026-11-19T16:00:00Z",
            "2026-11-19T17:45:00Z",
        ),
    ]
    dec = evaluate_autonomous_reasoning_decision(
        matchup_id="ROBUST_CLEAR",
        as_of_utc="2026-11-19T18:00:00Z",
        market_devig_prob=0.51,
        observations=obs,
        trajectory=_calm_trajectory(),
        n_ref=500,
        ess=420.0,
        koopman_damping_ratio=0.72,
    )
    assert dec.verdict == "PLAY"
    assert dec.reason_code == "CONJUNCTION_CLEARED"
    assert dec.clinical_to_sports_weight == CLINICAL_TO_SPORTS_WEIGHT == 0.0
    assert dec.real_money_stake_cleared is False
    assert dec.live_stake_fraction == 0.0
    assert len(dec.decision_hash) == 64
