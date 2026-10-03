"""Printed squared Hellinger distance (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not KL, not Jensen–Shannon, not AdaDelta/RMSProp/Nesterov,
not GIoU/IoU family. Does not edit grok_eq_adam.

Nowozin, C., Cseke, B., & Tomioka, R.,
"f-GAN: Training Generative Neural Samplers using Variational
Divergence Minimization," NIPS 2016 / arXiv:1606.00709,
Table 1 (Squared Hellinger), PDF page 3.

For discrete distributions on a shared finite support (caller-normalized
non-negative masses p, q of equal length):

    H²(p, q) = (1/2) Σ_i (√p_i − √q_i)²

which equals 1 − Σ_i √(p_i q_i) when Σ p = Σ q = 1.
This module returns the (1/2)Σ(√p−√q)² form.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


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


def hellinger_squared(p: object, q: object) -> float | None:
    """H² = (1/2) Σ (√p_i − √q_i)² (Nowozin et al. arXiv:1606.00709 Table 1, PDF p.3).

    Missing / non-finite / negative mass, length mismatch, or empty → null.
    """
    if not isinstance(p, (list, tuple)) or not isinstance(q, (list, tuple)):
        return None
    if len(p) == 0 or len(p) != len(q):
        return None
    total = 0.0
    for pi, qi in zip(p, q):
        a = _as_finite_nonneg(pi)
        b = _as_finite_nonneg(qi)
        if a is None or b is None:
            return None
        diff = math.sqrt(a) - math.sqrt(b)
        total += diff * diff
    out = 0.5 * total
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("hellinger_squared",)