"""Stated ML identity: InfoNCE loss (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- van den Oord, Li & Vinyals, "Representation Learning with Contrastive
  Predictive Coding," arXiv:1807.03748, Eq. (4):
  L_N = −E[ log( f_k(x_{t+k}, c_t) / Σ_{x_j ∈ X} f_k(x_j, c_t) ) ].
  Caller supplies the positive density score f_pos = f_k(x_{t+k}, c_t) and
  the scores for the other members of X (negatives); all f must be > 0.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def infonce_loss(
    f_pos: float | None,
    f_others: Sequence[float] | None,
) -> float | None:
    """L = −log( f_pos / (f_pos + Σ f_others) ) (CPC InfoNCE, Eq. 4).

    Missing → null. f_pos ≤ 0 → null. Empty others → null.
    Any other score ≤ 0 → null.
    """
    if f_pos is None or f_others is None:
        return None
    fp = float(f_pos)
    if fp <= 0.0:
        return None
    if len(f_others) == 0:
        return None
    total = fp
    for raw in f_others:
        if raw is None:
            return None
        fj = float(raw)
        if fj <= 0.0:
            return None
        total += fj
    return -math.log(fp / total)


COLUMN_BACKED_FUNCS: Sequence[str] = ("infonce_loss",)
