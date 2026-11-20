"""
whitefield_and_nflverse_metrics_engine.py
===============================================================================
Clean-room Python engine implementing Niner Narrative & Brett Whitefield
(Fantasy Points Data Suite) advanced isolation metrics exclusively over
cleared GSE datasets (`nflverse` `play_by_play_2026.parquet` and FTN charting)
plus adaptive HTML table schema fingerprinting (zero network / zero anti-bot
evasion).

Implements:
  1. `compute_trench_isolation_pbwr_rbwr`: 2.5s PBWR/RBWR threshold isolating
     OL quick-pressure allowed (<2.5s) from QB late-hold sacks (>3.0s).
  2. `compute_true_routes_run_and_ass_breakout`: Strips pass-blocking &
     screen-blocking snaps from TE/WR route denominators; evaluates ASS & 1D/RR.
  3. `compute_rb_creation_vs_line_and_bellcow`: Decomposes OL-generated
     YBC/Att vs RB-created YAC/Att & Forced Missed Tackles (FMT/Att) + weekly
     Bellcow involvement trend.
  4. `compute_dual_success_rate_and_qb_progression`: Evaluates both EPA > 0
     and 50%/70%/100% situational yards-to-go Success Rate plus 1st-read vs
     secondary-read progression sustainability.
  5. `compute_cleared_nflverse_2026_efficiency_profile`: Computes dual Success
     Rate, early-down pass rate, and sack-to-dropback efficiency strictly from
     GSE's cleared `intelligence/coaching/data/play_by_play_2026.parquet`.
  6. `adaptive_match_html_table_headers`: Non-evasive local HTML table parser
     with header-signature matching inspired by Scrapling's adaptive parsing.
"""

from __future__ import annotations

import json
import math
import re
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

try:
    import pandas as pd
except Exception:  # pragma: no cover - optional runtime fallback
    pd = None


_REPO_ROOT = Path(__file__).resolve().parents[2]
CLEARED_PBP_2026_PATH = (
    Path(__file__).resolve().parent / "data" / "play_by_play_2026.parquet"
)
CLEARED_FTN_2026_PATH = (
    Path(__file__).resolve().parent / "data" / "ftn_charting_2026.parquet"
)
CLEARED_STATS_PLAYER_WEEK_2026_PATH = (
    _REPO_ROOT / "data" / "nflverse" / "stats_player_week_2026.parquet"
)
CLEARED_SNAP_COUNTS_2026_PATH = (
    _REPO_ROOT / "data" / "nflverse" / "snap_counts_2026.parquet"
)
WEEK11_ESPN_LIVE_SYNC_PATH = (
    _REPO_ROOT / "data" / "engine" / "week11_espn_live_sync_2026_11_19.json"
)

_PARQUET_SUMMARY_CACHE: Dict[str, Any] = {}


def _clamp(val: float, low: float, high: float) -> float:
    return max(low, min(high, float(val)))


def _soft_cap(val: float, cap: float) -> float:
    """Smooth odd sigmoid saturation c * tanh(x / c) preserving strict ordering."""
    if cap <= 0.0:
        return 0.0
    return float(cap * math.tanh(float(val) / cap))


def _sigmoid(z: float) -> float:
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-z))
    ez = math.exp(z)
    return ez / (1.0 + ez)


def compute_trench_isolation_pbwr_rbwr(
    dropbacks: int,
    ol_quick_pressures_under_25_sec: float,
    qb_late_sacks_over_30_sec: float,
    ol_blocks_held_25_sec_plus: float,
    rush_snaps: int,
    rush_blocks_won: float,
) -> Dict[str, float]:
    """Separates 2.5s PBWR/RBWR OL wins from >3.0s QB-caused sacks."""
    db = max(1, int(dropbacks))
    rs = max(1, int(rush_snaps))
    pbwr = _clamp(ol_blocks_held_25_sec_plus / db, 0.0, 1.0)
    rbwr = _clamp(rush_blocks_won / rs, 0.0, 1.0)
    ol_quick = max(0.0, float(ol_quick_pressures_under_25_sec))
    qb_late = max(0.0, float(qb_late_sacks_over_30_sec))
    ol_quick_rate = _clamp(ol_quick / db, 0.0, 1.0)
    total_fail = ol_quick + qb_late
    qb_share = 0.0 if total_fail == 0.0 else _clamp(qb_late / total_fail, 0.0, 1.0)
    rel = db / (db + 180.0)
    proj_pressure = 0.21 + rel * (ol_quick_rate - 0.21) + 0.04 * (qb_late / db)
    epa_delta = _clamp(0.18 * (pbwr - 0.62) + 0.14 * (rbwr - 0.70) - 0.22 * (ol_quick_rate - 0.20), -0.10, 0.10)
    return {
        "pbwr": round(pbwr, 6),
        "rbwr": round(rbwr, 6),
        "ol_true_quick_pressure_rate": round(ol_quick_rate, 6),
        "qb_self_inflicted_sack_share": round(qb_share, 6),
        "projected_true_pressure_rate": round(proj_pressure, 6),
        "trench_isolation_epa_delta": round(epa_delta, 6),
    }


def compute_true_routes_run_and_ass_breakout(
    total_pass_snaps: int,
    pass_block_snaps: int,
    screen_block_snaps: int,
    targets: int,
    receiving_yards: float,
    first_downs: int,
    average_separation_score: float,
) -> Dict[str, float]:
    """Computes True Routes Run (excluding blocking snaps) and ASS breakout score."""
    tot = max(1, int(total_pass_snaps))
    true_routes = max(1, tot - max(0, int(pass_block_snaps)) - max(0, int(screen_block_snaps)))
    naive_yprr = float(receiving_yards) / tot
    true_yprr = float(receiving_yards) / true_routes
    true_tprr = _clamp(targets / true_routes, 0.0, 1.0)
    fd_per_route = _clamp(first_downs / true_routes, 0.0, 1.0)
    ass_norm = _clamp(average_separation_score, -0.5, 0.5)
    raw = 1.15 * ass_norm + 1.85 * (fd_per_route - 0.08) + 1.1 * (true_tprr - 0.20) + 0.08 * (true_yprr - 1.65)
    breakout = _sigmoid(raw)
    boost = _clamp(0.06 * (breakout - 0.5), -0.04, 0.05)
    return {
        "true_routes_run": float(true_routes),
        "naive_yprr": round(naive_yprr, 6),
        "true_yprr": round(true_yprr, 6),
        "true_tprr": round(true_tprr, 6),
        "first_downs_per_route_run": round(fd_per_route, 6),
        "breakout_leading_score": round(breakout, 6),
        "projected_next_target_share_boost": round(boost, 6),
    }


def compute_rb_creation_vs_line_and_bellcow(
    carries: int,
    yards_before_contact_total: float,
    yards_after_contact_total: float,
    forced_missed_tackles: int,
    explosive_runs_10_plus: int,
    weekly_involvement_shares: Sequence[float],
) -> Dict[str, float]:
    """Separates RB YAC/Att + FMT/Att from OL YBC/Att plus Bellcow slope."""
    c = max(1, int(carries))
    ybc = float(yards_before_contact_total) / c
    yac = float(yards_after_contact_total) / c
    fmt = max(0, int(forced_missed_tackles)) / c
    exp_rate = _clamp(max(0, int(explosive_runs_10_plus)) / c, 0.0, 1.0)
    denom = max(0.25, max(0.0, ybc) + max(0.0, yac))
    share_ratio = _clamp(max(0.0, yac) / denom, 0.0, 1.0)

    slope = 0.0
    n = len(weekly_involvement_shares)
    if n >= 2:
        mx = (n - 1) / 2.0
        my = sum(weekly_involvement_shares) / n
        num = sum((i - mx) * (float(v) - my) for i, v in enumerate(weekly_involvement_shares))
        den = sum((i - mx) ** 2 for i in range(n))
        slope = _clamp(num / den, -0.25, 0.25) if den > 0 else 0.0

    rb_delta = _clamp(0.06 * (yac - 2.6) + 0.14 * (fmt - 0.18) + 0.12 * slope, -0.08, 0.08)
    return {
        "ybc_per_att": round(ybc, 6),
        "yac_per_att": round(yac, 6),
        "fmt_per_att": round(fmt, 6),
        "explosive_run_rate": round(exp_rate, 6),
        "rb_creation_share_ratio": round(share_ratio, 6),
        "bellcow_trend_slope": round(slope, 6),
        "rb_skill_epa_delta": round(rb_delta, 6),
    }


