"""Moment-calibrated conformal quantile from Wang et al. arXiv:2610.15268.

Printed weighted empirical CDF and quantile:
F_w(q) = sum w_i * 1(S_i <= q)
q_alpha = inf { q : F_w(q) >= (n+1)(1-alpha)/n }

Fail-closed: invalid inputs return None.
"""
from __future__ import annotations

import math
from typing import Optional, Sequence


def moment_calibrated_quantile(
    scores: object,
    weights: object,
    alpha: object,
) -> Optional[float]:
    """Guarded weighted empirical quantile for moment-calibrated CP."""
    try:
        if not isinstance(scores, (list, tuple)) or not isinstance(weights, (list, tuple)):
            return None
        if len(scores) != len(weights) or len(scores) == 0:
            return None
        n = len(scores)
        a = float(alpha)
        if not (math.isfinite(a) and 0.0 < a < 1.0):
            return None
        level = (n + 1) * (1.0 - a) / n
        if not (0.0 < level <= 1.0 + 1.0 / n):
            return None
        pairs = []
        wsum = 0.0
        for s, w in zip(scores, weights):
            sv = float(s)
            wv = float(w)
            if not (math.isfinite(sv) and math.isfinite(wv) and wv >= 0.0):
                return None
            pairs.append((sv, wv))
            wsum += wv
        if not math.isfinite(wsum) or abs(wsum - 1.0) > 1e-6:
            return None
        pairs.sort(key=lambda t: t[0])
        cum = 0.0
        for sv, wv in pairs:
            cum += wv
            if cum >= level - 1e-12:
                return sv
        return float("inf")
    except (TypeError, ValueError, OverflowError):
        return None
