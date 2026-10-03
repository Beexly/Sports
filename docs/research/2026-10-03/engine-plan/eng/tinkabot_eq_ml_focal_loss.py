"""Stated ML identity: binary focal loss (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Lin, Goyal, Girshick, He & Dollár, "Focal Loss for Dense Object Detection",
  ICCV 2017 / arXiv:1708.02002, Eq. 5 (α-balanced form omitted for the
  core modulating term): FL(p_t) = −(1 − p_t)^γ log(p_t), with
  p_t = p if y=1 else 1−p. y ∈ {0,1}, p ∈ (0,1), γ≥0 caller-supplied.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def focal_loss(
    y: float | None,
    p: float | None,
    gamma: float | None,
) -> float | None:
    """FL = −(1 − p_t)^γ log(p_t), p_t = p if y=1 else 1−p.

    Missing → null. y not in {0,1} → null. p not in (0,1) → null.
    gamma < 0 → null.
    """
    if y is None or p is None or gamma is None:
        return None
    yy = float(y)
    pp = float(p)
    gg = float(gamma)
    if yy not in (0.0, 1.0):
        return None
    if not (0.0 < pp < 1.0):
        return None
    if gg < 0.0:
        return None
    p_t = pp if yy == 1.0 else (1.0 - pp)
    return -((1.0 - p_t) ** gg) * math.log(p_t)


COLUMN_BACKED_FUNCS: Sequence[str] = ("focal_loss",)
