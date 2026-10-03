"""Multi-column interactions — not prior lingxi ratios and not two-column diffs.

Avoids recoding eng/lingxi_eq_ratios_blends.py, lingxi_eq_column_deltas.py,
lingxi_eq_matchup_wp.py, mind_eq*, and equations.py.
Exact on-disk columns only. No score. No Hermes mind files. Never main.
"""
from __future__ import annotations

import math


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


def pass_matchup_sr(row: dict) -> float | None:
    """(h_o_pepa - a_d_pepa) * h_o_sr - (a_o_pepa - h_d_pepa) * a_o_sr.
    Four EPA columns plus two success rates.
    """
    hop = _num(row, "h_o_pepa")
    adp = _num(row, "a_d_pepa")
    aop = _num(row, "a_o_pepa")
    hdp = _num(row, "h_d_pepa")
    hs = _num(row, "h_o_sr")
    as_ = _num(row, "a_o_sr")
    if None in (hop, adp, aop, hdp, hs, as_):
        return None
    return (hop - adp) * hs - (aop - hdp) * as_


def rush_matchup_sr(row: dict) -> float | None:
    """(h_o_repa - a_d_repa) * h_o_sr - (a_o_repa - h_d_repa) * a_o_sr."""
    hor = _num(row, "h_o_repa")
    adr = _num(row, "a_d_repa")
    aor = _num(row, "a_o_repa")
    hdr = _num(row, "h_d_repa")
    hs = _num(row, "h_o_sr")
    as_ = _num(row, "a_o_sr")
    if None in (hor, adr, aor, hdr, hs, as_):
        return None
    return (hor - adr) * hs - (aor - hdr) * as_


def expl_proe_interaction(row: dict) -> float | None:
    """(h_o_expl * h_o_proe) - (a_o_expl * a_o_proe)."""
    he = _num(row, "h_o_expl")
    hp = _num(row, "h_o_proe")
    ae = _num(row, "a_o_expl")
    ap = _num(row, "a_o_proe")
    if None in (he, hp, ae, ap):
        return None
    return he * hp - ae * ap


def air_completion_mass(row: dict) -> float | None:
    """comp_air_epa / (comp_air_epa + comp_yac_epa) * complete_pass * cp.
    Air fraction gated by completion and model cp.
    """
    air = _num(row, "comp_air_epa")
    yac = _num(row, "comp_yac_epa")
    comp = _num(row, "complete_pass")
    cp = _num(row, "cp")
    if None in (air, yac, comp, cp):
        return None
    den = air + yac
    if den == 0.0:
        return None
    return (air / den) * comp * cp


def sticks_efficiency(row: dict) -> float | None:
    """(air_yards / ydstogo) * complete_pass when ydstogo != 0."""
    ay = _num(row, "air_yards")
    yt = _num(row, "ydstogo")
    comp = _num(row, "complete_pass")
    if None in (ay, yt, comp) or yt == 0.0:
        return None
    return (ay / yt) * comp


def epa_per_yard(row: dict) -> float | None:
    """epa / yards_gained when yards_gained != 0."""
    e = _num(row, "epa")
    y = _num(row, "yards_gained")
    if e is None or y is None or y == 0.0:
        return None
    return e / y


def wpa_per_yard(row: dict) -> float | None:
    """wpa / yards_gained when yards_gained != 0."""
    w = _num(row, "wpa")
    y = _num(row, "yards_gained")
    if w is None or y is None or y == 0.0:
        return None
    return w / y


def xyac_spread_success(row: dict) -> float | None:
    """(xyac_mean_yardage - xyac_median_yardage) * xyac_success.
    Spread times success — not a bare two-column diff export.
    """
    mean = _num(row, "xyac_mean_yardage")
    med = _num(row, "xyac_median_yardage")
    s = _num(row, "xyac_success")
    if None in (mean, med, s):
        return None
    return (mean - med) * s


def xyac_fd_mass(row: dict) -> float | None:
    """xyac_fd * xyac_mean_yardage * xyac_success."""
    fd = _num(row, "xyac_fd")
    m = _num(row, "xyac_mean_yardage")
    s = _num(row, "xyac_success")
    if None in (fd, m, s):
        return None
    return fd * m * s


def top_ay_concentration(row: dict) -> float | None:
    """top_ay_share / top_share when top_share != 0."""
    ay = _num(row, "top_ay_share")
    ts = _num(row, "top_share")
    if ay is None or ts is None or ts == 0.0:
        return None
    return ay / ts