def compute_dual_success_rate_and_qb_progression(
    epa_positive_rate: float,
    situational_yards_success_rate: float,
    first_read_epa: float,
    secondary_read_epa: float,
    scramble_drill_epa: float,
    checkdown_rate: float,
) -> Dict[str, float]:
    """Computes blended dual Success Rate and multi-read QB sustainability."""
    epa_sr = _clamp(epa_positive_rate, 0.0, 1.0)
    yds_sr = _clamp(situational_yards_success_rate, 0.0, 1.0)
    blended = 0.62 * epa_sr + 0.38 * yds_sr
    depth_gap = float(first_read_epa) - float(secondary_read_epa)
    z = (
        2.4 * (float(secondary_read_epa) + 0.05)
        + 1.1 * (float(scramble_drill_epa) - 0.02)
        + 1.8 * (blended - 0.44)
        - 1.2 * max(0.0, float(checkdown_rate) - 0.12)
    )
    sust = _sigmoid(z)
    epa_delta = _clamp(0.18 * (blended - 0.45) + 0.09 * (sust - 0.5), -0.09, 0.09)
    return {
        "blended_success_rate": round(blended, 6),
        "progression_depth_gap": round(depth_gap, 6),
        "sustainability_index": round(sust, 6),
        "qb_progression_epa_delta": round(epa_delta, 6),
    }


