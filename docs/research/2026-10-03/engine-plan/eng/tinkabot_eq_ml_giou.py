"""Stated ML identity: Generalized IoU (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Rezatofighi, H., Tsoi, N., Gwak, J., Sadeghian, A., Reid, I. & Savarese, S.,
  "Generalized Intersection over Union: A Metric and A Loss for Bounding Box
  Regression," IEEE/CVF CVPR 2019 / arXiv:1902.09630, Eqs. (5)–(7):
  IoU = |A∩B|/|A∪B|,
  GIoU = IoU − |C \\ (A∪B)| / |C|,
  with C the smallest enclosing convex shape. Caller supplies areas
  intersection I, union U, and enclose C (I≤U≤C, all ≥0).
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def generalized_iou(
    intersection: float | None,
    union: float | None,
    enclose: float | None,
) -> float | None:
    """GIoU = I/U − (C−U)/C (Rezatofighi et al. 2019 Eqs. 5–7).

    Missing → null. Any area < 0 → null. U≤0 or C≤0 → null.
    I > U or U > C → null.
    """
    if intersection is None or union is None or enclose is None:
        return None
    i = float(intersection)
    u = float(union)
    c = float(enclose)
    if i < 0.0 or u < 0.0 or c < 0.0:
        return None
    if u <= 0.0 or c <= 0.0:
        return None
    if i > u or u > c:
        return None
    iou = i / u
    return iou - (c - u) / c


COLUMN_BACKED_FUNCS: Sequence[str] = ("generalized_iou",)
