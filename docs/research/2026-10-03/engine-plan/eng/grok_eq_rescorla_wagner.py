"""Basic Rescorla-Wagner update as printed by Yuille. No score. No mint. Never main.

delta_V1 = alpha1 * C1 * (E - C1 * V1 - C2 * V2)
delta_V2 = alpha2 * C2 * (E - C1 * V1 - C2 * V2)
Source: Yuille, The Rescorla-Wagner Algorithm and Maximum Likelihood Estimation
of Causal Parameters, NIPS 2004, eq. (7),
https://www.cs.jhu.edu/~ayuille1/pubs/ucla/A191_ayuille_ANIPS2005.pdf PDF page 4.
Alphas and cues are supplied. This is not a pick.
"""
from __future__ import annotations

import math
from typing import Any


def _finite(x: Any) -> float | None:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v):
        return None
    return v


def rescorla_wagner_basic(alpha1: Any, alpha2: Any, c1: Any, c2: Any, e: Any, v1: Any, v2: Any) -> tuple[float, float] | None:
    vals = [_finite(x) for x in (alpha1, alpha2, c1, c2, e, v1, v2)]
    if any(x is None for x in vals):
        return None
    a1, a2, cue1, cue2, outcome, val1, val2 = vals
    if a1 < 0.0 or a2 < 0.0:
        return None
    error = outcome - cue1 * val1 - cue2 * val2
    return a1 * cue1 * error, a2 * cue2 * error


FUNCTIONS = {"rescorla_wagner_basic": rescorla_wagner_basic}
