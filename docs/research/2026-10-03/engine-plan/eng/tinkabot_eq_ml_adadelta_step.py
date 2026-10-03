"""AdaDelta parameter-update step (Zeiler / Ruder overview).

Printed in Ruder, "An overview of gradient descent optimization algorithms,"
arXiv:1609.04747 §4.4 Eq. (17) PDF:
  Δθ_t = − RMS[Δθ]_{t−1} / RMS[g]_t · g_t
where RMS[x]_t = √(E[x²]_t + ε).
Paired with tinkabot adadelta_delta_sq_avg (Eq. 15). Not RMSprop. Not Adam.
Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("adadelta_step",)


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


def adadelta_step(
    g: object,
    e_delta_prev: object,
    e_g: object,
    eps: object = 1e-6,
) -> float | None:
    """Δθ = −√(E[Δθ²]+ε) / √(E[g²]+ε) · g (Ruder arXiv:1609.04747 Eq. 17).

    Missing / non-finite → null. E_* < 0 or ε ≤ 0 → null.
    """
    gv = _as_finite(g)
    ed = _as_finite(e_delta_prev)
    eg = _as_finite(e_g)
    ep = _as_finite(eps)
    if gv is None or ed is None or eg is None or ep is None:
        return None
    if ed < 0.0 or eg < 0.0 or ep <= 0.0:
        return None
    num = math.sqrt(ed + ep)
    den = math.sqrt(eg + ep)
    if den == 0.0 or not math.isfinite(num) or not math.isfinite(den):
        return None
    out = -(num / den) * gv
    if not math.isfinite(out):
        return None
    return out
