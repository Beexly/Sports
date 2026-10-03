"""Stated ML identity: IoU loss LIoU=1−IoU (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite intersection_over_union, GIoU/DIoU/CIoU, residual_add,
FFN, PE, Attention, AdaMax, Adam α_t, or grok_eq_adam.

Source:
- Rezatofighi, H., Tsoi, N., Gwak, J., Sadeghian, A., Reid, I., & Savarese, S.,
  "Generalized Intersection over Union: A Metric and A Loss for Bounding Box
  Regression," IEEE/CVF CVPR 2019 / arXiv:1902.09630.
  https://arxiv.org/pdf/1902.09630
  PDF §3 (printed): LIoU = 1 − IoU (IoU as a distance / loss).
  Caller supplies IoU ∈ [0, 1].
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


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


def iou_loss(iou: object) -> float | None:
    """LIoU = 1 − IoU (Rezatofighi et al. 2019, §3).

    Missing → null. Non-finite → null.
    IoU outside [0, 1] → null.
    """
    v = _as_finite(iou)
    if v is None:
        return None
    if v < 0.0 or v > 1.0:
        return None
    return 1.0 - v


COLUMN_BACKED_FUNCS: Sequence[str] = ("iou_loss",)
