"""Stated ML identity: AdaGrad squared-gradient accumulate (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite adagrad_step, Adam/AdaMax, dropout_*, label_smoothing,
residual_*, IoU family, or grok_eq_adam.

Source:
- Duchi, J., Hazan, E., & Singer, Y., "Adaptive Subgradient Methods for Online
  Learning and Stochastic Optimization," JMLR 12 (2011) 2121–2159.
  https://jmlr.org/papers/volume12/duchi11a/duchi11a.pdf
  PDF §1.1: G_t = ∑_{τ=1}^t g_τ g_τ^⊤ ; diagonal specialization accumulates
  G ← G + g² (outer-product diagonal entry).
  Caller supplies prior accum G≥0 and gradient g.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def _as_finite(value: object) -> float | None:
    if value is None or isinstance(value, (str, bytes, bool)):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def adagrad_accumulate(g_prev: object, g: object) -> float | None:
    """G' = G + g² (Duchi et al. 2011, §1.1 diagonal of G_t).

    Missing → null. Non-finite → null.
    Prior G < 0 → null.
    """
    g0 = _as_finite(g_prev)
    gv = _as_finite(g)
    if g0 is None or gv is None:
        return None
    if g0 < 0.0:
        return None
    return g0 + gv * gv


COLUMN_BACKED_FUNCS: Sequence[str] = ("adagrad_accumulate",)
