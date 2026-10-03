"""Stated ML identity: GLEU score (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite BERTScore*, smatch, spice_*, ECE, MCE, CIDEr*, BLEU, ROUGE,
METEOR, chrF, TER, cohen_kappa, matthews_corrcoef, equal-weight JS,
Herbrich, or grok elastic potential.

Source:
- Wu, Y., Schuster, M., Chen, Z., Le, Q. V., Norouzi, M., Macherey, W.,
  et al., "Google's Neural Machine Translation System: Bridging the Gap
  between Human and Machine Translation," arXiv:1609.08144, 2016.
  https://arxiv.org/pdf/1609.08144
  arXiv PDF page 8: GLEU score is simply the minimum of recall and
  precision over 1–4 gram matches between output and target.
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


def gleu_score(precision: object, recall: object) -> float | None:
    """GLEU = min(precision, recall) (Wu et al. 2016, arXiv PDF p.8).

    Caller supplies n-gram precision and recall for 1–4 grams as defined
    in the paper. Missing → null. Non-finite → null.
    """
    p = _as_float(precision)
    r = _as_float(recall)
    if p is None or r is None:
        return None
    return min(p, r)


COLUMN_BACKED_FUNCS: Sequence[str] = ("gleu_score",)
