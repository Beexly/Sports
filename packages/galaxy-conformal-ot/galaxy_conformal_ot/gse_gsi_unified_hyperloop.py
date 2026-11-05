"""
galaxy_conformal_ot.gse_gsi_unified_hyperloop
=============================================
Unified GSE (NFL Play-by-Play Pocket Collapse) & GSI (MIMIC-IV Clinical Shock)
Conformal-OT Hyperloop Orchestrator (GSI-WP-05 v2.0).

Fuses:
1. Multi-Frame Rolling Covariance Whitening (`GSEClinicalEngine` / `ProductionWhiteningEngine`)
2. Non-Linear Pathological-Cone Kernelized Mahalanobis (`RFFMahalanobis`)
3. Counterfactual Sinkhorn-Knopp Optimal Transport (`CounterfactualTransportEngine`)
4. Split Conformal Quantile Regression (`SplitCQR`) with finite-sample coverage guarantees.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np

from .wasserstein_mahalanobis_whitening import (
    CounterfactualTransportEngine,
    GSEClinicalEngine,
    ProductionWhiteningEngine,
    RFFMahalanobis,
    split_conformal_threshold,
)


@dataclass
class HyperloopStepVerdict:
    step_index: int
    raw_primary_metric: float
    lower_bound: float
    upper_bound: float
    mahalanobis_score: float
    cqr_nonconformity: float
    counterfactual_delta_norm: float
    is_critical_shock: bool
    status_label: str


class UnifiedHyperloopOrchestrator:
    """Unified streaming & batch orchestrator for clinical ICU vitals and NFL trench telemetry."""

    def __init__(
        self,
        window_size: int = 12,
        gamma: float = 0.15,
        alpha: float = 0.10,
        rff_features: int = 48,
        seed: int = 42,
    ):
        self.window_size = int(window_size)
        self.gamma = float(gamma)
        self.alpha = float(alpha)
        self.clinical_engine = GSEClinicalEngine(window_size=window_size, regularization=gamma)
        self.whitening_engine = ProductionWhiteningEngine(frames=(4, 8, window_size), gamma=gamma)
        self.rff_engine = RFFMahalanobis(
            n_features=rff_features, shrink=0.20, seed=seed, one_sided_cone=True
        )
        self.transport_engine: CounterfactualTransportEngine | None = None
        self.conformal_tau: float | None = None
        self.cal_mean_: np.ndarray | None = None
        self.cal_std_: np.ndarray | None = None

    def fit_calibration(self, X_cal_negatives: np.ndarray) -> dict[str, Any]:
        """Fit whitening, RFF manifold, counterfactual OT cloud, and conformal threshold on D_cal."""
        X_cal = np.asarray(X_cal_negatives, dtype=float)
        if X_cal.ndim == 1:
            X_cal = X_cal[:, None]
        self.cal_mean_ = X_cal.mean(axis=0)
        self.cal_std_ = np.clip(X_cal.std(axis=0), 1e-6, None)
        X_cal_z = (X_cal - self.cal_mean_) / self.cal_std_

        self.rff_engine.fit(X_cal)
        self.transport_engine = CounterfactualTransportEngine(X_cal_z, eps=1.0)

        rff_scores = self.rff_engine.score(X_cal)
        ot_costs = self.transport_engine.transport_cost(X_cal_z)
        combined_cal = 0.65 * rff_scores + 0.35 * ot_costs
        self.conformal_tau = split_conformal_threshold(combined_cal, self.alpha)
        self.clinical_engine.calibrate(combined_cal, target_coverage=1.0 - self.alpha)

        return {
            "n_calibration": int(len(X_cal)),
            "alpha": float(self.alpha),
            "target_coverage": float(1.0 - self.alpha),
            "conformal_tau": float(self.conformal_tau),
        }

    def score_cohort(self, X: np.ndarray) -> dict[str, np.ndarray]:
        """Compute RFF Mahalanobis, Counterfactual OT cost, and composite non-conformity score."""
        if self.cal_mean_ is None or self.cal_std_ is None or self.transport_engine is None or self.conformal_tau is None:
            raise RuntimeError("Call fit_calibration(X_cal_negatives) before score_cohort(X).")
        X_arr = np.asarray(X, dtype=float)
        X_z = (X_arr - self.cal_mean_) / self.cal_std_
        rff_s = self.rff_engine.score(X_arr)
        ot_s = self.transport_engine.transport_cost(X_z)
        composite = 0.65 * rff_s + 0.35 * ot_s
        alarms = composite > self.conformal_tau
        return {
            "rff_mahalanobis": rff_s,
            "counterfactual_ot_cost": ot_s,
            "composite_score": composite,
            "anomaly_alarm": alarms,
        }

    def simulate_kafka_stream(self, stream_matrix: np.ndarray, primary_col: int = 0) -> list[HyperloopStepVerdict]:
        """Run high-velocity sliding-window Conformal-OT telemetry evaluation across a live stream."""
        X = np.asarray(stream_matrix, dtype=float)
        if X.ndim == 1:
            X = X[:, None]
        N, D = X.shape
        _, mahal = self.clinical_engine.conformal_whitening_transform(X)

        cal_slice = X[: max(4, min(15, N // 2))]
        ref_engine = CounterfactualTransportEngine(cal_slice, eps=2.5)
        tau_stream = max(float(np.percentile(mahal[: len(cal_slice)], 90)) * 1.35, 1.8432)

        verdicts: list[HyperloopStepVerdict] = []
        for t in range(N):
            lo = max(0, t - self.window_size + 1)
            W = X[lo : t + 1, primary_col]
            ref_w = W[:-1] if len(W) > 2 else W
            q_lo = float(np.percentile(ref_w, 10)) if len(ref_w) > 1 else float(W[0] - 5.0)
            q_hi = float(np.percentile(ref_w, 90)) if len(ref_w) > 1 else float(W[0] + 5.0)
            sig = float(max(np.std(ref_w), 2.5))
            half_width = max(3.5, 1.645 * sig)
            center = float(np.mean(ref_w))
            lower_b = min(q_lo, center - half_width)
            upper_b = max(q_hi, center + half_width)

            raw_val = float(X[t, primary_col])
            cqr_val = float(
                GSEClinicalEngine.compute_cqr_nonconformity_score(
                    np.array([raw_val]), np.array([lower_b]), np.array([upper_b]), np.array([sig])
                )[0]
            )
            _, delta = ref_engine.project(X[t])
            delta_norm = float(np.linalg.norm(delta))
            is_shock = bool((raw_val < lower_b) or (raw_val > upper_b) or (mahal[t] > tau_stream and cqr_val > 0.0))
            verdicts.append(
                HyperloopStepVerdict(
                    step_index=t + 1,
                    raw_primary_metric=raw_val,
                    lower_bound=round(lower_b, 2),
                    upper_bound=round(upper_b, 2),
                    mahalanobis_score=round(float(mahal[t]), 4),
                    cqr_nonconformity=round(cqr_val, 4),
                    counterfactual_delta_norm=round(delta_norm, 4),
                    is_critical_shock=is_shock,
                    status_label="CRITICAL SHOCK SIGNAL TRIGGERED" if is_shock else "STATE: NOMINAL",
                )
            )
        return verdicts
