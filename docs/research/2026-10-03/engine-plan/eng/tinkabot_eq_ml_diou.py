"""Stated ML identity: Distance-IoU (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Zheng, Z., Wang, P., Liu, W., Li, J., Ye, R. & Ren, D., "Distance-IoU Loss:
  Faster and Better Learning for Bounding Box Regression," AAAI 2020 /
  arXiv:1911.08287, Eq. (6):
  DIoU = IoU − ρ²(b, b^{gt}) / c²,
  where ρ is the Euclidean distance between box centers and c is the
  diagonal length of the smallest enclosing box. Caller supplies IoU ∈ [0,1],
  squared center distance d²≥0, and squared enclose diagonal c²>0.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def distance_iou(
    iou: float | None,
    center_dist_sq: float | None,
    enclose_diag_sq: float | None,
) -> float | None:
    """DIoU = IoU − d²/c² (Zheng et al. AAAI 2020 Eq. 6).

    Missing → null. IoU not in [0,1] → null. d² < 0 → null. c² ≤ 0 → null.
    """
    if iou is None or center_dist_sq is None or enclose_diag_sq is None:
        return None
    ii = float(iou)
    dd = float(center_dist_sq)
    cc = float(enclose_diag_sq)
    if ii < 0.0 or ii > 1.0:
        return None
    if dd < 0.0:
        return None
    if cc <= 0.0:
        return None
    return ii - dd / cc


COLUMN_BACKED_FUNCS: Sequence[str] = ("distance_iou",)
