"""Epistemic Out-of-Sample Calibration Gate (`tests/verify_out_of_sample_calibration.py`).

Benchmarks candidate research hypotheses against a clean historical player-frequency baseline
using out-of-sample Log-Loss, Brier Score, and Bernoulli Continuous Ranked Probability Score (CRPS).
Any candidate model that fails to strictly reduce both Log-Loss and Brier Score is REJECTED from
production promotion.
"""
from __future__ import annotations

from typing import Any, Dict, Sequence

import numpy as np


def calculate_log_loss(y_true: Sequence[int | float], y_prob: Sequence[float], eps: float = 1e-15) -> float:
    yt = np.asarray(y_true, dtype=np.float64)
    yp = np.clip(np.asarray(y_prob, dtype=np.float64), eps, 1.0 - eps)
    return float(-np.mean(yt * np.log(yp) + (1.0 - yt) * np.log(1.0 - yp)))


def calculate_brier_score(y_true: Sequence[int | float], y_prob: Sequence[float]) -> float:
    yt = np.asarray(y_true, dtype=np.float64)
    yp = np.asarray(y_prob, dtype=np.float64)
    return float(np.mean((yp - yt) ** 2))


def calculate_crps_bernoulli(y_true: Sequence[int | float], y_prob: Sequence[float]) -> float:
    """For binary outcomes y in {0,1}, CRPS(F_p, y) equals the Brier score (p - y)^2."""
    return calculate_brier_score(y_true, y_prob)


def run_historical_backtest_eval(
    historical_actuals: Sequence[int | float],
    baseline_probs: Sequence[float],
    advanced_physics_probs: Sequence[float],
) -> Dict[str, Any]:
    base_log_loss = calculate_log_loss(historical_actuals, baseline_probs)
    adv_log_loss = calculate_log_loss(historical_actuals, advanced_physics_probs)

    base_brier = calculate_brier_score(historical_actuals, baseline_probs)
    adv_brier = calculate_brier_score(historical_actuals, advanced_physics_probs)

    base_crps = calculate_crps_bernoulli(historical_actuals, baseline_probs)
    adv_crps = calculate_crps_bernoulli(historical_actuals, advanced_physics_probs)

    log_loss_delta = base_log_loss - adv_log_loss
    brier_delta = base_brier - adv_brier
    crps_delta = base_crps - adv_crps

    is_approved_for_production = (log_loss_delta > 0.0) and (brier_delta > 0.0) and (crps_delta > 0.0)

    return {
        "baseline_log_loss": round(base_log_loss, 5),
        "advanced_log_loss": round(adv_log_loss, 5),
        "log_loss_delta": round(log_loss_delta, 5),
        "baseline_brier": round(base_brier, 5),
        "advanced_brier": round(adv_brier, 5),
        "brier_delta": round(brier_delta, 5),
        "baseline_crps": round(base_crps, 5),
        "advanced_crps": round(adv_crps, 5),
        "crps_delta": round(crps_delta, 5),
        "PROMOTION_GATE_STATUS": "APPROVED" if is_approved_for_production else "REJECTED",
    }


if __name__ == "__main__":
    rng = np.random.default_rng(42)
    true_outcomes = rng.choice([0, 1], size=1000, p=[0.75, 0.25])
    baseline_predictions = np.clip(np.full(1000, 0.25) + rng.normal(0, 0.05, 1000), 0.01, 0.99)
    noise_overfit_predictions = np.clip(baseline_predictions + rng.normal(0, 0.12, 1000), 0.01, 0.99)
    results = run_historical_backtest_eval(true_outcomes, baseline_predictions, noise_overfit_predictions)
    print("=== EPISTEMIC GATE RUNTIME SUMMARY ===")
    for k, v in results.items():
        print(f"{k}: {v}")
