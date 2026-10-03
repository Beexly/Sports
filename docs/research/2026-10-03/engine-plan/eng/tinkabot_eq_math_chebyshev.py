"""Stated math identity: Chebyshev distance (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Deza & Deza, Encyclopedia of Distances (Springer), Chebyshev / L∞ /
  maximum metric: d_∞(x,y) = max_i |x_i − y_i|. Equal-length sequences.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def chebyshev_distance(
    x: Sequence[float] | None,
    y: Sequence[float] | None,
) -> float | None:
    """d_∞(x,y) = max_i |x_i − y_i|.

    Missing → null. Length mismatch or empty → null.
    """
    if x is None or y is None:
        return None
    xs = [float(v) for v in x]
    ys = [float(v) for v in y]
    if len(xs) == 0 or len(xs) != len(ys):
        return None
    return max(abs(a - b) for a, b in zip(xs, ys))


COLUMN_BACKED_FUNCS: Sequence[str] = ("chebyshev_distance",)
