"""Stated ML identity: maximum calibration error (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite ECE, METEOR/chrF/TER/BLEU/ROUGE, matthews_corrcoef,
equal-weight JS, or Herbrich margin ranking.

Source:
- Guo, C., Pleiss, G., Sun, Y., and Weinberger, K. Q.,
  "On Calibration of Modern Neural Networks,"
  Proceedings of the 34th International Conference on Machine Learning,
  2017. arXiv:1706.04599.
  https://arxiv.org/pdf/1706.04599
  arXiv PDF page 3, Equation (5):
  MCE = max_{m ∈ {1,...,M}} |acc(B_m) − conf(B_m)|,
  the largest absolute accuracy/confidence gap across bins.
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


def maximum_calibration_error(
    accuracies: Sequence[float] | None,
    confidences: Sequence[float] | None,
) -> float | None:
    """MCE = max_m |acc(B_m) − conf(B_m)| (Guo et al. 2017, Eq. 5).

    arXiv PDF page 3. Caller supplies per-bin accuracies and confidences.
    Missing → null. Non-finite inputs → null. Empty or unequal lengths → null.
    """
    accs = _as_floats(accuracies)
    confs = _as_floats(confidences)
    if accs is None or confs is None:
        return None
    if not accs or len(accs) != len(confs):
        return None
    return max(abs(acc - conf) for acc, conf in zip(accs, confs))


COLUMN_BACKED_FUNCS: Sequence[str] = ("maximum_calibration_error",)
