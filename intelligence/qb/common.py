# PROVENANCE — gse-intelligence-build / qb / common.py
# Shared constants and helpers for the qb (QB intelligence) module.
#
# Research implemented (see ~/workspace/corpus-intelligence/deep/c10/):
#   SYS-09 — rGAX residualization + contamination audit
#       (buildable-systems.md §SYS-09; syntheses.md Pipeline 6;
#        challenges.md r22/1143, r10/0424;
#        briefs: 1143-rethinking-player-evaluation-gax-beyond.md,
#                0424-biases-in-expected-goals-models-confound.md)
#   SYS-23 — INT prop pricing rule + sack-prop veto (kicker-defense-props)
#       (buildable-systems.md §SYS-23;
#        source: props/research/2026-09-25/kicker-defense-props-methodology.md:85,95,112-113,130-134)
#   SYS-24 — Luck-layer margin pricer (edge-sheet)
#       (buildable-systems.md §SYS-24;
#        source: predictions/research/2026-09-17/edge-sheet/README.md:13,41,48,50,57,101,103;
#        corroborated by dossier-v2 (r41) — two independent sources on
#        4.5 pts/turnover and ~0.00 fumble-recovery correlation)
#   week3-engine-readings — on-field efficiency blend weights
#       (verified-claims.md:419; source .../week3-engine-readings-2026-09-21.md:14,17,27 —
#        NOTE: this is a GSE repo brief, not a peer-reviewed paper; the weights are a
#        published prior from a Week-3-2026 engine reading, marked as brief-sourced)
#
# DATA BASIS (honesty): there is no real NFL dataset in this sandbox. Every
# quantitative routine in this package runs on seeded, documented synthetic
# data-generating processes (DGPs) whose parameters are calibrated to reproduce
# the *reported structure* of the research above (e.g. rGAX 0.936 (SE 0.005) vs
# GAX 0.757). Nothing here is estimated from real player data. Each public
# function states its data basis in its docstring.

"""Shared constants and helpers for the qb module."""

import numpy as np

# Canonical RNG seed for every synthetic DGP in this package. Fixed so the
# first implementation run IS the validation run (deterministic outputs).
CANONICAL_SEED = 20261002


def make_rng(seed=CANONICAL_SEED):
    """Seeded NumPy generator shared by all qb synthetic DGPs."""
    return np.random.default_rng(seed)


# ---------------------------------------------------------------------------
# Research-reported reference numbers (never used as computed outputs — they
# are the calibration targets / honesty anchors cited in docstrings).
# ---------------------------------------------------------------------------
PAPER_RGAX_SLOPE = 0.936      # 1143: rGAX robustness slope (SE 0.005)
PAPER_RGAX_SLOPE_SE = 0.005
PAPER_GAX_SLOPE = 0.757       # 1143: unresidualized GAX robustness slope (SE 0.005)
PAPER_GAX_SLOPE_SE = 0.005
# 1143 honesty anchors: corr(metric, residualized) ~ 1 everywhere
PAPER_CORR_SOCCER = 0.998
PAPER_CORR_NFL_RCPAE = 0.997
PAPER_CORR_GK = 0.999
# 0424 contamination anchors
CONTAM_MESSI_CLEAN = 127.6
CONTAM_MESSI_CONTAMINATED = 120.8   # >5% drop under +25%-finisher contamination
CONTAM_MAHREZ_WITH_DEFLECTIONS = 14.61
CONTAM_MAHREZ_NO_DEFLECTIONS = 9.03
NOISE_FINISHER_MEAN = 3.70    # 0424: +25% finisher, 150 shots/season
NOISE_FINISHER_SD = 3.73      # single-season GAX is mostly noise
# SYS-24 anchors
POINTS_PER_TURNOVER = 4.5     # edge-sheet; corroborated by dossier-v2 (r41)
FUMBLE_RECOVERY_YOY_CORR = 0.00
# SYS-23 anchors
INT_COMPLETION_CONVERSION = 0.523  # 52.3% conversion in the prop rule


def normal_pvalues(z):
    """Two-sided Normal p-values from z-scores (pure Python/numpy, no scipy)."""
    from math import erf, sqrt
    z = np.asarray(z, dtype=float)
    # Phi via erf; vectorize manually for clarity
    phi = 0.5 * (1.0 + np.vectorize(lambda v: erf(v / sqrt(2.0)))(z))
    return 2.0 * np.minimum(phi, 1.0 - phi)


def holm_adjust(p):
    """Bonferroni-Holm adjusted p-values."""
    p = np.asarray(p, dtype=float)
    m = p.size
    order = np.argsort(p, kind="stable")
    ranked = p[order]
    adj = np.empty(m)
    running_max = 0.0
    for i, pv in enumerate(ranked):
        adj_i = (m - i) * pv
        if adj_i > running_max:
            running_max = adj_i
        adj[order[i]] = min(running_max, 1.0)
    return adj


def bh_adjust(p):
    """Benjamini-Hochberg (FDR) adjusted p-values."""
    p = np.asarray(p, dtype=float)
    m = p.size
    order = np.argsort(p, kind="stable")
    ranked = p[order]
    adj = np.empty(m)
    running_min = 1.0
    for i in range(m - 1, -1, -1):
        adj_i = m / (i + 1) * ranked[i]
        if adj_i < running_min:
            running_min = adj_i
        adj[order[i]] = min(running_min, 1.0)
    return adj


def by_adjust(p):
    """Benjamini-Yekutieli (FDR under arbitrary dependence) adjusted p-values."""
    p = np.asarray(p, dtype=float)
    m = p.size
    c_m = float(np.sum(1.0 / np.arange(1, m + 1)))
    order = np.argsort(p, kind="stable")
    ranked = p[order]
    adj = np.empty(m)
    running_min = 1.0
    for i in range(m - 1, -1, -1):
        adj_i = m * c_m / (i + 1) * ranked[i]
        if adj_i < running_min:
            running_min = adj_i
        adj[order[i]] = min(running_min, 1.0)
    return adj
