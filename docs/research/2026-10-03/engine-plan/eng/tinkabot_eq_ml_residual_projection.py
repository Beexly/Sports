"""Stated ML identity: residual projection shortcut (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite residual_add (identity shortcut), IoU/LIoU, FFN, PE,
Attention, AdaMax, Adam α_t, or grok_eq_adam.

Source:
- He, K., Zhang, X., Ren, S., & Sun, J., "Deep Residual Learning for Image
  Recognition," IEEE/CVF CVPR 2016 / arXiv:1512.03385.
  https://arxiv.org/pdf/1512.03385
  PDF §3.2 Eqn.(2): y = F(x, {Wi}) + Ws x
  (linear projection shortcut when dimensions differ).
  Caller supplies residual F, projection scale Ws, and input x (scalars).
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


def residual_projection(f_x: object, w_s: object, x: object) -> float | None:
    """y = F(x) + Ws·x (He et al. 2016, Eqn.(2)).

    Missing → null. Non-finite → null.
    """
    f = _as_finite(f_x)
    w = _as_finite(w_s)
    xv = _as_finite(x)
    if f is None or w is None or xv is None:
        return None
    return f + w * xv


COLUMN_BACKED_FUNCS: Sequence[str] = ("residual_projection",)
