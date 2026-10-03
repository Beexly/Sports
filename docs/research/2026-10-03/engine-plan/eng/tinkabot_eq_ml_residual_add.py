"""Stated ML identity: residual shortcut y=F(x)+x (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite IoU/GIoU/DIoU/CIoU, FFN, PE, Attention, AdaMax, Adam α_t,
embedding_scale, attention_head_dim, or grok_eq_adam.

Source:
- He, K., Zhang, X., Ren, S., & Sun, J., "Deep Residual Learning for Image
  Recognition," IEEE/CVF CVPR 2016 / arXiv:1512.03385.
  https://arxiv.org/pdf/1512.03385
  PDF §3.2 (printed p.2–3): desired mapping H(x) is recast as F(x)+x with
  F(x):=H(x)−x; realized as y = F(x) + x (identity shortcut).
  Caller supplies residual F and input x (scalars).
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


def residual_add(f_x: object, x: object) -> float | None:
    """y = F(x) + x (He et al. 2016, §3.2 identity shortcut).

    Missing → null. Non-finite → null.
    """
    f = _as_finite(f_x)
    xv = _as_finite(x)
    if f is None or xv is None:
        return None
    return f + xv


COLUMN_BACKED_FUNCS: Sequence[str] = ("residual_add",)
