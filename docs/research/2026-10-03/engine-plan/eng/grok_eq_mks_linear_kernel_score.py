"""Multivariate Kernel Score linear-kernel reduction as printed in Meyer & Xu, arXiv:2604.21595v2 eq (4).

For linear kernel the feature-space regularized Mahalanobis reduces to
e_hat(ε) = (ε - μ)^T (Σ + λ I)^{-1} (ε - μ).
Missing inputs, non-square covariance, non-positive λ, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations
import numpy as np


def mks_linear_kernel_score(
    residual: list[float] | None,
    mean: list[float] | None,
    cov: list[list[float]] | None,
    lam: float | None,
) -> float | None:
    if residual is None or mean is None or cov is None or lam is None:
        return None
    try:
        r = np.asarray(residual, dtype=float)
        m = np.asarray(mean, dtype=float)
        C = np.asarray(cov, dtype=float)
        ld = float(lam)
    except (TypeError, ValueError):
        return None
    if r.ndim != 1 or m.ndim != 1 or C.ndim != 2:
        return None
    if r.shape != m.shape or C.shape != (r.shape[0], r.shape[0]):
        return None
    if ld <= 0.0 or not np.isfinite(ld):
        return None
    try:
        centered = r - m
        regularized = C + ld * np.eye(r.shape[0])
        inv = np.linalg.inv(regularized)
        score = float(centered @ inv @ centered)
        if not np.isfinite(score):
            return None
        return score
    except (np.linalg.LinAlgError, OverflowError, ValueError):
        return None
