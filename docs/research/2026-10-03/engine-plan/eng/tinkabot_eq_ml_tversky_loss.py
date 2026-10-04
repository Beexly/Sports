"""Tversky loss L = 1 − TP / (TP + α FN + β FP) (Salehi et al. 2017).

Printed in Tversky loss paper arXiv:1706.05721 soft form over sequences.
α, β ≥ 0 finite. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("tversky_loss",)


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


def tversky_loss(p: object, g: object, alpha: object = 0.5, beta: object = 0.5) -> float | None:
    """L = 1 − TP / (TP + α FN + β FP).

    Soft: TP=Σ p g, FN=Σ (1−p) g, FP=Σ p (1−g) over equal-length sequences.
    Denominator zero → null. α, β must be finite and ≥ 0.
    """
    if not isinstance(p, (list, tuple)) or not isinstance(g, (list, tuple)):
        return None
    if len(p) != len(g) or len(p) == 0:
        return None
    a = _as_finite(alpha)
    b = _as_finite(beta)
    if a is None or b is None or a < 0.0 or b < 0.0:
        return None
    tp = 0.0
    fn = 0.0
    fp = 0.0
    for pv_raw, gv_raw in zip(p, g):
        pv = _as_finite(pv_raw)
        gv = _as_finite(gv_raw)
        if pv is None or gv is None:
            return None
        tp += pv * gv
        fn += (1.0 - pv) * gv
        fp += pv * (1.0 - gv)
    den = tp + a * fn + b * fp
    if den == 0.0:
        return None
    out = 1.0 - (tp / den)
    if not math.isfinite(out):
        return None
    return out
