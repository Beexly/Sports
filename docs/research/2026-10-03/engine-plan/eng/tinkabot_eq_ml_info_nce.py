"""InfoNCE loss (van den Oord et al. CPC / arXiv:1807.03748).

Printed Eq. (4) PDF p.3:
  L_N = − E[ log( f_k(x_{t+k}, c_t) / Σ_{x_j ∈ X} f_k(x_j, c_t) ) ]
Caller supplies the positive score f_+ and the full set of scores
(positive + negatives) as a sequence. One function. Not Adam / AdaDelta.
Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("info_nce",)


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


def info_nce(positive_f: object, scores: Sequence[object] | None) -> float | None:
    """L = −log( f_+ / Σ_j f_j ) (van den Oord et al. 2018 Eq. 4).

    Missing / non-finite → null. Empty scores → null. Any f ≤ 0 → null.
    positive_f must appear as one of the scores (within 1e-12).
    """
    pos = _as_finite(positive_f)
    if pos is None or scores is None or len(scores) == 0:
        return None
    if pos <= 0.0:
        return None
    total = 0.0
    found = False
    for s in scores:
        v = _as_finite(s)
        if v is None or v <= 0.0:
            return None
        if abs(v - pos) <= 1e-12:
            found = True
        total += v
    if not found or total <= 0.0:
        return None
    out = -math.log(pos / total)
    if not math.isfinite(out):
        return None
    return out
