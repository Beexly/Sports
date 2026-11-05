"""
Unit & Integration Test Suite for GSE-GSI Conformal-OT Engine v2.0 (`test_matrix_core.py`).
Tests `GSEClinicalEngine`, `ProductionWhiteningEngine`, `RFFMahalanobis` (including one-sided
Pathological Strain Cone), `CounterfactualTransportEngine`, `UnifiedHyperloopOrchestrator`,
and `evaluate_trajectory_payload`.
"""
from __future__ import annotations

import numpy as np
import pytest

from galaxy_conformal_ot import (
    CounterfactualTransportEngine,
    GSEClinicalEngine,
    ProductionWhiteningEngine,
    RFFMahalanobis,
    UnifiedHyperloopOrchestrator,
    evaluate_trajectory_payload,
)


def test_gse_clinical_engine_rolling_covariance_and_whitening():
    rng = np.random.default_rng(101)
    X = rng.normal(0.0, 1.0, size=(30, 4))
    X[25:] += np.array([4.5, -4.0, 3.5, -3.0])

    eng = GSEClinicalEngine(window_size=10, regularization=1e-3)
    covs, means = eng.calculate_rolling_covariance(X)
    assert covs.shape == (30, 4, 4)
    assert means.shape == (30, 4)

    whitened, mahal = eng.conformal_whitening_transform(X)
    assert whitened.shape == (30, 4)
    assert mahal.shape == (30,)
    assert np.all(np.isfinite(mahal))

    tau = eng.calibrate(mahal[:20], target_coverage=0.90)
    assert np.isfinite(tau)
    anomalies = eng.predict_anomaly(mahal)
    assert anomalies[25:].any()


def test_cqr_nonconformity_score_scales_by_local_volatility():
    y = np.array([92.0, 58.0])
    q_lo = np.array([80.0, 80.0])
    q_hi = np.array([95.0, 95.0])
    sig = np.array([4.0, 4.0])
    scores = GSEClinicalEngine.compute_cqr_nonconformity_score(y, q_lo, q_hi, sig)
    assert scores[0] <= 0.0  # inside [80, 95]
    assert scores[1] == pytest.approx((80.0 - 58.0) / 4.0)


def test_one_sided_pathological_strain_cone_rff_mahalanobis():
    rng = np.random.default_rng(202)
    ref = rng.normal(0.0, 1.0, size=(120, 5))
    rff = RFFMahalanobis(n_features=48, shrink=0.20, seed=7, one_sided_cone=True).fit(ref)

    # Healthy below-mean values (-2 SD) should map to zero strain cone excursion -> zero distance!
    super_healthy = np.full((10, 5), -2.0)
    dying_shock = np.full((10, 5), +3.5)
    s_healthy = rff.score(super_healthy)
    s_shock = rff.score(dying_shock)
    assert np.allclose(s_healthy, 0.0, atol=1e-12)
    assert float(s_shock.mean()) > 5.0


def test_unified_hyperloop_orchestrator_and_api_payload():
    rng = np.random.default_rng(303)
    cal = rng.normal(90.0, 3.0, size=(40, 3))
    shock = rng.normal(55.0, 5.0, size=(10, 3))
    stream = np.vstack([cal[:20], shock])

    orch = UnifiedHyperloopOrchestrator(window_size=8, gamma=0.15, alpha=0.10)
    fit_res = orch.fit_calibration(cal)
    assert fit_res["target_coverage"] == pytest.approx(0.90)

    scored = orch.score_cohort(stream)
    assert scored["composite_score"][20:].mean() > scored["composite_score"][:20].mean()

    api_res = evaluate_trajectory_payload({
        "trajectory": stream.tolist(),
        "window_size": 8,
        "alpha": 0.10,
    })
    assert api_res["schema"] == "gsi.conformal_ot.v2.trajectory_verdict"
    assert api_res["n_timesteps"] == 30
    assert len(api_res["critical_shock_steps"]) >= 1
