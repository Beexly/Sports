"""log_softmax(z)_i = z_i − log Σ_j exp(z_j) (Goodfellow et al. 2016).

Printed in Deep Learning §6.2.2.2 (softargmax / log-domain form of softmax).
Numerically via max-shift: z_i − m − log Σ exp(z_j − m), m = max z.
One function returns the full vector. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("log_softmax",)


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


def log_softmax(z: object) -> list[float] | None:
    """log_softmax(z)_i = z_i − log Σ_j exp(z_j) (Goodfellow §6.2.2.2).

    z: non-empty sequence of finite logits. Missing / empty / non-finite → null.
    """
    if not isinstance(z, (list, tuple)) or len(z) == 0:
        return None
    vals: list[float] = []
    for item in z:
        v = _as_finite(item)
        if v is None:
            return None
        vals.append(v)
    m = max(vals)
    # sum exp(z_j - m)
    s = 0.0
    for v in vals:
        s += math.exp(v - m)
    if s <= 0.0 or not math.isfinite(s):
        return None
    log_s = math.log(s)
    out: list[float] = []
    for v in vals:
        li = v - m - log_s
        if not math.isfinite(li):
            return None
        out.append(li)
    return out
