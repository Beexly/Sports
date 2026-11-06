"""Conformal marginal coverage guarantee as printed in arXiv:2611.06320 eq (1).

P(Y0 in Q(X0)) >= 1 - gamma.
Returns True if observed_prob >= 1-gamma, False otherwise, None on invalid input.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def conformal_coverage_guarantee(observed_prob: float | None, gamma: float | None) -> bool | None:
    if observed_prob is None or gamma is None:
        return None
    try:
        p = float(observed_prob)
        g = float(gamma)
        if not math.isfinite(p) or not math.isfinite(g):
            return None
        if not (0.0 <= p <= 1.0 and 0.0 < g < 1.0):
            return None
        return p >= (1.0 - g)
    except (ValueError, TypeError):
        return None
