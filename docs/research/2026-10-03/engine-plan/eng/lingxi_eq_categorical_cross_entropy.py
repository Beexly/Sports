"""Printed non-sports identity: categorical cross-entropy (lingxi lane).

One function. Not sports. No I/O. Does not score or mint.

Book:
Cover, T. M. and Thomas, J. A. (2006). Elements of Information Theory,
2nd edition. Wiley. Cross-entropy
  H(p, q) = - sum_i p_i log q_i
Natural log (nats). No change-of-base constant. A positive p_i with
q_i <= 0 returns null. A zero p_i contributes 0.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def categorical_cross_entropy(
    p: Sequence[float] | None,
    q: Sequence[float] | None,
) -> float | None:
    """H(p, q) = -sum_i p_i * log(q_i)."""
    if p is None or q is None:
        return None
    if len(p) == 0 or len(p) != len(q):
        return None
    total = 0.0
    for p_raw, q_raw in zip(p, q):
        if p_raw is None or q_raw is None:
            return None
        pp = float(p_raw)
        qq = float(q_raw)
        if not math.isfinite(pp) or not math.isfinite(qq) or pp < 0.0:
            return None
        if pp == 0.0:
            continue
        if qq <= 0.0:
            return None
        total += pp * math.log(qq)
    return -total


COLUMN_BACKED_FUNCS: Sequence[str] = ("categorical_cross_entropy",)