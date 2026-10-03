"""BatchNorm scale-and-shift y = γ x̂ + β (Ioffe & Szegedy 2015).

Printed in arXiv:1502.03167 Algorithm 1 PDF p.3:
  y_i ← γ x̂_i + β ≡ BN_{γ,β}(x_i)
Caller supplies already-normalized x̂. One function. Not AdaDelta/Adam.
Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("batch_norm_affine",)


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


def batch_norm_affine(x_hat: object, gamma: object, beta: object) -> float | None:
    """y = γ · x̂ + β (Ioffe & Szegedy 2015 Alg. 1).

    Missing / non-finite → null.
    """
    x = _as_finite(x_hat)
    g = _as_finite(gamma)
    b = _as_finite(beta)
    if x is None or g is None or b is None:
        return None
    out = g * x + b
    if not math.isfinite(out):
        return None
    return out
