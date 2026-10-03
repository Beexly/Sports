"""Stated physics identity: Newton's second law (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax, College Physics 2e, §4.3 Newton's Second Law of Motion,
  https://openstax.org/books/college-physics-2e/pages/4-3-newtons-second-law-of-motion-concept-of-a-system
  prints F_net = m a. Magnitude/scalar form used here:
  F = m * a, with m, a caller-supplied (m>0; a may be signed).
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def newtons_second_law(
    m: float | None,
    a: float | None,
) -> float | None:
    """F = m * a.

    Missing → null. Non-positive mass → null.
    """
    if m is None or a is None:
        return None
    mm = float(m)
    aa = float(a)
    if mm <= 0.0:
        return None
    return mm * aa


COLUMN_BACKED_FUNCS: Sequence[str] = ("newtons_second_law",)
