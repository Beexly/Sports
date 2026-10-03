"""Printed Transformer learning-rate schedule (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not positional encoding sin/cos, not FFN, not AdaMax,
not scaled-dot Attention, not Adam m̂/v̂.

Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L.,
Gomez, A. N., Kaiser, Ł., & Polosukhin, I., Attention Is All You
Need, NeurIPS 2017 / arXiv:1706.03762, equation (3), PDF page 7:

    lrate = d_model^{−0.5} · min(step_num^{−0.5},
                                 step_num · warmup_steps^{−1.5})
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


def transformer_lrate(
    d_model: object, step_num: object, warmup_steps: object
) -> float | None:
    """Equation (3), Vaswani et al. 2017 arXiv:1706.03762 PDF page 7."""
    d = _as_positive(d_model)
    step = _as_positive(step_num)
    warm = _as_positive(warmup_steps)
    if d is None or step is None or warm is None:
        return None
    # step_num should be a positive integer timestep
    if step != math.floor(step):
        return None
    inv_sqrt_d = d ** -0.5
    inv_sqrt_step = step ** -0.5
    warmup_term = step * (warm ** -1.5)
    out = inv_sqrt_d * min(inv_sqrt_step, warmup_term)
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("transformer_lrate",)