"""Printed ADADELTA parameter update (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not RMSProp θ←θ−η·g/√(E+ε), not E[g²] accumulation, not Nesterov,
not classical momentum, not Adam/AdaMax. Does not edit grok_eq_adam.

Zeiler, M. D., "ADADELTA: An Adaptive Learning Rate Method,"
arXiv:1212.5701v1, §3.2 / Eq. (14), PDF page 3:

    Δx_t = − (RMS[Δx]_{t−1} / RMS[g]_t) g_t

Caller supplies RMS[Δx]_{t−1}, RMS[g]_t, and g_t (all scalars).
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


def adadelta_update(
    rms_delta: object,
    rms_grad: object,
    grad: object,
) -> float | None:
    """Δx = −(RMS[Δx]/RMS[g]) g (Zeiler arXiv:1212.5701 Eq.14, PDF p.3).

    Missing / non-finite → null. RMS[g] ≤ 0 → null.
    """
    rdx = _as_finite(rms_delta)
    rg = _as_finite(rms_grad)
    g = _as_finite(grad)
    if rdx is None or rg is None or g is None:
        return None
    if rg <= 0.0:
        return None
    out = -(rdx / rg) * g
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("adadelta_update",)