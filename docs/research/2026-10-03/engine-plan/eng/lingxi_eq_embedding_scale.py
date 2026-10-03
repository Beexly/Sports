"""Printed Transformer embedding scale (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not positional encoding, not FFN, not Attention(Q,K,V),
not 1/√d_k attention scale, not transformer_lrate, not AdaMax.

Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L.,
Gomez, A. N., Kaiser, Ł., & Polosukhin, I., Attention Is All You
Need, NeurIPS 2017 / arXiv:1706.03762, §3.4 Embeddings and Softmax,
PDF page 5:

    In the embedding layers, we multiply those weights by √d_model.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


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


def embedding_scale(weight: object, d_model: object) -> float | None:
    """weight · √d_model (Vaswani et al. 2017 §3.4, PDF page 5)."""
    w = _as_finite(weight)
    d = _as_finite(d_model)
    if w is None or d is None:
        return None
    if d <= 0.0:
        return None
    out = w * math.sqrt(d)
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("embedding_scale",)