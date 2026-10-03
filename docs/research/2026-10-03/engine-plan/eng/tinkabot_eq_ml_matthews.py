"""Stated ML identity: Matthews correlation coefficient (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Matthews, B. W., "Comparison of the predicted and observed secondary
  structure of T4 phage lysozyme," Biochimica et Biophysica Acta, vol. 405,
  1975, pp. 442–451. Correlation coefficient (printed p. 444):
  C = (TP·TN − FP·FN) / √((TP+FP)(TP+FN)(TN+FP)(TN+FN)),
  with non-negative counts TP,TN,FP,FN (caller-supplied).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def matthews_corrcoef(
    tp: float | None,
    tn: float | None,
    fp: float | None,
    fn: float | None,
) -> float | None:
    """C = (TP·TN − FP·FN) / √((TP+FP)(TP+FN)(TN+FP)(TN+FN)) (Matthews 1975).

    Missing → null. Any count < 0 → null. Denominator = 0 → null.
    """
    if tp is None or tn is None or fp is None or fn is None:
        return None
    tpp = float(tp)
    tnn = float(tn)
    fpp = float(fp)
    fnn = float(fn)
    if tpp < 0.0 or tnn < 0.0 or fpp < 0.0 or fnn < 0.0:
        return None
    den = (tpp + fpp) * (tpp + fnn) * (tnn + fpp) * (tnn + fnn)
    if den <= 0.0:
        return None
    return (tpp * tnn - fpp * fnn) / math.sqrt(den)


COLUMN_BACKED_FUNCS: Sequence[str] = ("matthews_corrcoef",)
