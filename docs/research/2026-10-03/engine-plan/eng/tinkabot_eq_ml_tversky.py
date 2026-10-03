"""Stated ML identity: Tversky index / ratio model (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Tversky, A., "Features of Similarity," Psychological Review, vol. 84,
  no. 4, 1977, pp. 327–352. Ratio model (printed p. 333):
  S(a,b) = f(A∩B) / (f(A∩B) + α f(A−B) + β f(B−A)),
  with α,β ≥ 0 caller-supplied and f taken as non-negative feature counts
  (intersection / directed differences supplied as scalars).
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def tversky_index(
    intersection: float | None,
    a_minus_b: float | None,
    b_minus_a: float | None,
    alpha: float | None,
    beta: float | None,
) -> float | None:
    """S = c / (c + α·a + β·b) (Tversky 1977 p. 333 ratio model).

    Missing → null. Any of c,a,b < 0 → null. α or β < 0 → null.
    Denominator ≤ 0 → null.
    """
    if (
        intersection is None
        or a_minus_b is None
        or b_minus_a is None
        or alpha is None
        or beta is None
    ):
        return None
    c = float(intersection)
    a = float(a_minus_b)
    b = float(b_minus_a)
    aa = float(alpha)
    bb = float(beta)
    if c < 0.0 or a < 0.0 or b < 0.0:
        return None
    if aa < 0.0 or bb < 0.0:
        return None
    den = c + aa * a + bb * b
    if den <= 0.0:
        return None
    return c / den


COLUMN_BACKED_FUNCS: Sequence[str] = ("tversky_index",)
