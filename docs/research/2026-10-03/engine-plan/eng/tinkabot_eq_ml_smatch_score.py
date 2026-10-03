"""Stated ML identity: smatch score (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite BERTScore*, spice_*, ECE, MCE, CIDEr*, BLEU, ROUGE,
METEOR, chrF, TER, cohen_kappa, matthews_corrcoef, equal-weight JS,
Herbrich, or grok elastic potential.

Source:
- Cai, S. and Knight, K., "Smatch: an Evaluation Metric for Semantic
  Feature Structures," Proceedings of the 51st Annual Meeting of the
  Association for Computational Linguistics (Volume 2: Short Papers),
  2013, pages 748–752. ACL anthology P13-2131.
  https://aclanthology.org/P13-2131.pdf
  PDF page 1 (anthology print p.748–749): the smatch score is the
  maximum of the f-scores obtainable via a one-to-one matching of
  variables between the two AMRs.
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


def _as_floats(values: object) -> list[float] | None:
    if values is None or isinstance(values, (str, bytes)):
        return None
    if not isinstance(values, Sequence):
        return None
    out: list[float] = []
    for value in values:
        number = _as_float(value)
        if number is None:
            return None
        out.append(number)
    return out


def smatch_score(mapping_f_scores: Sequence[float] | None) -> float | None:
    """smatch = max_m F(m) over variable mappings (Cai & Knight 2013).

    Caller supplies the f-score for each one-to-one variable mapping.
    Missing → null. Empty → null. Non-finite → null.
    """
    scores = _as_floats(mapping_f_scores)
    if scores is None or not scores:
        return None
    return max(scores)


COLUMN_BACKED_FUNCS: Sequence[str] = ("smatch_score",)
