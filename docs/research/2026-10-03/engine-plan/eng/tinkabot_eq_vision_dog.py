"""Stated vision identity: difference of Gaussians (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not restore HOLD deletes.

Source:
- Lowe, D. G. \"Distinctive Image Features from Scale-Invariant Keypoints,\"
  IJCV 2004, https://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf printed p. 5,
  equation (1): D(x, y, σ) = L(x, y, kσ) − L(x, y, σ), where L is the
  Gaussian-blurred image at that scale.

Callers supply the two L samples and the positive scale factors k and σ.
k is not hard-coded.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def difference_of_gaussians(
    l_k_sigma: float | None,
    l_sigma: float | None,
    k: float | None,
    sigma: float | None,
) -> float | None:
    """D = L(x, y, k*sigma) - L(x, y, sigma).

    Missing L → null. Missing or non-positive k or sigma → null.
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


COLUMN_BACKED_FUNCS: Sequence[str] = ("difference_of_gaussians",)
