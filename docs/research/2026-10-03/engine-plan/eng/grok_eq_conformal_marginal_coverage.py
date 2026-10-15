"""Marginal coverage bound as printed in Angelopoulos, Barber, Bates arXiv:2411.11824 eq (1.1).

P(Y_{n+1} in C(X_{n+1})) >= 1 - alpha for alpha in (0,1).
Returns the lower bound 1-alpha; invalid alpha or math failure -> None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def conformal_marginal_coverage_bound(alpha: float | None) -> float | None:
    if alpha is None:
        return None
    a = float(alpha)
    if not (0.0 < a < 1.0) or not math.isfinite(a):
        return None
    return 1.0 - a
