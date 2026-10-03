"""Stated ML identity: contrastive loss (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Hadsell, Chopra & LeCun, "Dimensionality Reduction by Learning an Invariant
  Mapping", IEEE CVPR 2006, Eq. (4):
  L = (1−Y)·½·D² + Y·½·{max(0, m−D)}²
  with Y∈{0,1} (0 = similar pair, 1 = dissimilar), D≥0 the pair distance,
  and m>0 the margin (caller-supplied).
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def contrastive_loss(
    y: float | None,
    distance: float | None,
    margin: float | None,
) -> float | None:
    """L = (1−Y)·½·D² + Y·½·{max(0, m−D)}² (Hadsell et al. 2006 Eq. 4).

    Missing → null. y not in {0,1} → null. distance < 0 → null. margin ≤ 0 → null.
    """
    if y is None or distance is None or margin is None:
        return None
    yy = float(y)
    dd = float(distance)
    mm = float(margin)
    if yy not in (0.0, 1.0):
        return None
    if dd < 0.0:
        return None
    if mm <= 0.0:
        return None
    if yy == 0.0:
        return 0.5 * (dd ** 2)
    hinge = mm - dd
    if hinge < 0.0:
        hinge = 0.0
    return 0.5 * (hinge ** 2)


COLUMN_BACKED_FUNCS: Sequence[str] = ("contrastive_loss",)
