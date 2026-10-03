"""Stated ML proper-scoring identity: Brier skill score (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports pairs. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not restore HOLD deletes.
Does not copy temperature_scale / epa_success / red_zone / two_minute.

Sources (ML / proper scoring — local research cites):
- C:\\Users\\Garrett\\_research\\agent-bus\\inbox\\from-motif\\gse-rl\\reward.py
- C:\\Users\\Garrett\\_research\\agent-bus\\inbox\\from-motif\\GSE-RL-MISSION-2026-10-02.md
  Brier skill: skill = 1 − brier / baseline, with brier = (p − y)².
  Baseline is caller-supplied (no frozen P0 or other coefficient here).

Maps onto existing in-repo brier column helper (equations.brier).
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def brier_skill(brier: float | None, baseline: float | None) -> float | None:
    """skill = 1 − brier / baseline. Missing inputs or non-positive baseline → null."""
    if brier is None or baseline is None:
        return None
    b = float(baseline)
    if b <= 0.0:
        return None
    return 1.0 - float(brier) / b


COLUMN_BACKED_FUNCS: Sequence[str] = ("brier_skill",)
