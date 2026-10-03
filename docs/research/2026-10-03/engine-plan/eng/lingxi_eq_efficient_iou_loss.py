"""Printed Efficient IoU loss (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not IoU, not LIoU=1−IoU alone, not GIoU/DIoU/CIoU, not residual_add,
not Attention/FFN/PE/lrate/embedding_scale/head_dim, not AdaMax/Adam.

Zhang, Y.-F., Ren, W., Zhang, Z., Jia, Z., Wang, L., & Tan, T.,
"Focal and Efficient IOU Loss for Accurate Bounding Box Regression,"
Neurocomputing / arXiv:2101.08158, §3.2 The Proposed Method,
PDF page 3, Eq. (7):

    L_EIoU = L_IoU + L_dis + L_asp
           = 1 − IoU
             + ρ²(b, b^{gt}) / ((w_c)² + (h_c)²)
             + ρ²(w, w^{gt}) / (w_c)²
             + ρ²(h, h^{gt}) / (h_c)²

where w_c, h_c are width and height of the smallest enclosing box.
Caller supplies IoU ∈ [0,1], squared center distance ≥0, squared
width/height diffs ≥0, and positive enclose width² and height².
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


def efficient_iou_loss(
    iou: object,
    center_dist_sq: object,
    enclose_w_sq: object,
    enclose_h_sq: object,
    width_diff_sq: object,
    height_diff_sq: object,
) -> float | None:
    """L_EIoU = 1−IoU + ρ²(b)/((wc)²+(hc)²) + ρ²(w)/(wc)² + ρ²(h)/(hc)².

    Zhang et al. arXiv:2101.08158 Eq. (7), PDF page 3.
    Missing / non-finite → null. IoU outside [0,1] → null.
    Any squared distance < 0 → null. enclose_w_sq or enclose_h_sq ≤ 0 → null.
    """
    ii = _as_finite(iou)
    dd = _as_finite(center_dist_sq)
    wc2 = _as_finite(enclose_w_sq)
    hc2 = _as_finite(enclose_h_sq)
    dw2 = _as_finite(width_diff_sq)
    dh2 = _as_finite(height_diff_sq)
    if None in (ii, dd, wc2, hc2, dw2, dh2):
        return None
    assert ii is not None and dd is not None and wc2 is not None
    assert hc2 is not None and dw2 is not None and dh2 is not None
    if ii < 0.0 or ii > 1.0:
        return None
    if dd < 0.0 or dw2 < 0.0 or dh2 < 0.0:
        return None
    if wc2 <= 0.0 or hc2 <= 0.0:
        return None
    c2 = wc2 + hc2
    if c2 <= 0.0:
        return None
    out = (1.0 - ii) + (dd / c2) + (dw2 / wc2) + (dh2 / hc2)
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("efficient_iou_loss",)
