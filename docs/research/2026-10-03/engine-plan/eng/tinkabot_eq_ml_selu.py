"""Stated ML identity: Scaled Exponential Linear Unit (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Klambauer, Unterthiner, Mayr & Hochreiter, "Self-Normalizing Neural
  Networks", NeurIPS 2017 / arXiv:1706.02515, Eq. 1:
  selu(x) = λ x if x > 0 else λ α (exp(x) − 1).
  λ, α, x caller-supplied (λ>0, α>0).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def selu(
    x: float | None,
    lam: float | None,
    alpha: float | None,
) -> float | None:
    """selu(x) = λ x if x > 0 else λ α (exp(x) − 1).

    Missing → null. Non-positive λ or α → null.
    """
    if x is None or lam is None or alpha is None:
        return None
    xx = float(x)
    ll = float(lam)
    aa = float(alpha)
    if ll <= 0.0 or aa <= 0.0:
        return None
    if xx > 0.0:
        return ll * xx
    return ll * aa * (math.exp(xx) - 1.0)


COLUMN_BACKED_FUNCS: Sequence[str] = ("selu",)
