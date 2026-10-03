"""Stated math identity: Pearson product-moment correlation (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax, Introductory Statistics, §12.3 The Regression Equation /
  correlation coefficient discussion (sample Pearson r),
  https://openstax.org/books/introductory-statistics/pages/12-3-the-regression-equation
  and standard sample form:
  r = Σ((x_i − x̄)(y_i − ȳ)) / sqrt(Σ(x_i − x̄)² Σ(y_i − ȳ)²).
  Equal-length sequences; n≥2; zero variance → null.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def pearson_r(
    x: Sequence[float] | None,
    y: Sequence[float] | None,
) -> float | None:
    """Sample Pearson r as printed above.

    Missing → null. Length mismatch, n<2, or zero denom → null.
    """
    if x is None or y is None:
        return None
    xs = [float(v) for v in x]
    ys = [float(v) for v in y]
    n = len(xs)
    if n < 2 or n != len(ys):
        return None
    mx = sum(xs) / n
    my = sum(ys) / n
    num = 0.0
    sx = 0.0
    sy = 0.0
    for a, b in zip(xs, ys):
        dx = a - mx
        dy = b - my
        num += dx * dy
        sx += dx * dx
        sy += dy * dy
    denom = math.sqrt(sx * sy)
    if denom == 0.0:
        return None
    return num / denom


COLUMN_BACKED_FUNCS: Sequence[str] = ("pearson_r",)
