"""Stated ML/ecology identity: Jaccard index (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Jaccard, P. \"The Distribution of the Flora in the Alpine Zone,\"
  New Phytologist 11(2), 1912, https://doi.org/10.1111/j.1469-8137.1912.tb05611.x
  printed p. 37–38: coefficient of community =
  (number of species common to both) / (total number of species in the two),
  i.e. J = h / (a + b − h) with h = |A∩B|, a = |A|, b = |B|.

a, b, h are caller-supplied.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def jaccard_index(
    h: float | None,
    a: float | None,
    b: float | None,
) -> float | None:
    """J = h / (a + b - h).

    Missing → null. Negative h/a/b → null. h > a or h > b → null.
    Denominator a+b-h <= 0 → null.
    """
    if h is None or a is None or b is None:
        return None
    hh = float(h)
    aa = float(a)
    bb = float(b)
    if hh < 0.0 or aa < 0.0 or bb < 0.0:
        return None
    if hh > aa or hh > bb:
        return None
    denom = aa + bb - hh
    if denom <= 0.0:
        return None
    return hh / denom


COLUMN_BACKED_FUNCS: Sequence[str] = ("jaccard_index",)
