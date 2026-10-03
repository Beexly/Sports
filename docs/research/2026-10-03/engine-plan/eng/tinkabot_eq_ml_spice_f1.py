"""Stated ML identity: SPICE F1 (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite ECE, MCE, CIDEr_n, CIDEr, BLEU, ROUGE, METEOR, chrF, TER,
cohen_kappa, matthews_corrcoef, equal-weight JS, or Herbrich margin ranking.

Source:
- Anderson, P., Fernando, B., Johnson, M., and Gould, S.,
  "SPICE: Semantic Propositional Image Caption Evaluation,"
  ECCV 2016. arXiv:1607.08822.
  https://arxiv.org/pdf/1607.08822
  arXiv PDF page 7, Equation (5):
  SPICE(c, S) = F1(c, S) = (2 · P(c, S) · R(c, S)) / (P(c, S) + R(c, S)),
  where P and R are the scene-graph tuple precision and recall in Eqs. (3)–(4).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def _as_float(value: object) -> float | None:
    if value is None or isinstance(value, (str, bytes, bool)):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def spice_f1(precision: object, recall: object) -> float | None:
    """SPICE = F1 = 2PR/(P+R) (Anderson et al. 2016, Eq. 5).

    Caller supplies P(c,S) and R(c,S) from the printed matching defs.
    Missing → null. Non-finite → null. P+R = 0 → null.
    """
    p = _as_float(precision)
    r = _as_float(recall)
    if p is None or r is None:
        return None
    denom = p + r
    if denom == 0.0:
        return None
    return (2.0 * p * r) / denom


COLUMN_BACKED_FUNCS: Sequence[str] = ("spice_f1",)
