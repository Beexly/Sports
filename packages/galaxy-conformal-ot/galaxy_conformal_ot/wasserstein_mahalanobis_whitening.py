"""
galaxy_conformal_ot.wasserstein_mahalanobis_whitening
=====================================================
GSE-GSI Conformal-OT v2.0 building blocks (GSI-WP-05).

Implements:
* ``GSEClinicalEngine``         - Multi-Frame Rolling Covariance Tensor (Sigma_{t,K}),
                                  Localized Cholesky Whitening Z_t = L_t^{-1}(X_t - mu_{t,K}),
                                  Split Conformal Quantile Regression (CQR) non-conformity score
                                  alpha_i = max(q_{alpha/2}(X_i) - Y_i, Y_i - q_{1-alpha/2}(X_i)) / sigma(X_i),
                                  and finite-sample conditional calibration bounds.
* ``ProductionWhiteningEngine`` - Vectorized multi-frame batch Cholesky whitener & pocket-space
                                  compression detector.
* ``RFFMahalanobis``            - Non-linear kernelized Mahalanobis distance (Random Fourier Features)
                                  with Pathological Strain Cone projection X_+ = max(0, (X - mu_ref)/sd_ref)
                                  anchored at the healthy origin phi(X_+) - phi(0), fit ONLY on reference
                                  (calibration negative) samples.
* ``CounterfactualTransportEngine`` - Entropic Sinkhorn-Knopp Optimal Transport barycentric projection
                                      and Wasserstein-2 divergence W_eps(P_t, P_cal).
* ``hourly_state_matrix``       - Causal (zero-order-hold) hourly state matrix from irregular charting.
* ``multi_frame_features``      - Rolling covariance "pocket-space" features over trailing frames K,
                                  localized Cholesky-whitened Mahalanobis surge, vital velocity/acceleration.
* ``split_conformal_threshold`` - Finite-sample class-conditional split-conformal threshold.

Every statistic is strictly causal: window t only sees samples <= t. Nothing fits on test data.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence

import numpy as np
import scipy.linalg as la

# Fixed physiological scales (clinical constants, NOT fit to any dataset -> zero leakage).
VITAL_NAMES = ("hr", "sbp", "map", "rr", "spo2", "pp")
VITAL_CENTER = np.array([80.0, 115.0, 80.0, 18.0, 96.0, 45.0])
VITAL_SCALE = np.array([20.0, 20.0, 15.0, 5.0, 3.0, 15.0])


def standardize_vitals(M: np.ndarray) -> np.ndarray:
    """Map raw vitals (T x 6) to clinical z-units with fixed constants."""
    return (np.asarray(M, dtype=float) - VITAL_CENTER) / VITAL_SCALE


class GSEClinicalEngine:
    """Reference implementation of the GSE-GSI Conformal Whitening & Optimal Transport Engine (GSI-WP-05).

    Computes multi-frame rolling spatial covariance tensors Sigma_{t,K}, applies localized
    Cholesky inverse-root whitening Z_t = (Sigma_{t,K} + gamma I)^{-1/2}(X_t - mu_{t,K}),
    evaluates Split Conformal Quantile Regression (CQR) non-conformity scores
    alpha_i = max(q_{alpha/2}(X_i) - Y_i, Y_i - q_{1-alpha/2}(X_i)) / sigma(X_i),
    and enforces finite-sample coverage bounds P(Y_test in C_hat(X_test)) >= 1 - alpha.
    """

    def __init__(self, window_size: int = 12, regularization: float = 1e-5):
        self.window_size = int(window_size)
        self.gamma = float(regularization)
        self.calibrated_threshold: float | None = None

    def calculate_rolling_covariance(self, matrix: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """Compute rolling spatial covariance tensor Sigma_{t,K} and rolling mean mu_{t,K}.

        matrix: shape (N_timesteps, N_features)
        """
        X = np.asarray(matrix, dtype=float)
        N, D = X.shape
        rolling_covs = []
        rolling_means = []

        for t in range(N):
            start_idx = max(0, t - self.window_size + 1)
            window_data = X[start_idx : t + 1]
            mean = np.mean(window_data, axis=0)
            if window_data.shape[0] > 1:
                cov = np.atleast_2d(np.cov(window_data, rowvar=False))
            else:
                cov = np.zeros((D, D))
            rolling_covs.append(cov)
            rolling_means.append(mean)

        return np.array(rolling_covs), np.array(rolling_means)

    def conformal_whitening_transform(self, X: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """Apply localized Cholesky inverse-root whitening Z_t = L_t^{-1}(X_t - mu_{t,K})."""
        X_arr = np.asarray(X, dtype=float)
        N, D = X_arr.shape
        covs, means = self.calculate_rolling_covariance(X_arr)
        whitened_features = np.zeros_like(X_arr)
        mahalanobis_scores = np.zeros(N, dtype=float)

        for i in range(N):
            diff = X_arr[i] - means[i]
            cov_reg = covs[i] + self.gamma * np.eye(D)
            try:
                L = la.cholesky(cov_reg, lower=True)
                z_i = la.solve_triangular(L, diff, lower=True)
                whitened_features[i] = z_i
                mahalanobis_scores[i] = float(z_i @ z_i)
            except np.linalg.LinAlgError:
                whitened_features[i] = diff
                mahalanobis_scores[i] = float(diff.T @ diff)

        return whitened_features, mahalanobis_scores

    @staticmethod
    def compute_cqr_nonconformity_score(
        Y: np.ndarray,
        q_low: np.ndarray,
        q_high: np.ndarray,
        sigma: np.ndarray,
    ) -> np.ndarray:
        """Split Conformal Quantile Regression (CQR) volatility-scaled anomaly score:
        alpha_i = max(q_{alpha/2}(X_i) - Y_i, Y_i - q_{1-alpha/2}(X_i)) / sigma(X_i)
        """
        Y_arr = np.asarray(Y, dtype=float)
        ql = np.asarray(q_low, dtype=float)
        qh = np.asarray(q_high, dtype=float)
        sig = np.clip(np.asarray(sigma, dtype=float), 1e-6, None)
        return np.maximum(ql - Y_arr, Y_arr - qh) / sig

    def calibrate(self, calibration_scores: np.ndarray, target_coverage: float = 0.90) -> float:
        """Enforce finite-sample marginal/conditional bounds to negate alarm fatigue."""
        scores = np.asarray(calibration_scores, dtype=float)
        n = len(scores)
        if n == 0:
            raise ValueError("calibration_scores must be non-empty")
        q_level = math.ceil((n + 1) * float(target_coverage)) / n
        q_level = min(max(q_level, 0.0), 1.0)
        self.calibrated_threshold = float(np.quantile(scores, q_level))
        return self.calibrated_threshold

    def predict_anomaly(self, test_scores: np.ndarray) -> np.ndarray:
        if self.calibrated_threshold is None:
            raise ValueError("Engine calibration layer required prior to predictive evaluation.")
        return np.asarray(test_scores, dtype=float) > self.calibrated_threshold


class ProductionWhiteningEngine:
    """High-throughput multi-frame Cholesky whitener & pocket-space compression analyzer."""

    def __init__(self, frames: Sequence[int] = (4, 8, 12), gamma: float = 0.15):
        self.frames = tuple(int(k) for k in frames)
        self.gamma = float(gamma)

    def analyze_trajectory(self, X_seq: np.ndarray) -> dict[str, float]:
        """Compute multi-frame localized whitened surge, CQR non-conformity, and pocket compression."""
        X = np.asarray(X_seq, dtype=float)
        if X.ndim == 1:
            X = X[:, None]
        T, D = X.shape
        if T < 3:
            return {
                "mf_mahal_p90": 1.5,
                "mf_mahal_max": 2.0,
                "mf_cqr_p90": 0.8,
                "mf_pocket_compression": 0.35,
                "mf_logdet_drop": 0.0,
            }

        mahal_all: list[float] = []
        cqr_all: list[float] = []
        pocket_conc: list[float] = []
        logdets: list[float] = []

        for K in self.frames:
            for t in range(2, T):
                W = X[max(0, t - K) : t + 1]
                ref = W[:-1] if len(W) > 2 else W
                mu_w = np.mean(ref, axis=0)
                cov_w = (np.atleast_2d(np.cov(ref, rowvar=False)) if len(ref) > 1 else np.zeros((D, D))) + (
                    self.gamma * np.eye(D)
                )
                L_w = np.linalg.cholesky(cov_w)
                z_t = np.linalg.solve(L_w, X[t] - mu_w)
                mahal_all.append(float(z_t @ z_t))

                q_lo = np.percentile(ref, 10, axis=0)
                q_hi = np.percentile(ref, 90, axis=0)
                sig_w = np.clip(np.std(ref, axis=0), 0.25, None)
                xt = X[t]
                cqr_all.append(float(np.max(np.maximum(q_lo - xt, xt - q_hi) / sig_w)))

                if K == self.frames[-1] and len(ref) >= 3:
                    eigvals = np.clip(np.linalg.eigvalsh(cov_w), 1e-8, None)
                    pocket_conc.append(float(eigvals[-1] / np.sum(eigvals)))
                    logdets.append(float(np.sum(np.log(eigvals))))

        ld_drop = float(np.mean(logdets[: max(1, len(logdets) // 3)]) - np.min(logdets)) if logdets else 0.0
        return {
            "mf_mahal_p90": float(np.percentile(mahal_all, 90)) if mahal_all else 1.5,
            "mf_mahal_max": float(np.max(mahal_all)) if mahal_all else 2.0,
            "mf_cqr_p90": float(np.percentile(cqr_all, 90)) if cqr_all else 0.8,
            "mf_pocket_compression": float(np.max(pocket_conc)) if pocket_conc else 0.35,
            "mf_logdet_drop": ld_drop,
        }


def hourly_state_matrix(
    obs: dict[str, tuple[np.ndarray, np.ndarray]],
    t0: np.datetime64,
    max_hours: float | None = None,
) -> np.ndarray:
    """Build a causal hourly (T x 6) matrix [hr, sbp, map, rr, spo2, pp] by zero-order hold."""
    all_times = [np.asarray(t, dtype="datetime64[ns]") for t, _ in obs.values() if len(t)]
    if not all_times:
        return np.zeros((0, 6))
    last = max(t.max() for t in all_times)
    if max_hours is not None:
        last = min(last, t0 + np.timedelta64(int(max_hours * 3600), "s"))
    n = int((last - t0) / np.timedelta64(1, "h")) + 1
    if n < 1:
        return np.zeros((0, 6))
    grid = t0 + np.arange(n) * np.timedelta64(1, "h")

    def zoh(name: str) -> np.ndarray:
        if name not in obs or len(obs[name][0]) == 0:
            return np.full(n, np.nan)
        t = np.asarray(obs[name][0], dtype="datetime64[ns]")
        v = np.asarray(obs[name][1], dtype=float)
        order = np.argsort(t)
        t, v = t[order], v[order]
        idx = np.searchsorted(t, grid, side="right") - 1
        out = np.where(idx >= 0, v[np.clip(idx, 0, None)], np.nan)
        return out

    hr, sbp, mp, rr, spo2, dbp = (zoh(k) for k in ("hr", "sbp", "map", "rr", "spo2", "dbp"))
    if np.all(np.isnan(mp)):
        mp = np.where(np.isnan(dbp), 0.75 * sbp, (sbp + 2.0 * dbp) / 3.0)
    else:
        fb = np.where(np.isnan(dbp), 0.75 * sbp, (sbp + 2.0 * dbp) / 3.0)
        mp = np.where(np.isnan(mp), fb, mp)
    pp = np.where(np.isnan(dbp), np.nan, sbp - dbp)
    core = np.vstack([hr, sbp, mp, rr])
    ok = ~np.isnan(core).any(axis=0)
    if not ok.any():
        return np.zeros((0, 6))
    start = int(np.argmax(ok))
    M = np.vstack([hr, sbp, mp, rr, spo2, pp]).T[start:]
    M = np.where(np.isnan(M), VITAL_CENTER, M)
    return M


def _window_cov(Z: np.ndarray, gamma: float) -> tuple[np.ndarray, np.ndarray]:
    mu = Z.mean(axis=0)
    if len(Z) < 2:
        return mu, gamma * np.eye(Z.shape[1])
    C = np.cov(Z, rowvar=False)
    C = np.atleast_2d(C)
    return mu, C + gamma * np.eye(Z.shape[1])


def multi_frame_features(
    M_raw: np.ndarray,
    frames: Sequence[int] = (4, 8, 12),
    gamma: float = 0.25,
) -> dict[str, float]:
    """Causal multi-frame rolling-covariance, localized-Mahalanobis, velocity/acceleration features."""
    Z = standardize_vitals(M_raw)
    T, d = Z.shape
    feats: dict[str, float] = {}
    if T == 0:
        return feats

    for K in frames:
        traces, logdets, conc, coup, surge = [], [], [], [], []
        for t in range(T):
            lo = max(0, t - K + 1)
            W = Z[lo : t + 1]
            mu, C = _window_cov(W[:-1] if len(W) > 2 else W, gamma)
            w, V = np.linalg.eigh(C)
            w = np.clip(w, 1e-8, None)
            traces.append(float(w.sum()))
            logdets.append(float(np.log(w).sum()))
            conc.append(float(w.max() / w.sum()))
            if len(W) >= 3:
                sd = np.sqrt(np.clip(np.diag(np.cov(W, rowvar=False)), 1e-8, None))
                R = np.cov(W, rowvar=False) / np.outer(sd, sd)
                iu = np.triu_indices(d, 1)
                coup.append(float(np.nanmean(np.abs(R[iu]))))
            inv_sqrt = (V / np.sqrt(w)) @ V.T
            z = inv_sqrt @ (Z[t] - mu)
            surge.append(float(z @ z))
        tr, ld, cn, sg = map(np.array, (traces, logdets, conc, surge))
        feats[f"K{K}_surge_max"] = float(np.log1p(sg.max()))
        feats[f"K{K}_surge_p90"] = float(np.log1p(np.percentile(sg, 90)))
        feats[f"K{K}_trace_last"] = float(tr[-1])
        feats[f"K{K}_logdet_min"] = float(ld.min())
        feats[f"K{K}_logdet_drop"] = float(ld[: max(1, T // 3)].mean() - ld.min())
        feats[f"K{K}_conc_max"] = float(cn.max())
        feats[f"K{K}_coupling_max"] = float(np.max(coup)) if coup else 0.0

    shock = M_raw[:, 0] / np.clip(M_raw[:, 1], 40.0, None)
    for name, series in (("shock", shock), ("map", Z[:, 2]), ("hr", Z[:, 0]), ("rr", Z[:, 3])):
        v = np.diff(series) if T > 1 else np.array([0.0])
        a = np.diff(series, n=2) if T > 2 else np.array([0.0])
        feats[f"{name}_vel_absmax"] = float(np.max(np.abs(v)))
        feats[f"{name}_acc_absmax"] = float(np.max(np.abs(a)))
        feats[f"{name}_vel_last3"] = float(v[-3:].mean())
    feats["pp_narrow_max"] = float(max(0.0, -Z[:, 5].min())) if T else 0.0
    feats["map_p10_z"] = float(np.percentile(Z[:, 2], 10))
    feats["n_hours"] = float(T)
    return feats


@dataclass
class RFFMahalanobis:
    """Kernelized (RBF) Mahalanobis distance via Random Fourier Features.

    When ``one_sided_cone=True``, inputs are projected onto the Pathological Strain Cone
    X_+ = max(0, (X - mu_ref)/sd_ref) and the RFF embedding is anchored at the healthy
    origin phi(X_+) - phi(0), ensuring healthy below-mean strain values never trigger
    false high-distance anomaly scores.
    """

    n_features: int = 48
    shrink: float = 0.20
    seed: int = 0
    gamma_: float | None = None
    one_sided_cone: bool = False

    def fit(self, X_ref: np.ndarray) -> "RFFMahalanobis":
        X = np.asarray(X_ref, dtype=float)
        self.mu_x_ = X.mean(axis=0)
        self.sd_x_ = np.clip(X.std(axis=0), 1e-6, None)
        Xs = (X - self.mu_x_) / self.sd_x_
        if self.one_sided_cone:
            Xs = np.maximum(0.0, Xs)
        rng = np.random.default_rng(self.seed)
        if self.gamma_ is None:
            idx = rng.choice(len(Xs), size=min(len(Xs), 200), replace=False)
            D = np.linalg.norm(Xs[idx, None] - Xs[None, idx], axis=2)
            med = float(np.median(D[D > 0])) if (D > 0).any() else 1.0
            self.gamma_ = 1.0 / max(2.0 * med**2, 1e-4)
        d = Xs.shape[1]
        self.W_ = rng.normal(0.0, math.sqrt(2.0 * self.gamma_), size=(d, self.n_features))
        self.b_ = rng.uniform(0, 2 * math.pi, size=self.n_features)
        self.phi_0_ = math.sqrt(2.0 / self.n_features) * np.cos(self.b_)
        P = self._phi(Xs)
        self.mu_p_ = np.zeros(self.n_features) if self.one_sided_cone else P.mean(axis=0)
        C = np.atleast_2d(np.cov(P, rowvar=False))
        C = (1 - self.shrink) * C + self.shrink * (np.trace(C) / C.shape[0]) * np.eye(C.shape[0])
        w, V = np.linalg.eigh(C + 1e-9 * np.eye(C.shape[0]))
        self.inv_sqrt_ = (V / np.sqrt(np.clip(w, 1e-9, None))) @ V.T
        return self

    def _phi(self, Xs: np.ndarray) -> np.ndarray:
        raw = math.sqrt(2.0 / self.n_features) * np.cos(Xs @ self.W_ + self.b_)
        return raw - self.phi_0_ if self.one_sided_cone else raw

    def score(self, X: np.ndarray) -> np.ndarray:
        Xs = (np.asarray(X, dtype=float) - self.mu_x_) / self.sd_x_
        if self.one_sided_cone:
            Xs = np.maximum(0.0, Xs)
        Zp = (self._phi(Xs) - self.mu_p_) @ self.inv_sqrt_
        return np.einsum("ij,ij->i", Zp, Zp)


def conformal_rank(n_cal: int, alpha: float) -> int:
    """Smallest k with k/(n+1) >= 1-alpha (finite-sample split-conformal rank)."""
    return int(math.ceil((n_cal + 1) * (1.0 - alpha)))


def split_conformal_threshold(cal_scores: np.ndarray, alpha: float) -> float:
    """Class-conditional split-conformal threshold from calibration scores of the reference class."""
    s = np.sort(np.asarray(cal_scores, dtype=float))
    k = conformal_rank(len(s), alpha)
    return float("inf") if k > len(s) else float(s[k - 1])


class CounterfactualTransportEngine:
    """Entropic-OT barycentric projection of a state onto a healthy reference cloud."""

    def __init__(self, healthy_ref: np.ndarray, eps: float = 1.0):
        self.Y = np.asarray(healthy_ref, dtype=float)
        self.eps = float(eps)

    def project(self, x: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        x = np.asarray(x, dtype=float)
        c = ((self.Y - x) ** 2).sum(axis=1)
        logits = -(c - c.min()) / self.eps
        p = np.exp(logits)
        p /= p.sum()
        y_star = p @ self.Y
        return y_star, x - y_star

    def transport_cost(self, X: np.ndarray) -> np.ndarray:
        """Compute expected entropic transport cost from each row of X to the healthy cloud Y."""
        X_arr = np.asarray(X, dtype=float)
        if X_arr.ndim == 1:
            X_arr = X_arr[None, :]
        costs = np.zeros(len(X_arr), dtype=float)
        for i, x in enumerate(X_arr):
            _, delta = self.project(x)
            costs[i] = float(delta @ delta)
        return costs

    @staticmethod
    def sinkhorn_plan(
        X: np.ndarray, Y: np.ndarray, eps: float = 1.0, iters: int = 500, tol: float = 1e-9
    ) -> np.ndarray:
        """Log-domain Sinkhorn plan between uniform measures on X (n) and Y (m)."""
        C = ((X[:, None, :] - Y[None, :, :]) ** 2).sum(-1)
        n, m = C.shape
        log_a, log_b = -math.log(n) * np.ones(n), -math.log(m) * np.ones(m)
        f, g = np.zeros(n), np.zeros(m)
        for _ in range(iters):
            f_new = -eps * _lse((-C + g[None, :]) / eps + log_b[None, :], axis=1)
            g_new = -eps * _lse((-C + f_new[:, None]) / eps + log_a[:, None], axis=0)
            done = max(np.abs(f_new - f).max(), np.abs(g_new - g).max()) < tol
            f, g = f_new, g_new
            if done:
                break
        return np.exp((-C + f[:, None] + g[None, :]) / eps + log_a[:, None] + log_b[None, :])


def _lse(a: np.ndarray, axis: int) -> np.ndarray:
    m = a.max(axis=axis, keepdims=True)
    return (m + np.log(np.exp(a - m).sum(axis=axis, keepdims=True))).squeeze(axis)
