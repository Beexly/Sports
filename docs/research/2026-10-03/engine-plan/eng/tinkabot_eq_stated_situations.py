"""Stated situation-bin identities for mind ingestion (tinkabot lane).

Stated identity: tinkabot.
New-file helpers only. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Distinct names from gse_eq_corpus
and prior tinkabot modules. No HOLD restores.

Sources (corpus cites, not fit coefficients):
- docs/engine/research/2026-10-02/corpus-deep/deep/c02/buildable-systems.md
  System 2 cells: score_bucket {trail_8+, trail_1_7, tied, lead_1_7, lead_8+}
  down_distance {early 1-2, late 3-4} × {short ≤3, mid 4-7, long 8+}
- c02 INT-5 (via gse_eq_corpus docstring chain): garbage time qtr==4 and
  (wp > 0.95 or wp < 0.05)
- c02 NGS-8: deep air correlate air_yards ≥ 20
- c03 buildable-systems: neutral_mask 0.35 ≤ wp ≤ 0.65
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"

NEUTRAL_WP_LO = 0.35
NEUTRAL_WP_HI = 0.65
DEEP_AIR_YARDS = 20.0


def _null(x: float | None) -> bool:
    return x is None


def script_score_bucket(score_differential: float | None) -> str | None:
    """c02 System 2 score_bucket labels from score_differential."""
    if _null(score_differential):
        return None
    d = float(score_differential)
    if d <= -8:
        return "trail_8+"
    if -7 <= d <= -1:
        return "trail_1_7"
    if d == 0:
        return "tied"
    if 1 <= d <= 7:
        return "lead_1_7"
    if d >= 8:
        return "lead_8+"
    return None


def down_distance_label(down: float | None, ydstogo: float | None) -> str | None:
    """c02 System 2: {early|late}_{short|mid|long}."""
    if _null(down) or _null(ydstogo):
        return None
    d = float(down)
    y = float(ydstogo)
    if d in (1.0, 2.0):
        side = "early"
    elif d in (3.0, 4.0):
        side = "late"
    else:
        return None
    if y <= 3.0:
        dist = "short"
    elif y <= 7.0:
        dist = "mid"
    else:
        dist = "long"
    return f"{side}_{dist}"


def garbage_q4(qtr: float | None, wp: float | None) -> float | None:
    """c02 INT-5: qtr == 4 and (wp > 0.95 or wp < 0.05). Missing inputs → null."""
    if _null(qtr) or _null(wp):
        return None
    return 1.0 if float(qtr) == 4.0 and (float(wp) > 0.95 or float(wp) < 0.05) else 0.0


def deep_air_flag(air_yards: float | None) -> float | None:
    """c02 NGS-8: P(air_yards ≥ 20) indicator. Missing air yards → null."""
    if _null(air_yards):
        return None
    return 1.0 if float(air_yards) >= DEEP_AIR_YARDS else 0.0


def neutral_script_wp(wp: float | None) -> float | None:
    """c03: neutral_mask is 0.35 ≤ wp ≤ 0.65. Missing wp → null."""
    if _null(wp):
        return None
    w = float(wp)
    return 1.0 if NEUTRAL_WP_LO <= w <= NEUTRAL_WP_HI else 0.0


COLUMN_BACKED_FUNCS: Sequence[str] = (
    "script_score_bucket",
    "down_distance_label",
    "garbage_q4",
    "deep_air_flag",
    "neutral_script_wp",
)
