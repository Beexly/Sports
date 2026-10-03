"""Stated ML identity: Intersection over Union (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite GIoU/DIoU/CIoU, Jaccard (set form), FFN, PE, Attention,
AdaMax, Adam α_t/m̂/v̂, or grok_eq_adam.

Source:
- Rezatofighi, H., Tsoi, N., Gwak, J., Sadeghian, A., Reid, I., & Savarese, S.,
  "Generalized Intersection over Union: A Metric and A Loss for Bounding Box
  Regression," IEEE/CVF CVPR 2019 / arXiv:1902.09630.
  https://arxiv.org/pdf/1902.09630
  PDF §3 (printed): IoU = |A ∩ B| / |A ∪ B|.
  Caller supplies intersection I = |A∩B| and union U = |A∪B|.
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


def intersection_over_union(
    intersection: object,
    union: object,
) -> float | None:
    """IoU = I / U (Rezatofighi et al. 2019, §3).

    Missing → null. Non-finite → null.
    I < 0, U ≤ 0, or I > U → null.
    """
    i = _as_finite(intersection)
    u = _as_finite(union)
    if i is None or u is None:
        return None
    if i < 0.0 or u <= 0.0 or i > u:
        return None
    return i / u


COLUMN_BACKED_FUNCS: Sequence[str] = ("intersection_over_union",)
