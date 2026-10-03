"""Stated math identity: Minkowski distance (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Deza & Deza, Encyclopedia of Distances (Springer), Minkowski / L_p metric:
  d_p(x,y) = (Σ_i |x_i − y_i|^p)^{1/p}, with p>0 caller-supplied.
  Equal-length sequences. (p=1 Manhattan, p=2 Euclidean, p→∞ Chebyshev —
  those are separate modules; this is the general printed form.)
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def minkowski_distance(
    x: Sequence[float] | None,
    y: Sequence[float] | None,
    p: float | None,
) -> float | None:
    """d_p(x,y) = (Σ_i |x_i − y_i|^p)^{1/p}.

    Missing → null. Length mismatch, empty, or p≤0 → null.
    """
    if x is None or y is None or p is None:
        return None
    xs = [float(v) for v in x]
    ys = [float(v) for v in y]
    pp = float(p)
    if pp <= 0.0:
        return None
    if len(xs) == 0 or len(xs) != len(ys):
        return None
    total = sum(abs(a - b) ** pp for a, b in zip(xs, ys))
    return total ** (1.0 / pp)


COLUMN_BACKED_FUNCS: Sequence[str] = ("minkowski_distance",)
