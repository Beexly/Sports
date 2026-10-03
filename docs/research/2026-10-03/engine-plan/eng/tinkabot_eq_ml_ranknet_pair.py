"""Stated ML identity: RankNet pairwise cross-entropy cost (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Burges, C., Shaked, T., Renshaw, E., Lazier, A., Deeds, M., Hamilton, N.
  & Hullender, G., "Learning to Rank using Gradient Descent," ICML 2005.
  Pairwise model (Eqs. 1–3): o_{ij}=s_i−s_j,
  P_{ij}=1/(1+e^{−σ o_{ij}}),
  C_{ij}=−P̄_{ij} log P_{ij} − (1−P̄_{ij}) log(1−P_{ij}),
  with P̄_{ij}∈{0,1} the target preference and σ>0.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def ranknet_pair_cost(
    s_i: float | None,
    s_j: float | None,
    target: float | None,
    sigma: float | None,
) -> float | None:
    """C = −ȳ log P − (1−ȳ) log(1−P), P=1/(1+e^{−σ(s_i−s_j)}) (RankNet).

    Missing → null. target not in {0,1} → null. σ ≤ 0 → null.
    """
    if s_i is None or s_j is None or target is None or sigma is None:
        return None
    ybar = float(target)
    sig = float(sigma)
    if ybar not in (0.0, 1.0):
        return None
    if sig <= 0.0:
        return None
    o = float(s_i) - float(s_j)
    # stable sigmoid
    z = -sig * o
    if z >= 0.0:
        ez = math.exp(-z)
        p = ez / (1.0 + ez)
    else:
        ez = math.exp(z)
        p = 1.0 / (1.0 + ez)
    # clamp for log
    eps = 1e-15
    p = min(max(p, eps), 1.0 - eps)
    return -(ybar * math.log(p) + (1.0 - ybar) * math.log(1.0 - p))


COLUMN_BACKED_FUNCS: Sequence[str] = ("ranknet_pair_cost",)
