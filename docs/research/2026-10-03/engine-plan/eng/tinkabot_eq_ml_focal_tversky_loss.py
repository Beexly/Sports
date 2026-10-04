"""Focal Tversky loss FTL = (1 − TI)^γ (Abraham et al. 2018).

Printed in arXiv:1810.07842. TI = TP / (TP + α FN + β FP) soft form.
γ ≥ 0 finite. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("focal_tversky_loss",)


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


def focal_tversky_loss(
    p: object,
    g: object,
    alpha: object = 0.7,
    beta: object = 0.3,
    gamma: object = 4.0 / 3.0,
) -> float | None:
    """FTL = (1 − TI)^γ with TI = TP / (TP + α FN + β FP).

    Soft: TP=Σ p g, FN=Σ (1−p) g, FP=Σ p (1−g).
    Denominator zero → null. α, β, γ finite; α, β ≥ 0; γ ≥ 0.
    """
    if not isinstance(p, (list, tuple)) or not isinstance(g, (list, tuple)):
        return None
    if len(p) != len(g) or len(p) == 0:
        return None
    a = _as_finite(alpha)
    b = _as_finite(beta)
    gam = _as_finite(gamma)
    if a is None or b is None or gam is None:
        return None
    if a < 0.0 or b < 0.0 or gam < 0.0:
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
    ti = tp / den
    out = (1.0 - ti) ** gam
    if not math.isfinite(out):
        return None
    return out
