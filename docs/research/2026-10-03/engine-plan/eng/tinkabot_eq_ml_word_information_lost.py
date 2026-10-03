"""Stated ML identity: word information lost WIL (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite WER, MER, GLEU, BERTScore*, smatch, spice_*, PMI, ROUGE-L*,
ECE, MCE, CIDEr*, BLEU, METEOR, chrF, TER, cohen_kappa, matthews_corrcoef,
equal-weight JS, Herbrich, or grok elastic potential.

Source:
- Morris, A. C., Maier, V., & Green, P., "From WER and RIL to MER and WIL:
  improved evaluation measures for connected speech recognition,"
  Interspeech / ICSLP 2004.
  PDF §6 Word information lost, Eq. (21):
  WIP = (H·H)/(N1·N2) ≅ I(X,Y)/H(Y),  WIL = 1 − WIP
  with N1 = H+S+D and N2 = H+S+I (from earlier in the paper).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def _as_nonneg_count(value: object) -> float | None:
    if value is None or isinstance(value, (str, bytes, bool)):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number) or number < 0:
        return None
    return number


def word_information_lost(
    substitutions: object,
    deletions: object,
    insertions: object,
    hits: object,
) -> float | None:
    """WIL = 1 − (H·H)/(N1·N2) (Morris et al. 2004, Eq.21).

    N1 = H+S+D, N2 = H+S+I. Missing → null. Non-finite or negative → null.
    Zero N1 or N2 → null.
    """
    s = _as_nonneg_count(substitutions)
    d = _as_nonneg_count(deletions)
    i = _as_nonneg_count(insertions)
    h = _as_nonneg_count(hits)
    if s is None or d is None or i is None or h is None:
        return None
    n1 = h + s + d
    n2 = h + s + i
    if n1 == 0 or n2 == 0:
        return None
    wip = (h * h) / (n1 * n2)
    return 1.0 - wip


COLUMN_BACKED_FUNCS: Sequence[str] = ("word_information_lost",)