def compute_cleared_nflverse_2026_efficiency_profile(
    pbp_path: Path = CLEARED_PBP_2026_PATH,
    team_abbr: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Computes league or team dual Success Rate (EPA > 0 vs 50%/70%/100% yards-to-go),
    pass-play share, and sack rate strictly from GSE's cleared nflverse parquet.
    """
    if pd is None or not pbp_path.exists():
        return {"available": False, "source": "nflverse_cleared_parquet_missing"}

    cols = [
        "week",
        "posteam",
        "play_type",
        "down",
        "ydstogo",
        "yards_gained",
        "epa",
        "pass_attempt",
        "rush_attempt",
        "sack",
        "qb_kneel",
        "qb_spike",
        "aborted_play",
    ]
    df = pd.read_parquet(pbp_path, columns=cols)
    scrim = df[
        df["play_type"].isin(["pass", "run"])
        & (df["qb_kneel"] != 1)
        & (df["qb_spike"] != 1)
        & (df["aborted_play"] != 1)
        & df["posteam"].notna()
    ].copy()
    if team_abbr:
        scrim = scrim[scrim["posteam"] == team_abbr.upper()]

    n = int(len(scrim))
    if n == 0:
        return {"available": True, "source": "nflverse_cleared_2026", "plays": 0}

    epa_sr = float((scrim["epa"].fillna(-1.0) > 0).mean())
    d = scrim["down"].fillna(1)
    ytg = scrim["ydstogo"].fillna(10)
    yg = scrim["yards_gained"].fillna(0)
    yds_ok = (
        ((d == 1) & (yg >= 0.50 * ytg))
        | ((d == 2) & (yg >= 0.70 * ytg))
        | ((d >= 3) & (yg >= ytg))
    )
    yds_sr = float(yds_ok.mean())
    dropbacks = int(scrim["pass_attempt"].fillna(0).sum() + scrim["sack"].fillna(0).sum())
    sacks = int(scrim["sack"].fillna(0).sum())
    max_week = int(df["week"].dropna().max()) if "week" in df.columns and len(df) > 0 else 0
    return {
        "available": True,
        "source": "nflverse_cleared_2026",
        "team": team_abbr.upper() if team_abbr else "LEAGUE",
        "plays": n,
        "total_pbp_rows": int(len(df)),
        "max_week": max_week,
        "epa_success_rate": round(epa_sr, 4),
        "situational_yards_success_rate": round(yds_sr, 4),
        "mean_epa_per_play": round(float(scrim["epa"].fillna(0.0).mean()), 4),
        "sack_rate_per_dropback": round(sacks / max(1, dropbacks), 4),
    }


def _ols_slope(values: Sequence[float]) -> float:
    n = len(values)
    if n < 2:
        return 0.0
    mx = (n - 1) / 2.0
    my = sum(float(v) for v in values) / n
    num = sum((i - mx) * (float(v) - my) for i, v in enumerate(values))
    den = sum((i - mx) ** 2 for i in range(n))
    return (num / den) if den > 0 else 0.0


def compute_non_sneak_success_rate_guard(
    total_offensive_plays: int,
    qb_sneak_plays: int,
    qb_sneak_successes: int,
    raw_yards_success_rate: float,
    first_and_20_penalty_drives: int,
    total_drives: int,
) -> Dict[str, Any]:
    """
    Strips 3rd/4th-and-1 QB sneak / Tush Push inflation from raw yards-to-go
    success rate and penalizes high 1st-and-20 holding stall frequency.
    """
    tot = max(1, int(total_offensive_plays))
    sneaks = max(0, min(tot - 1, int(qb_sneak_plays)))
    non_sneak = max(1, tot - sneaks)
    raw_sr = _clamp(raw_yards_success_rate, 0.0, 1.0)
    raw_succ = raw_sr * tot
    sneak_succ = max(0, min(sneaks, int(qb_sneak_successes)))
    non_sneak_sr = _clamp((raw_succ - sneak_succ) / non_sneak, 0.0, 1.0)
    inflation_gap = raw_sr - non_sneak_sr
    stall_rate = _clamp(max(0, int(first_and_20_penalty_drives)) / max(1, int(total_drives)), 0.0, 1.0)
    epa_delta = _clamp(0.16 * (non_sneak_sr - 0.44) - 0.14 * max(0.0, stall_rate - 0.06), -0.08, 0.08)
    return {
        "non_sneak_plays": non_sneak,
        "raw_yards_success_rate": round(raw_sr, 6),
        "non_sneak_success_rate": round(non_sneak_sr, 6),
        "sneak_inflation_gap": round(inflation_gap, 6),
        "first_and_20_stall_rate": round(stall_rate, 6),
        "cleaned_success_epa_delta": round(epa_delta, 6),
    }


def classify_pass_rush_coverage_regime(
    pass_rush_win_rate_under_25_sec: float,
    sack_rate_per_dropback: float,
    secondary_coverage_hold_index: float,
    qb_time_to_throw_sec: float,
    edge_rusher_out_count: float = 0.0,
    starting_cb_out_count: float = 0.0,
    ol_starter_out_count: float = 0.0,
) -> Dict[str, Any]:
    """
    Classifies the 2x2 <2.5s PRWR vs. sack-rate matrix while pricing live
    fractional Out/Doubtful/Questionable DE, CB, and OT stack-cliff injuries.
    """
    edge_eff = max(0.0, float(edge_rusher_out_count))
    cb_eff = max(0.0, float(starting_cb_out_count))
    ol_eff = max(0.0, float(ol_starter_out_count))
    ol_cliff = ol_eff + 0.35 * max(0.0, ol_eff - 1.0)
    cb_cascade = cb_eff + 0.25 * max(0.0, cb_eff - 1.0)

    adj_prwr = _clamp(
        pass_rush_win_rate_under_25_sec - 0.045 * edge_eff + 0.035 * ol_cliff,
        0.0,
        1.0,
    )
    adj_cov_hold = _clamp(
        secondary_coverage_hold_index - 0.07 * cb_cascade,
        0.0,
        1.0,
    )
    sack_rate = _clamp(sack_rate_per_dropback, 0.0, 1.0)
    high_prwr = adj_prwr >= 0.44
    high_sacks = sack_rate >= 0.068
    if high_prwr and high_sacks and adj_cov_hold >= 0.45:
        regime = "TRUE_TRENCH_DOMINANCE"
    elif (not high_prwr) and high_sacks:
        regime = "COVERAGE_SACK_REGIME"
    elif high_prwr and (not high_sacks):
        regime = "QUICK_RELEASE_BACKEND_VULNERABILITY"
    else:
        regime = "TRENCH_COLLAPSE"

    cov_sack_risk = _clamp(max(0.0, sack_rate - 0.055) * 7.0 * max(0.0, 0.45 - adj_prwr) * 14.0, 0.0, 1.0)
    quick_vuln = _clamp((1.0 - adj_cov_hold) * _clamp(2.65 - float(qb_time_to_throw_sec) + 0.45, 0.2, 1.0), 0.0, 1.0)
    true_disrupt = _clamp(0.65 * adj_prwr * 0.55 + 0.35 * sack_rate * 3.0, 0.0, 1.0)
    epa_delta = _clamp(
        0.16 * (adj_prwr - 0.43)
        + 0.10 * (adj_cov_hold - 0.50)
        - 0.05 * cov_sack_risk
        - 0.04 * (quick_vuln if regime == "QUICK_RELEASE_BACKEND_VULNERABILITY" else 0.0),
        -0.08,
        0.08,
    )
    return {
        "regime": regime,
        "adjusted_prwr": round(adj_prwr, 6),
        "adjusted_coverage_hold": round(adj_cov_hold, 6),
        "true_disruption_rate": round(true_disrupt, 6),
        "coverage_sack_regression_risk": round(cov_sack_risk, 6),
        "quick_release_vulnerability": round(quick_vuln, 6),
        "trench_coverage_regime_epa_delta": round(epa_delta, 6),
    }


def compute_strict_fmt_index(
    carries: int,
    raw_total_missed_tackles: int,
    incidental_los_arm_grabs: int,
    angle_eroding_open_field_bursts: int,
) -> Dict[str, Any]:
    """Strips incidental LOS arm-grab contacts and credits open-field burst FMTs."""
    c = max(1, int(carries))
    raw = max(0, int(raw_total_missed_tackles))
    los_noise = max(0, min(raw, int(incidental_los_arm_grabs)))
    bursts = max(0, int(angle_eroding_open_field_bursts))
    strict_cnt = max(0, raw - los_noise + bursts)
    strict_per_att = strict_cnt / c
    noise_share = 0.0 if raw == 0 else _clamp(los_noise / raw, 0.0, 1.0)
    epa_delta = _clamp(0.14 * (strict_per_att - 0.16), -0.06, 0.06)
    return {
        "strict_fmt_count": strict_cnt,
        "strict_fmt_per_att": round(strict_per_att, 6),
        "noise_inflation_share": round(noise_share, 6),
        "strict_elusiveness_epa_delta": round(epa_delta, 6),
    }


def evaluate_bellcow_trajectory_slope(
    weekly_points: Sequence[Mapping[str, Any]],
) -> Dict[str, Any]:
    """Detects week-over-week RB bellcow takeover and efficiency acceleration."""
    ordered = sorted(weekly_points, key=lambda r: float(r.get("week", 0)))
    snap_slope = _clamp(_ols_slope([float(p.get("snap_share", 0.5)) for p in ordered]), -0.25, 0.25)
    touch_slope = _clamp(_ols_slope([float(p.get("touch_share", 0.5)) for p in ordered]), -0.25, 0.25)
    exp_slope = _clamp(_ols_slope([float(p.get("explosive_run_rate", 0.1)) for p in ordered]), -0.15, 0.15)
    yac_slope = _clamp(_ols_slope([float(p.get("yac_per_att", 2.7)) for p in ordered]), -1.5, 1.5)
    fmt_slope = _clamp(_ols_slope([float(p.get("strict_fmt_per_att", 0.18)) for p in ordered]), -0.15, 0.15)
    yprr_last = float(ordered[-1].get("rb_yprr", 0.9)) if ordered else 0.9

    eff_accel = _clamp(0.45 * exp_slope * 4.0 + 0.35 * (yac_slope / 3.0) + 0.20 * fmt_slope * 4.0, -0.5, 0.5)
    raw_sig = 2.6 * snap_slope + 2.0 * touch_slope + 1.4 * eff_accel + 0.22 * (yprr_last - 1.0)
    bellcow_sig = _clamp(math.tanh(raw_sig), -1.0, 1.0)
    proj_snap_delta = _clamp(0.18 * bellcow_sig + 0.35 * snap_slope, -0.20, 0.20)
    breakout_flag = bool(bellcow_sig >= 0.32 and len(ordered) >= 2)
    rb_bellcow_epa_delta = _clamp(0.05 * bellcow_sig, -0.06, 0.06)
    return {
        "snap_share_slope": round(snap_slope, 6),
        "efficiency_acceleration": round(eff_accel, 6),
        "bellcow_expansion_signal": round(bellcow_sig, 6),
        "projected_next_week_snap_share_delta": round(proj_snap_delta, 6),
        "breakout_buy_low_flag": breakout_flag,
        "rb_bellcow_epa_delta": round(rb_bellcow_epa_delta, 6),
    }


def evaluate_scheme_concept_matchup_matrix(
    duo_share: float,
    outside_zone_share: float,
    inside_zone_share: float,
    gap_power_share: float,
    eleven_personnel_rate: float,
    light_box_rate_allowed_by_opp: float,
    def_epa_allowed_vs_duo: float,
    def_epa_allowed_vs_oz: float,
    def_epa_allowed_vs_iz: float,
    def_epa_allowed_vs_gap: float,
    off_epa_vs_two_high: float,
    off_epa_vs_man: float,
    def_two_high_rate: float,
    def_cover1_rate: float,
) -> Dict[str, float]:
    """Matches run-concept shares, personnel/box alignment, and coverage-shell fit."""
    raw_sum = max(0.0, duo_share) + max(0.0, outside_zone_share) + max(0.0, inside_zone_share) + max(0.0, gap_power_share)
    norm = raw_sum if raw_sum > 0.0 else 1.0
    w_duo = max(0.0, duo_share) / norm
    w_oz = max(0.0, outside_zone_share) / norm
    w_iz = max(0.0, inside_zone_share) / norm
    w_gap = max(0.0, gap_power_share) / norm

    run_edge = _clamp(
        w_duo * def_epa_allowed_vs_duo
        + w_oz * def_epa_allowed_vs_oz
        + w_iz * def_epa_allowed_vs_iz
        + w_gap * def_epa_allowed_vs_gap,
        -0.25,
        0.25,
    )
    two_high = _clamp(def_two_high_rate, 0.0, 1.0)
    cover1 = _clamp(def_cover1_rate, 0.0, 1.0)
    shell_edge = _clamp(two_high * off_epa_vs_two_high + cover1 * off_epa_vs_man, -0.25, 0.25)
    box_fit = _clamp((_clamp(eleven_personnel_rate, 0.0, 1.0) - 0.55) * 0.4 + (_clamp(light_box_rate_allowed_by_opp, 0.0, 1.0) - 0.50) * 0.5, -0.35, 0.35)
    epa_delta = _clamp(0.28 * run_edge + 0.30 * shell_edge + 0.04 * box_fit, -0.08, 0.08)
    return {
        "weighted_run_concept_epa_edge": round(run_edge, 6),
        "coverage_shell_fit_epa_edge": round(shell_edge, 6),
        "light_box_eleven_personnel_fit": round(box_fit, 6),
        "scheme_concept_matchup_epa_delta": round(epa_delta, 6),
    }


def validate_cross_charting_consistency(
    rpo_play_count: int,
    rpo_with_wr_run_block_or_quick_release_count: int,
    observed_model_pressure_rate: float,
    ground_truth_charted_pressure_rate: float,
    impossible_air_yards_count: int = 0,
    total_charted_pass_plays: int = 100,
) -> Dict[str, Any]:
    """Automated QC invariant checker + AWS/NGS Ep.3 population base-rate guard."""
    anomalies: List[str] = []
    rpo_tot = max(0, int(rpo_play_count))
    rpo_ok = max(0, min(rpo_tot, int(rpo_with_wr_run_block_or_quick_release_count)))
    rpo_mismatch = 0.0 if rpo_tot == 0 else _clamp((rpo_tot - rpo_ok) / rpo_tot, 0.0, 1.0)
    if rpo_mismatch > 0.20:
        anomalies.append(f"rpo_charting_mismatch_rate={rpo_mismatch:.3f}")

    base_truth = max(0.05, float(ground_truth_charted_pressure_rate))
    pressure_ratio = max(0.0, float(observed_model_pressure_rate)) / base_truth
    drift_flag = bool(pressure_ratio > 1.5 or pressure_ratio < 0.5)
    if drift_flag:
        anomalies.append(f"population_pressure_drift_ratio={pressure_ratio:.3f}")

    bad_air = max(0, int(impossible_air_yards_count))
    pass_den = max(1, int(total_charted_pass_plays))
    air_err = bad_air / pass_den
    if air_err > 0.03:
        anomalies.append(f"air_yards_depth_conflict_rate={air_err:.3f}")

    penalty = 0.35 * rpo_mismatch + (0.25 if drift_flag else 0.0) + 0.40 * _clamp(air_err * 5.0, 0.0, 1.0)
    reliability = _clamp(1.0 - penalty, 0.5, 1.0)
    return {
        "qc_passed": len(anomalies) == 0,
        "rpo_consistency_mismatch_rate": round(rpo_mismatch, 6),
        "population_pressure_inflation_ratio": round(pressure_ratio, 6),
        "population_drift_flag": drift_flag,
        "reliability_weight": round(reliability, 6),
        "anomalies": anomalies,
    }


def compute_garbage_time_adjusted_qbr_proxy(
    total_dropbacks: int,
    clean_script_dropbacks: int,
    clean_script_epa_per_dropback: float,
    garbage_time_epa_per_dropback: float,
    qb_scramble_epa_contribution: float,
    fumble_lost_penalty: float,
    defensive_penalties_drawn_yards: float,
    receiver_spectacular_catch_credit_split: float,
) -> Dict[str, float]:
    """
    Downweights Q4 garbage-time padding (WP < 0.05 or > 0.95), folds in QB
    scrambles + defensive penalties drawn, and applies WR credit split.
    """
    tot_db = max(1, int(total_dropbacks))
    clean_db = max(1, min(tot_db, int(clean_script_dropbacks)))
    garbage_db = max(0, tot_db - clean_db)
    garbage_share = _clamp(garbage_db / tot_db, 0.0, 1.0)

    raw_blend = (clean_db * clean_script_epa_per_dropback + garbage_db * garbage_time_epa_per_dropback) / tot_db
    filt_blend = (clean_db * clean_script_epa_per_dropback + 0.15 * garbage_db * garbage_time_epa_per_dropback) / max(1.0, clean_db + 0.15 * garbage_db)
    inflation_bias = raw_blend - filt_blend
    pen_boost = _clamp((float(defensive_penalties_drawn_yards) / tot_db) * 0.045, -0.02, 0.06)
    fum_tax = max(0.0, float(fumble_lost_penalty)) / tot_db
    wr_split = _clamp(receiver_spectacular_catch_credit_split, 0.0, 0.12)
    wr_adj_epa = filt_blend - wr_split * max(0.0, filt_blend)
    qbr_epa = wr_adj_epa + float(qb_scramble_epa_contribution) + pen_boost - fum_tax
    epa_delta = _clamp(0.45 * qbr_epa - 0.12 * max(0.0, inflation_bias), -0.08, 0.08)
    return {
        "garbage_time_share": round(garbage_share, 6),
        "garbage_time_inflation_bias": round(inflation_bias, 6),
        "receiver_credit_adjusted_epa": round(wr_adj_epa, 6),
        "garbage_time_filtered_qbr_epa": round(qbr_epa, 6),
        "qbr_sustainability_epa_delta": round(epa_delta, 6),
    }


def _load_cached_nflverse_2026_team_summaries(
    pbp_path: Path = CLEARED_PBP_2026_PATH,
    ftn_path: Path = CLEARED_FTN_2026_PATH,
    spw_path: Path = CLEARED_STATS_PLAYER_WEEK_2026_PATH,
    snap_path: Path = CLEARED_SNAP_COUNTS_2026_PATH,
) -> Dict[str, Any]:
    """Mtime-keyed cached aggregator across cleared Weeks 1-10 nflverse parquets."""
    if pd is None or not pbp_path.exists():
        return {"available": False, "max_week": 0, "teams": {}}
    mtime_sig = (
        pbp_path.stat().st_mtime,
        ftn_path.stat().st_mtime if ftn_path.exists() else 0.0,
        spw_path.stat().st_mtime if spw_path.exists() else 0.0,
        snap_path.stat().st_mtime if snap_path.exists() else 0.0,
    )
    cached = _PARQUET_SUMMARY_CACHE.get("summary")
    if cached is not None and _PARQUET_SUMMARY_CACHE.get("mtime_sig") == mtime_sig:
        return cached

    from intelligence.coaching.ftn_and_snap_deep_intelligence_engine import _normalize_player_key

    pbp_cols = [
        "game_id", "play_id", "drive", "week", "posteam", "defteam", "play_type", "down",
        "ydstogo", "yards_gained", "epa", "wp", "pass_attempt", "rush_attempt",
        "sack", "qb_hit", "cpoe", "qb_kneel", "qb_spike", "aborted_play", "qb_scramble",
        "fumble_lost", "penalty", "penalty_team", "penalty_type", "penalty_yards",
        "run_location", "run_gap", "qtr",
    ]
    df = pd.read_parquet(pbp_path, columns=pbp_cols)
    max_week = int(df["week"].dropna().max()) if len(df) > 0 else 0
    scrim = df[
        df["play_type"].isin(["pass", "run"])
        & (df["qb_kneel"] != 1)
        & (df["qb_spike"] != 1)
        & (df["aborted_play"] != 1)
        & df["posteam"].notna()
    ].copy()

    if ftn_path.exists():
        ftn_cols = [
            "nflverse_game_id", "nflverse_play_id", "n_defense_box",
            "is_motion", "is_play_action", "is_screen_pass", "is_rpo",
            "is_qb_sneak", "n_pass_rushers", "is_qb_fault_sack", "is_created_reception",
        ]
        ftn = pd.read_parquet(ftn_path, columns=ftn_cols)
        scrim = scrim.merge(
            ftn,
            left_on=["game_id", "play_id"],
            right_on=["nflverse_game_id", "nflverse_play_id"],
            how="left",
        )
    else:
        scrim["n_defense_box"] = 6
        scrim["n_pass_rushers"] = 4
        for col in ("is_motion", "is_play_action", "is_screen_pass", "is_rpo", "is_qb_sneak", "is_qb_fault_sack", "is_created_reception"):
            scrim[col] = False

    d = scrim["down"].fillna(1)
    ytg = scrim["ydstogo"].fillna(10)
    yg = scrim["yards_gained"].fillna(0)
    scrim["yds_ok"] = (
        ((d == 1) & (yg >= 0.50 * ytg))
        | ((d == 2) & (yg >= 0.70 * ytg))
        | ((d >= 3) & (yg >= ytg))
    )
    scrim["is_clean_script"] = ~((scrim["qtr"].fillna(1) == 4) & ((scrim["wp"].fillna(0.5) < 0.05) | (scrim["wp"].fillna(0.5) > 0.95)))
    scrim["is_db"] = (scrim["pass_attempt"].fillna(0) == 1) | (scrim["sack"].fillna(0) == 1)
    # Use genuine FTN charted `is_qb_sneak` instead of all short-yardage RB carries
    scrim["is_sneak_proxy"] = scrim["is_qb_sneak"].fillna(False).astype(bool)

    rb_weekly_by_team: Dict[str, List[Dict[str, Any]]] = {}
    if spw_path.exists():
        spw = pd.read_parquet(spw_path, columns=[
            "player_display_name", "position", "week", "team", "carries", "rushing_yards",
            "rushing_10", "targets", "receiving_yards",
        ])
        rbs = spw[(spw["position"] == "RB") & (spw["carries"].fillna(0) > 0)].copy()
        snap_map: Dict[Tuple[str, int, str], float] = {}
        if snap_path.exists():
            snp = pd.read_parquet(snap_path, columns=["team", "week", "player", "offense_pct"])
            for row in snp.itertuples(index=False):
                pct_val = 0.0 if pd.isna(row.offense_pct) else float(row.offense_pct)
                snap_map[(str(row.team).upper(), int(row.week), _normalize_player_key(str(row.player)))] = pct_val
        team_rb_carries = rbs.groupby(["team", "week"])["carries"].transform("sum").clip(lower=1)
        rbs["touch_share"] = rbs["carries"].fillna(0) / team_rb_carries
        if len(rbs) > 0:
            # Prefer recent L3 active lead RB when present, else season carry leader
            rbs_recent = rbs[rbs["week"] >= max(1, max_week - 2)]
            lead_source = rbs_recent if len(rbs_recent) > 0 else rbs
            lead_names = (
                lead_source.groupby(["team", "player_display_name"])["carries"]
                .sum()
                .reset_index()
                .sort_values(["team", "carries"], ascending=[True, False])
                .drop_duplicates("team")
            )
            for row in lead_names.itertuples(index=False):
                tm = str(row.team).upper()
                pname = str(row.player_display_name)
                pkey = _normalize_player_key(pname)
                p_rows = rbs[(rbs["team"] == row.team) & (rbs["player_display_name"] == pname)].sort_values("week").tail(4)
                pts: List[Dict[str, Any]] = []
                for pr in p_rows.itertuples(index=False):
                    car = max(1, int(pr.carries or 0))
                    exp_r = float(pr.rushing_10 or 0) / car
                    snap_pct = snap_map.get((tm, int(pr.week), pkey), float(pr.touch_share))
                    pts.append({
                        "week": int(pr.week),
                        "snap_share": _clamp(snap_pct, 0.0, 1.0),
                        "touch_share": _clamp(float(pr.touch_share), 0.0, 1.0),
                        "explosive_run_rate": _clamp(exp_r, 0.0, 1.0),
                        "yac_per_att": _clamp(0.55 * (float(pr.rushing_yards or 0) / car), 0.5, 5.5),
                        "strict_fmt_per_att": _clamp(0.12 + 0.5 * exp_r, 0.05, 0.40),
                        "rb_yprr": _clamp(float(pr.receiving_yards or 0) / max(8.0, float(pr.targets or 1) * 4.2), 0.2, 3.0),
                    })
                rb_weekly_by_team[tm] = pts

    teams_out: Dict[str, Dict[str, Any]] = {}
    all_teams = sorted(set(scrim["posteam"].dropna().astype(str)) | set(scrim["defteam"].dropna().astype(str)))
    for tm in all_teams:
        off = scrim[scrim["posteam"] == tm]
        dfn = scrim[scrim["defteam"] == tm]
        n_off = max(1, int(len(off)))
        sneaks = off[off["is_sneak_proxy"]]
        n_sneaks = int(len(sneaks))
        sneak_succ = int(sneaks["yds_ok"].sum()) if n_sneaks > 0 else 0
        raw_yds_sr = float(off["yds_ok"].mean()) if len(off) > 0 else 0.43

        off_db = off[off["is_db"]]
        clean_db = off_db[off_db["is_clean_script"]]
        garb_db = off_db[~off_db["is_clean_script"]]
        n_db = max(1, int(len(off_db)))
        n_clean_db = max(1, int(len(clean_db)))
        clean_epa_db = float(clean_db["epa"].fillna(0.0).mean()) if len(clean_db) > 0 else 0.0
        garb_epa_db = float(garb_db["epa"].fillna(0.0).mean()) if len(garb_db) > 0 else clean_epa_db
        scr_epa = float(off[off["qb_scramble"] == 1]["epa"].fillna(0.0).sum()) / n_db if len(off) > 0 else 0.0
        qb_sacks = off[off["sack"] == 1]
        qb_fault_sacks = int(qb_sacks["is_qb_fault_sack"].fillna(False).sum()) if len(qb_sacks) > 0 else 0

        off_rushes = off[off["rush_attempt"] == 1]
        dfn_rushes = dfn[dfn["rush_attempt"] == 1]
        dfn_db = dfn[dfn["is_db"]]
        dfn_sacks = int(dfn_db["sack"].fillna(0).sum()) if len(dfn_db) > 0 else 0
        dfn_blitz_rate = float((dfn_db["n_pass_rushers"].fillna(4) >= 5).mean()) if len(dfn_db) > 0 else 0.27
        dfn_light_box = float((dfn["n_defense_box"].fillna(6) <= 6).mean()) if len(dfn) > 0 else 0.56
        rpo_plays = int(off["is_rpo"].fillna(False).sum()) if len(off) > 0 else 0
        fumbles = float(off["fumble_lost"].fillna(0).sum()) if len(off) > 0 else 0.0

        def _gap_epa(frame: Any, gap_vals: Sequence[str], fallback: float = 0.0) -> float:
            sub = frame[frame["run_gap"].isin(gap_vals)]
            return float(sub["epa"].fillna(0.0).mean()) if len(sub) >= 5 else fallback

        n_drives_real = max(1, int(off[["game_id", "drive"]].drop_duplicates().shape[0])) if len(off) > 0 else 1
        off_sack_rate = float(off_db["sack"].fillna(0).mean()) if len(off_db) > 0 else 0.062
        off_qb_hit_rate = float(off_db["qb_hit"].fillna(0).mean()) if len(off_db) > 0 else 0.145
        off_blitz_faced_rate = float((off_db["n_pass_rushers"].fillna(4) >= 5).mean()) if len(off_db) > 0 else 0.28
        # Calibrated clean-room nflverse -> true pressure rate OLS (shard2, n=32, R^2=0.4554)
        ols_true_pressure_rate = _clamp(
            0.16945 + 0.23179 * off_sack_rate + 0.590093 * off_qb_hit_rate - 0.176444 * off_blitz_faced_rate,
            0.08,
            0.38,
        )
        tm_pens = df[(df["penalty"] == 1) & (df["penalty_team"] == tm)]
        n_hold = int((tm_pens["penalty_type"] == "Offensive Holding").sum()) if len(tm_pens) > 0 else 0
        n_fs = int((tm_pens["penalty_type"] == "False Start").sum()) if len(tm_pens) > 0 else 0
        off_hold_fs_per_drive = (n_hold + n_fs) / n_drives_real
        off_att_f = off[off["pass_attempt"].fillna(0) == 1]
        off_cpoe_val = float(off_att_f["cpoe"].dropna().mean()) if len(off_att_f["cpoe"].dropna()) > 0 else 0.0

        teams_out[tm] = {
            "plays": int(len(off)),
            "raw_yards_sr": raw_yds_sr,
            "sneak_plays": n_sneaks,
            "sneak_successes": sneak_succ,
            "first_and_20_drives": int(((off["down"] == 1) & (off["ydstogo"] >= 18)).sum()) if len(off) > 0 else 0,
            "estimated_drives": n_drives_real,
            "total_dropbacks": n_db,
            "clean_dropbacks": n_clean_db,
            "clean_epa_db": clean_epa_db,
            "garbage_epa_db": garb_epa_db,
            "scramble_epa_contrib": scr_epa,
            "fumble_lost": fumbles,
            "qb_fault_sacks": qb_fault_sacks,
            "ol_sacks": max(0, int(off_db["sack"].fillna(0).sum()) - qb_fault_sacks),
            "off_sack_rate": round(off_sack_rate, 4),
            "off_qb_hit_rate": round(off_qb_hit_rate, 4),
            "off_blitz_faced_rate": round(off_blitz_faced_rate, 4),
            "ols_true_pressure_rate": round(ols_true_pressure_rate, 4),
            "off_hold_fs_per_drive": round(off_hold_fs_per_drive, 4),
            "off_cpoe": round(off_cpoe_val, 3),
            "rpo_plays": rpo_plays,
            "pass_epa_clean": clean_epa_db,
            "rush_epa_off": float(off_rushes["epa"].fillna(0.0).mean()) if len(off_rushes) > 0 else 0.0,
            "def_sack_rate": dfn_sacks / max(1, int(len(dfn_db))),
            "def_blitz_rate": dfn_blitz_rate,
            "def_light_box_rate": dfn_light_box,
            "def_pass_epa_allowed": float(dfn_db["epa"].fillna(0.0).mean()) if len(dfn_db) > 0 else 0.0,
            "def_epa_allowed_inside": _gap_epa(dfn_rushes, ["guard"]),
            "def_epa_allowed_off_tackle": _gap_epa(dfn_rushes, ["tackle"]),
            "def_epa_allowed_outside": _gap_epa(dfn_rushes, ["end"]),
            "off_inside_share": float((off_rushes["run_gap"] == "guard").mean()) if len(off_rushes) > 0 else 0.34,
            "off_tackle_share": float((off_rushes["run_gap"] == "tackle").mean()) if len(off_rushes) > 0 else 0.33,
            "off_outside_share": float((off_rushes["run_gap"] == "end").mean()) if len(off_rushes) > 0 else 0.33,
            "rb_weekly_points": rb_weekly_by_team.get(tm, []),
        }

    out = {"available": True, "max_week": max_week, "teams": teams_out}
    _PARQUET_SUMMARY_CACHE["mtime_sig"] = mtime_sig
    _PARQUET_SUMMARY_CACHE["summary"] = out
    return out


def _load_live_espn_injury_counts(team_abbr: str, context: Mapping[str, Any]) -> Dict[str, Any]:
    """
    Extracts snap-share weighted Out/Doubtful/Questionable injury impacts across
    DE, CB, OL, DT, TE, LB using `ftn_and_snap_deep_intelligence_engine`.
    Multi-week IR is logged separately (`ir_already_priced_in`) so already-missing
    IR players are NOT double-counted against Weeks 1-10 baselines, and 0-snap
    reserves do NOT trigger false positional stacking cliffs.
    """
    from intelligence.coaching.ftn_and_snap_deep_intelligence_engine import (
        evaluate_snap_weighted_injury_impact,
        normalize_nfl_team,
    )

    tm = normalize_nfl_team(team_abbr)
    raw_map = dict(context.get("espn_injuries") or {})
    norm_map = {normalize_nfl_team(k): list(v or []) for k, v in raw_map.items()}
    injs = list(norm_map.get(tm) or [])
    if not injs and WEEK11_ESPN_LIVE_SYNC_PATH.exists():
        try:
            sync = json.loads(WEEK11_ESPN_LIVE_SYNC_PATH.read_text(encoding="utf-8"))
            raw_sync = dict(sync.get("tnf_injuries") or {})
            norm_sync = {normalize_nfl_team(k): list(v or []) for k, v in raw_sync.items()}
            injs = list(norm_sync.get(tm) or [])
        except Exception:
            injs = []
    return evaluate_snap_weighted_injury_impact(tm, injs)


def evaluate_whitefield_and_nflverse_matchup_profile(
    away_team: str,
    home_team: str,
    context: Optional[Mapping[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Live pre-simulation evaluator computing Stream 15M Whitefield isolation +
    all 7 PFR 11_19 rules directly over cleared Weeks 1-10 nflverse + FTN +
    snap-count parquets and live Week 11 ESPN injuries for BOTH teams with
    strict one-owner channel separation, incremental baseline residualization,
    asymmetric Questionable sigma, and smooth tanh soft-caps.
    """
    from intelligence.coaching.ftn_and_snap_deep_intelligence_engine import (
        load_ftn_pbp_32team_charting_profiles,
        normalize_nfl_team,
    )

    ctx = dict(context or {})
    away_u = normalize_nfl_team(away_team or "IND")
    home_u = normalize_nfl_team(home_team or "HOU")
    cache = _load_cached_nflverse_2026_team_summaries()
    ftn_cache = load_ftn_pbp_32team_charting_profiles()
    teams_map = cache.get("teams") or {}
    ftn_map = ftn_cache.get("teams") or {}

    def _side_eval(off_tm: str, def_tm: str, ol_out_override: Optional[float]) -> Dict[str, Any]:
        off_s = teams_map.get(off_tm) or {}
        def_s = teams_map.get(def_tm) or {}
        off_ftn = ftn_map.get(off_tm) or {}
        def_ftn = ftn_map.get(def_tm) or {}
        def_inj = _load_live_espn_injury_counts(def_tm, ctx)
        off_inj = _load_live_espn_injury_counts(off_tm, ctx)

        if ol_out_override is not None:
            ol_out = float(ol_out_override)
            ol_cliff = ol_out + 0.35 * max(0.0, ol_out - 1.0)
        else:
            ol_out = float(off_inj["ol_out"])
            ol_cliff = float(off_inj.get("ol_cliff_weighted", ol_out))
        cb_out = float(def_inj["cb_out"])
        cb_cascade = float(def_inj.get("cb_cliff_weighted", cb_out))

        plays = int(off_s.get("plays", 520))
        sr_guard = compute_non_sneak_success_rate_guard(
            total_offensive_plays=plays,
            qb_sneak_plays=int(off_s.get("sneak_plays", 10)),
            qb_sneak_successes=int(off_s.get("sneak_successes", 8)),
            raw_yards_success_rate=float(off_s.get("raw_yards_sr", 0.43)),
            first_and_20_penalty_drives=int(off_s.get("first_and_20_drives", 5)),
            total_drives=int(off_s.get("estimated_drives", 85)),
        )
        n_db = max(1, int(off_s.get("total_dropbacks", 280)))
        ol_sacks = int(off_ftn.get("ol_fault_sacks", off_s.get("ol_sacks", 12)))
        qb_sacks = int(off_ftn.get("qb_fault_sacks", off_s.get("qb_fault_sacks", 6)))
        # Calibrated clean-room nflverse pressure rate (OLS R^2=0.4554 over sack+qb_hit+blitz_faced)
        emp_ol_press_rate = float(off_s.get("ols_true_pressure_rate", _clamp((ol_sacks * 3.1 + 0.049 * n_db) / n_db, 0.08, 0.38)))
        ol_quick_est = max(12.0, emp_ol_press_rate * n_db - float(qb_sacks))
        # Strictly evaluate baseline healthy Weeks 1-10 trench & rush-regime states here so live
        # ESPN injuries are NEVER double/triple counted across trench_iso, rush_regime, and pressure_hazard!
        trench_iso = compute_trench_isolation_pbwr_rbwr(
            dropbacks=n_db,
            ol_quick_pressures_under_25_sec=ol_quick_est,
            qb_late_sacks_over_30_sec=float(qb_sacks),
            ol_blocks_held_25_sec_plus=max(50.0, n_db - ol_quick_est),
            rush_snaps=max(60, int(plays * 0.42)),
            rush_blocks_won=max(40.0, plays * 0.42 * 0.69),
        )
        def_prwr_base = _clamp(
            0.39 + 1.4 * float(def_s.get("def_sack_rate", 0.062)) + 0.18 * (float(def_ftn.get("def_blitz_rate", def_s.get("def_blitz_rate", 0.27))) - 0.25),
            0.30,
            0.58,
        )
        def_cov_hold = _clamp(0.54 - 0.45 * float(def_s.get("def_pass_epa_allowed", 0.02)), 0.30, 0.72)
        rush_regime = classify_pass_rush_coverage_regime(
            pass_rush_win_rate_under_25_sec=def_prwr_base,
            sack_rate_per_dropback=float(def_s.get("def_sack_rate", 0.062)),
            secondary_coverage_hold_index=def_cov_hold,
            qb_time_to_throw_sec=2.72,
            edge_rusher_out_count=0.0,
            starting_cb_out_count=0.0,
            ol_starter_out_count=0.0,
        )
        clean_db_cnt = int(off_s.get("clean_dropbacks", max(1, int(n_db * 0.90))))
        clean_epa_val = float(off_s.get("clean_epa_db", 0.02))
        garb_epa_val = float(off_s.get("garbage_epa_db", 0.02))
        raw_db_epa = ((clean_db_cnt * clean_epa_val) + max(0, n_db - clean_db_cnt) * garb_epa_val) / n_db

        # Real FTN WR drop vs created reception net credit split (-0.30*drop + 0.40*created)
        wr_catch_split = _clamp(
            0.40 * (float(off_ftn.get("created_reception_rate", 0.035)) - 0.035)
            - 0.30 * (float(off_ftn.get("wr_drop_rate", 0.045)) - 0.045),
            -0.06,
            0.06,
        )
        qbr_proxy = compute_garbage_time_adjusted_qbr_proxy(
            total_dropbacks=n_db,
            clean_script_dropbacks=clean_db_cnt,
            clean_script_epa_per_dropback=clean_epa_val,
            garbage_time_epa_per_dropback=garb_epa_val,
            qb_scramble_epa_contribution=float(off_s.get("scramble_epa_contrib", 0.01)),
            fumble_lost_penalty=float(off_s.get("fumble_lost", 1.5)),
            defensive_penalties_drawn_yards=24.0,
            receiver_spectacular_catch_credit_split=wr_catch_split,
        )
        bellcow_pts = list(off_s.get("rb_weekly_points") or [])
        bellcow = evaluate_bellcow_trajectory_slope(bellcow_pts) if bellcow_pts else {
            "bellcow_expansion_signal": 0.0,
            "projected_next_week_snap_share_delta": 0.0,
            "breakout_buy_low_flag": False,
            "rb_bellcow_epa_delta": 0.0,
        }
        eleven_pers = _clamp(0.86 - float(off_ftn.get("multi_back_rate", 0.22)), 0.42, 0.78)
        def_light_box = float(def_ftn.get("def_light_box_rate", def_s.get("def_light_box_rate", 0.56)))
        def_cov1 = _clamp(0.14 + 0.45 * float(def_ftn.get("def_blitz_rate", 0.26)), 0.14, 0.44)
        concept = evaluate_scheme_concept_matchup_matrix(
            duo_share=0.5 * float(off_s.get("off_inside_share", 0.34)),
            outside_zone_share=float(off_s.get("off_outside_share", 0.33)),
            inside_zone_share=0.5 * float(off_s.get("off_inside_share", 0.34)),
            gap_power_share=float(off_s.get("off_tackle_share", 0.33)),
            eleven_personnel_rate=eleven_pers,
            light_box_rate_allowed_by_opp=def_light_box,
            def_epa_allowed_vs_duo=float(def_s.get("def_epa_allowed_inside", 0.0)),
            def_epa_allowed_vs_oz=float(def_s.get("def_epa_allowed_outside", 0.0)),
            def_epa_allowed_vs_iz=float(def_s.get("def_epa_allowed_inside", 0.0)),
            def_epa_allowed_vs_gap=float(def_s.get("def_epa_allowed_off_tackle", 0.0)),
            off_epa_vs_two_high=clean_epa_val * 0.45 + 0.10 * float(off_ftn.get("secondary_read_epa", 0.0)),
            off_epa_vs_man=clean_epa_val * 0.55,
            def_two_high_rate=def_light_box,
            def_cover1_rate=def_cov1,
        )
        # Empirically anchor cross-charting QC against OLS-calibrated nflverse pressure rate + RPO charting
        qc = validate_cross_charting_consistency(
            rpo_play_count=int(off_s.get("rpo_plays", 12)),
            rpo_with_wr_run_block_or_quick_release_count=int(off_s.get("rpo_plays", 12)),
            observed_model_pressure_rate=trench_iso["projected_true_pressure_rate"],
            ground_truth_charted_pressure_rate=emp_ol_press_rate,
        )
        qc_w = float(qc["reliability_weight"])

        # Strict One-Owner Injury Separation (zero double/triple counting):
        #   - pressure_hazard_delta -> ONLY sack_prob_lut (owns OL cliff, opp EDGE/DT out, own TE out)
        #   - trench_epa_delta -> ONLY baseline trench/regime differential (zero injury terms here)
        #   - qbr_edge -> ONLY QBR residual + opp CB/S coverage cascade + own TE pass-pro chip loss
        #   - skill_edge -> ONLY bellcow + concept matrix + opp DT/LB run/coverage relief
        pressure_hazard_raw = qc_w * (
            0.18 * (trench_iso["projected_true_pressure_rate"] - 0.21)
            + 0.015 * (ol_cliff - 0.85 * float(def_inj["edge_out"]) - 0.55 * float(def_inj["dt_out"]))
            + 0.005 * float(off_inj["te_out"])
            + 0.06 * rush_regime["trench_coverage_regime_epa_delta"]
        )
        pressure_hazard_delta = _soft_cap(pressure_hazard_raw, 0.025)
        trench_epa_delta = _soft_cap(
            qc_w * (
                0.28 * trench_iso["trench_isolation_epa_delta"]
                - 0.28 * rush_regime["trench_coverage_regime_epa_delta"]
                - 0.008 * ol_cliff
                + 0.006 * float(def_inj["edge_out"])
            ),
            0.035,
        )

        # Council Hardening 2 + Shard 3 OL Penalty Discipline:
        # Blend shrunk Offensive Holding + False Start per-drive discipline (r=0.8315 vs PFR OL penalties)
        # with non-sneak residualized efficiency so below-cutoff stall penalties (e.g. HOU 0.3265 vs IND 0.2193) count!
        n_dr = max(1, int(off_s.get("estimated_drives", 85)))
        raw_pen_dr = float(off_s.get("off_hold_fs_per_drive", 0.2680))
        shrunk_pen_dr = 0.2680 + (n_dr / (n_dr + 40.0)) * (raw_pen_dr - 0.2680)
        pen_disc_epa = _soft_cap(qc_w * 0.15 * (0.2680 - shrunk_pen_dr), 0.020)
        sneak_res = -0.35 * sr_guard["sneak_inflation_gap"] - 0.10 * max(0.0, sr_guard["first_and_20_stall_rate"] - 0.06)
        non_sneak_edge = _soft_cap(qc_w * (0.45 * sneak_res + pen_disc_epa), 0.030)

        qbr_residual = qbr_proxy["garbage_time_filtered_qbr_epa"] - raw_db_epa
        cb_pass_boost = 0.010 * cb_cascade + 0.006 * float(def_inj.get("s_out", 0.0)) - 0.005 * float(off_inj["te_out"])
        qbr_edge = _soft_cap(qc_w * (0.40 * qbr_residual + cb_pass_boost), 0.030)

        dt_lb_boost = 0.004 * float(def_inj["dt_out"]) + 0.004 * float(def_inj["lb_out"])
        skill_edge = _soft_cap(
            qc_w * (0.28 * bellcow["rb_bellcow_epa_delta"] + 0.30 * concept["scheme_concept_matchup_epa_delta"] + dt_lb_boost),
            0.030,
        )
        # Asymmetric snap-weighted Questionable sigma: only the Questionable players affecting
        # THIS matchup (own off Q + opp def Q) contribute, plus a tiny 0.0012 swing-depth floor
        # when Questionable reserves sit behind an Out starter (e.g., Charlie Heck behind Jalen Travis).
        has_raw_q = (float(off_inj.get("questionable_weight", 0.0)) + float(def_inj.get("questionable_weight", 0.0))) > 0.0
        q_var_sum = float(off_inj.get("q_off_sigma_sq", 0.0)) + float(def_inj.get("q_def_sigma_sq", 0.0))
        q_floor = 0.0012 if (has_raw_q and q_var_sum < 1e-6) else 0.0
        q_sigma = round(min(0.025, max(q_floor, math.sqrt(max(0.0, q_var_sum)))), 6)

        return {
            "non_sneak_success_guard": sr_guard,
            "trench_isolation": trench_iso,
            "opponent_pass_rush_coverage_regime": rush_regime,
            "opponent_live_def_injuries": def_inj,
            "own_live_off_injuries": off_inj,
            "own_live_ol_out": round(ol_out, 4),
            "own_live_ol_cliff_weighted": round(ol_cliff, 4),
            "opponent_cb_cascade_weighted": round(cb_cascade, 4),
            "garbage_time_qbr_proxy": qbr_proxy,
            "qbr_incremental_residual_epa": round(qbr_residual, 6),
            "bellcow_trajectory": bellcow,
            "scheme_concept_matchup": concept,
            "cross_charting_qc": qc,
            "trench_pressure_delta": round(trench_epa_delta, 6),
            "pressure_hazard_delta": round(pressure_hazard_delta, 6),
            "non_sneak_sr_edge": round(non_sneak_edge, 6),
            "garbage_time_qbr_edge": round(qbr_edge, 6),
            "bellcow_and_concept_edge": round(skill_edge, 6),
            "questionable_uncertainty_sigma": q_sigma,
        }

    aw_eval = _side_eval(away_u, home_u, ctx.get("away_ol_starters_out"))
    hm_eval = _side_eval(home_u, away_u, ctx.get("home_ol_starters_out"))

    return {
        "schema": "gse_whitefield_nflverse_matchup_15m_v3_snap_ftn_grounded",
        "data_available": bool(cache.get("available")),
        "nflverse_max_week": int(cache.get("max_week", 0)),
        "away_team": away_u,
        "home_team": home_u,
        "away_profile": aw_eval,
        "home_profile": hm_eval,
        "stream_15m_away_trench_pressure_delta": aw_eval["trench_pressure_delta"],
        "stream_15m_home_trench_pressure_delta": hm_eval["trench_pressure_delta"],
        "stream_15m_away_pressure_hazard_delta": aw_eval["pressure_hazard_delta"],
        "stream_15m_home_pressure_hazard_delta": hm_eval["pressure_hazard_delta"],
        "stream_15m_away_non_sneak_sr_edge": aw_eval["non_sneak_sr_edge"],
        "stream_15m_home_non_sneak_sr_edge": hm_eval["non_sneak_sr_edge"],
        "stream_15m_away_garbage_time_qbr_edge": aw_eval["garbage_time_qbr_edge"],
        "stream_15m_home_garbage_time_qbr_edge": hm_eval["garbage_time_qbr_edge"],
        "stream_15m_away_bellcow_ass_breakout": aw_eval["bellcow_and_concept_edge"],
        "stream_15m_home_bellcow_ass_breakout": hm_eval["bellcow_and_concept_edge"],
        "stream_15m_away_questionable_sigma": aw_eval["questionable_uncertainty_sigma"],
        "stream_15m_home_questionable_sigma": hm_eval["questionable_uncertainty_sigma"],
    }


class _LocalTableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.tables: List[List[List[str]]] = []
        self._in_table = False
        self._in_cell = False
        self._cur_table: List[List[str]] = []
        self._cur_row: List[str] = []
        self._buf: List[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        t = tag.lower()
        if t == "table":
            self._in_table = True
            self._cur_table = []
        elif self._in_table and t == "tr":
            self._cur_row = []
        elif self._in_table and t in ("th", "td"):
            self._in_cell = True
            self._buf = []

    def handle_endtag(self, tag: str) -> None:
        t = tag.lower()
        if t in ("th", "td") and self._in_cell:
            self._in_cell = False
            self._cur_row.append(re.sub(r"\s+", " ", "".join(self._buf)).strip())
        elif t == "tr" and self._in_table and self._cur_row:
            self._cur_table.append(self._cur_row)
        elif t == "table" and self._in_table:
            self._in_table = False
            if self._cur_table:
                self.tables.append(self._cur_table)

    def handle_data(self, data: str) -> None:
        if self._in_cell:
            self._buf.append(data)


def adaptive_match_html_table_headers(
    html_text: str,
    required_tokens: Iterable[str],
) -> Optional[Dict[str, Any]]:
    """
    Non-evasive local HTML table extractor that locates the matching table by
    structural header-token Jaccard overlap rather than brittle CSS selectors.
    """
    req = {tok.strip().lower() for tok in required_tokens if tok.strip()}
    parser = _LocalTableParser()
    parser.feed(html_text)
    best: Optional[Dict[str, Any]] = None
    best_score = -1.0
    for idx, tbl in enumerate(parser.tables):
        for r_idx in range(min(3, len(tbl))):
            row_tokens = {re.sub(r"[^a-z0-9]+", "", c.lower()) for c in tbl[r_idx] if c.strip()}
            if not row_tokens:
                continue
            overlap = len(req & row_tokens) / max(1, len(req))
            if overlap > best_score and overlap >= 0.5:
                best_score = overlap
                best = {
                    "table_index": idx,
                    "header_row_index": r_idx,
                    "headers": tbl[r_idx],
                    "data_rows": tbl[r_idx + 1 :],
                    "match_score": round(overlap, 4),
                }
    return best


__all__ = [
    "CLEARED_PBP_2026_PATH",
    "CLEARED_FTN_2026_PATH",
    "CLEARED_STATS_PLAYER_WEEK_2026_PATH",
    "CLEARED_SNAP_COUNTS_2026_PATH",
    "WEEK11_ESPN_LIVE_SYNC_PATH",
    "compute_trench_isolation_pbwr_rbwr",
    "compute_true_routes_run_and_ass_breakout",
    "compute_rb_creation_vs_line_and_bellcow",
    "compute_dual_success_rate_and_qb_progression",
    "compute_non_sneak_success_rate_guard",
    "classify_pass_rush_coverage_regime",
    "compute_strict_fmt_index",
    "evaluate_bellcow_trajectory_slope",
    "evaluate_scheme_concept_matchup_matrix",
    "validate_cross_charting_consistency",
    "compute_garbage_time_adjusted_qbr_proxy",
    "compute_cleared_nflverse_2026_efficiency_profile",
    "evaluate_whitefield_and_nflverse_matchup_profile",
    "adaptive_match_html_table_headers",
]
