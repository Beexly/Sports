"""Printed Focal-EIoU loss (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not L_EIoU alone, not IoU, not LIoU=1−IoU, not GIoU/DIoU/CIoU,
not binary focal_loss FL=−(1−p_t)^γ log(p_t), not residual/dropout,
not Attention/FFN/PE/lrate/embedding_scale/head_dim, not AdaMax/Adam.

Zhang, Y.-F., Ren, W., Zhang, Z., Jia, Z., Wang, L., & Tan, T.,
"Focal and Efficient IOU Loss for Accurate Bounding Box Regression,"
Neurocomputing / arXiv:2101.08158, §4.2 Focal-EIOU Loss,
PDF page 5, Eq. (10):

    L_Focal-EIoU = IoU^γ · L_EIoU

where IoU = |A ∩ B| / |A ∪ B| and γ controls outlier inhibition.
Caller supplies IoU ∈ [0,1], a finite L_EIoU value, and γ ≥ 0.
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


def focal_efficient_iou_loss(
    iou: object,
    efficient_iou_loss: object,
    gamma: object,
) -> float | None:
    """L_Focal-EIoU = IoU^γ · L_EIoU (Zhang et al. arXiv:2101.08158 Eq. 10).

    Missing / non-finite → null. IoU outside [0,1] → null. γ < 0 → null.
    """
    ii = _as_finite(iou)
    leiou = _as_finite(efficient_iou_loss)
    gg = _as_finite(gamma)
    if ii is None or leiou is None or gg is None:
        return None
    if ii < 0.0 or ii > 1.0:
        return None
    if gg < 0.0:
        return None
    # 0^0 → treat as 1 for the printed product when γ=0 (IoU^0 = 1).
    weight = 1.0 if gg == 0.0 else (ii ** gg)
    out = weight * leiou
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("focal_efficient_iou_loss",)
