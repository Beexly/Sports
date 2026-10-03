"""Soft Dice loss L = 1 − 2 Σ p g / (Σ p² + Σ g²) (Milletari et al. 2016).

Printed in V-Net arXiv:1606.04797 Eq. (3) (soft Dice objective as loss).
One scalar over equal-length prediction/ground-truth sequences.
Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("dice_loss",)


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


def dice_loss(p: object, g: object) -> float | None:
    """L_Dice = 1 − 2 Σ p_i g_i / (Σ p_i² + Σ g_i²) (V-Net soft Dice).

    p, g: equal-length non-empty sequences of finite values.
    Denominator zero → null.
    """
    if not isinstance(p, (list, tuple)) or not isinstance(g, (list, tuple)):
        return None
    if len(p) != len(g) or len(p) == 0:
        return None
    num = 0.0
    den_p = 0.0
    den_g = 0.0
    for a, b in zip(p, g):
        pv = _as_finite(a)
        gv = _as_finite(b)
        if pv is None or gv is None:
            return None
        num += pv * gv
        den_p += pv * pv
        den_g += gv * gv
    den = den_p + den_g
    if den == 0.0:
        return None
    dice = 2.0 * num / den
    out = 1.0 - dice
    if not math.isfinite(out):
        return None
    return out
