"""Stated ML identity: Smooth L1 loss (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Girshick, R., "Fast R-CNN," IEEE ICCV 2015 / arXiv:1504.08083, Eq. (3):
  smooth_L1(x) = 0.5 x²  if |x| < 1,
                 |x| − 0.5 otherwise.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def smooth_l1_loss(x: float | None) -> float | None:
    """smooth_L1(x) as in Girshick Fast R-CNN Eq. (3).

    Missing → null.
    """
    if x is None:
        return None
    xx = float(x)
    ax = abs(xx)
    if ax < 1.0:
        return 0.5 * (xx ** 2)
    return ax - 0.5


COLUMN_BACKED_FUNCS: Sequence[str] = ("smooth_l1_loss",)
