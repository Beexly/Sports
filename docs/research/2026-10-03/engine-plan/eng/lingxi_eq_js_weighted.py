"""Printed weighted Jensen-Shannon divergence (lingxi lane).

Two functions. No I/O. Does not score a slate or mint.
Does not edit the equal-weight file tinkabot_eq_ml_jensen_shannon.py.

Lin, J., "Divergence Measures Based on the Shannon Entropy,"
IEEE Transactions on Information Theory, vol. 37, no. 1, Jan. 1991,
pp. 145-151.

Equation (4.1), PDF page 147, Section IV:
    JS_pi(p1, p2) = H(pi1*p1 + pi2*p2) - pi1*H(p1) - pi2*H(p2)
    with pi1 + pi2 = 1 and pi >= 0.

Equation (5.1), PDF page 149:
    JS_pi(p1, ..., pn) = H(sum_i pi_i p_i) - sum_i pi_i H(p_i)

H is Shannon entropy with the natural log, the same convention as the
equal-weight slice of this paper already on the branch. 0*log 0 is 0.
The equal-weight identity L = 2H((p1+p2)/2) - H(p1) - H(p2) is not
reimplemented here.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"

_SUM_TOL = 1e-9


def _finite(value: float) -> float | None:
    number = float(value)
    if not math.isfinite(number):
        return None
    return number


def _entropy(probs: Sequence[float]) -> float | None:
    total = 0.0
    mass = 0.0
    for raw in probs:
        if raw is None:
            return None
        p = _finite(raw)
        if p is None or p < 0.0 or p > 1.0:
            return None
        mass += p
        if p == 0.0:
            continue
        total -= p * math.log(p)
    if abs(mass - 1.0) > _SUM_TOL:
        return None
    return total


def _weights(weights: Sequence[float]) -> list[float] | None:
    parsed: list[float] = []
    mass = 0.0
    for raw in weights:
        if raw is None:
            return None
        weight = _finite(raw)
        if weight is None or weight < 0.0:
            return None
        parsed.append(weight)
        mass += weight
    if not parsed or abs(mass - 1.0) > _SUM_TOL:
        return None
    return parsed


def js_pi(
    p1: Sequence[float] | None,
    p2: Sequence[float] | None,
    pi1: float | None,
    pi2: float | None,
) -> float | None:
    """Equation (4.1), Lin 1991 PDF page 147. Natural log."""
    if p1 is None or p2 is None or pi1 is None or pi2 is None:
        return None
    if len(p1) == 0 or len(p1) != len(p2):
        return None
    weights = _weights((pi1, pi2))
    if weights is None:
        return None
    h1 = _entropy(p1)
    h2 = _entropy(p2)
    if h1 is None or h2 is None:
        return None
    mixture = [
        weights[0] * float(a) + weights[1] * float(b) for a, b in zip(p1, p2)
    ]
    hm = _entropy(mixture)
    if hm is None:
        return None
    return hm - weights[0] * h1 - weights[1] * h2


def js_pi_n(
    distributions: Sequence[Sequence[float]] | None,
    weights: Sequence[float] | None,
) -> float | None:
    """Equation (5.1), Lin 1991 PDF page 149. Natural log."""
    if distributions is None or weights is None:
        return None
    parsed = _weights(weights)
    if parsed is None or len(parsed) != len(distributions) or len(parsed) < 2:
        return None
    width: int | None = None
    entropies: list[float] = []
    rows: list[list[float]] = []
    for dist in distributions:
        if dist is None or len(dist) == 0:
            return None
        if width is None:
            width = len(dist)
        elif len(dist) != width:
            return None
        h = _entropy(dist)
        if h is None:
            return None
        entropies.append(h)
        rows.append([float(item) for item in dist])
    mixture = [0.0] * width
    for weight, row in zip(parsed, rows):
        for index, mass in enumerate(row):
            mixture[index] += weight * mass
    hm = _entropy(mixture)
    if hm is None:
        return None
    return hm - sum(weight * entropy for weight, entropy in zip(parsed, entropies))


COLUMN_BACKED_FUNCS = ("js_pi", "js_pi_n")