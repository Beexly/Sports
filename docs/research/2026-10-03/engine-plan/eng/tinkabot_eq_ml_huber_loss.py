"""Stated ML identity: Huber loss (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not restore HOLD deletes.
Does not touch mind.jsonl or trainers.

Source:
- Huber, P. J. \"Robust Estimation of a Location Parameter,\"
  Annals of Mathematical Statistics 35(1), 1964,
  https://projecteuclid.org/journals/annals-of-mathematical-statistics/volume-35/issue-1/Robust-Estimation-of-a-Location-Parameter/10.1214/aoms/1177703732.full
  printed p. 79 (ρ / loss form): for threshold k > 0,
  ρ(t) = t²/2 when |t| ≤ k;  k|t| − k²/2 when |t| > k.
  Here residual a and threshold delta are caller-supplied (delta is k).

delta is not hard-coded.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def huber_loss(a: float | None, delta: float | None) -> float | None:
    """Huber ρ(a; delta): 0.5*a^2 if |a|<=delta else delta*(|a|-0.5*delta).

    Missing a or delta → null. Non-positive delta → null.
    """
    if a is None or delta is None:
        return None
    aa = float(a)
    dd = float(delta)
    if dd <= 0.0:
        return None
    abs_a = abs(aa)
    if abs_a <= dd:
        return 0.5 * aa * aa
    return dd * (abs_a - 0.5 * dd)


COLUMN_BACKED_FUNCS: Sequence[str] = ("huber_loss",)
