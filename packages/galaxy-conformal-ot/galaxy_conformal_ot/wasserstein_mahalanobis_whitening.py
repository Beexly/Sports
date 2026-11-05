"""
galaxy_conformal_ot.wasserstein_mahalanobis_whitening
=====================================================
GSE-GSI Conformal-OT v2.0 building blocks.

* ``hourly_state_matrix``       - causal (zero-order-hold) hourly state matrix from irregular charting.
* ``multi_frame_features``      - rolling covariance "pocket-space" features over trailing frames K,
                                  localized Cholesky-whitened Mahalanobis surge, vital velocity/acceleration.
* ``RFFMahalanobis``            - non-linear kernelized Mahalanobis distance (random Fourier features)
                                  fit ONLY on a reference (calibration negative) set.
* ``split_conformal_threshold`` - finite-sample class-conditional split-conformal threshold.
* ``CounterfactualTransportEngine`` - entropic-OT barycentric projection onto a healthy reference cloud.

Every statistic is causal: window t only sees samples <= t. Nothing here fits on test data; the caller
owns the train/cal/test split.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence

import numpy as np

# Fixed physiological scales (clinical constants, NOT fit to any dataset -> no leakage).
VITAL_NAMES = ("hr", "sbp", "map", "rr", "spo2", "pp")
VITAL_CENTER = np.array([80.0, 115.0, 80.0, 18.0, 96.0, 45.0])
VITAL_SCALE = np.array([20.0, 20.0, 15.0, 5.0, 3.0, 15.0])


def standardize_vitals(M: np.ndarray) -> np.ndarray:
    """Map raw vitals (T x 6) to clinical z-units with fixed constants."""
    return (np.asarray(M, dtype=float) - VITAL_CENTER) / VITAL_SCALE


def hourly_state_matrix(
    obs: dict[str, tuple[np.ndarray, np.ndarray]],
    t0: np.datetime64,
    max_hours: float | None = None,
) -> np.ndarray:
    """Build a causal hourly (T x 6) matrix [hr, sbp, map, rr, spo2, pp] by zero-order hold.

    ``obs[name] = (times, values)`` with times as datetime64. A grid point only uses observations at or
    before it. Leading grid points before every core vital has been observed are dropped.
    Missing MAP -> 0.75*SBP-ish fallback via (SBP + 2*DBP)/3 when DBP is present, else 0.75*SBP.
    Missing pulse pressure -> 45 (center), i.e. zero signal rather than an invented one.
    """
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
    # remaining gaps (e.g. SpO2/pp not yet observed): neutral = clinical center (z = 0), never invented signal
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
    """Causal multi-frame rolling-covariance, localized-Mahalanobis, velocity/acceleration features.

    Returns a flat dict of scalars summarising the whole observed trajectory.
    gamma regularises Sigma_{t,K} so the inverse square root exists even when K < d (rank deficiency).
    """
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
            mu, C = _window_cov(W[:-1] if len(W) > 2 else W, gamma)  # reference excludes the current point
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
            z = inv_sqrt @ (Z[t] - mu)  # localized Cholesky/eig-whitened deviation of the newest point
            surge.append(float(z @ z))
        tr, ld, cn, sg = map(np.array, (traces, logdets, conc, surge))
        feats[f"K{K}_surge_max"] = float(np.log1p(sg.max()))
        feats[f"K{K}_surge_p90"] = float(np.log1p(np.percentile(sg, 90)))
        feats[f"K{K}_trace_last"] = float(tr[-1])
        feats[f"K{K}_logdet_min"] = float(ld.min())
        # pocket-space compression: how far the covariance volume has collapsed relative to its start
        feats[f"K{K}_logdet_drop"] = float(ld[: max(1, T // 3)].mean() - ld.min())
        feats[f"K{K}_conc_max"] = float(cn.max())
        feats[f"K{K}_coupling_max"] = float(np.max(coup)) if coup else 0.0

    # velocity / acceleration of key hemodynamic channels (per hour, z-units)
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
    """Kernelized (RBF) Mahalanobis distance via random Fourier features.

    fit() uses ONLY the reference set (stable/negative cohort); score() is the squared Mahalanobis distance
    of phi(x) to the reference mean under a shrunk reference covariance. Non-linear: it measures departure
    along the kernel feature manifold, not just in the raw linear space.
    """

    n_features: int = 48
    shrink: float = 0.15
    seed: int = 0
    gamma_: float | None = None

    def fit(self, X_ref: np.ndarray) -> "RFFMahalanobis":
        X = np.asarray(X_ref, dtype=float)
        self.mu_x_ = X.mean(axis=0)
        self.sd_x_ = np.clip(X.std(axis=0), 1e-6, None)
        Xs = (X - self.mu_x_) / self.sd_x_
        rng = np.random.default_rng(self.seed)
        if self.gamma_ is None:  # median heuristic on the reference set
            idx = rng.choice(len(Xs), size=min(len(Xs), 200), replace=False)
            D = np.linalg.norm(Xs[idx, None] - Xs[None, idx], axis=2)
            med = np.median(D[D > 0]) if (D > 0).any() else 1.0
            self.gamma_ = 1.0 / (2.0 * med**2)
        d = Xs.shape[1]
        self.W_ = rng.normal(0.0, math.sqrt(2.0 * self.gamma_), size=(d, self.n_features))
        self.b_ = rng.uniform(0, 2 * math.pi, size=self.n_features)
        P = self._phi(Xs)
        self.mu_p_ = P.mean(axis=0)
        C = np.cov(P, rowvar=False)
        C = (1 - self.shrink) * C + self.shrink * np.trace(C) / C.shape[0] * np.eye(C.shape[0])
        w, V = np.linalg.eigh(C + 1e-9 * np.eye(C.shape[0]))
        self.inv_sqrt_ = (V / np.sqrt(np.clip(w, 1e-9, None))) @ V.T
        return self

    def _phi(self, Xs: np.ndarray) -> np.ndarray:
        return math.sqrt(2.0 / self.n_features) * np.cos(Xs @ self.W_ + self.b_)

    def score(self, X: np.ndarray) -> np.ndarray:
        Xs = (np.asarray(X, dtype=float) - self.mu_x_) / self.sd_x_
        Zp = (self._phi(Xs) - self.mu_p_) @ self.inv_sqrt_
        return np.einsum("ij,ij->i", Zp, Zp)


def conformal_rank(n_cal: int, alpha: float) -> int:
    """Smallest k with k/(n+1) >= 1-alpha (finite-sample split-conformal rank)."""
    return int(math.ceil((n_cal + 1) * (1.0 - alpha)))


def split_conformal_threshold(cal_scores: np.ndarray, alpha: float) -> float:
    """Class-conditional split-conformal threshold from calibration scores of the reference class.

    P(score_test_ref <= tau) >= 1 - alpha under exchangeability. If the rank exceeds n, returns +inf
    (the guarantee is then vacuous, which is the correct finite-sample behaviour).
    """
    s = np.sort(np.asarray(cal_scores, dtype=float))
    k = conformal_rank(len(s), alpha)
    return float("inf") if k > len(s) else float(s[k - 1])


class CounterfactualTransportEngine:
    """Entropic-OT barycentric projection of a state onto a healthy reference cloud.

    For a single source point the entropic OT plan to reference samples y_j is
    P_j proportional to exp(-||x-y_j||^2 / eps) (the Sinkhorn solution with one source atom). The
    barycentric image  y* = sum_j P_j y_j  is the minimal-transport healthy counterpart, and
    delta = x - y* is the counterfactual intervention direction. With several source atoms use
    ``sinkhorn_plan``.
    """

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
