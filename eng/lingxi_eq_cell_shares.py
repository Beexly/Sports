"""Stated pass_rate_cells shares: n_pass/n_plays and n_rush/n_plays.

Corpus situation cells (early|mid, early|short, third|*, fourth|*).
early|long already in lingxi_eq_stated_rates. No coefficients. No score. No mint.
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


def _share(row: dict, cell: str, kind: str) -> float | None:
    n = _num(row, f"pass_rate_cells__{cell}__n_{kind}")
    plays = _num(row, f"pass_rate_cells__{cell}__n_plays")
    if n is None or plays is None or plays == 0.0:
        return None
    return n / plays


def early_mid_pass_share(row: dict) -> float | None:
    return _share(row, "early|mid", "pass")


def early_mid_rush_share(row: dict) -> float | None:
    return _share(row, "early|mid", "rush")


def early_short_pass_share(row: dict) -> float | None:
    return _share(row, "early|short", "pass")


def early_short_rush_share(row: dict) -> float | None:
    return _share(row, "early|short", "rush")


def third_long_pass_share(row: dict) -> float | None:
    return _share(row, "third|long", "pass")


def third_long_rush_share(row: dict) -> float | None:
    return _share(row, "third|long", "rush")


def third_mid_pass_share(row: dict) -> float | None:
    return _share(row, "third|mid", "pass")


def third_mid_rush_share(row: dict) -> float | None:
    return _share(row, "third|mid", "rush")


def third_short_pass_share(row: dict) -> float | None:
    return _share(row, "third|short", "pass")


def third_short_rush_share(row: dict) -> float | None:
    return _share(row, "third|short", "rush")


def fourth_long_pass_share(row: dict) -> float | None:
    return _share(row, "fourth|long", "pass")


def fourth_long_rush_share(row: dict) -> float | None:
    return _share(row, "fourth|long", "rush")


def fourth_mid_pass_share(row: dict) -> float | None:
    return _share(row, "fourth|mid", "pass")


def fourth_mid_rush_share(row: dict) -> float | None:
    return _share(row, "fourth|mid", "rush")


def fourth_short_pass_share(row: dict) -> float | None:
    return _share(row, "fourth|short", "pass")


def fourth_short_rush_share(row: dict) -> float | None:
    return _share(row, "fourth|short", "rush")


FUNCTIONS = {
    "early_mid_pass_share": early_mid_pass_share,
    "early_mid_rush_share": early_mid_rush_share,
    "early_short_pass_share": early_short_pass_share,
    "early_short_rush_share": early_short_rush_share,
    "third_long_pass_share": third_long_pass_share,
    "third_long_rush_share": third_long_rush_share,
    "third_mid_pass_share": third_mid_pass_share,
    "third_mid_rush_share": third_mid_rush_share,
    "third_short_pass_share": third_short_pass_share,
    "third_short_rush_share": third_short_rush_share,
    "fourth_long_pass_share": fourth_long_pass_share,
    "fourth_long_rush_share": fourth_long_rush_share,
    "fourth_mid_pass_share": fourth_mid_pass_share,
    "fourth_mid_rush_share": fourth_mid_rush_share,
    "fourth_short_pass_share": fourth_short_pass_share,
    "fourth_short_rush_share": fourth_short_rush_share,
}