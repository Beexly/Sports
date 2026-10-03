"""Equation functions not already in equations.py.

Exact on-disk columns only. No score. No Hermes mind files.
Does not redefine drive_state_line, air_yards_to_sticks, margin_residual,
home_minus_away, or other equations.py names.
Does not use clean_epa_baseline (not EPA_no-pressure; leave unused).
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


def _diff(row: dict, home: str, away: str) -> float | None:
    h = _num(row, home)
    a = _num(row, away)
    if h is None or a is None:
        return None
    return h - a


def pass_epa_edge(row: dict) -> float | None:
    """h_o_pepa - a_o_pepa. Columns: h_o_pepa, a_o_pepa."""
    return _diff(row, "h_o_pepa", "a_o_pepa")


def rush_epa_edge(row: dict) -> float | None:
    """h_o_repa - a_o_repa. Columns: h_o_repa, a_o_repa."""
    return _diff(row, "h_o_repa", "a_o_repa")


def explosive_edge(row: dict) -> float | None:
    """h_o_expl - a_o_expl. Columns: h_o_expl, a_o_expl."""
    return _diff(row, "h_o_expl", "a_o_expl")


def pass_proe_edge(row: dict) -> float | None:
    """h_o_proe - a_o_proe. Columns: h_o_proe, a_o_proe."""
    return _diff(row, "h_o_proe", "a_o_proe")


def turnover_edge(row: dict) -> float | None:
    """h_to - a_to. Columns: h_to, a_to."""
    return _diff(row, "h_to", "a_to")


def offense_success_edge(row: dict) -> float | None:
    """h_o_sr - a_o_sr. Columns: h_o_sr, a_o_sr."""
    return _diff(row, "h_o_sr", "a_o_sr")


def defense_success_edge(row: dict) -> float | None:
    """h_d_sr - a_d_sr. Columns: h_d_sr, a_d_sr."""
    return _diff(row, "h_d_sr", "a_d_sr")


def def_pass_epa_edge(row: dict) -> float | None:
    """h_d_pepa - a_d_pepa. Columns: h_d_pepa, a_d_pepa."""
    return _diff(row, "h_d_pepa", "a_d_pepa")


def def_rush_epa_edge(row: dict) -> float | None:
    """h_d_repa - a_d_repa. Columns: h_d_repa, a_d_repa."""
    return _diff(row, "h_d_repa", "a_d_repa")


def def_explosive_edge(row: dict) -> float | None:
    """h_d_expl - a_d_expl. Columns: h_d_expl, a_d_expl."""
    return _diff(row, "h_d_expl", "a_d_expl")


def air_minus_yac_epa(row: dict) -> float | None:
    """comp_air_epa - comp_yac_epa. Columns: comp_air_epa, comp_yac_epa."""
    return _diff(row, "comp_air_epa", "comp_yac_epa")


def air_minus_xyac_epa(row: dict) -> float | None:
    """comp_air_epa - xyac_epa. Columns: comp_air_epa, xyac_epa."""
    return _diff(row, "comp_air_epa", "xyac_epa")


def air_wpa_minus_yac_wpa(row: dict) -> float | None:
    """comp_air_wpa - comp_yac_wpa. Columns: comp_air_wpa, comp_yac_wpa."""
    return _diff(row, "comp_air_wpa", "comp_yac_wpa")


def score_gap(row: dict) -> float | None:
    """posteam_score - defteam_score. Columns: posteam_score, defteam_score."""
    return _diff(row, "posteam_score", "defteam_score")


FUNCTIONS = {
    "pass_epa_edge": pass_epa_edge,
    "rush_epa_edge": rush_epa_edge,
    "explosive_edge": explosive_edge,
    "pass_proe_edge": pass_proe_edge,
    "turnover_edge": turnover_edge,
    "offense_success_edge": offense_success_edge,
    "defense_success_edge": defense_success_edge,
    "def_pass_epa_edge": def_pass_epa_edge,
    "def_rush_epa_edge": def_rush_epa_edge,
    "def_explosive_edge": def_explosive_edge,
    "air_minus_yac_epa": air_minus_yac_epa,
    "air_minus_xyac_epa": air_minus_xyac_epa,
    "air_wpa_minus_yac_wpa": air_wpa_minus_yac_wpa,
    "score_gap": score_gap,
}
