"""Stated ML identity: AdaGrad diagonal step (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite Adam/AdaMax, dropout_*, label_smoothing, residual_*,
IoU family, FFN, PE, Attention, or grok_eq_adam.

Source:
- Duchi, J., Hazan, E., & Singer, Y., "Adaptive Subgradient Methods for Online
  Learning and Stochastic Optimization," JMLR 12 (2011) 2121–2159.
  https://jmlr.org/papers/volume12/duchi11a/duchi11a.pdf
  PDF §1.1 Eqn.(1) (diagonal specialization, no projection):
  x ← x − η · diag(G_t)^{−1/2} g_t
  i.e. scalar x' = x − η · g / √G with G the accumulated squared-gradient entry.
  Caller supplies x, η, g, and G > 0.
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


def adagrad_step(
    x: object,
    eta: object,
    g: object,
    g_accum: object,
) -> float | None:
    """x' = x − η·g/√G (Duchi et al. 2011, Eqn.(1), scalar).

    Missing → null. Non-finite → null.
    η ≤ 0 or G ≤ 0 → null.
    """
    xv = _as_finite(x)
    eta_v = _as_finite(eta)
    gv = _as_finite(g)
    gv_acc = _as_finite(g_accum)
    if xv is None or eta_v is None or gv is None or gv_acc is None:
        return None
    if eta_v <= 0.0 or gv_acc <= 0.0:
        return None
    return xv - eta_v * gv / math.sqrt(gv_acc)


COLUMN_BACKED_FUNCS: Sequence[str] = ("adagrad_step",)