def market_wp_tension(row: dict) -> float | None:
    """vegas_wp * home_wp * (1 - away_wp). Three-way market/model mass."""
    v = _num(row, "vegas_wp")
    h = _num(row, "home_wp")
    a = _num(row, "away_wp")
    if None in (v, h, a):
        return None
    return v * h * (1.0 - a)


def line_geometry(row: dict) -> float | None:
    """hypot(spread_line, total_line - 45) — line pair magnitude."""
    s = _num(row, "spread_line")
    t = _num(row, "total_line")
    if s is None or t is None:
        return None
    return math.hypot(s, t - 45.0)


def result_total_norm(row: dict) -> float | None:
    """result / total when total != 0."""
    r = _num(row, "result")
    t = _num(row, "total")
    if r is None or t is None or t == 0.0:
        return None
    return r / t


def qb_epa_on_pass_rate(row: dict) -> float | None:
    """qb_epa * pass_attempt / max(pass_attempt + rush_attempt, eps)."""
    q = _num(row, "qb_epa")
    p = _num(row, "pass_attempt")
    r = _num(row, "rush_attempt")
    if None in (q, p, r):
        return None
    den = p + r
    if den == 0.0:
        return None
    return q * (p / den)


def down_distance_pressure(row: dict) -> float | None:
    """down * ydstogo / max(yardline_100, 1)."""
    d = _num(row, "down")
    yt = _num(row, "ydstogo")
    yl = _num(row, "yardline_100")
    if None in (d, yt, yl):
        return None
    return d * yt / max(yl, 1.0)


def pace_iqr_hurry(row: dict) -> float | None:
    """(tempo__pace_p75 - tempo__pace_p25) * tempo__hurryup_rate."""
    p75 = _num(row, "tempo__pace_p75")
    p25 = _num(row, "tempo__pace_p25")
    h = _num(row, "tempo__hurryup_rate")
    if None in (p75, p25, h):
        return None
    return (p75 - p25) * h


def deep_quick_contrast(row: dict) -> float | None:
    """off_tendencies__deep_rate * (1 - off_tendencies__quick_game_rate)."""
    deep = _num(row, "off_tendencies__deep_rate")
    quick = _num(row, "off_tendencies__quick_game_rate")
    if deep is None or quick is None:
        return None
    return deep * (1.0 - quick)


def pressure_sack_product(row: dict) -> float | None:
    """def_pressure_weekly__proxy_rate * def_tendencies__sack_rate_vs."""
    pr = _num(row, "def_pressure_weekly__proxy_rate")
    sk = _num(row, "def_tendencies__sack_rate_vs")
    if pr is None or sk is None:
        return None
    return pr * sk


def early_rz_proe_product(row: dict) -> float | None:
    """proe_early_neutral__proe * rz_mix__rz_proe."""
    e = _num(row, "proe_early_neutral__proe")
    z = _num(row, "rz_mix__rz_proe")
    if e is None or z is None:
        return None
    return e * z


def third_down_first_rate(row: dict) -> float | None:
    """third_down_converted * first_down (co-occurrence mass)."""
    t = _num(row, "third_down_converted")
    f = _num(row, "first_down")
    if t is None or f is None:
        return None
    return t * f


FUNCTIONS = {
    "pass_matchup_sr": pass_matchup_sr,
    "rush_matchup_sr": rush_matchup_sr,
    "expl_proe_interaction": expl_proe_interaction,
    "air_completion_mass": air_completion_mass,
    "sticks_efficiency": sticks_efficiency,
    "epa_per_yard": epa_per_yard,
    "wpa_per_yard": wpa_per_yard,
    "xyac_spread_success": xyac_spread_success,
    "xyac_fd_mass": xyac_fd_mass,
    "top_ay_concentration": top_ay_concentration,
    "market_wp_tension": market_wp_tension,
    "line_geometry": line_geometry,
    "result_total_norm": result_total_norm,
    "qb_epa_on_pass_rate": qb_epa_on_pass_rate,
    "down_distance_pressure": down_distance_pressure,
    "pace_iqr_hurry": pace_iqr_hurry,
    "deep_quick_contrast": deep_quick_contrast,
    "pressure_sack_product": pressure_sack_product,
    "early_rz_proe_product": early_rz_proe_product,
    "third_down_first_rate": third_down_first_rate,
}
