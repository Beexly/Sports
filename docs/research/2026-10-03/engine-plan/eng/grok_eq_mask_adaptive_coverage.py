"""Mask-adaptive coverage bound as printed in arXiv:2611.01724 eq (1).

P(Y in C_hat | Cond) >= 1 - alpha - epsilon(Cond).
Returns True if coverage_prob >= 1 - alpha - epsilon, else False. Missing, invalid -> None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def mask_adaptive_coverage(coverage_prob: float | None, alpha: float | None, epsilon: float | None) -> bool | None:
    if coverage_prob is None or alpha is None or epsilon is None:
        return None
    try:
        p = float(coverage_prob)
        a = float(alpha)
        e = float(epsilon)
        if not all(math.isfinite(x) for x in (p, a, e)):
            return None
        if not (0.0 <= p <= 1.0 and 0.0 < a < 1.0 and e >= 0.0):
            return None
        return p >= 1.0 - a - e
    except (TypeError, ValueError, OverflowError):
        return None
