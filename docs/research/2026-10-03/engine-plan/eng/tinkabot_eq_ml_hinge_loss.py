"""Stated ML identity: hinge loss (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Cortes & Vapnik, "Support-Vector Networks", Machine Learning 20:273–297
  (1995); modern soft-margin hinge as printed in standard SVM texts /
  scikit-learn: L(y, t) = max(0, 1 − y · t) with y ∈ {−1, +1} and
  t the decision value (raw score).
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def hinge_loss(
    y: float | None,
    t: float | None,
) -> float | None:
    """L = max(0, 1 − y · t).

    Missing → null. y not in {−1, +1} → null.
    """
    if y is None or t is None:
        return None
    yy = float(y)
    tt = float(t)
    if yy not in (-1.0, 1.0):
        return None
    v = 1.0 - yy * tt
    return v if v > 0.0 else 0.0


COLUMN_BACKED_FUNCS: Sequence[str] = ("hinge_loss",)
