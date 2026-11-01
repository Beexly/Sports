"""Two-sided marginal coverage bound as printed in Angelopoulos & Bates arXiv:2107.07511 eq (1).

1 - alpha <= P(Y_test in C(X_test)) <= 1 - alpha + 1/(n+1)
Returns the upper bound 1 - alpha + 1/(n+1); invalid inputs or math failure -> None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def conformal_two_sided_coverage_upper(alpha: float | None, n: int | None) -> float | None:
    if alpha is None or n is None:
        return None
    try:
        a = float(alpha)
        nn = int(n)
    except (TypeError, ValueError):
        return None
    if not (0.0 < a < 1.0) or not math.isfinite(a) or nn < 1:
        return None
    upper = 1.0 - a + 1.0 / (nn + 1)
    if not math.isfinite(upper) or upper <= 1.0 - a:
        return None
    return upper
