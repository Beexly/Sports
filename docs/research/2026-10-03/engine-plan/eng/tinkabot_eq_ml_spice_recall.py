"""Stated ML identity: SPICE recall R(c,S) (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite spice_f1, spice_precision, ECE, MCE, CIDEr*, BLEU, ROUGE,
METEOR, chrF, TER, cohen_kappa, matthews_corrcoef, equal-weight JS, or
Herbrich margin ranking.

Source:
- Anderson, P., Fernando, B., Johnson, M., and Gould, S.,
  "SPICE: Semantic Propositional Image Caption Evaluation,"
  ECCV 2016. arXiv:1607.08822.
  https://arxiv.org/pdf/1607.08822
  arXiv PDF page 7, Equation (4):
  R(c, S) = |T(G(c)) ⊗ T(G(S))| / |T(G(S))|,
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


def spice_recall(matched_tuples: object, reference_tuples: object) -> float | None:
    """R(c,S) = |T(G(c)) ⊗ T(G(S))| / |T(G(S))| (Anderson et al. 2016, Eq. 4).

    Caller supplies match cardinality and |T(G(S))|. Missing → null.
    Non-finite → null. Negative counts → null. |T(G(S))| = 0 → null.
    """
    matched = _as_float(matched_tuples)
    refs = _as_float(reference_tuples)
    if matched is None or refs is None:
        return None
    if matched < 0.0 or refs <= 0.0:
        return None
    return matched / refs


COLUMN_BACKED_FUNCS: Sequence[str] = ("spice_recall",)
