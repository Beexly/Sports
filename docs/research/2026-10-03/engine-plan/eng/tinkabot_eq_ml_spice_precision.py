"""Stated ML identity: SPICE precision P(c,S) (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite spice_f1, ECE, MCE, CIDEr*, BLEU, ROUGE, METEOR, chrF, TER,
cohen_kappa, matthews_corrcoef, equal-weight JS, or Herbrich margin ranking.

Source:
- Anderson, P., Fernando, B., Johnson, M., and Gould, S.,
  "SPICE: Semantic Propositional Image Caption Evaluation,"
  ECCV 2016. arXiv:1607.08822.
  https://arxiv.org/pdf/1607.08822
  arXiv PDF page 7, Equation (3):
  P(c, S) = |T(G(c)) ⊗ T(G(S))| / |T(G(c))|,
  where ⊗ returns matching scene-graph tuples and T(·) is Eq. (2).
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


def spice_precision(matched_tuples: object, candidate_tuples: object) -> float | None:
    """P(c,S) = |T(G(c)) ⊗ T(G(S))| / |T(G(c))| (Anderson et al. 2016, Eq. 3).

    Caller supplies match cardinality and |T(G(c))|. Missing → null.
    Non-finite → null. Negative counts → null. |T(G(c))| = 0 → null.
    """
    matched = _as_float(matched_tuples)
    cand = _as_float(candidate_tuples)
    if matched is None or cand is None:
        return None
    if matched < 0.0 or cand <= 0.0:
        return None
    return matched / cand


COLUMN_BACKED_FUNCS: Sequence[str] = ("spice_precision",)
