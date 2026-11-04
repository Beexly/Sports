"""TDD Test Suite for Market-Specific Calibration Heads and PBO Gate.

Verifies:
1. Base-rate Brier score calculations for MONEYLINE (0.2229), SPREAD (0.2483), and TOTAL (0.2497).
2. Monotonic mapping from calibrated cover probability to XX/100 conviction rating.
3. Overfitting control via Bailey & López de Prado's Probability of Backtest Overfitting (PBO <= 0.15).
4. Market calibration heads serializable contract.
"""

import pytest
import numpy as np
import os
import json


def test_true_market_base_rate_brier_scores():
    from scripts.calibration.train_market_specific_calibration_heads import (
        TRUE_BASE_RATE_BRIER,
        compute_brier_skill_score,
    )
    
    assert TRUE_BASE_RATE_BRIER["MONEYLINE"] == pytest.approx(0.2229, abs=1e-4)
    assert TRUE_BASE_RATE_BRIER["SPREAD"] == pytest.approx(0.2483, abs=1e-4)
    assert TRUE_BASE_RATE_BRIER["TOTAL"] == pytest.approx(0.2497, abs=1e-4)
    
    # Perfect predictions give skill score of 1.0
    perfect_skill = compute_brier_skill_score(0.0, TRUE_BASE_RATE_BRIER["SPREAD"])
    assert perfect_skill == pytest.approx(1.0, abs=1e-4)
    
    # Base rate predictions give skill score of 0.0
    base_skill = compute_brier_skill_score(TRUE_BASE_RATE_BRIER["SPREAD"], TRUE_BASE_RATE_BRIER["SPREAD"])
    assert base_skill == pytest.approx(0.0, abs=1e-4)


def test_monotonic_conviction_score_mapping():
    from scripts.calibration.train_market_specific_calibration_heads import (
        map_cover_prob_and_edge_to_confidence,
    )
    
    # For a spread bet (-110, break-even 0.5238):
    # As cover probability and edge rise, confidence score (50-100) must strictly monotonically increase
    p_covers = [0.525, 0.540, 0.560, 0.580, 0.620]
    edges = [p - 0.5238 for p in p_covers]
    scores = [map_cover_prob_and_edge_to_confidence(p, e, market="SPREAD") for p, e in zip(p_covers, edges)]
    
    for i in range(len(scores) - 1):
        assert scores[i] <= scores[i + 1], f"Monotonicity violated: {scores[i]} > {scores[i+1]}"
        assert 50 <= scores[i] <= 100, f"Score out of bounds: {scores[i]}"


def test_pbo_combinatorially_symmetric_cv():
    from scripts.calibration.train_market_specific_calibration_heads import (
        compute_pbo_cscv,
    )
    
    np.random.seed(42)
    # Synthetic performance matrix: T observations x N model configurations
    T, N = 100, 10
    # Create matrix where Model 0 is genuinely better (positive Sharpe/return)
    R = np.random.randn(T, N) * 0.1
    R[:, 0] += 0.05
    
    pbo = compute_pbo_cscv(R, num_partitions=8)
    assert 0.0 <= pbo <= 1.0
    # Because Model 0 is genuinely superior, PBO should be low
    assert pbo <= 0.15, f"PBO unexpectedly high for signal matrix: {pbo}"


def test_market_calibration_head_fit_and_export(tmp_path):
    from scripts.calibration.train_market_specific_calibration_heads import (
        MarketCalibrationSuite,
    )
    
    suite = MarketCalibrationSuite()
    
    # Synthetic mock picks
    picks = [
        {"market": "MONEYLINE", "raw_prob": 0.65, "devig_prob": 0.60, "result": 1},
        {"market": "MONEYLINE", "raw_prob": 0.55, "devig_prob": 0.52, "result": 1},
        {"market": "MONEYLINE", "raw_prob": 0.40, "devig_prob": 0.45, "result": 0},
        {"market": "SPREAD", "raw_prob": 0.55, "devig_prob": 0.50, "result": 1},
        {"market": "SPREAD", "raw_prob": 0.58, "devig_prob": 0.50, "result": 1},
        {"market": "SPREAD", "raw_prob": 0.51, "devig_prob": 0.50, "result": 0},
        {"market": "TOTAL", "raw_prob": 0.54, "devig_prob": 0.50, "result": 1},
        {"market": "TOTAL", "raw_prob": 0.48, "devig_prob": 0.50, "result": 0},
    ]
    
    report = suite.fit(picks)
    assert "MONEYLINE" in report
    assert "SPREAD" in report
    assert "TOTAL" in report
    
    out_file = tmp_path / "market_calibration_heads.json"
    suite.export(str(out_file))
    assert os.path.exists(out_file)
    
    with open(out_file) as f:
        data = json.load(f)
        assert data["version"] == "2026.1"
        assert "heads" in data
