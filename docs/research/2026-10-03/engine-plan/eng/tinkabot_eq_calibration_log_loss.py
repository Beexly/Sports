"""Stated scoring identity: binary log loss (tinkabot lane).

One function. Not a pick. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score a game or mint. Does not write Neon.

Source:
- Good, I. J. Rational Decisions, JRSS B, 1952, logarithmic score.
- Guo et al., On Calibration of Modern Neural Networks, arXiv 1706.04599.
  Binary form LL = -[y log p + (1-y) log(1-p)].
  eps is caller-supplied. p outside [eps, 1-eps] returns null.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def binary_log_loss(y: float | None, p: float | None, eps: float | None) -> float | None:
    """LL = -[y log p + (1-y) log(1-p)]."""
    if y is None or p is None or eps is None:
        return None
    yy = float(y)
    pp = float(p)
    ee = float(eps)
    if yy not in (0.0, 1.0):
        return None
    if ee <= 0.0 or ee >= 0.5:
        return None
    if pp < ee or pp > 1.0 - ee:
        return None
    return -(yy * math.log(pp) + (1.0 - yy) * math.log(1.0 - pp))


COLUMN_BACKED_FUNCS: Sequence[str] = ("binary_log_loss",)
