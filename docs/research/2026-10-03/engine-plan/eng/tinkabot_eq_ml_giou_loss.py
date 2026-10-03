"""GIoU loss L_GIoU = 1 − GIoU (Rezatofighi et al. CVPR 2019).

Printed in arXiv:1902.09630 §3 PDF property 1:
  L_GIoU = 1 − GIoU
Caller supplies GIoU ∈ [−1, 1]. Paired with generalized_iou (Alg. 1).
Not LIoU. Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("giou_loss",)


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


def giou_loss(giou: object) -> float | None:
    """L_GIoU = 1 − GIoU (Rezatofighi et al. 2019 §3).

    Missing / non-finite → null. GIoU outside [−1, 1] → null.
    """
    v = _as_finite(giou)
    if v is None:
        return None
    if v < -1.0 or v > 1.0:
        return None
    return 1.0 - v
