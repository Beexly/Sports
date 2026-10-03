"""Printed Maximum Calibration Error (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Chuan Guo, Geoff Pleiss, Yu Sun, Kilian Q. Weinberger,
On Calibration of Modern Neural Networks, ICML 2017,
arXiv:1706.04599, Section 2.1, equation (5), PDF page 3:

    MCE = max_m |acc(B_m) - conf(B_m)|

Worst-case absolute gap between bin accuracy and confidence.
Not ECE (Guo eq 3; tinkabot). Not METEOR/chrF/TER/BLEU/ROUGE.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def maximum_calibration_error(
    bin_accuracies: Sequence[float] | None,
    bin_confidences: Sequence[float] | None,
) -> float | None:
    """Equation (5), Guo et al. ICML 2017 arXiv:1706.04599 PDF page 3."""
    if bin_accuracies is None or bin_confidences is None:
        return None
    if isinstance(bin_accuracies, (str, bytes)) or isinstance(
        bin_confidences, (str, bytes)
    ):
        return None
    try:
        accs = [float(a) for a in bin_accuracies]
        confs = [float(c) for c in bin_confidences]
    except (TypeError, ValueError):
        return None
    if not accs or len(accs) != len(confs):
        return None
    gaps: list[float] = []
    for acc, conf in zip(accs, confs):
        if not math.isfinite(acc) or not math.isfinite(conf):
            return None
        if acc < 0.0 or acc > 1.0 or conf < 0.0 or conf > 1.0:
            return None
        gaps.append(abs(acc - conf))
    return max(gaps)


COLUMN_BACKED_FUNCS = ("maximum_calibration_error",)