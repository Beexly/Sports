"""Stated ML identity: Complete IoU loss (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite matthews_corrcoef, equal-weight JS, Herbrich margin ranking,
or distance_iou.

Source:
- Zheng, Z., Wang, P., Liu, W., Li, J., Ye, R. & Ren, D., "Distance-IoU Loss:
  Faster and Better Learning for Bounding Box Regression," AAAI 2020 /
  arXiv:1911.08287, https://arxiv.org/pdf/1911.08287
  Anthology/arXiv PDF page 4, Eq. (9), (10), and (11):
  v = (4/π²) (arctan(w^{gt}/h^{gt}) − arctan(w/h))²,
  α = v / ((1 − IoU) + v),
  L_CIoU = 1 − IoU + ρ²(b, b^{gt}) / c² + α v.
  Caller supplies IoU ∈ [0,1], squared center distance ρ² ≥ 0, squared
  enclosing diagonal c² > 0, and positive widths and heights.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def complete_iou_loss(
    iou: float | None,
    center_dist_sq: float | None,
    enclose_diag_sq: float | None,
    width: float | None,
    height: float | None,
    gt_width: float | None,
    gt_height: float | None,
) -> float | None:
    """L_CIoU = 1 − IoU + ρ²/c² + α v (Zheng et al. arXiv:1911.08287 Eq. 10).

    v and α are the printed Eq. (9) and Eq. (11) on the same page.
    Missing → null. IoU not in [0,1] → null. ρ² < 0 or c² ≤ 0 → null.
    Non-positive width or height → null. When (1−IoU)+v = 0, the αv term is 0.
    """
    if (
        iou is None
        or center_dist_sq is None
        or enclose_diag_sq is None
        or width is None
        or height is None
        or gt_width is None
        or gt_height is None
    ):
        return None
    try:
        ii = float(iou)
        dd = float(center_dist_sq)
        cc = float(enclose_diag_sq)
        w = float(width)
        h = float(height)
        wg = float(gt_width)
        hg = float(gt_height)
    except (TypeError, ValueError):
        return None
    if not all(math.isfinite(x) for x in (ii, dd, cc, w, h, wg, hg)):
        return None
    if ii < 0.0 or ii > 1.0 or dd < 0.0 or cc <= 0.0:
        return None
    if w <= 0.0 or h <= 0.0 or wg <= 0.0 or hg <= 0.0:
        return None
    # Eq. (9)
    v = (4.0 / (math.pi ** 2)) * (
        math.atan(wg / hg) - math.atan(w / h)
    ) ** 2
    # Eq. (11); αv is 0 when the printed denominator vanishes (IoU=1 and v=0).
    denom = (1.0 - ii) + v
    alpha_v = 0.0 if denom <= 0.0 else (v / denom) * v
    # Eq. (10)
    return (1.0 - ii) + (dd / cc) + alpha_v


COLUMN_BACKED_FUNCS: Sequence[str] = ("complete_iou_loss",)
