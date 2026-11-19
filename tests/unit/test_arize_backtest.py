"""Unit tests for Arize walk-forward calibration and real-money stake unlock gate."""

from __future__ import annotations

import pytest

from gse_engine.observability.arize_tracing import evaluate_walk_forward_calibration


def test_blocks_stake_unlock_when_sample_below_minimum_or_ece_high() -> None:
    """Stake freeze remains ACTIVE below 50 games or when ECE breaches 0.035."""
    small = evaluate_walk_forward_calibration(
        probs=[0.60] * 20,
        outcomes=[1] * 12 + [0] * 8,
        market_probs=[0.55] * 20,
    )
    assert small.real_money_stake_cleared is False

    overconfident = evaluate_walk_forward_calibration(
        probs=[0.85] * 60,
        outcomes=[1] * 30 + [0] * 30,
        market_probs=[0.55] * 60,
    )
    assert overconfident.ece == pytest.approx(0.35)
    assert overconfident.real_money_stake_cleared is False


def test_clears_stake_unlock_on_calibrated_oos_sample_beating_market() -> None:
    """Well-calibrated predictions with n >= 50, ECE <= 0.035, and CLV beat >= 0.50 clear."""
    probs = [0.60] * 30 + [0.40] * 30
    outcomes = [1] * 18 + [0] * 12 + [1] * 12 + [0] * 18
    market_probs = [0.55] * 30 + [0.35] * 15 + [0.45] * 15

    captured = []
    report = evaluate_walk_forward_calibration(
        probs=probs,
        outcomes=outcomes,
        market_probs=market_probs,
        on_report=captured.append,
    )

    assert len(captured) == 1
    assert report.sample_size == 60
    assert report.ece <= 0.035
    assert report.decided_clv_beat_rate == pytest.approx(0.75)
    assert report.real_money_stake_cleared is True
