# PROVENANCE — gse-intelligence-build / combining / synthetic.py
# Seeded SYNTHETIC data-generating processes for the combining module.
# Implements: SYS-04 (arXiv:2305.16735v2) component-forecaster DGP and
#             SYS-07 (0748 afCRPS) ensemble DGP.
#   Corpus: ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md
#           (SYS-04, SYS-07, SYS-16)
#           ~/workspace/corpus-intelligence/deep/c10/syntheses.md (Pipelines 4, 7)
# HONESTY: every generator here is SYNTHETIC. No real ensemble forecasts exist
# in this sandbox. Seeds are fixed so runs are reproducible; reported gains
# validate the machinery (losses, combination construction, audits), not
# real-world performance. Labeled synthetic in all docstrings and provenance.
"""Seeded synthetic DGPs for the combining module (SYNTHETIC — not real forecasts)."""

import math

import numpy as np

_MARGIN_GRID = np.linspace(-6.0, 6.0, 241)  # standardized margin units


def _phi(z):
    """Standard normal CDF via erf (no scipy dependency)."""
    z = np.asarray(z, dtype=float)
    out = np.empty_like(z)
    flat = z.ravel()
    vals = np.array([0.5 * (1.0 + math.erf(v / math.sqrt(2.0))) for v in flat])
    out = vals.reshape(z.shape)
    return out


def normal_cdf_grid(grid, mu, sigma):
    """Normal CDF evaluated on a grid (component predictive distribution)."""
    return _phi((np.asarray(grid, dtype=float) - mu) / sigma)


def component_forecasters_dgp(seed=1550, n=600):
    """SYNTHETIC component forecasters for SYS-04 angular combining.

    Truth: latent signal s_t (AR(1)) + noise -> outcome y_t.
    Each of K=4 components issues a per-sample predictive normal CDF
    N(s_t + bias_i, spread_i^2): disagreeing locations, overdispersed spreads.
    Location disagreement is the mechanism that lets angular combining
    (theta=67.5, mostly-vertical but sharpened) beat the linear opinion
    pool: the linear pool of disagreeing components is overdispersed, and
    angular averaging sharpens it (the same mechanism the paper reports:
    +1.4% MQS fallback on real data). The gain magnitude here is
    DGP-dependent; the invariant under test is the construction +
    non-inferiority, not the paper's number.

    Returns dict with y, signal, per-sample component CDFs, grid, and each
    component's information-source attribution (for the SYS-16 pre-step audit).
    """
    rng = np.random.default_rng(seed)
    k = 4
    s = np.empty(n)
    s[0] = rng.normal()
    for t in range(1, n):
        s[t] = 0.9 * s[t - 1] + 0.4359 * rng.normal()
    y = s + 0.5 * rng.normal(size=n)

    biases = np.array([-0.80, 0.60, 0.40, -0.30])
    spreads = np.array([1.35, 1.15, 1.50, 1.25])
    grid = _MARGIN_GRID.copy()
    cdfs = np.empty((n, k, grid.size))
    for t in range(n):
        for i in range(k):
            cdfs[t, i] = normal_cdf_grid(grid, s[t] + biases[i], spreads[i])

    sources = [
        {"epa_model": 0.45, "market_consensus": 0.30, "weather_lane": 0.25},
        {"tracking_ngs": 0.50, "epa_model": 0.30, "injury_report": 0.20},
        {"market_consensus": 0.40, "beat_reporter": 0.35, "epa_model": 0.25},
        {"tracking_ngs": 0.45, "weather_lane": 0.30, "injury_report": 0.25},
    ]
    names = ["epa_residual_model", "tracking_augmented", "market_anchored", "weather_blend"]
    return {
        "synthetic": True,
        "seed": seed,
        "n": n,
        "k": k,
        "y": y,
        "signal": s,
        "grid": grid,
        "cdfs": cdfs,  # (n, k, G)
        "components": [
            {"name": names[i], "sources": sources[i], "bias": float(biases[i]),
             "spread": float(spreads[i])}
            for i in range(k)
        ],
    }


def ensemble_dgp(seed=748, m=12, n_train=3000, n_hold=1500):
    """SYNTHETIC ensemble DGP for SYS-07 afCRPS training.

    M-member ensembles with KNOWN member biases (the learnable structure) and
    heterogeneous member noise. Two reforecast eras with different bias
    structures (model-cycle change) — training must respect era boundaries
    (no cross-era pooling).

    Returns dict with train/holdout ensembles, observations, era labels.
    """
    rng = np.random.default_rng(seed)
    n_total = n_train + n_hold
    s = np.empty(n_total)
    s[0] = rng.normal()
    for t in range(1, n_total):
        s[t] = 0.9 * s[t - 1] + 0.4359 * rng.normal()
    y = s + 0.5 * rng.normal(size=n_total)

    # Era boundary at the midpoint: different bias structure per era.
    era = np.where(np.arange(n_total) < n_total // 2, "A", "B")
    bias_A = np.linspace(-0.6, 0.6, m)
    bias_B = np.linspace(-0.3, 0.9, m)
    sigmas = 0.8 + 0.4 * np.arange(m) / max(m - 1, 1)

    X = np.empty((n_total, m))
    for t in range(n_total):
        b = bias_A if era[t] == "A" else bias_B
        X[t] = s[t] + b + sigmas * rng.normal(size=m)

    return {
        "synthetic": True,
        "seed": seed,
        "m": m,
        "X_train": X[:n_train],
        "y_train": y[:n_train],
        "era_train": era[:n_train],
        "X_hold": X[n_train:],
        "y_hold": y[n_train:],
        "era_hold": era[n_train:],
        "member_sigmas": sigmas,
    }
