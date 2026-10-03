"""Printed Spearman rank correlation on rank differences (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not Pearson product-moment, not Hellinger, not KL/JS/χ²,
not InfoNCE/GIoU/AdaDelta, not Softmax. Does not edit grok_eq_adam.

Spearman, C., "The Proof and Measurement of Association between
Two Things," The American Journal of Psychology, Vol. 15, No. 1
(Jan., 1904), pp. 72–101. Standard textbook form of the rank
correlation (equivalent to Pearson on ranks) with ties absent:

    ρ = 1 − 6 Σ_i d_i² / (n (n² − 1))

where d_i is the difference of ranks for observation i and n is
the number of paired observations. Caller supplies the sequence
of rank differences d (length n ≥ 2).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def _as_finite(value: object) -> float | None:
    if value is None or isinstance(value, (str, bytes, bool)):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def spearman_rho(rank_diffs: object) -> float | None:
    """ρ = 1 − 6 Σ d_i² / (n(n²−1)) (Spearman 1904 rank-diff form).

    Missing / non-finite entries, not a sequence, or n < 2 → null.
    """
    if not isinstance(rank_diffs, (list, tuple)):
        return None
    n = len(rank_diffs)
    if n < 2:
        return None
    sum_sq = 0.0
    for d in rank_diffs:
        v = _as_finite(d)
        if v is None:
            return None
        sum_sq += v * v
    denom = n * (n * n - 1)
    if denom == 0:
        return None
    out = 1.0 - (6.0 * sum_sq) / denom
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("spearman_rho",)