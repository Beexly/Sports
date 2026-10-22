"""Jensen-Shannon divergence as printed in Lin 1991 IEEE TIT 37:145-151.

JS(p, q) = H((p + q)/2) - 0.5 * (H(p) + H(q))
where H is the Shannon entropy.
Missing inputs, non-probability vectors, or zero-sum → null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations
import math
from typing import Sequence


def _entropy(probs: Sequence[float]) -> float | None:
    s = 0.0
    total = 0.0
    for p in probs:
        if p is None or p < 0.0:
            return None
        total += p
        if p > 0.0:
            s -= p * math.log(p)
    if abs(total - 1.0) > 1e-6:
        return None
    return s


def jensen_shannon_divergence(p: Sequence[float] | None, q: Sequence[float] | None) -> float | None:
    if p is None or q is None:
        return None
    if len(p) != len(q) or len(p) == 0:
        return None
    hp = _entropy(p)
    hq = _entropy(q)
    if hp is None or hq is None:
        return None
    mid = [(a + b) / 2.0 for a, b in zip(p, q)]
    hm = _entropy(mid)
    if hm is None:
        return None
    return hm - 0.5 * (hp + hq)
