"""Copula+CACP marginal coverage guarantee as printed in arXiv:2602.02583 eq (4).

P(x0,tau in C~^alpha_0,tau) >= 1 - alpha.
Returns True if observed_prob >= 1-alpha, False otherwise, None on invalid input.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def copula_cacp_coverage_guarantee(observed_prob: float | None, alpha: float | None) -> bool | None:
    if observed_prob is None or alpha is None:
        return None
    try:
        p = float(observed_prob)
        a = float(alpha)
        if not math.isfinite(p) or not math.isfinite(a):
            return None
        if not (0.0 <= p <= 1.0 and 0.0 < a < 1.0):
            return None
        return p >= (1.0 - a)
    except (ValueError, TypeError):
        return None
