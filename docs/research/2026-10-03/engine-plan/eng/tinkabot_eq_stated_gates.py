"""Stated column-gate identities for mind ingestion (tinkabot lane).

Stated identity: tinkabot.
New-file helpers only. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not restore HOLD-deleted
composed/alias helpers from tinkabot_eq_column.py.

Sources (corpus / coverage, not invented coefficients):
- eng/learn_wide_coverage.json floors.trust_weekly / floors.protection_stress
- docs/engine/research/2026-10-02/corpus-deep/deep/c03/buildable-systems.md
  (epa success = epa > 0; red zone yardline_100 <= 20; two-minute
  half_seconds_remaining <= 120)
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"

# Floors cited from eng/learn_wide_coverage.json
TRUST_TARGETS_FLOOR = 25
PROTECTION_GAMES_FLOOR = 3

# Stated thresholds from c03 buildable-systems / a05 (not fit coeffs)
RED_ZONE_YARDLINE = 20
TWO_MINUTE_SECONDS = 120


def _null(x: float | None) -> bool:
    return x is None


def trust_or_null(
    value: float | None,
    targets: float | None,
    floor: float = TRUST_TARGETS_FLOOR,
) -> float | None:
    """floors.trust_weekly: targets < 25 nulls hhi, n_eff, top_share, top2_share, top_ay_share."""
    if _null(value) or _null(targets):
        return None
    if float(targets) < floor:
        return None
    return float(value)


def protection_stress_or_null(
    value: float | None,
    games: float | None,
    null_reason: object | None = None,
    floor: float = PROTECTION_GAMES_FLOOR,
) -> float | None:
    """floors.protection_stress: null_reason set or games < 3 nulls stress fields."""
    if null_reason is not None:
        return None
    if _null(value) or _null(games):
        return None
    if float(games) < floor:
        return None
    return float(value)


def epa_success(epa: float | None) -> float | None:
    """c03 sequencing: success = epa > 0. Missing epa stays null. Zero is not a success."""
    if _null(epa):
        return None
    return 1.0 if float(epa) > 0.0 else 0.0


def red_zone(yardline_100: float | None) -> float | None:
    """c02/a05: red zone is yardline_100 <= 20. Missing line stays null."""
    if _null(yardline_100):
        return None
    return 1.0 if float(yardline_100) <= RED_ZONE_YARDLINE else 0.0


def two_minute(half_seconds_remaining: float | None) -> float | None:
    """a05: last 2:00 of either half is half_seconds_remaining <= 120."""
    if _null(half_seconds_remaining):
        return None
    return 1.0 if float(half_seconds_remaining) <= TWO_MINUTE_SECONDS else 0.0


COLUMN_BACKED_FUNCS: Sequence[str] = (
    "trust_or_null",
    "protection_stress_or_null",
    "epa_success",
    "red_zone",
    "two_minute",
)
