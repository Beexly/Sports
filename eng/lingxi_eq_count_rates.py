"""Stated rate from existing def_pressure_weekly counts.

proxy_rate = pressures / db. No free coefficients. Not in equations.py.
No score. No mint. Never main.
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


def def_pressure_proxy_from_counts(row: dict) -> float | None:
    """proxy_rate = pressures / db (def_pressure_weekly)."""
    pressures = _num(row, "def_pressure_weekly__pressures")
    db = _num(row, "def_pressure_weekly__db")
    if pressures is None or db is None or db == 0.0:
        return None
    return pressures / db


FUNCTIONS = {
    "def_pressure_proxy_from_counts": def_pressure_proxy_from_counts,
}