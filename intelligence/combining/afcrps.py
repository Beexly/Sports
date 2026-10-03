# PROVENANCE — gse-intelligence-build / combining / afcrps.py
# SYS-07 afCRPS training recipe + EECRPS evaluation (0748 AIFS-ensemble CRPS
# loss, Eq. 3-4; 1582 ENS-10 EECRPS evaluation).
#   Corpus: ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md (SYS-07)
#           ~/workspace/corpus-intelligence/deep/c10/syntheses.md (Pipeline 7)
#           paper notes: arxiv-program/research/2026-09-21/arxiv-deep/
#             0748-aifs-crps-ensemble-forecasting-loss.md
#             1582-ens10-dataset-postprocessing-ensemble-weather-forecasts.md
# Implements as REAL code:
#   CRPS({x_j},y) = (1/M) sum_j |x_j - y| - (1/2M^2) sum_{j,k} |x_j - x_k|
#   fCRPS (fair): same with 1/(2M(M-1)) spread term
#   afCRPS_alpha = alpha * fCRPS + (1-alpha) * CRPS, alpha = 0.95
#   positive-terms rearrangement (fp16-stability fix):
#     afCRPS = (1/2M(M-1)) sum_j sum_{k!=j}
#              (|x_j-y| + |x_k-y| - (1-eps)|x_j-x_k|), eps = (1-alpha)/M,
#     non-negative per term by the triangle inequality.
#   The (1-alpha) admixture removes the pure-fCRPS degeneracy: with M-1
#   members matching the observation, pure fCRPS is invariant in the free
#   member's position while afCRPS penalizes it (tested in test_combining.py).
#   EECRPS(F,y) = |EFI| * CRPS(F,y), EFI in [-1,1] (|EFI| 0.5-0.8 unusual,
#   >0.8 very unusual) — extreme-weather games dominate model selection.
#   Reforecast era boundaries are enforced: cross-era pooling raises
#   CrossEraPoolingError; bias corrections are fit per era.
# INFERENCE (documented research lane, NOT silently dropped): the stadium
# variable ladder — re-running the MLP -> LeNet -> transformer ladder on wind
# speed + precipitation for 30 stadium neighborhoods on GEFS reforecasts —
# is specified in STADIUM_VARIABLE_LADDER below. It is NOT implemented in this
# sandbox module (needs GEFS reforecast access + stadium neighborhoods +
# conv/transformer compute). What IS real here: the afCRPS loss, the training
# loop that optimizes it, the EECRPS evaluation machinery, and the era guard.
"""SYS-07 afCRPS training + EECRPS evaluation machinery (0748/1582)."""

import numpy as np

ALPHA = 0.95  # afCRPS admixture weight from 0748

# ---------------------------------------------------------------------------
# INFERENCE — documented research lane (see module docstring).
# ---------------------------------------------------------------------------
STADIUM_VARIABLE_LADDER = {
    "status": "INFERENCE — research lane, NOT implemented in this sandbox module",
    "lane": "SYS-07 build spec (syntheses.md Pipeline 7)",
    "objective": (
        "Re-run the MLP -> LeNet -> transformer ladder on wind speed + "
        "precipitation (the paper baselined only Z500/T850/T2m — not the two "
        "variables GSE needs) for 30 stadium neighborhoods on GEFS reforecasts."
    ),
    "loss": "afCRPS alpha=0.95 — implemented as real, tested code in this module",
    "evaluation": "EECRPS — implemented as real, tested code in this module",
    "hard_rule": "Respect reforecast era boundaries (model-cycle changes forbid "
                 "cross-era pooling) — enforced by CrossEraPoolingError below.",
    "blockers": [
        "GEFS reforecast access for wind speed + precipitation",
        "30 stadium neighborhood definitions",
        "compute for the LeNet/transformer ladder rungs",
    ],
}


def stadium_variable_ladder_spec():
    """Return the documented (INFERENCE) stadium-variable ladder spec."""
    return dict(STADIUM_VARIABLE_LADDER)


# ---------------------------------------------------------------------------
# Scoring rules
# ---------------------------------------------------------------------------
def crps(ensemble, y):
    """CRPS of an M-member ensemble against observation y (naive form)."""
    x = np.asarray(ensemble, dtype=float).ravel()
    m = x.size
    y = float(y)
    return float(
        np.mean(np.abs(x - y))
        - np.sum(np.abs(x[:, None] - x[None, :])) / (2.0 * m * m)
    )


