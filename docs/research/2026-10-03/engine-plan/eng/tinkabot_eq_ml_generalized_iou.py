"""Generalized IoU (Rezatofighi et al. CVPR 2019).

Printed in arXiv:1902.09630 Alg. 1 / §3 PDF:
  GIoU = IoU − |C − (A ∪ B)| / |C|
Caller supplies IoU ∈ [0, 1] and the empty-enclosure ratio
r = |C − (A ∪ B)| / |C| ∈ [0, 1]. One function. Not LIoU.
Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("generalized_iou",)


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


def generalized_iou(iou: object, enclosure_empty_ratio: object) -> float | None:
    """GIoU = IoU − |C−(A∪B)|/|C| (Rezatofighi et al. 2019 Alg. 1).

    Missing / non-finite → null. IoU or r outside [0, 1] → null.
    """
    i = _as_finite(iou)
    r = _as_finite(enclosure_empty_ratio)
    if i is None or r is None:
        return None
    if i < 0.0 or i > 1.0 or r < 0.0 or r > 1.0:
        return None
    out = i - r
    if not math.isfinite(out):
        return None
    return out
