"""Stated ML identity: softplus activation (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Dugas, C., Bengio, Y., Bélisle, F., Nadeau, C., and Garcia, R.
  \"Incorporating Second-Order Functional Knowledge for Better Option
  Pricing,\" Advances in Neural Information Processing Systems 13 (NIPS 2000),
  https://papers.nips.cc/paper_files/paper/2000/file/44968aece94f667e4095002d140b5896-Paper.pdf
  printed p. 3 (eq. after softplus definition): softplus(x) = log(1 + e^x).

x is caller-supplied. Numerically uses a stable form for large |x|.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def softplus(x: float | None) -> float | None:
    """softplus(x) = log(1 + exp(x)).

    Missing → null. For large positive x uses x + log1p(exp(-x));
    for large negative x uses log1p(exp(x)).
    """
    if x is None:
        return None
    xx = float(x)
    if xx > 0.0:
        return xx + math.log1p(math.exp(-xx))
    return math.log1p(math.exp(xx))


COLUMN_BACKED_FUNCS: Sequence[str] = ("softplus",)