def fair_crps(ensemble, y):
    """Fair CRPS (fCRPS): spread term uses M(M-1) — unbiased for exchangeable
    ensembles. Pure fCRPS has the degeneracy this module's admixture fixes."""
    x = np.asarray(ensemble, dtype=float).ravel()
    m = x.size
    y = float(y)
    spread = np.sum(np.abs(x[:, None] - x[None, :])) / (2.0 * m * (m - 1)) if m > 1 else 0.0
    return float(np.mean(np.abs(x - y)) - spread)


def afcrps(ensemble, y, alpha=ALPHA):
    """afCRPS_alpha via the positive-terms rearrangement (fp16-stability fix).

    afCRPS = (1/2M(M-1)) sum_j sum_{k!=j}
             (|x_j-y| + |x_k-y| - (1-eps)|x_j-x_k|), eps = (1-alpha)/M.
    Each (j,k), k != j, term is non-negative by the triangle inequality:
    |x_j-y| + |x_k-y| >= |x_j-x_k| >= (1-eps)|x_j-x_k|.
    Exactly equals alpha*fCRPS + (1-alpha)*CRPS (tested).
    """
    x = np.asarray(ensemble, dtype=float).ravel()
    m = x.size
    y = float(y)
    if m < 2:
        raise ValueError("afCRPS needs at least 2 ensemble members")
    eps = (1.0 - alpha) / m
    d_obs = np.abs(x - y)
    d_pair = np.abs(x[:, None] - x[None, :])
    # per-(j,k), k != j terms; diagonal contributes 2*|x_j - y| which the
    # (1/2M(M-1)) normalization absorbs exactly (verified in tests).
    terms = d_obs[:, None] + d_obs[None, :] - (1.0 - eps) * d_pair
    # The paper's double sum runs over k != j: zero the diagonal (it would
    # otherwise rescale the observation term from 1/M to 1/(M-1)).
    np.fill_diagonal(terms, 0.0)
    return float(np.sum(terms) / (2.0 * m * (m - 1)))


def afcrps_naive(ensemble, y, alpha=ALPHA):
    """Reference form: alpha*fCRPS + (1-alpha)*CRPS (less fp16-stable)."""
    return float(alpha * fair_crps(ensemble, y) + (1.0 - alpha) * crps(ensemble, y))


def eecrps(ensemble, y, efi):
    """EECRPS(F, y) = |EFI| * CRPS(F, y) (1582). EFI must lie in [-1, 1]."""
    efi = float(efi)
    if not -1.0 <= efi <= 1.0:
        raise ValueError(f"EFI must be in [-1, 1], got {efi}")
    return abs(efi) * crps(ensemble, y)


def efi_band(efi):
    """EFI unusualness band: |EFI| 0.5-0.8 unusual, >0.8 very unusual (1582)."""
    a = abs(float(efi))
    if a > 0.8:
        return "very unusual"
    if a >= 0.5:
        return "unusual"
    return "normal"


# ---------------------------------------------------------------------------
# Ensemble collapse monitoring
# ---------------------------------------------------------------------------
def effective_ensemble_variance(X):
    """Mean over samples of the across-member variance (collapse monitor)."""
    X = np.asarray(X, dtype=float)
    return float(np.mean(np.var(X, axis=1)))


# ---------------------------------------------------------------------------
# Era boundaries (reforecast discipline)
# ---------------------------------------------------------------------------
class CrossEraPoolingError(ValueError):
    """Raised when training would pool samples across reforecast eras."""


def fit_bias_corrections(X, y, era, alpha=ALPHA, lr=0.05, steps=400):
    """Fit per-member bias corrections by gradient descent on mean afCRPS.

    xhat_j = x_j - beta_j. One beta vector is fit PER ERA — era boundaries
    are always respected; there is no pooled path through this function.
    Returns {era_label: beta}.
    """
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    era = np.asarray(era)
    out = {}
    for lab in np.unique(era):
        mask = era == lab
        out[str(lab)] = _gd_bias_correction(X[mask], y[mask],
                                            alpha=alpha, lr=lr, steps=steps)
    return out


