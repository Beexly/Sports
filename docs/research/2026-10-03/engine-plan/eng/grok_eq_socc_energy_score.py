"""Energy score for multivariate ensemble from arXiv:2610.24591.

Printed equation in Section 3:
ES(F_K, y) = (1/K) sum_k ||f_k - y|| - (1/(2 K^2)) sum_k sum_ell ||f_k - f_ell||
with Euclidean norm. Missing or invalid ensembles/observation, dimension mismatch, or math failure -> null.
Does not score, mint, or write mind.jsonl.
Source: Mária Lakatos, Score-optimized copula coupling for multivariate ensemble post-processing,
arXiv:2610.24591v2, https://arxiv.org/html/2610.24591v2
Opened 2026-11-06. Picks settled stay 0.
Jensen-Shannon 63d5c908 stays held.
"""
from __future__ import annotations

import math
from typing import Any, Sequence


def _finite(x: Any) -> float | None:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v):
        return None
    return v


def _euclid(a: Sequence[Any], b: Sequence[Any]) -> float | None:
    if not isinstance(a, (list, tuple)) or not isinstance(b, (list, tuple)):
        return None
    if len(a) != len(b) or len(a) == 0:
        return None
    acc = 0.0
    try:
        for x, y in zip(a, b):
            fx = _finite(x)
            fy = _finite(y)
            if fx is None or fy is None:
                return None
            d = fx - fy
            acc += d * d
        if not math.isfinite(acc) or acc < 0.0:
            return None
        return math.sqrt(acc)
    except (ValueError, OverflowError):
        return None


def socc_energy_score(ensemble: Sequence[Any], observation: Sequence[Any]) -> float | None:
    """Apply printed ES. Fail closed on invalid."""
    if not isinstance(ensemble, (list, tuple)) or len(ensemble) == 0:
        return None
    if not isinstance(observation, (list, tuple)) or len(observation) == 0:
        return None
    K = len(ensemble)
    dims = len(observation)
    # validate all members same dim and finite
    for member in ensemble:
        if not isinstance(member, (list, tuple)) or len(member) != dims:
            return None
        for v in member:
            if _finite(v) is None:
                return None
    for v in observation:
        if _finite(v) is None:
            return None
    try:
        first = 0.0
        for fk in ensemble:
            dist = _euclid(fk, observation)
            if dist is None:
                return None
            first += dist
        first /= K
        second = 0.0
        for fk in ensemble:
            for fell in ensemble:
                dist = _euclid(fk, fell)
                if dist is None:
                    return None
                second += dist
        second /= (2.0 * K * K)
        res = first - second
        if not math.isfinite(res):
            return None
        return res
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
