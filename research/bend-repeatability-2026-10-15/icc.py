"""ICC(2,1) estimator + split-half / Spearman-Brown machinery for the Bend
Score repeatability measurement (WO-3 design, Deliverable 1).

Primary estimator: ICC(2,1) - two-way random-effects, absolute agreement,
single measurement (Shrout & Fleiss 1979, case 2). Subjects = athletes,
occasions = the k repeated measurements per athlete (e.g. two half-means).

Given an n x k matrix X (rows = athletes, cols = occasions, complete):
  MSR = between-athletes mean square, MSC = between-occasions mean square,
  MSE = residual mean square of the two-way ANOVA decomposition.
  ICC(2,1) = (MSR - MSE) / (MSR + (k-1)*MSE + (k/n)*(MSC - MSE))

95% CI: parametric bootstrap from the fitted ANOVA variance components
  s2e = MSE,  s2c = max(0, (MSC - MSE)/n),  s2a = max(0, (MSR - MSE)/k).
  B resamples of the two-way random-effects model are drawn, ICC(2,1) is
  recomputed on each, and the 2.5/97.5 percentiles are the interval.
  (The textbook Shrout-Fleiss F interval was implemented first and
  REJECTED in validation: on synthetic ground truth at n=80, k=2 it
  covered only 0.81-0.93 across ICC 0.3/0.6/0.85. The bootstrap interval
  covers at ~nominal; see tests/test_icc_synthetic.py, which asserts
  both recovery of the point estimate and CI coverage before any
  real-data number may be quoted.)
"""

from __future__ import annotations

import numpy as np
from scipy import stats  # noqa: F401  (kept: analytic reference)


def _icc_point(X: np.ndarray) -> tuple[float, float, float, float]:
    """Point estimate + mean squares only (no CI)."""
    n, k = X.shape
    grand = X.mean()
    ssr = k * ((X.mean(axis=1) - grand) ** 2).sum()
    ssc = n * ((X.mean(axis=0) - grand) ** 2).sum()
    sst = ((X - grand) ** 2).sum()
    sse = sst - ssr - ssc
    msr, msc, mse = ssr / (n - 1), ssc / max(k - 1, 1), sse / ((n - 1) * (k - 1))
    denom = msr + (k - 1) * mse + (k / n) * (msc - mse)
    icc = (msr - mse) / denom if denom != 0 else float("nan")
    return float(icc), float(msr), float(msc), float(mse)


def icc_2_1(X: np.ndarray, n_boot: int = 2000, seed: int = 20261015) -> dict:
    """Shrout-Fleiss ICC(2,1), absolute agreement, single measure.

    X: (n_athletes, k_occasions) array, complete (no NaN).
    CI: parametric bootstrap from fitted variance components (see module
    docstring for why the analytic F interval was rejected in validation).
    Returns dict with icc, ci_lo, ci_hi, n, k, msr, msc, mse, F, df1, df2.
    """
    X = np.asarray(X, dtype=float)
    if X.ndim != 2:
        raise ValueError("X must be 2-D (athletes x occasions)")
    n, k = X.shape
    if n < 3 or k < 2:
        raise ValueError(f"need n>=3 athletes and k>=2 occasions, got {X.shape}")
    if np.isnan(X).any():
        raise ValueError("X contains NaN; ICC(2,1) here requires a complete matrix")

    icc, msr, msc, mse = _icc_point(X)
    df_r, df_e = n - 1, (n - 1) * (k - 1)
    f_obs = msr / mse if mse > 0 else float("inf")

    # fitted variance components
    s2a = max(0.0, (msr - mse) / k)
    s2c = max(0.0, (msc - mse) / n)
    s2e = max(mse, 1e-12)
    rng = np.random.default_rng(seed)
    boots = np.empty(n_boot)
    mu = float(X.mean())
    for b in range(n_boot):
        Xb = (mu + rng.normal(0, np.sqrt(s2a), size=(n, 1))
              + rng.normal(0, np.sqrt(s2c), size=(1, k))
              + rng.normal(0, np.sqrt(s2e), size=(n, k)))
        boots[b] = _icc_point(Xb)[0]
    lo, hi = np.percentile(boots, [2.5, 97.5])

    return {
        "icc": float(icc), "ci_lo": float(lo), "ci_hi": float(hi),
        "n": int(n), "k": int(k),
        "msr": float(msr), "msc": float(msc), "mse": float(mse),
        "F": float(f_obs), "df1": int(df_r), "df2": int(df_e),
        "s2a": float(s2a), "s2c": float(s2c), "s2e": float(s2e),
    }


def split_half_sb(values_a: np.ndarray, values_b: np.ndarray) -> dict:
    """Split-half: Pearson r between the two per-athlete half-means,
    Spearman-Brown corrected to the full set:  r_sb = 2r / (1 + r).
    """
    a, b = np.asarray(values_a, float), np.asarray(values_b, float)
    ok = ~np.isnan(a) & ~np.isnan(b)
    a, b = a[ok], b[ok]
    r = float(np.corrcoef(a, b)[0, 1]) if len(a) >= 3 else float("nan")
    r_sb = 2 * r / (1 + r) if r == r and r > -1 else float("nan")
    return {"n": int(len(a)), "r_half": r, "r_spearman_brown": float(r_sb)}


def reps_needed(r_single: float, target: float) -> float:
    """Spearman-Brown prophecy: reps k of a measure with single-rep
    reliability r_single needed for the k-rep mean to reach `target`:
        R_k = k*r / (1 + (k-1)*r)   =>   k = R*(1-r) / (r*(1-R))
    Pure formula - context table, not a data claim.
    """
    if not (0 < r_single < 1) or not (0 < target < 1):
        return float("nan")
    return target * (1 - r_single) / (r_single * (1 - target))


def sb_curve(targets=(0.70, 0.80), r_grid=(0.2, 0.3, 0.4, 0.5, 0.6, 0.7)) -> dict:
    """Reps-needed table over hypothetical single-rep reliabilities."""
    return {r: {t: reps_needed(r, t) for t in targets} for r in r_grid}
