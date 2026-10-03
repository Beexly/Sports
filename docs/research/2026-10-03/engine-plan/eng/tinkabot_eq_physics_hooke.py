"""Stated physics identity: Hooke's law (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Hooke, R. Lectures De Potentia Restitutiva, or of Spring, 1678
  (\"ut tensio, sic vis\"); modern linear form F = −k x with spring
  constant k > 0. English text via Early English Books / Internet Archive:
  https://archive.org/details/lecturesdepotent00hook
  k and displacement x are caller-supplied; k is not hard-coded.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def hookes_law(x: float | None, k: float | None) -> float | None:
    """F = -k * x.

    Missing → null. Non-positive k → null.
    """
    if x is None or k is None:
        return None
    xx = float(x)
    kk = float(k)
    if kk <= 0.0:
        return None
    return -kk * xx


COLUMN_BACKED_FUNCS: Sequence[str] = ("hookes_law",)
