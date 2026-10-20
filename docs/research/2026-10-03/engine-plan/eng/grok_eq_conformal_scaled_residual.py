"""Guarded scaled residual nonconformity score from Angelopoulos et al. arXiv:2411.11824.

s(x, y) = |y - \hat{f}(x)| / \hat{\sigma}(x)

Missing, non-numeric, sigma <= 0, or math failure fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def conformal_scaled_residual(y: float | None, y_hat: float | None, sigma: float | None) -> float | None:
    if y is None or y_hat is None or sigma is None:
        return None
    try:
        yy = float(y)
        yh = float(y_hat)
        sg = float(sigma)
        if sg <= 0.0:
            return None
        return abs(yy - yh) / sg
    except (TypeError, ValueError, OverflowError, ZeroDivisionError):
        return None
