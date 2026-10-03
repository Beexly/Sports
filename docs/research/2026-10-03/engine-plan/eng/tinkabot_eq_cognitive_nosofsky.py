"""Stated cognitive identity: Nosofsky similarity (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not restore HOLD deletes.

Source:
- Nosofsky, R. M. \"Attention, Similarity, and the Identification–
  Categorization Relationship,\" JEP: General 1986,
  https://cseweb.ucsd.edu/~gary/PAPER-SUGGESTIONS/nosofsky-JEP-Gen-1986.pdf
  printed p. 44, equation (11):
  η_ij = exp(−c · (Σ_m w_m |x_im − x_jm|^r)^(1/r))
  with two dimensions and w2 = 1 − w1 as stated for this commit.

Callers supply coordinates and positive/allowed c, w1, r.
c, w1, and r are not hard-coded.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def nosofsky_similarity(
    x_i1: float | None,
    x_j1: float | None,
    x_i2: float | None,
    x_j2: float | None,
    c: float | None,
    w1: float | None,
    r: float | None,
) -> float | None:
    """eta = exp(-c * (w1*|xi1-xj1|^r + (1-w1)*|xi2-xj2|^r)^(1/r)).

    Missing coordinate → null.
    Missing c, or c < 0 → null.
    Missing w1, or w1 not in [0, 1] → null.
    Missing r, or r <= 0 → null.
    """
    if x_i1 is None or x_j1 is None or x_i2 is None or x_j2 is None:
        return None
    if c is None or w1 is None or r is None:
        return None
    cc = float(c)
    ww = float(w1)
    rr = float(r)
    if cc < 0.0:
        return None
    if ww < 0.0 or ww > 1.0:
        return None
    if rr <= 0.0:
        return None
    d1 = abs(float(x_i1) - float(x_j1))
    d2 = abs(float(x_i2) - float(x_j2))
    weighted = ww * (d1 ** rr) + (1.0 - ww) * (d2 ** rr)
    dist = weighted ** (1.0 / rr)
    return math.exp(-cc * dist)


COLUMN_BACKED_FUNCS: Sequence[str] = ("nosofsky_similarity",)
