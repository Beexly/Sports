"""Printed non-sports identity: triplet loss (lingxi lane).

One function. Not sports. No I/O. Does not score or mint.

Paper:
Schroff, F., Kalenichenko, D., and Philbin, J. (2015). FaceNet:
A Unified Embedding for Face Recognition and Clustering.
CVPR. arXiv:1503.03832. The triplet loss is
  L = max(0, d_ap - d_an + alpha)
where d_ap and d_an are the squared anchor-positive and
anchor-negative distances, and alpha is the margin.
All three are caller-supplied. No hard-coded margin.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def triplet_loss(
    d_ap: float | None,
    d_an: float | None,
    alpha: float | None,
) -> float | None:
    """L = max(0, d_ap - d_an + alpha)."""
    if d_ap is None or d_an is None or alpha is None:
        return None
    ap = float(d_ap)
    an = float(d_an)
    margin = float(alpha)
    if not (math.isfinite(ap) and math.isfinite(an) and math.isfinite(margin)):
        return None
    if ap < 0.0 or an < 0.0:
        return None
    total = ap - an + margin
    if total > 0.0:
        return total
    return 0.0


COLUMN_BACKED_FUNCS: Sequence[str] = ("triplet_loss",)