"""Printed multi-head attention head dimension (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not Attention(Q,K,V), not 1/√d_k, not embedding ·√d_model,
not transformer_lrate, not FFN, not PE.

Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L.,
Gomez, A. N., Kaiser, Ł., & Polosukhin, I., Attention Is All You
Need, NeurIPS 2017 / arXiv:1706.03762, §3.2.2 Multi-Head Attention,
PDF page 5:

    d_k = d_v = d_model / h
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def _as_positive(value: object) -> float | None:
    if value is None or isinstance(value, (str, bytes, bool)):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number) or number <= 0.0:
        return None
    return number


def attention_head_dim(d_model: object, n_heads: object) -> float | None:
    """d_k = d_model / h (Vaswani et al. 2017 §3.2.2, PDF page 5)."""
    d = _as_positive(d_model)
    h = _as_positive(n_heads)
    if d is None or h is None:
        return None
    # h should be a positive integer that divides d_model in the paper's use,
    # but the printed identity is the ratio; require positive finite h.
    if h != math.floor(h):
        return None
    out = d / h
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("attention_head_dim",)