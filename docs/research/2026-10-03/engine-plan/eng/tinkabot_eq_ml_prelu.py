"""Stated ML identity: Parametric ReLU (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- He, Zhang, Ren & Sun, "Delving Deep into Rectifiers: Surpassing
  Human-Level Performance on ImageNet Classification", ICCV 2015 /
  arXiv:1502.01852, Eq. 1: f(y_i) = y_i if y_i > 0 else a_i y_i.
  Channel coefficient a and input y caller-supplied (a may be any real).
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def prelu(
    y: float | None,
    a: float | None,
) -> float | None:
    """f(y) = y if y > 0 else a · y.

    Missing → null.
    """
    if y is None or a is None:
        return None
    yy = float(y)
    aa = float(a)
    if yy > 0.0:
        return yy
    return aa * yy


COLUMN_BACKED_FUNCS: Sequence[str] = ("prelu",)
