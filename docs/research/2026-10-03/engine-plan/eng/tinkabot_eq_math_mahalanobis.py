"""Stated math identity: Mahalanobis distance (diagonal Σ) (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Mahalanobis, "On the generalised distance in statistics", Proceedings of
  the National Institute of Sciences of India, 1936. Modern diagonal form
  (independent coordinates / diagonal covariance Σ = diag(σ²)):
  d = √( Σ_i (x_i − μ_i)² / σ²_i ), with equal-length x, μ, var; each var>0.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def mahalanobis_distance(
    x: Sequence[float] | None,
    mu: Sequence[float] | None,
    var: Sequence[float] | None,
) -> float | None:
    """d = √(Σ_i (x_i − μ_i)² / var_i) for diagonal Σ.

    Missing → null. Length mismatch, empty, or non-positive var → null.
    """
    if x is None or mu is None or var is None:
        return None
    xs = [float(v) for v in x]
    mus = [float(v) for v in mu]
    vars_ = [float(v) for v in var]
    n = len(xs)
    if n == 0 or n != len(mus) or n != len(vars_):
        return None
    total = 0.0
    for a, m, v in zip(xs, mus, vars_):
        if v <= 0.0:
            return None
        d = a - m
        total += (d * d) / v
    return math.sqrt(total)


COLUMN_BACKED_FUNCS: Sequence[str] = ("mahalanobis_distance",)
