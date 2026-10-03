"""Stated math identity: Frobenius norm (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Golub & Van Loan, Matrix Computations (4th ed.), §2.3.1 / standard form
  ‖A‖_F = √(Σ_{i,j} |a_{ij}|²). Entries passed as a flat sequence of
  matrix elements (row-major or otherwise — order does not affect the sum).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def frobenius_norm(
    entries: Sequence[float] | None,
) -> float | None:
    """‖A‖_F = √(Σ |a_k|²) over flat entries.

    Missing → null. Empty → null.
    """
    if entries is None:
        return None
    vals = [float(v) for v in entries]
    if len(vals) == 0:
        return None
    return math.sqrt(sum(v * v for v in vals))


COLUMN_BACKED_FUNCS: Sequence[str] = ("frobenius_norm",)
