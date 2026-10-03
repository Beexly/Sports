"""Stated physics/chemistry identity: ideal-gas pressure (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax, College Physics 2e, §13.3 The Ideal Gas Law,
  https://openstax.org/books/college-physics-2e/pages/13-3-the-ideal-gas-law
  prints PV = NkT / PV = nRT. Pressure form used here:
  P = n R T / V, with n, R, T, V caller-supplied (R>0, T>0, V>0; n≥0).
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def ideal_gas_pressure(
    n: float | None,
    r: float | None,
    t: float | None,
    v: float | None,
) -> float | None:
    """P = n * R * T / V.

    Missing → null. Non-positive R, T, or V → null. Negative n → null.
    """
    if n is None or r is None or t is None or v is None:
        return None
    nn = float(n)
    rr = float(r)
    tt = float(t)
    vv = float(v)
    if nn < 0.0:
        return None
    if rr <= 0.0 or tt <= 0.0 or vv <= 0.0:
        return None
    return (nn * rr * tt) / vv


COLUMN_BACKED_FUNCS: Sequence[str] = ("ideal_gas_pressure",)
