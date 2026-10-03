"""Stated identities with existing learn_wide columns.

Sources:
- c03 buildable-systems: PROE_raw = pass_rate_actual - pass_rate_expected
- tempo columns: IQR = pace_p75 - pace_p25
- pass_rate_cells early|long: n_pass|n_rush / n_plays

WOPR (1.5/0.7) removed — no paper-page cite yet (HOLD 78fd05dc).
Not in equations.py. No score. No mint. Never main.
"""
from __future__ import annotations


def _num(row: dict, name: str) -> float | None:
    if row is None:
        return None
    try:
        v = row[name]
    except Exception:
        return None
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def proe_raw_from_rates(row: dict) -> float | None:
    """PROE_raw = pass_rate_actual - pass_rate_expected (c03)."""
    actual = _num(row, "proe_early_neutral__pass_rate_actual")
    expected = _num(row, "proe_early_neutral__pass_rate_expected")
    if actual is None or expected is None:
        return None
    return actual - expected


def tempo_pace_iqr(row: dict) -> float | None:
    """IQR = tempo__pace_p75 - tempo__pace_p25."""
    hi = _num(row, "tempo__pace_p75")
    lo = _num(row, "tempo__pace_p25")
    if hi is None or lo is None:
        return None
    return hi - lo


def early_long_pass_share(row: dict) -> float | None:
    """n_pass / n_plays for pass_rate_cells early|long."""
    n_pass = _num(row, "pass_rate_cells__early|long__n_pass")
    n_plays = _num(row, "pass_rate_cells__early|long__n_plays")
    if n_pass is None or n_plays is None or n_plays == 0.0:
        return None
    return n_pass / n_plays


def early_long_rush_share(row: dict) -> float | None:
    """n_rush / n_plays for pass_rate_cells early|long."""
    n_rush = _num(row, "pass_rate_cells__early|long__n_rush")
    n_plays = _num(row, "pass_rate_cells__early|long__n_plays")
    if n_rush is None or n_plays is None or n_plays == 0.0:
        return None
    return n_rush / n_plays


FUNCTIONS = {
    "proe_raw_from_rates": proe_raw_from_rates,
    "tempo_pace_iqr": tempo_pace_iqr,
    "early_long_pass_share": early_long_pass_share,
    "early_long_rush_share": early_long_rush_share,
}