"""Conformal prediction set membership from Barber & Tibshirani arXiv:2504.02292 eq (3).

Printed: C(X_{n+1}) = { y : S^y_{n+1} <= Quantile_{1-alpha}(S^y_1, ..., S^y_{n+1}) }
Returns True if in set, False if not; invalid inputs or math failure -> None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Optional, Sequence


def conformal_unified_set_membership(
    s_test: object, scores: object, alpha: object
) -> Optional[bool]:
    """Guarded check of printed set membership inequality."""
    try:
        if not isinstance(scores, (list, tuple)) or len(scores) == 0:
            return None
        st = float(s_test)
        if not math.isfinite(st):
            return None
        a = float(alpha)
        if not (0.0 < a < 1.0) or not math.isfinite(a):
            return None
        sc = [float(s) for s in scores]
        if any(not math.isfinite(x) for x in sc):
            return None
        # Empirical quantile as in printed definition
        n = len(sc)
        sorted_sc = sorted(sc)
        # Quantile level 1-alpha, using the inf definition roughly as ceiling index
        q_idx = min(n - 1, max(0, int(math.ceil((1 - a) * n)) - 1))
        q = sorted_sc[q_idx]
        return st <= q
    except (TypeError, ValueError, OverflowError):
        return None
