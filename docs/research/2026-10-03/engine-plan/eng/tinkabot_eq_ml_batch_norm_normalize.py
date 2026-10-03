"""BatchNorm normalize x̂ = (x − μ) / √(σ² + ε) (Ioffe & Szegedy 2015).

Printed in arXiv:1502.03167 Algorithm 1 PDF p.3:
  x̂_i ← (x_i − μ_B) / √(σ_B² + ε)
Paired with tinkabot batch_norm_affine (scale and shift). One function.
Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("batch_norm_normalize",)


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


def batch_norm_normalize(
    x: object,
    mu: object,
    var: object,
    eps: object = 1e-5,
) -> float | None:
    """x̂ = (x − μ) / √(σ² + ε) (Ioffe & Szegedy 2015 Alg. 1).

    Missing / non-finite → null. σ² < 0 or ε ≤ 0 → null.
    """
    xv = _as_finite(x)
    m = _as_finite(mu)
    v = _as_finite(var)
    e = _as_finite(eps)
    if xv is None or m is None or v is None or e is None:
        return None
    if v < 0.0 or e <= 0.0:
        return None
    denom = math.sqrt(v + e)
    if denom == 0.0 or not math.isfinite(denom):
        return None
    out = (xv - m) / denom
    if not math.isfinite(out):
        return None
    return out
