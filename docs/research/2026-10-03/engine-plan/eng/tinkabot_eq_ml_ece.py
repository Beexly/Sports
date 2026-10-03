"""Stated ML identity: expected calibration error (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.
Does not rewrite BLEU, BLEU brevity, ROUGE-N/L/S, matthews_corrcoef,
equal-weight JS, or Herbrich margin ranking.

Source:
- Guo, C., Pleiss, G., Sun, Y., and Weinberger, K. Q.,
  "On Calibration of Modern Neural Networks,"
  Proceedings of the 34th International Conference on Machine Learning,
  2017. arXiv:1706.04599.
  https://arxiv.org/pdf/1706.04599
  arXiv PDF page 3, Equation (3):
  ECE = Σ_{m=1}^{M} (|B_m| / n) |acc(B_m) − conf(B_m)|,
  where n is the number of samples, |B_m| is the number of samples
  in bin m, acc(B_m) is that bin's accuracy, and conf(B_m) is that
  bin's confidence. The printed measure is a weighted average of the
  bins' absolute accuracy/confidence gaps.
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


def expected_calibration_error(
    bin_counts: Sequence[float] | None,
    accuracies: Sequence[float] | None,
    confidences: Sequence[float] | None,
    n: float | None,
) -> float | None:
    """ECE = Σ (|B_m| / n) |acc(B_m) − conf(B_m)| (Guo et al. 2017, Eq. 3).

    arXiv PDF page 3. Caller supplies the M bin counts, accuracies,
    confidences, and n. Missing → null. Non-finite inputs → null.
    n ≤ 0 → null. A negative bin count → null (|B_m| is a count).
    Empty bins or unequal lengths → null.
    """
    counts = _as_floats(bin_counts)
    accs = _as_floats(accuracies)
    confs = _as_floats(confidences)
    sample_count = _as_float(n)
    if counts is None or accs is None or confs is None or sample_count is None:
        return None
    if sample_count <= 0.0:
        return None
    if not counts or len(counts) != len(accs) or len(counts) != len(confs):
        return None
    if any(count < 0.0 for count in counts):
        return None
    total = 0.0
    for count, acc, conf in zip(counts, accs, confs):
        total += (count / sample_count) * abs(acc - conf)
    return total


COLUMN_BACKED_FUNCS: Sequence[str] = ("expected_calibration_error",)
