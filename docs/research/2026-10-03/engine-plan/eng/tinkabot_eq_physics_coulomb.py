"""Stated physics identity: Coulomb force magnitude (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax, College Physics 2e, §18.3 Coulomb's Law,
  https://openstax.org/books/college-physics-2e/pages/18-3-coulombs-law
  prints F = k |q1 q2| / r² (magnitude). k, q1, q2, r caller-supplied
  (k>0, r>0; charges may be signed — absolute product used).
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def coulomb_force(
    k: float | None,
    q1: float | None,
    q2: float | None,
    r: float | None,
) -> float | None:
    """F = k * |q1 * q2| / r².

    Missing → null. Non-positive k or r → null.
    """
    if k is None or q1 is None or q2 is None or r is None:
        return None
    kk = float(k)
    qq1 = float(q1)
    qq2 = float(q2)
    rr = float(r)
    if kk <= 0.0 or rr <= 0.0:
        return None
    return (kk * abs(qq1 * qq2)) / (rr * rr)


COLUMN_BACKED_FUNCS: Sequence[str] = ("coulomb_force",)
