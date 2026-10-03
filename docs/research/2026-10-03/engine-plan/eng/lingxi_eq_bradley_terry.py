"""Printed non-sports identity: Bradley-Terry paired comparison (lingxi lane).

One function. Not sports. No I/O. Does not score or mint.

Source (printed in-repo):
docs/research/2026-10-03/engine-plan/GEMINI_DEEP_RESEARCH_CLOSED_2026-10-03.md
  item 10: "Bradley-Terry. Bradley and Terry, Rank analysis of incomplete
  block designs, Biometrika 1952. P(i beats j) = p_i / (p_i + p_j)."

Citation named there: Bradley, R. A. and Terry, M. E. (1952), Biometrika
39(3/4): 324-345. Strengths p_i and p_j are caller-supplied. No extra constant.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def bradley_terry(p_i: float | None, p_j: float | None) -> float | None:
    """P(i beats j) = p_i / (p_i + p_j)."""
    if p_i is None or p_j is None:
        return None
    pi = float(p_i)
    pj = float(p_j)
    if not math.isfinite(pi) or not math.isfinite(pj):
        return None
    if pi < 0.0 or pj < 0.0:
        return None
    denom = pi + pj
    if denom == 0.0:
        return None
    return pi / denom


COLUMN_BACKED_FUNCS: Sequence[str] = ("bradley_terry",)