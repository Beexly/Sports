"""Predictive mutual information as printed in arXiv:2611.04066 eq (8).

MI_n = H(p_tilde_n) - (1/M) sum_m H(p_tilde_n^{(m)})
where H(p) = -sum_c p_c log p_c
Returns the MI value, or None on invalid input.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def _entropy(probs: Sequence[float]) -> float | None:
    if not probs:
        return None
    h = 0.0
    total = 0.0
    for p in probs:
        if not math.isfinite(p) or p < 0.0:
            return None
        total += p
        if p > 0.0:
            h -= p * math.log(p)
    if not math.isfinite(h) or abs(total - 1.0) > 1e-6:
        return None
    return h


def glocal_mi_score(mean_probs: Sequence[float] | None, individual_probs: Sequence[Sequence[float]] | None) -> float | None:
    """Compute MI from mean predictive distribution and MC dropout realizations."""
    if mean_probs is None or individual_probs is None or len(individual_probs) == 0:
        return None
    h_mean = _entropy(mean_probs)
    if h_mean is None:
        return None
    sum_h = 0.0
    for probs in individual_probs:
        h = _entropy(probs)
        if h is None:
            return None
        sum_h += h
    mi = h_mean - (sum_h / len(individual_probs))
    if not math.isfinite(mi):
        return None
    return mi
