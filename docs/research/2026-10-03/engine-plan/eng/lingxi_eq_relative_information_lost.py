"""Printed relative information lost RIL (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Andrew C. Morris, Viktoria Maier, and Phil Green, From WER and
RIL to MER and WIL: improved evaluation measures for connected
speech recognition, Interspeech 2004, equation (12), PDF page 3:

    RIL = 1 − I(X, Y) / H(Y)

Not WIL (eq 21), MER, WER, TER, PMI, GLEU, BERTScore*,
smatch, SPICE*, CIDEr*, ROUGE-N/S/L P·F, kappa, ECE/MCE,
or elastic potential.
"""
from __future__ import annotations

import math

IDENTITY = "lingxi"


def relative_information_lost(
    mutual_info: float | None, entropy_y: float | None
) -> float | None:
    """Equation (12) RIL, Morris et al. Interspeech 2004 PDF page 3."""
    if mutual_info is None or entropy_y is None:
        return None
    i_xy = float(mutual_info)
    h_y = float(entropy_y)
    if not math.isfinite(i_xy) or not math.isfinite(h_y):
        return None
    if h_y <= 0.0:
        return None
    # MI and entropy are non-negative; I(X,Y) <= H(Y)
    if i_xy < 0.0 or i_xy > h_y:
        return None
    return 1.0 - (i_xy / h_y)


COLUMN_BACKED_FUNCS = ("relative_information_lost",)
