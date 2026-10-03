"""Stated tempo quartile gaps from existing pace columns. No free coefficients.

upper = pace_p75 - pace_med; lower = pace_med - pace_p25.
IQR already in lingxi_eq_stated_rates. No score. No mint. Never main.
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


def tempo_pace_upper_gap(row: dict) -> float | None:
    """pace_p75 - pace_med."""
    hi = _num(row, "tempo__pace_p75")
    mid = _num(row, "tempo__pace_med")
    if hi is None or mid is None:
        return None
    return hi - mid


def tempo_pace_lower_gap(row: dict) -> float | None:
    """pace_med - pace_p25."""
    mid = _num(row, "tempo__pace_med")
    lo = _num(row, "tempo__pace_p25")
    if mid is None or lo is None:
        return None
    return mid - lo


FUNCTIONS = {
    "tempo_pace_upper_gap": tempo_pace_upper_gap,
    "tempo_pace_lower_gap": tempo_pace_lower_gap,
}