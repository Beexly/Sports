"""Jensen-Shannon divergence from Lin 1991 IEEE TIT 37:145-151 eq (3.14)/(4.1).

JS(p1, p2; π) = H(π1 p1 + π2 p2) - π1 H(p1) - π2 H(p2), π2=1-π1.
H Shannon entropy. Fail-closed on non-prob, non-finite, length mismatch.
Does not score, mint, or write mind.jsonl. 63d5c908 held.
"""
from __future__ import annotations

import math
from typing import Sequence


def _entropy(p: Sequence[float]) -> float | None:
    try:
        s = 0.0
        for x in p:
            xx = float(x)
            if not math.isfinite(xx) or xx < 0.0:
                return None
            if xx > 0.0:
                s -= xx * math.log(xx)
        return s
    except (TypeError, ValueError, OverflowError):
        return None


def lin_js_divergence(
    p1: Sequence[float] | None,
    p2: Sequence[float] | None,
    pi1: float | None = 0.5,
) -> float | None:
    """Return JS divergence, or None if inputs fail closed."""
    try:
        if p1 is None or p2 is None or pi1 is None:
            return None
        if len(p1) != len(p2) or len(p1) == 0:
            return None
        a = float(pi1)
        if not (0.0 <= a <= 1.0) or not math.isfinite(a):
            return None
        b = 1.0 - a
        h1 = _entropy(p1)
        h2 = _entropy(p2)
        if h1 is None or h2 is None:
            return None
        mix = [a * float(x) + b * float(y) for x, y in zip(p1, p2)]
        hm = _entropy(mix)
        if hm is None:
            return None
        # check sums near 1
        s1 = sum(float(x) for x in p1)
        s2 = sum(float(y) for y in p2)
        if not (0.99 <= s1 <= 1.01 and 0.99 <= s2 <= 1.01):
            return None
        res = hm - a * h1 - b * h2
        if not math.isfinite(res) or res < -1e-9:
            return None
        return max(0.0, res)
    except (TypeError, ValueError, OverflowError):
        return None
