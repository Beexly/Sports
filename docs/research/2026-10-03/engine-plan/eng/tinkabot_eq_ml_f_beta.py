"""Stated ML identity: F-β score (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Chinchor, N., "MUC-4 Evaluation Metrics," Proceedings of the Fourth Message
  Understanding Conference (MUC-4), 1992. Printed F-measure:
  F = ((β²+1)·P·R) / (β²·P + R), with precision P, recall R in [0,1],
  and β>0 caller-supplied (β=1 recovers the balanced F1).
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def f_beta_score(
    precision: float | None,
    recall: float | None,
    beta: float | None,
) -> float | None:
    """F_β = (1+β²) P R / (β² P + R) (Chinchor MUC-4 1992).

    Missing → null. P or R not in [0,1] → null. β ≤ 0 → null.
    Denominator ≤ 0 → null.
    """
    if precision is None or recall is None or beta is None:
        return None
    p = float(precision)
    r = float(recall)
    b = float(beta)
    if p < 0.0 or p > 1.0 or r < 0.0 or r > 1.0:
        return None
    if b <= 0.0:
        return None
    b2 = b * b
    den = b2 * p + r
    if den <= 0.0:
        return None
    return ((1.0 + b2) * p * r) / den


COLUMN_BACKED_FUNCS: Sequence[str] = ("f_beta_score",)
