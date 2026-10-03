"""Printed Pearson χ² f-divergence (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not Hellinger, not KL, not Jensen–Shannon, not InfoNCE,
not GIoU/AdaDelta. Does not edit grok_eq_adam.
Not Pearson product-moment correlation.

Nowozin, C., Cseke, B., & Tomioka, R.,
"f-GAN: Training Generative Neural Samplers using Variational
Divergence Minimization," NIPS 2016 / arXiv:1606.00709,
Table 1 (Pearson χ²), PDF page 3:

    D_{χ²}(P ‖ Q) = ∫ (q(x) − p(x))² / p(x) dx

For discrete shared support (equal-length sequences):

    Σ_i (q_i − p_i)² / p_i    (p_i > 0 required).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def _as_finite(value: object) -> float | None:
    if value is None or isinstance(value, (str, bytes, bool)):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def pearson_chi_squared(p: object, q: object) -> float | None:
    """D_χ² = Σ (q_i − p_i)² / p_i (Nowozin et al. arXiv:1606.00709 Table 1, PDF p.3).

    Missing / non-finite, length mismatch, empty, or any p_i ≤ 0 → null.
    """
    if not isinstance(p, (list, tuple)) or not isinstance(q, (list, tuple)):
        return None
    if len(p) == 0 or len(p) != len(q):
        return None
    total = 0.0
    for pi, qi in zip(p, q):
        a = _as_finite(pi)
        b = _as_finite(qi)
        if a is None or b is None:
            return None
        if a <= 0.0:
            return None
        diff = b - a
        total += (diff * diff) / a
    if not math.isfinite(total):
        return None
    return total


COLUMN_BACKED_FUNCS: Sequence[str] = ("pearson_chi_squared",)