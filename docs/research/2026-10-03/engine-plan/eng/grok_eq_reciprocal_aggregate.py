"""Guarded reciprocal aggregate from Liu arXiv:2609.29658 eq (2.1).

Printed: R_w = sum_{i=1}^m w_i / p_i
where w_i >= 0, sum w_i = 1, p_i in (0,1].

Fail-closed on None, non-numeric, non-finite, non-positive p, negative or non-sum-1 weights.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def reciprocal_aggregate(
    weights: Sequence[float] | None,
    ps: Sequence[float] | None,
) -> float | None:
    """Return weighted reciprocal sum; None if invalid."""
    try:
        if weights is None or ps is None:
            return None
        if len(weights) != len(ps) or len(weights) == 0:
            return None
        ws = [float(w) for w in weights]
        ps_ = [float(p) for p in ps]
        if not all(math.isfinite(w) and math.isfinite(p) for w, p in zip(ws, ps_)):
            return None
        if any(w < 0.0 for w in ws):
            return None
        if any(p <= 0.0 or p > 1.0 for p in ps_):
            return None
        s = sum(ws)
        if not math.isclose(s, 1.0, abs_tol=1e-6):
            return None
        return sum(w / p for w, p in zip(ws, ps_))
    except (TypeError, ValueError, OverflowError, ZeroDivisionError):
        return None
