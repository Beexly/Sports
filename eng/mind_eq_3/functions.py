"""Complex equation functions. Exact on-disk columns only.

Every input name below is a real column already on disk (pbp / engine /
feature tables). No h_qb_act. No FTN-only fields. No invented mappings.
No score. No mint. Caller supplies point-in-time rows (lag <= 2 seasons).
Formulas copied from docs/research/2026-10-03/engine-plan/eng/equations.py
and home-minus-away diffs of existing h_/a_ columns.
"""
from __future__ import annotations

import math


def _num(row, name):
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


def drive_state_line(row):
    """0.2007*ydstogo - 0.0446*yardline_100. Columns: ydstogo, yardline_100."""
    ydstogo = _num(row, "ydstogo")
    yardline_100 = _num(row, "yardline_100")
    if ydstogo is None or yardline_100 is None:
        return None
    return 0.2007 * ydstogo - 0.0446 * yardline_100


def air_yards_to_sticks(row):
    """air_yards - ydstogo. Columns: air_yards, ydstogo."""
    air_yards = _num(row, "air_yards")
    ydstogo = _num(row, "ydstogo")
    if air_yards is None or ydstogo is None:
        return None
    return air_yards - ydstogo


def margin_residual(row):
    """result - spread_line. Columns: result, spread_line."""
    result = _num(row, "result")
    spread_line = _num(row, "spread_line")
    if result is None or spread_line is None:
        return None
    return result - spread_line


def total_residual(row):
    """total - total_line. Columns: total, total_line."""
    total = _num(row, "total")
    total_line = _num(row, "total_line")
    if total is None or total_line is None:
        return None
    return total - total_line


def complete_minus_cp(row):
    """complete_pass - cp. Columns: complete_pass, cp."""
    complete_pass = _num(row, "complete_pass")
    cp = _num(row, "cp")
    if complete_pass is None or cp is None:
        return None
    return complete_pass - cp


def home_wp_minus_away_wp(row):
    """home_wp - away_wp. Columns: home_wp, away_wp."""
    home_wp = _num(row, "home_wp")
    away_wp = _num(row, "away_wp")
    if home_wp is None or away_wp is None:
        return None
    return home_wp - away_wp


def h_minus_a_o_epa(row):
    """h_o_epa - a_o_epa. Columns: h_o_epa, a_o_epa."""
    h = _num(row, "h_o_epa")
    a = _num(row, "a_o_epa")
    if h is None or a is None:
        return None
    return h - a


def h_minus_a_d_epa(row):
    """h_d_epa - a_d_epa. Columns: h_d_epa, a_d_epa."""
    h = _num(row, "h_d_epa")
    a = _num(row, "a_d_epa")
    if h is None or a is None:
        return None
    return h - a


def h_minus_a_o_press(row):
    """h_o_press - a_o_press. Columns: h_o_press, a_o_press."""
    h = _num(row, "h_o_press")
    a = _num(row, "a_o_press")
    if h is None or a is None:
        return None
    return h - a


def h_minus_a_d_press(row):
    """h_d_press - a_d_press. Columns: h_d_press, a_d_press."""
    h = _num(row, "h_d_press")
    a = _num(row, "a_d_press")
    if h is None or a is None:
        return None
    return h - a


def h_minus_a_o_sr(row):
    """h_o_sr - a_o_sr. Columns: h_o_sr, a_o_sr."""
    h = _num(row, "h_o_sr")
    a = _num(row, "a_o_sr")
    if h is None or a is None:
        return None
    return h - a


def pressure_minus_clean_epa(row):
    """pressure_rate context vs clean_epa_baseline gap is not defined here.
    Exact: epa - clean_epa_baseline when both columns present.
    Columns: epa, clean_epa_baseline.
    """
    epa = _num(row, "epa")
    base = _num(row, "clean_epa_baseline")
    if epa is None or base is None:
        return None
    return epa - base


def team_points_from_lines(row):
    """home=(total+margin)/2 style using total_line and -spread_line as margin proxy.
    Only when both line columns exist. Columns: total_line, spread_line.
    Returns (home_pts, away_pts) or None.
    """
    total_line = _num(row, "total_line")
    spread_line = _num(row, "spread_line")
    if total_line is None or spread_line is None:
        return None
    # home margin vs spread: home favored when spread_line < 0 in common convention
    margin = -spread_line
    return (total_line + margin) / 2.0, (total_line - margin) / 2.0


def air_epa_minus_yac_epa(row):
    """comp_air_epa - yac_epa when both present. Columns: comp_air_epa, yac_epa."""
    a = _num(row, "comp_air_epa")
    y = _num(row, "yac_epa")
    if a is None or y is None:
        return None
    return a - y


FUNCTIONS = {
    "drive_state_line": {
        "fn": drive_state_line,
        "columns": ["ydstogo", "yardline_100"],
        "statement": "0.2007*ydstogo - 0.0446*yardline_100",
    },
    "air_yards_to_sticks": {
        "fn": air_yards_to_sticks,
        "columns": ["air_yards", "ydstogo"],
        "statement": "air_yards - ydstogo",
    },
    "margin_residual": {
        "fn": margin_residual,
        "columns": ["result", "spread_line"],
        "statement": "result - spread_line",
    },
    "total_residual": {
        "fn": total_residual,
        "columns": ["total", "total_line"],
        "statement": "total - total_line",
    },
    "complete_minus_cp": {
        "fn": complete_minus_cp,
        "columns": ["complete_pass", "cp"],
        "statement": "complete_pass - cp",
    },
    "home_wp_minus_away_wp": {
        "fn": home_wp_minus_away_wp,
        "columns": ["home_wp", "away_wp"],
        "statement": "home_wp - away_wp",
    },
    "h_minus_a_o_epa": {
        "fn": h_minus_a_o_epa,
        "columns": ["h_o_epa", "a_o_epa"],
        "statement": "h_o_epa - a_o_epa",
    },
    "h_minus_a_d_epa": {
        "fn": h_minus_a_d_epa,
        "columns": ["h_d_epa", "a_d_epa"],
        "statement": "h_d_epa - a_d_epa",
    },
    "h_minus_a_o_press": {
        "fn": h_minus_a_o_press,
        "columns": ["h_o_press", "a_o_press"],
        "statement": "h_o_press - a_o_press",
    },
    "h_minus_a_d_press": {
        "fn": h_minus_a_d_press,
        "columns": ["h_d_press", "a_d_press"],
        "statement": "h_d_press - a_d_press",
    },
    "h_minus_a_o_sr": {
        "fn": h_minus_a_o_sr,
        "columns": ["h_o_sr", "a_o_sr"],
        "statement": "h_o_sr - a_o_sr",
    },
    "epa_minus_clean_baseline": {
        "fn": pressure_minus_clean_epa,
        "columns": ["epa", "clean_epa_baseline"],
        "statement": "epa - clean_epa_baseline",
    },
    "team_points_from_lines": {
        "fn": team_points_from_lines,
        "columns": ["total_line", "spread_line"],
        "statement": "home=(total_line + (-spread_line))/2, away=(total_line - (-spread_line))/2",
    },
    "comp_air_epa_minus_yac_epa": {
        "fn": air_epa_minus_yac_epa,
        "columns": ["comp_air_epa", "yac_epa"],
        "statement": "comp_air_epa - yac_epa",
    },
}