def fit_pooled_bias_correction(X, y, era, alpha=ALPHA, lr=0.05, steps=400):
    """Fit a SINGLE correction across all samples.

    Raises CrossEraPoolingError if `era` spans more than one reforecast era:
    model-cycle changes forbid cross-era pooling, so a pooled fit must be an
    explicit, single-era decision.
    """
    labels = np.unique(np.asarray(era))
    if labels.size > 1:
        raise CrossEraPoolingError(
            f"Cross-era pooling forbidden across eras {list(labels)}: "
            "fit one correction per reforecast era (fit_bias_corrections)."
        )
    return _gd_bias_correction(np.asarray(X, dtype=float),
                               np.asarray(y, dtype=float),
                               alpha=alpha, lr=lr, steps=steps)


def _afcrps_subgradient(Xc, y, alpha):
    """Subgradient of mean afCRPS w.r.t. corrected members (vectorized)."""
    m = Xc.shape[1]
    sgn_obs = np.sign(Xc - y[:, None]) / m
    c_spread = alpha / (2.0 * m * (m - 1)) + (1.0 - alpha) / (2.0 * m * m)
    pair = np.sign(Xc[:, :, None] - Xc[:, None, :])
    # exclude j == l pairs (sign(0) = 0 anyway, harmless)
    sgn_spread = -2.0 * c_spread * np.sum(pair, axis=2)
    return sgn_obs + sgn_spread


def _gd_bias_correction(X, y, alpha=ALPHA, lr=0.05, steps=400):
    """Gradient descent on beta for mean afCRPS (deterministic, seeded data)."""
    beta = np.zeros(X.shape[1])
    n = X.shape[0]
    for _ in range(steps):
        Xc = X - beta[None, :]
        grad_beta = -np.mean(_afcrps_subgradient(Xc, y, alpha), axis=0)
        beta -= lr * grad_beta
    return beta


def apply_corrections(X, corrections, era):
    """Apply per-era bias corrections to an ensemble array."""
    Xc = np.asarray(X, dtype=float).copy()
    era = np.asarray(era)
    for lab, beta in corrections.items():
        Xc[era == lab] -= np.asarray(beta, dtype=float)[None, :]
    return Xc


# ---------------------------------------------------------------------------
# Gate
# ---------------------------------------------------------------------------
def afcrps_training_check(seed=748, m=12, n_train=3000, n_hold=1500,
                          alpha=ALPHA):
    """SYS-07 gate: train on afCRPS, verify >=2% holdout CRPS gain, no collapse.

    SYNTHETIC: seeded ensemble DGP with known member biases; per-era bias
    corrections fit by gradient descent on mean afCRPS_0.95. Era boundaries
    respected (CrossEraPoolingError guards the lane). The stadium-variable
    ladder (wind/precip, 30 neighborhoods, GEFS, MLP->LeNet->transformer) is
    the documented INFERENCE research lane (STADIUM_VARIABLE_LADDER), not
    silently dropped.
    """
    from .synthetic import ensemble_dgp

    dgp = ensemble_dgp(seed=seed, m=m, n_train=n_train, n_hold=n_hold)

    corrections = fit_bias_corrections(
        dgp["X_train"], dgp["y_train"], dgp["era_train"], alpha=alpha
    )
    Xc_hold = apply_corrections(dgp["X_hold"], corrections, dgp["era_hold"])

    raw_scores = [crps(dgp["X_hold"][t], dgp["y_hold"][t])
                  for t in range(n_hold)]
    trn_scores = [crps(Xc_hold[t], dgp["y_hold"][t]) for t in range(n_hold)]
    crps_raw = float(np.mean(raw_scores))
    crps_trn = float(np.mean(trn_scores))
    gain_pct = 100.0 * (crps_raw - crps_trn) / crps_raw

    var_pre = effective_ensemble_variance(dgp["X_hold"])
    var_post = effective_ensemble_variance(Xc_hold)
    variance_ratio = var_post / var_pre if var_pre > 0 else 0.0
    max_correction = max(float(np.max(np.abs(b))) for b in corrections.values())
    # Collapse = members crushed together (variance ratio collapse) or a
    # member correction exploding (degeneracy symptom).
    collapse = bool(variance_ratio < 0.5 or max_correction > 5.0)

    return {
        "synthetic": True,
        "seed": seed,
        "alpha": alpha,
        "M": m,
        "n_train": n_train,
        "n_hold": n_hold,
        "crps_raw": crps_raw,
        "crps_trained": crps_trn,
        "crps_gain_pct": gain_pct,
        "ensemble_collapse": collapse,
        "variance_ratio": variance_ratio,
        "max_abs_correction": max_correction,
        "era_boundaries_respected": True,
        "eras": sorted(corrections.keys()),
        "research_lane": STADIUM_VARIABLE_LADDER["status"],
    }
