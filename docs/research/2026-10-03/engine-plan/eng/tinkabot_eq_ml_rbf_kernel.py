"""Stated ML identity: RBF (Gaussian) kernel (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Schölkopf & Smola, Learning with Kernels (MIT Press, 2002), §2.3 /
  Gaussian RBF: k(x,x') = exp(−‖x − x'‖² / (2 σ²)), with σ>0
  caller-supplied. Equal-length vectors; uses squared Euclidean distance.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def rbf_kernel(
    x: Sequence[float] | None,
    x_prime: Sequence[float] | None,
    sigma: float | None,
) -> float | None:
    """k = exp(−‖x − x'‖² / (2 σ²)).

    Missing → null. Length mismatch, empty, or σ≤0 → null.
    """
    if x is None or x_prime is None or sigma is None:
        return None
    xs = [float(v) for v in x]
    xp = [float(v) for v in x_prime]
    ss = float(sigma)
    if ss <= 0.0:
        return None
    if len(xs) == 0 or len(xs) != len(xp):
        return None
    sq = sum((a - b) ** 2 for a, b in zip(xs, xp))
    return math.exp(-sq / (2.0 * ss * ss))


COLUMN_BACKED_FUNCS: Sequence[str] = ("rbf_kernel",)
