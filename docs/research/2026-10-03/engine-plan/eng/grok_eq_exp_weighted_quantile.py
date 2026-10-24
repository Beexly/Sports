"""Guarded exponentially weighted empirical quantile as printed in arXiv:2610.27740 eq (3).

\hat{q}_{t,{\rm exp}}=\inf\{r:\sum_{i:R_i\leq r}w_i/\sum_j w_j\geq 1-\alpha\}

Missing, non-numeric, empty, weights <=0, alpha not in (0,1), or math failure fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def exp_weighted_quantile(
    residuals: Sequence[float | None] | None,
    weights: Sequence[float | None] | None,
    alpha: float | None,
) -> float | None:
    if residuals is None or weights is None or alpha is None:
        return None
    try:
        if len(residuals) == 0 or len(residuals) != len(weights):
            return None
        a = float(alpha)
        if not (0.0 < a < 1.0):
            return None
        pairs = []
        total_w = 0.0
        for r, w in zip(residuals, weights):
            if r is None or w is None:
                return None
            rr = float(r)
            ww = float(w)
            if not math.isfinite(rr) or not math.isfinite(ww) or ww <= 0.0:
                return None
            pairs.append((rr, ww))
            total_w += ww
        if total_w <= 0.0:
            return None
        pairs.sort(key=lambda x: x[0])
        thresh = 1.0 - a
        cum = 0.0
        for rr, ww in pairs:
            cum += ww
            if cum / total_w >= thresh:
                return rr
        return pairs[-1][0]
    except (TypeError, ValueError, OverflowError, ZeroDivisionError):
        return None
