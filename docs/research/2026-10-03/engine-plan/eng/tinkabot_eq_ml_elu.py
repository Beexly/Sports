"""Stated ML identity: Exponential Linear Unit (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Clevert, Unterthiner & Hochreiter, "Fast and Accurate Deep Network Learning
  by Exponential Linear Units (ELUs)", ICLR 2016 / arXiv:1511.07289,
  Eq. 1: f(x) = x if x > 0 else α (exp(x) − 1). α, x caller-supplied (α>0).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def elu(
    x: float | None,
    alpha: float | None,
) -> float | None:
    """ELU(x; α) = x if x > 0 else α (exp(x) − 1).

    Missing → null. Non-positive alpha → null.
    """
    if x is None or alpha is None:
        return None
    xx = float(x)
    aa = float(alpha)
    if aa <= 0.0:
        return None
    if xx > 0.0:
        return xx
    return aa * (math.exp(xx) - 1.0)


COLUMN_BACKED_FUNCS: Sequence[str] = ("elu",)
