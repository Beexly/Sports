"""Stated vision identity: difference of two supplied L samples (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not restore HOLD deletes.

This is not a Gaussian blur and not a Difference-of-Gaussians operator.
Callers already supply two L samples; this module only subtracts them
after checking that the scale factors k and σ are positive.

Algebraic form (same subtraction as Lowe 2004 eq.1 when L is precomputed):
  D = L(kσ) − L(σ)
Source note (form only, not a blur implementation):
- Lowe, D. G. \"Distinctive Image Features from Scale-Invariant Keypoints,\"
  IJCV 2004, https://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf printed p. 5,
  equation (1).
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def difference_of_supplied_l(
    l_k_sigma: float | None,
    l_sigma: float | None,
    k: float | None,
    sigma: float | None,
) -> float | None:
    """D = L(k*sigma) - L(sigma) for two caller-supplied L values.

    Missing L → null. Missing or non-positive k or sigma → null.
    Does not blur; k and sigma are positivity gates only.
    """
    if l_k_sigma is None or l_sigma is None:
        return None
    if k is None or sigma is None:
        return None
    kk = float(k)
    ss = float(sigma)
    if kk <= 0.0 or ss <= 0.0:
        return None
    return float(l_k_sigma) - float(l_sigma)


COLUMN_BACKED_FUNCS: Sequence[str] = ("difference_of_supplied_l",)
