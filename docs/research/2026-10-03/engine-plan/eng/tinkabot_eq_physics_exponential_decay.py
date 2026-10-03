"""Stated physics identity: exponential decay (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax, College Physics 2e, §31.5 Half-Life and Activity,
  https://openstax.org/books/college-physics-2e/pages/31-5-half-life-and-activity
  prints N = N_0 e^{−λ t} (also activity forms). Population form used here:
  N = N0 * exp(−λ * t), with N0≥0, λ>0, t≥0 caller-supplied.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def exponential_decay(
    n0: float | None,
    lam: float | None,
    t: float | None,
) -> float | None:
    """N = N0 * exp(−λ * t).

    Missing → null. Negative N0, non-positive λ, or negative t → null.
    """
    if n0 is None or lam is None or t is None:
        return None
    nn = float(n0)
    ll = float(lam)
    tt = float(t)
    if nn < 0.0 or ll <= 0.0 or tt < 0.0:
        return None
    return nn * math.exp(-ll * tt)


COLUMN_BACKED_FUNCS: Sequence[str] = ("exponential_decay",)
