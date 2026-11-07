"""Volume of a generalized hyperrectangle from arXiv:2611.05543.

Printed in Section 3:
Vol(H) = prod_{j=1}^d |H_j|
where |·| denotes Lebesgue measure on R, H = prod H_j a generalized hyperrectangle.
Missing, empty, non-positive, non-finite measures, or math failure -> null.
Does not score, mint, or write mind.jsonl.
Source: Nabil Alami, Souhaib Ben Taieb, Generalized Hyperrectangular Prediction Sets in Multivariate Conformal Prediction,
arXiv:2611.05543v1, https://arxiv.org/pdf/2611.05543v1
Opened 2026-11-07. Picks settled stay 0.
Jensen-Shannon 63d5c908 stays held.
"""
from __future__ import annotations

import math
from typing import Any, Sequence


def _finite_positive(x: Any) -> float | None:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v) or v <= 0.0:
        return None
    return v


def gh_volume(measures: Sequence[Any]) -> float | None:
    """Apply printed product of coordinate Lebesgue measures. Fail closed on invalid."""
    if not isinstance(measures, (list, tuple)) or len(measures) == 0:
        return None
    acc = 1.0
    try:
        for m in measures:
            fm = _finite_positive(m)
            if fm is None:
                return None
            acc *= fm
            if not math.isfinite(acc):
                return None
        return acc
    except (ValueError, OverflowError):
        return None
