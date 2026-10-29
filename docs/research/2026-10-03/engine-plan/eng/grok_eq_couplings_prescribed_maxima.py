"""Guarded couplings-prescribed-maxima measure inequality from Ansari arXiv:2610.30642 printed eq (2).

G(t) - G(s) <= sum_{i=1}^d (F_i(t) - F_i(s)) for all s < t

Returns the excess: (G_t - G_s) - sum(F_diffs). Negative or zero means inequality holds.
Fail-closed on invalid inputs: missing, non-finite, s >= t, empty diffs, negative lengths.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def couplings_prescribed_maxima_excess(
    g_t: float | None,
    g_s: float | None,
    f_diffs: Sequence[float] | None,
    s: float | None = None,
    t: float | None = None,
) -> float | None:
    if g_t is None or g_s is None or f_diffs is None:
        return None
    try:
        gt = float(g_t)
        gs = float(g_s)
        if not (math.isfinite(gt) and math.isfinite(gs)):
            return None
        diffs = [float(d) for d in f_diffs]
        if not diffs or not all(math.isfinite(d) for d in diffs):
            return None
        if any(d < 0.0 for d in diffs):
            return None
        if s is not None and t is not None:
            ss = float(s)
            tt = float(t)
            if not (math.isfinite(ss) and math.isfinite(tt)) or ss >= tt:
                return None
        excess = (gt - gs) - sum(diffs)
        return excess
    except (TypeError, ValueError, OverflowError):
        return None
