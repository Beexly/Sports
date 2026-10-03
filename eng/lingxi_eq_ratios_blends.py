"""Ratios, products, and multi-column blends — not two-column differences.

Not in equations.py. Not recoding mind_eq* two-column subtractions.
Exact on-disk columns only. No score. No Hermes mind files. Never main.
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


def _ratio(num: float | None, den: float | None) -> float | None:
    if num is None or den is None or den == 0.0:
        return None
    return num / den


def home_pass_epa_share(row: dict) -> float | None:
    """total_home_pass_epa / total_home_epa."""
    return _ratio(_num(row, "total_home_pass_epa"), _num(row, "total_home_epa"))


def home_rush_epa_share(row: dict) -> float | None:
    """total_home_rush_epa / total_home_epa."""
    return _ratio(_num(row, "total_home_rush_epa"), _num(row, "total_home_epa"))


def away_pass_epa_share(row: dict) -> float | None:
    """total_away_pass_epa / total_away_epa."""
    return _ratio(_num(row, "total_away_pass_epa"), _num(row, "total_away_epa"))


def away_rush_epa_share(row: dict) -> float | None:
    """total_away_rush_epa / total_away_epa."""
    return _ratio(_num(row, "total_away_rush_epa"), _num(row, "total_away_epa"))


def air_epa_fraction(row: dict) -> float | None:
    """comp_air_epa / (comp_air_epa + comp_yac_epa)."""
    air = _num(row, "comp_air_epa")
    yac = _num(row, "comp_yac_epa")
    if air is None or yac is None:
        return None
    return _ratio(air, air + yac)


def sr_weighted_offense_epa(row: dict) -> float | None:
    """h_o_sr * h_o_epa - a_o_sr * a_o_epa (four columns; product blend)."""
    hs = _num(row, "h_o_sr")
    he = _num(row, "h_o_epa")
    as_ = _num(row, "a_o_sr")
    ae = _num(row, "a_o_epa")
    if None in (hs, he, as_, ae):
        return None
    return hs * he - as_ * ae


def pe_re_offense_blend(row: dict) -> float | None:
    """0.5*(h_o_pepa+h_o_repa) - 0.5*(a_o_pepa+a_o_repa). Four columns."""
    hp = _num(row, "h_o_pepa")
    hr = _num(row, "h_o_repa")
    ap = _num(row, "a_o_pepa")
    ar = _num(row, "a_o_repa")
    if None in (hp, hr, ap, ar):
        return None
    return 0.5 * (hp + hr) - 0.5 * (ap + ar)


def xyac_expected_yards(row: dict) -> float | None:
    """xyac_success * xyac_mean_yardage."""
    s = _num(row, "xyac_success")
    m = _num(row, "xyac_mean_yardage")
    if s is None or m is None:
        return None
    return s * m


def top_share_ratio(row: dict) -> float | None:
    """top_share / top2_share."""
    return _ratio(_num(row, "top_share"), _num(row, "top2_share"))



def yards_per_needed(row: dict) -> float | None:
    """yards_gained / ydstogo. Ratio, not a difference."""
    return _ratio(_num(row, "yards_gained"), _num(row, "ydstogo"))


def completion_over_cp(row: dict) -> float | None:
    """complete_pass / cp when cp > 0 (hit rate vs model cp)."""
    return _ratio(_num(row, "complete_pass"), _num(row, "cp"))


def cpoe_scaled_air(row: dict) -> float | None:
    """cpoe * air_yards. Product of completion residual and depth."""
    c = _num(row, "cpoe")
    a = _num(row, "air_yards")
    if c is None or a is None:
        return None
    return c * a


def success_epa_product(row: dict) -> float | None:
    """success * epa."""
    s = _num(row, "success")
    e = _num(row, "epa")
    if s is None or e is None:
        return None
    return s * e


def success_wpa_product(row: dict) -> float | None:
    """success * wpa."""
    s = _num(row, "success")
    w = _num(row, "wpa")
    if s is None or w is None:
        return None
    return s * w


def shotgun_no_huddle_cooccur(row: dict) -> float | None:
    """shotgun * no_huddle (both treated as 0/1 rates)."""
    s = _num(row, "shotgun")
    n = _num(row, "no_huddle")
    if s is None or n is None:
        return None
    return s * n


def hurry_over_pace(row: dict) -> float | None:
    """tempo__hurryup_rate / tempo__pace_med."""
    return _ratio(_num(row, "tempo__hurryup_rate"), _num(row, "tempo__pace_med"))


FUNCTIONS = {
    "home_pass_epa_share": home_pass_epa_share,
    "home_rush_epa_share": home_rush_epa_share,
    "away_pass_epa_share": away_pass_epa_share,
    "away_rush_epa_share": away_rush_epa_share,
    "air_epa_fraction": air_epa_fraction,
    "sr_weighted_offense_epa": sr_weighted_offense_epa,
    "pe_re_offense_blend": pe_re_offense_blend,
    "xyac_expected_yards": xyac_expected_yards,
    "top_share_ratio": top_share_ratio,
    "yards_per_needed": yards_per_needed,
    "completion_over_cp": completion_over_cp,
    "cpoe_scaled_air": cpoe_scaled_air,
    "success_epa_product": success_epa_product,
    "success_wpa_product": success_wpa_product,
    "shotgun_no_huddle_cooccur": shotgun_no_huddle_cooccur,
    "hurry_over_pace": hurry_over_pace,
}
