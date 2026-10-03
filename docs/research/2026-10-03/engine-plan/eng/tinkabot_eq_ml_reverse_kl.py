"""Reverse KL divergence (Nowozin et al. f-GAN / arXiv:1606.00709).

Printed Table 1 PDF p.3 (Reverse KL):
  D_{KL}(Q ‖ P) = Σ_i q_i log(q_i / p_i)
Discrete equal-length non-negative masses. Not Hellinger, not JS.
Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("reverse_kl",)


def _as_finite_nonneg(value: object) -> float | None:
    if value is None or isinstance(value, (str, bytes, bool)):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number) or number < 0.0:
        return None
    return number


def reverse_kl(q: object, p: object) -> float | None:
    """D_KL(Q‖P) = Σ q_i log(q_i/p_i) (Nowozin et al. Table 1 Reverse KL).

    Missing / non-finite / negative, length mismatch, or empty → null.
    q_i>0 with p_i=0 → null. q_i=0 contributes 0.
    """
    if not isinstance(q, (list, tuple)) or not isinstance(p, (list, tuple)):
        return None
    if len(q) == 0 or len(q) != len(p):
        return None
    total = 0.0
    for qi, pi in zip(q, p):
        a = _as_finite_nonneg(qi)
        b = _as_finite_nonneg(pi)
        if a is None or b is None:
            return None
        if a == 0.0:
            continue
        if b == 0.0:
            return None
        total += a * math.log(a / b)
    if not math.isfinite(total):
        return None
    return total
