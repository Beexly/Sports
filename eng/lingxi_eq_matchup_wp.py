"""More equation functions not already in equations.py or lingxi_eq_column_deltas.py.

Exact on-disk columns only. No score. No Hermes mind files.
Does not touch eng/mind_eq*. Does not use clean_epa_baseline or h_qb_act.
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


def _diff(row: dict, left: str, right: str) -> float | None:
    a = _num(row, left)
    b = _num(row, right)
    if a is None or b is None:
        return None
    return a - b


def offense_epa_edge(row: dict) -> float | None:
    """h_o_epa - a_o_epa. Columns: h_o_epa, a_o_epa."""
    return _diff(row, "h_o_epa", "a_o_epa")


def defense_epa_edge(row: dict) -> float | None:
    """h_d_epa - a_d_epa. Columns: h_d_epa, a_d_epa."""
    return _diff(row, "h_d_epa", "a_d_epa")


def offense_press_edge(row: dict) -> float | None:
    """h_o_press - a_o_press. Columns: h_o_press, a_o_press."""
    return _diff(row, "h_o_press", "a_o_press")


def defense_press_edge(row: dict) -> float | None:
    """h_d_press - a_d_press. Columns: h_d_press, a_d_press."""
    return _diff(row, "h_d_press", "a_d_press")


def air_minus_yac_epa_raw(row: dict) -> float | None:
    """air_epa - yac_epa. Columns: air_epa, yac_epa."""
    return _diff(row, "air_epa", "yac_epa")


def air_minus_yac_wpa_raw(row: dict) -> float | None:
    """air_wpa - yac_wpa. Columns: air_wpa, yac_wpa."""
    return _diff(row, "air_wpa", "yac_wpa")


def home_wp_post_edge(row: dict) -> float | None:
    """home_wp_post - away_wp_post. Columns: home_wp_post, away_wp_post."""
    return _diff(row, "home_wp_post", "away_wp_post")


def total_epa_edge(row: dict) -> float | None:
    """total_home_epa - total_away_epa. Columns: total_home_epa, total_away_epa."""
    return _diff(row, "total_home_epa", "total_away_epa")


def total_pass_epa_edge(row: dict) -> float | None:
    """total_home_pass_epa - total_away_pass_epa."""
    return _diff(row, "total_home_pass_epa", "total_away_pass_epa")


def total_rush_epa_edge(row: dict) -> float | None:
    """total_home_rush_epa - total_away_rush_epa."""
    return _diff(row, "total_home_rush_epa", "total_away_rush_epa")


def total_score_edge(row: dict) -> float | None:
    """total_home_score - total_away_score."""
    return _diff(row, "total_home_score", "total_away_score")


def vegas_minus_model_wp(row: dict) -> float | None:
    """vegas_wp - wp. Columns: vegas_wp, wp."""
    return _diff(row, "vegas_wp", "wp")


def vegas_home_minus_home_wp(row: dict) -> float | None:
    """vegas_home_wp - home_wp. Columns: vegas_home_wp, home_wp."""
    return _diff(row, "vegas_home_wp", "home_wp")


def xyac_mean_minus_median(row: dict) -> float | None:
    """xyac_mean_yardage - xyac_median_yardage."""
    return _diff(row, "xyac_mean_yardage", "xyac_median_yardage")


def cpoe_minus_pbp(row: dict) -> float | None:
    """cpoe - cpoe_pbp. Columns: cpoe, cpoe_pbp."""
    return _diff(row, "cpoe", "cpoe_pbp")


def top_share_minus_top2(row: dict) -> float | None:
    """top_share - top2_share. Columns: top_share, top2_share."""
    return _diff(row, "top_share", "top2_share")


def press_minus_m_press(row: dict) -> float | None:
    """pressure_rate - m_press when both exist. Columns: pressure_rate, m_press."""
    return _diff(row, "pressure_rate", "m_press")


FUNCTIONS = {
    "offense_epa_edge": offense_epa_edge,
    "defense_epa_edge": defense_epa_edge,
    "offense_press_edge": offense_press_edge,
    "defense_press_edge": defense_press_edge,
    "air_minus_yac_epa_raw": air_minus_yac_epa_raw,
    "air_minus_yac_wpa_raw": air_minus_yac_wpa_raw,
    "home_wp_post_edge": home_wp_post_edge,
    "total_epa_edge": total_epa_edge,
    "total_pass_epa_edge": total_pass_epa_edge,
    "total_rush_epa_edge": total_rush_epa_edge,
    "total_score_edge": total_score_edge,
    "vegas_minus_model_wp": vegas_minus_model_wp,
    "vegas_home_minus_home_wp": vegas_home_minus_home_wp,
    "xyac_mean_minus_median": xyac_mean_minus_median,
    "cpoe_minus_pbp": cpoe_minus_pbp,
    "top_share_minus_top2": top_share_minus_top2,
    "press_minus_m_press": press_minus_m_press,
}
