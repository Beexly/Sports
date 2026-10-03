"""Stated ML identity: margin ranking loss (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Herbrich, R., Graepel, T. & Obermayer, K., "Large Margin Rank Boundaries
  for Ordinal Regression," in Advances in Large Margin Classifiers,
  MIT Press, 2000, pp. 115–132. Ranking hinge (large-margin) form used as
  L(x1,x2,y) = max(0, −y·(x1−x2) + m) with y∈{−1,+1} and margin m≥0
  (printed ranking-SVM / ordinal large-margin constraint hinge).
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def margin_ranking_loss(
    x1: float | None,
    x2: float | None,
    y: float | None,
    margin: float | None,
) -> float | None:
    """L = max(0, −y·(x1−x2) + m) (Herbrich et al. 2000 large-margin rank).

    Missing → null. y not in {−1,+1} → null. margin < 0 → null.
    """
    if x1 is None or x2 is None or y is None or margin is None:
        return None
    yy = float(y)
    mm = float(margin)
    if yy not in (-1.0, 1.0):
        return None
    if mm < 0.0:
        return None
    v = -yy * (float(x1) - float(x2)) + mm
    return v if v > 0.0 else 0.0


COLUMN_BACKED_FUNCS: Sequence[str] = ("margin_ranking_loss",)
