"""Stated math identity: Manhattan / L1 distance (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Deza & Deza, Encyclopedia of Distances (Springer), Manhattan / taxicab /
  L1 metric: d_1(x,y) = Σ_i |x_i − y_i|. Equal-length sequences.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def manhattan_distance(
    x: Sequence[float] | None,
    y: Sequence[float] | None,
) -> float | None:
    """d_1(x,y) = Σ_i |x_i − y_i|.

    Missing → null. Length mismatch or empty → null.
    """
    if x is None or y is None:
        return None
    xs = [float(v) for v in x]
    ys = [float(v) for v in y]
    if len(xs) == 0 or len(xs) != len(ys):
        return None
    return sum(abs(a - b) for a, b in zip(xs, ys))


COLUMN_BACKED_FUNCS: Sequence[str] = ("manhattan_distance",)
