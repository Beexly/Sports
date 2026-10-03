"""Stated ML identity: Jensen–Shannon divergence (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Lin, J., "Divergence Measures Based on the Shannon Entropy,"
  IEEE Transactions on Information Theory, vol. 37, no. 1, Jan. 1991,
  pp. 145–151, Section IV (Jensen–Shannon divergence). Printed form:
  JS(P, Q) = H(M) − ½ H(P) − ½ H(Q), with M = ½(P + Q) and
  H(R) = −Σ r_i log r_i (natural log; 0·log 0 taken as 0).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"

_SUM_TOL = 1e-9


def _entropy(probs: Sequence[float]) -> float | None:
    h = 0.0
    s = 0.0
    for raw in probs:
        p = float(raw)
        if p < 0.0 or p > 1.0:
            return None
        s += p
        if p == 0.0:
            continue
        h -= p * math.log(p)
    if abs(s - 1.0) > _SUM_TOL:
        return None
    return h


def jensen_shannon_divergence(
    p: Sequence[float] | None,
    q: Sequence[float] | None,
) -> float | None:
    """JS(P,Q) = H(M) − ½ H(P) − ½ H(Q), M = ½(P+Q) (Lin 1991 §IV).

    Missing → null. Unequal lengths → null. Any mass outside [0,1] or
    either vector not summing to 1 (±1e-9) → null.
    """
    if p is None or q is None:
        return None
    if len(p) == 0 or len(p) != len(q):
        return None
    hp = _entropy(p)
    hq = _entropy(q)
    if hp is None or hq is None:
        return None
    m = [0.5 * (float(pi) + float(qi)) for pi, qi in zip(p, q)]
    hm = _entropy(m)
    if hm is None:
        return None
    return hm - 0.5 * hp - 0.5 * hq


COLUMN_BACKED_FUNCS: Sequence[str] = ("jensen_shannon_divergence",)
