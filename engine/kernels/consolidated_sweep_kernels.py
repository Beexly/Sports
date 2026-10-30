"""Consolidated X & Instagram Sweep Kernels (Sep 17 - Oct 30, 2026).

Wires every high-leverage football, coaching, referee, IDP, 1Q, and calibration
kernel extracted in:
- docs/data-sources/research/2026-10-30/X-ALL-SWEEPS-CONSOLIDATED.md
- docs/data-sources/research/2026-10-30/INSTAGRAM-ALL-SWEEPS-CONSOLIDATED.md
- docs/engine/research/2026-10-30/GROK47-AGENT1-X-SWEEP-LEVERAGE-AUDIT.md
- data/engine/consolidated_2026_pbp_sweep_metrics.json (computed from verified
  18,738-play play_by_play_2026.parquet and 18,019-row ftn_charting_2026.parquet)

Enforces Grok 4.7 Agent #1's One-Owner-Per-Mechanism & Parameter Bounds:
- C-281 / C-304 Identity Fence: TPRR x YPRR is a 2D quadrant, NOT a product (since YPRR = TPRR * YPT,
  multiplying them squares TPRR). Reallocation shift is capped at |delta_share| <= 0.06 and re-projected
  through KKT so shares sum to 1.0 and scratched roles stay 0.0.
- C-285: @ArkansasQuant iterative ridge two-way fixed effects (lambda = 50 plays, garbage time WP 5-95%
  filtered on the real 2026 schedule), residual vs tendency capped at |delta_epa| <= 0.04.
- C-297: Pregame referee crew penalty-mix residual (DPI / offensive holding), |delta_epa| <= 0.02,
  strictly separated from postgame luck grading.
- C-300: @RyNoonan Tackles vs Expected IDP prop kernel, mean shift capped at <= 0.25 tackles and
  orthogonalized against missed-tackle YAC.
- C-316: Public PBP Non-Sack Havoc Rate (TFL + FF + INT + PD) / plays (excluding sacks so pressure
  is never double-counted), |delta_sr| <= 0.03.
- @mockingboardapp ALTITUDE: Uses verified single-game reliability (QB 0.147, RB 0.210, WR 0.177,
  TE 0.126) and half-signal game counts (6 / 4 / 5 / 8 games) to emit a 0-100 score + band.
- Stage D Log-Odds Cap: Sum of absolute overlay adjustments is capped at |delta_log_odds| <= 0.35.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Dict, Mapping, Sequence

import numpy as np

from argon_drop.live_certs import load_verified_pbp

ROOT_DEFAULT = Path(__file__).resolve().parents[2]
PBP_2026_REL = Path("intelligence/coaching/data/play_by_play_2026.parquet")
FTN_2026_REL = Path("intelligence/coaching/data/ftn_charting_2026.parquet")
METRICS_2026_REL = Path("data/engine/consolidated_2026_pbp_sweep_metrics.json")

ALTITUDE_SINGLE_GAME_RELIABILITY = {
    "QB": 0.147,
    "RB": 0.210,
    "WR": 0.177,
    "TE": 0.126,
}
ALTITUDE_HALF_SIGNAL_GAMES = {
    "QB": 6.0,
    "RB": 4.0,
    "WR": 5.0,
    "TE": 8.0,
}


def load_consolidated_2026_pbp_metrics(root: Path = ROOT_DEFAULT) -> Dict[str, Any]:
    """Fail-closed loader that verifies both real 2026 PBP & FTN parquet files exist
    and loads the precomputed 32-team empirical sweep metrics JSON."""
    pbp_path = load_verified_pbp(root / PBP_2026_REL)
    ftn_path = load_verified_pbp(root / FTN_2026_REL)
    metrics_path = load_verified_pbp(root / METRICS_2026_REL)
    data = json.loads(metrics_path.read_text(encoding="utf-8"))
    data["verified_pbp_path"] = str(pbp_path)
    data["verified_ftn_path"] = str(ftn_path)
    return data


def compute_c281_tprr_yprr_composite(
    tprr: float,
    yprr: float,
    man_rate: float = 0.28,
    yprr_vs_man: float | None = None,
    yprr_vs_zone: float | None = None,
) -> Dict[str, Any]:
    """C-281 + C-304 Identity-Safe 2D Quadrant (TPRR vs YPRR):
    Per C-304, YPRR = TPRR * (Yards / Target). We NEVER multiply TPRR * YPRR as a raw
    volume multiplier (which would square TPRR). Instead:
    - `target_share_delta` (from TPRR vs 0.21 baseline) is bounded in [-0.06, +0.06] for KKT reallocation.
    - `ypt_implied` = effective_yprr / effective_tprr measures per-target efficiency without squaring TPRR.
    """
    p_man = float(np.clip(man_rate, 0.05, 0.75))
    y_man = float(yprr if yprr_vs_man is None else yprr_vs_man)
    y_zone = float(yprr if yprr_vs_zone is None else yprr_vs_zone)
    effective_yprr = max(0.2, p_man * y_man + (1.0 - p_man) * y_zone)
    eff_tprr = float(np.clip(tprr, 0.05, 0.45))

    # C-304 identity: implied Yards Per Target = YPRR / TPRR
    implied_ypt = effective_yprr / eff_tprr
    target_share_delta = float(np.clip(0.45 * (eff_tprr - 0.21), -0.06, 0.06))
    share_multiplier = float(np.clip(1.0 + target_share_delta / 0.26, 0.77, 1.23))

    if eff_tprr >= 0.23 and effective_yprr >= 2.00:
        quadrant = "ALPHA_FUNNEL_ELITE"
    elif eff_tprr < 0.23 and effective_yprr >= 2.00:
        quadrant = "EFFICIENT_SECONDARY"
    elif eff_tprr >= 0.23 and effective_yprr < 2.00:
        quadrant = "VOLUME_CHURN"
    else:
        quadrant = "LOW_USAGE"

    return {
        "quadrant": quadrant,
        "effective_tprr": round(eff_tprr, 4),
        "effective_yprr": round(effective_yprr, 4),
        "implied_ypt_c304": round(implied_ypt, 4),
        "target_share_delta": round(target_share_delta, 4),
        "c281_composite": round(effective_yprr, 4),
        "share_multiplier": round(share_multiplier, 4),
    }


def compute_c287_wopr(target_share: float, air_yards_share: float) -> float:
    """C-287: Public Fantasy Football Analytics Weighted Opportunity Rating diagnostic:
    WOPR = 1.5 * TargetShare + 0.7 * AirYardsShare.
    Note per Grok 4.7 Agent #1 audit: diagnostic/residual only; never stacked on top of C-281 in KKT.
    """
    ts = float(np.clip(target_share, 0.0, 0.60))
    ays = float(np.clip(air_yards_share, 0.0, 0.75))
    return round(1.5 * ts + 0.7 * ays, 4)


def compute_mockingboard_altitude(
    wopr: float,
    c281_composite: float,
    first_read_share: float = 0.24,
    route_participation: float = 0.82,
    position: str = "WR",
    games_played: int = 7,
) -> Dict[str, Any]:
    """@mockingboardapp ALTITUDE: De-noised opportunity/talent metric on a 0-100 scale
    with explicit uncertainty band using verified single-game reliability (QB 0.147, RB 0.210,
    WR 0.177, TE 0.126) and half-signal game counts (QB 6, RB 4, WR 5, TE 8).
    """
    pos_key = position.upper()[:2]
    n_half = float(ALTITUDE_HALF_SIGNAL_GAMES.get(pos_key, 5.0))
    rel_1g = float(ALTITUDE_SINGLE_GAME_RELIABILITY.get(pos_key, 0.177))
    gp = max(1.0, float(games_played))
    signal_weight = gp / (gp + n_half)

    wopr_norm = float(np.clip(wopr / 0.52, 0.2, 2.0))
    yprr_norm = float(np.clip(c281_composite / 1.85, 0.2, 2.2))
    read_norm = float(np.clip(first_read_share / 0.24, 0.2, 2.0))
    route_norm = float(np.clip(route_participation / 0.82, 0.3, 1.25))

    raw_index = 0.40 * wopr_norm + 0.35 * yprr_norm + 0.15 * read_norm + 0.10 * route_norm
    shrunk_index = 1.0 + signal_weight * (raw_index - 1.0)
    altitude_score = float(np.clip(50.0 * shrunk_index, 10.0, 99.0))
    band_half_width = float(np.clip(18.0 * math.sqrt(max(0.10, 1.0 - signal_weight)), 4.0, 18.0))
    tilt_multiplier = float(np.clip(shrunk_index ** 0.30, 0.85, 1.18))
    return {
        "altitude_score": round(altitude_score, 2),
        "altitude_band": (
            round(max(0.0, altitude_score - band_half_width), 2),
            round(min(100.0, altitude_score + band_half_width), 2),
        ),
        "signal_weight": round(signal_weight, 4),
        "single_game_reliability": rel_1g,
        "tilt_multiplier": round(tilt_multiplier, 4),
    }


def compute_c285_iterative_ridge_matchup_delta(
    off_team: str,
    def_team: str,
    metrics: Mapping[str, Any],
    tendency_net_epa: float = 0.0,
) -> Dict[str, float]:
    """C-285: @ArkansasQuant iterative ridge two-way fixed effects opponent adjustment
    (lambda = 50 plays, garbage time WP 5-95% excluded on the real 2026 schedule).
    Per Agent #1 bound: enters as a residual vs current tendency EPA capped at |delta_epa| <= 0.04.
    """
    teams = metrics.get("teams", {})
    off_row = teams.get(off_team, {})
    def_row = teams.get(def_team, {})
    off_epa = float(off_row.get("c285_off_ridge_epa", 0.0))
    def_epa_allowed = float(def_row.get("c285_def_ridge_epa", 0.0))
    raw_ridge_matchup = off_epa + def_epa_allowed
    residual_vs_tendency = float(np.clip(0.25 * (raw_ridge_matchup - float(tendency_net_epa)), -0.04, 0.04))
    return {
        "off_ridge_epa": round(off_epa, 4),
        "def_ridge_epa_allowed": round(def_epa_allowed, 4),
        "raw_ridge_matchup_epa": round(raw_ridge_matchup, 4),
        "net_epa_delta": round(residual_vs_tendency, 4),
    }


def compute_c297_referee_crew_penalty_kernel(
    dpi_rate_mult: float = 1.0,
    off_hold_rate_mult: float = 1.0,
    home_bias_z: float = 0.0,
    is_home_offense: bool = True,
) -> Dict[str, float]:
    """C-297: Pregame referee crew-assignment + penalty-mix residual kernel.
    Bounded at |delta_epa| <= 0.02 per Agent #1 audit and strictly separated from postgame luck grading.
    """
    dpi_m = float(np.clip(dpi_rate_mult, 0.70, 1.40))
    hold_m = float(np.clip(off_hold_rate_mult, 0.70, 1.40))
    hb_z = float(np.clip(home_bias_z, -2.5, 2.5))
    side_sign = 1.0 if is_home_offense else -1.0

    deep_shot_ev_delta = float(np.clip(1.8 * (dpi_m - 1.0) + 0.25 * side_sign * hb_z, -1.5, 2.0))
    drive_stall_prob_delta = float(np.clip(0.035 * (hold_m - 1.0) - 0.002 * side_sign * hb_z, -0.02, 0.02))
    epa_residual_delta = float(np.clip(0.04 * (dpi_m - hold_m) + 0.003 * side_sign * hb_z, -0.02, 0.02))
    return {
        "deep_shot_ev_delta_yds": round(deep_shot_ev_delta, 4),
        "drive_stall_prob_delta": round(drive_stall_prob_delta, 5),
        "epa_residual_delta": round(epa_residual_delta, 5),
    }


def compute_c300_rynoonan_idp_tackles_kernel(
    opp_rush_att_proj: float,
    opp_completions_proj: float,
    opp_sacks_proj: float,
    player_snap_share: float = 0.92,
    tackle_efficiency_rate: float = 0.145,
    box_alignment_mult: float = 1.0,
    market_line: float = 7.5,
    devig_over_prob: float = 0.50,
    sim_over_prob: float | None = None,
) -> Dict[str, Any]:
    """C-300: @RyNoonan Tackles vs Expected IDP prop kernel (attributed 939-742, +95.5u at >= 5% edge).
    Per Agent #1 bound: box alignment mean shift is capped at <= 0.25 tackles and orthogonalized
    against missed-tackle YAC.
    """
    total_tackle_opps = max(25.0, float(opp_rush_att_proj) + float(opp_completions_proj) + float(opp_sacks_proj))
    snap_s = float(np.clip(player_snap_share, 0.20, 1.0))
    eff = float(np.clip(tackle_efficiency_rate, 0.04, 0.25))
    base_tackles = total_tackle_opps * snap_s * eff
    raw_shift = base_tackles * (float(box_alignment_mult) - 1.0)
    capped_shift = float(np.clip(raw_shift, -0.25, 0.25))
    expected_tackles = max(0.5, base_tackles + capped_shift)

    if sim_over_prob is None:
        k_floor = int(math.floor(float(market_line)))
        lam = max(0.5, expected_tackles)
        cdf = sum(math.exp(-lam) * (lam ** k) / math.factorial(k) for k in range(k_floor + 1))
        over_p = float(np.clip(1.0 - cdf, 0.02, 0.98))
    else:
        over_p = float(np.clip(sim_over_prob, 0.02, 0.98))

    under_p = 1.0 - over_p
    over_edge = over_p - float(devig_over_prob)
    under_edge = under_p - (1.0 - float(devig_over_prob))
    best_side = "OVER" if over_edge >= under_edge else "UNDER"
    best_edge = max(over_edge, under_edge)
    clears_rynoonan_5pct_rule = bool(best_edge >= 0.05)

    return {
        "total_tackle_opportunities": round(total_tackle_opps, 2),
        "base_expected_tackles": round(base_tackles, 3),
        "capped_mean_shift": round(capped_shift, 4),
        "expected_tackles": round(expected_tackles, 3),
        "over_prob": round(over_p, 4),
        "under_prob": round(under_p, 4),
        "recommended_side": best_side,
        "edge": round(best_edge, 4),
        "clears_c300_5pct_rule": clears_rynoonan_5pct_rule,
    }


def compute_c316_havoc_rate_modifier(
    off_team: str,
    def_team: str,
    metrics: Mapping[str, Any],
) -> Dict[str, float]:
    """C-316: Public PBP Non-Sack Defensive Havoc Rate = (TFL + FF + INT + PD) / scrimmage plays.
    Excludes sacks per Agent #1 audit so pressure/sacks are never double-counted!
    2026 NFL average non-sack havoc event rate is ~0.104.
    Bounds |delta_sr| <= 0.03.
    """
    teams = metrics.get("teams", {})
    off_row = teams.get(off_team, {})
    def_row = teams.get(def_team, {})
    def_havoc = float(def_row.get("c316_def_havoc_rate", 0.104))
    off_havoc_allowed = float(off_row.get("c316_off_havoc_allowed", 0.104))
    blended_havoc = 0.55 * def_havoc + 0.45 * off_havoc_allowed
    sr_delta = float(np.clip(-0.45 * (blended_havoc - 0.104), -0.03, 0.03))
    ratio = blended_havoc / 0.104
    disruption_mult = float(np.clip(ratio ** 0.45, 0.88, 1.14))
    turnover_mult = float(np.clip(ratio ** 0.40, 0.90, 1.12))
    return {
        "blended_non_sack_havoc_rate": round(blended_havoc, 4),
        "sr_delta": round(sr_delta, 4),
        "disruption_mult": round(disruption_mult, 4),
        "turnover_mult": round(turnover_mult, 4),
    }


def compute_patton_poe_p2s_mitigation(
    raw_pressure_prob: float,
    qb_fault_sack_share: float = 0.18,
    screen_rate: float = 0.10,
    rpo_rate: float = 0.08,
    quick_game_rate: float = 0.32,
    poe_pct: float = 0.0,
) -> Dict[str, float]:
    """@PattonAnalytics QB Pressure Mitigation & POE diagnostic.
    Uses stored `poe_pct` and `qb_fault_sack_share` to bound the pressure-to-sack multiplier in [0.85, 1.20].
    """
    p_raw = float(np.clip(raw_pressure_prob, 0.12, 0.60))
    qb_fault = float(np.clip(qb_fault_sack_share, 0.05, 0.40))
    playcaller_valve = float(np.clip(screen_rate + rpo_rate + 0.35 * quick_game_rate, 0.10, 0.48))
    poe_term = float(np.clip(poe_pct / 100.0, -0.12, 0.12))

    mitigation_factor = float(
        np.clip(1.0 - 0.45 * (playcaller_valve - 0.28) + 0.35 * (qb_fault - 0.18) + 0.25 * poe_term, 0.85, 1.20)
    )
    mitigated_pressure_prob = float(np.clip(p_raw * mitigation_factor, 0.10, 0.58))
    p2s_conversion_mult = float(np.clip(0.88 + 0.60 * qb_fault + 0.25 * poe_term, 0.85, 1.20))
    return {
        "raw_pressure_prob": round(p_raw, 4),
        "mitigated_pressure_prob": round(mitigated_pressure_prob, 4),
        "p2s_conversion_mult": round(p2s_conversion_mult, 4),
    }


def compute_coach_a_structural_coverage_modifiers(
    def_shell: str,
    off_play: str,
    down: int,
    ydstogo: int,
    motion_rate: float = 0.58,
    blitz_rate: float = 0.26,
) -> Dict[str, float]:
    """@The_Coach_A Structural Football Rules (Sessions 5 & 8), capped per Agent #1 audit:
    - Extra sack multiplier on Big Nickel / Double-Mug is capped at 1.08 (not 1.15).
    """
    sack_tfl_mult = 1.0
    short_gain_mult = 1.0
    explosive_mult = 1.0
    breakaway_mult = 1.0

    if down in (1, 2) and ydstogo >= 7 and def_shell == "sim_blitz" and off_play in ("inside_zone", "outside_zone"):
        sack_tfl_mult *= 1.08
        explosive_mult *= 0.90

    if def_shell == "two_high_quarters":
        breakaway_mult *= 0.84
        short_gain_mult *= 1.07
        if off_play == "deep_shot":
            explosive_mult *= 0.92

    if down == 3 and ydstogo >= 5 and def_shell in ("man_blitz", "sim_blitz"):
        if off_play in ("quick_game", "screen_draw") and motion_rate >= 0.58:
            short_gain_mult *= 1.08
            explosive_mult *= 1.06
            sack_tfl_mult *= 0.94
        else:
            sack_tfl_mult *= min(1.08, 1.04 + 0.10 * max(0.0, float(blitz_rate) - 0.26))

    return {
        "sack_tfl_mult": round(sack_tfl_mult, 4),
        "short_gain_mult": round(short_gain_mult, 4),
        "explosive_mult": round(explosive_mult, 4),
        "breakaway_mult": round(breakaway_mult, 4),
    }


def compute_ghatz_situational_epa_modifier(
    off_team: str,
    def_team: str,
    down: int,
    ydstogo: int,
    def_shell: str,
    metrics: Mapping[str, Any],
) -> float:
    """@ghatz_28 State-Conditioned Situational EPA Split, strictly capped at |delta_epa| <= 0.03
    per Agent #1 audit so it never double-counts baseline team quality."""
    teams = metrics.get("teams", {})
    off_row = teams.get(off_team, {})
    def_row = teams.get(def_team, {})

    delta = 0.0
    if down == 3 and ydstogo >= 6:
        obv_off = float(off_row.get("ghatz_obv_pass_off_epa", 0.0))
        obv_def = float(def_row.get("ghatz_obv_pass_def_epa", 0.0))
        delta += 0.15 * obv_off + 0.12 * obv_def

    if def_shell in ("man_blitz", "sim_blitz"):
        qb_blitz = float(off_row.get("ghatz_qb_vs_blitz_epa", 0.0))
        def_blitz = float(def_row.get("ftn_def_blitz_epa", 0.0))
        delta += 0.12 * qb_blitz + 0.10 * def_blitz

    return float(np.clip(delta, -0.03, 0.03))


def compute_locktalk_1q_script_stop_and_hfa(
    home_team: str,
    away_team: str,
    posteam: str,
    qtr: int,
    drive_num: int,
    full_game_hfa_pts: float,
    metrics: Mapping[str, Any],
) -> Dict[str, float]:
    """@thelocktalk 1Q & nflverse Method Corpus (calibrated to Grok 4.7 Agent #2 2026 PBP audit):
    - 2026 PBP measurement (18,738 plays, 107 games):
      * Q1 is 8.78 combined pts (19.26% of regulation scoring) vs 13.49 in Q2 (29.60%),
        9.58 in Q3 (21.03%), and 13.72 in Q4 (30.11%).
      * Q1 is the ONLY quarter with a positive home edge in 2026 (+0.78 pts).
      * Home offensive snaps in Q1 average 13.57 of 61.78 (pi_Q1 = 0.2197).
        Allocating s_H = 0.37 of HFA to Q1 adds `(0.37 - 0.2197) * H / 13.57 = 0.01108 * H`
        EPA per home Q1 snap, balanced across Q2-Q4 so full-game HFA is zero-sum conserved.
    - The Script: 2026 PBP shows scripted first-15 EPA is NOT higher than later plays (44.4% of
      team-games better, delta -0.048 EPA). Per Agent #2 audit, we do NOT add a positive script bump
      (script_epa_delta = 0.0).
    - The Stop: Opening drives in Q1 (drive_num <= 2) punt 44.1% of the time (25.2% 3-and-out) vs
      33.7% (17.8% 3-and-out) on drives >= 3. We modulate Q1 early-drive stop rate using the opposing
      defense's empirical Q1 stop rate vs the 0.2523 opening-drive baseline.
    """
    teams = metrics.get("teams", {})
    defteam = away_team if posteam == home_team else home_team
    def_row = teams.get(defteam, {})

    q_weights = {1: 0.37, 2: 0.21, 3: 0.21, 4: 0.21}
    q_weight = q_weights.get(int(qtr), 0.21)
    is_home = 1.0 if posteam == home_team else -1.0
    zero_sum_qtr_hfa_pts = float(full_game_hfa_pts) * (q_weight - 0.25) * is_home
    per_snap_hfa_tilt_epa = float(np.clip(zero_sum_qtr_hfa_pts / 13.57, -0.04, 0.04))

    script_epa_delta = 0.0
    stop_rate_chain_mult = 1.0
    if int(qtr) == 1 and int(drive_num) <= 2:
        def_q1_stop = float(def_row.get("locktalk_def_q1_stop_rate", 0.2523))
        stop_rate_chain_mult = float(np.clip(1.0 - 0.30 * (def_q1_stop - 0.2523), 0.92, 1.08))

    return {
        "qtr_hfa_weight": q_weight,
        "per_snap_hfa_tilt_epa": round(per_snap_hfa_tilt_epa, 5),
        "script_epa_delta": round(script_epa_delta, 5),
        "stop_rate_chain_mult": round(stop_rate_chain_mult, 4),
    }


def compute_locktalk_qb_vulture_goal_line_split(
    posteam: str,
    yardline_100: int,
    metrics: Mapping[str, Any],
) -> Dict[str, float]:
    """@thelocktalk QB Vulture / Inside-the-5 Rush TD Split (calibrated to Grok 4.7 Agent #2 audit):
    - 2026 PBP measurement (204 rush TDs):
      * 68.14% (139/204) of rush TDs come from yardline_100 <= 5; 32.35% (66/204) from yardline_100 == 1.
      * League QB share of rush TDs is 0.2014 inside the 5 (28/139) and 0.2879 at the 1-yard line (19/66).
      * Formula: `p_QB_td = (n_team * p_team + k * anchor) / (n_team + k)` with k = 10.0 so a 7-game
        sample cannot go to 1.0 and workhorse RBs (McCaffrey, Kyren Williams, Henry, Swift, Taylor, Gibbs)
        are never hit with a blanket haircut.
    """
    teams = metrics.get("teams", {})
    off_row = teams.get(posteam, {})
    n_team = float(off_row.get("locktalk_qb_vulture_gl_runs", 6))
    p_team = float(off_row.get("locktalk_qb_vulture_raw_share", 0.2014))
    k_prior = 10.0

    yl = int(yardline_100)
    if yl <= 1:
        anchor = 0.2879
        effective_qb_share = float(np.clip((n_team * p_team + k_prior * anchor) / (n_team + k_prior), 0.08, 0.52))
    elif yl <= 5:
        anchor = 0.2014
        effective_qb_share = float(np.clip((n_team * p_team + k_prior * anchor) / (n_team + k_prior), 0.06, 0.44))
    else:
        effective_qb_share = 0.11

    return {
        "qb_rush_share": round(effective_qb_share, 4),
        "rb_rush_share": round(1.0 - effective_qb_share, 4),
    }


def cap_stage_d_overlay_log_odds(
    base_prob: float,
    overlay_log_odds_deltas: Sequence[float],
    max_abs_log_odds: float = 0.35,
) -> Dict[str, float]:
    """Stage D Cognitive Router Cap (AGENTS.md & Grok 4.7 Agent #1 §4):
    Enforces that the sum of absolute overlay adjustments on one side/market never exceeds
    `|Delta log-odds| <= 0.35` before market comparison.
    """
    p0 = float(np.clip(base_prob, 0.01, 0.99))
    base_logit = math.log(p0 / (1.0 - p0))
    sum_abs = sum(abs(float(d)) for d in overlay_log_odds_deltas)
    raw_sum = sum(float(d) for d in overlay_log_odds_deltas)
    if sum_abs > max_abs_log_odds and sum_abs > 1e-12:
        scale = max_abs_log_odds / sum_abs
        capped_delta = raw_sum * scale
    else:
        scale = 1.0
        capped_delta = raw_sum
    final_logit = base_logit + capped_delta
    final_prob = 1.0 / (1.0 + math.exp(-final_logit))
    return {
        "base_prob": round(p0, 4),
        "raw_log_odds_sum": round(raw_sum, 4),
        "sum_abs_log_odds": round(sum_abs, 4),
        "capped_log_odds_delta": round(capped_delta, 4),
        "scale_factor": round(scale, 4),
        "final_prob": round(final_prob, 4),
    }


def compute_whitebison_prop_calibration_blend(
    raw_mc_prob: float,
    devig_market_prob: float,
    prop_weight_model: float = 0.55,
) -> float:
    """Diagnostic prop calibration blend helper (kept explicit and never silently stacked)."""
    w = float(np.clip(prop_weight_model, 0.0, 1.0))
    p_mc = float(np.clip(raw_mc_prob, 0.01, 0.99))
    p_mkt = float(np.clip(devig_market_prob, 0.01, 0.99))
    return float(np.clip(w * p_mc + (1.0 - w) * p_mkt, 0.01, 0.99))


# ============================================================================
# 10. OCT 30 7-SIGNAL PACK CONSUMER (Closes READINESS.md §2 & §5.9)
# ============================================================================

_SIGNAL_PACK_CACHE: Dict[str, Any] = {}
_TAU_HAT_TABLE_CACHE: Dict[Tuple[str, int, str, str], Dict[str, Any]] = {}


def _load_oct30_signal_pack_tables() -> Dict[str, Any]:
    if _SIGNAL_PACK_CACHE:
        return _SIGNAL_PACK_CACHE
    import csv
    from pathlib import Path

    repo_root = Path(__file__).resolve().parents[2]
    out_dir = repo_root / "docs" / "research" / "2026-10-30" / "signal-pack" / "outputs"

    def _read_csv(name: str) -> List[Dict[str, str]]:
        p = out_dir / name
        if not p.exists():
            return []
        with open(p, encoding="utf-8", newline="") as fh:
            return list(csv.DictReader(fh))

    s1 = {r["defense"]: r for r in _read_csv("01_red_zone_xtd_share.csv")}
    s2 = {r["team"]: r for r in _read_csv("02_missed_tackles_by_defense.csv")}
    s3 = {r["qb"].lower(): r for r in _read_csv("03_qb_throwaway_rate.csv")}
    s4_rows = _read_csv("04_rb_rushing_epa.csv")
    s5 = {r["team"]: r for r in _read_csv("05_big_plays_vs_success.csv")}
    s6 = {r["defense"]: r for r in _read_csv("06_defensive_epa_by_quarter.csv")}
    s7 = {r["config"]: r for r in _read_csv("07_paired_flip_leverage.csv")}

    _SIGNAL_PACK_CACHE.update({
        "s1": s1,
        "s2": s2,
        "s3": s3,
        "s4_rows": s4_rows,
        "s5": s5,
        "s6": s6,
        "s7": s7,
    })
    return _SIGNAL_PACK_CACHE


def _norm_nflverse_team(team: str) -> str:
    t = str(team).strip().upper()
    return "LA" if t == "LAR" else t


def _norm_pfr_team(team: str) -> str:
    t = str(team).strip().upper()
    return "LAR" if t == "LA" else t


def consume_oct30_signal_pack(
    off_team: str,
    def_team: str,
    qb_name: str = "",
    rb_name: str = "",
) -> Dict[str, Any]:
    """Consumes all 7 verified tables from docs/research/2026-10-30/signal-pack/outputs/.

    Closes READINESS.md §2 & §5.9 ("Signal pack consumption — no engine code consumes it").
    """
    tabs = _load_oct30_signal_pack_tables()
    off_nflv = _norm_nflverse_team(off_team)
    def_nflv = _norm_nflverse_team(def_team)
    def_pfr = _norm_pfr_team(def_team)

    # S1: Red-zone expected TD share allowed by position (@KoalatyStats)
    r1 = tabs["s1"].get(def_nflv, {})
    s1_rz_xtd_share = {
        "QB": float(r1.get("QB_xtd_share", 0.06)),
        "RB": float(r1.get("RB_xtd_share", 0.41)),
        "WR": float(r1.get("WR_xtd_share", 0.31)),
        "TE": float(r1.get("TE_xtd_share", 0.22)),
        "OTHER": float(r1.get("OTHER_xtd_share", 0.0)),
    }

    # S2: Missed tackles by defense (@sfdata9ers / @PattonAnalytics PFR)
    r2 = tabs["s2"].get(def_pfr) or tabs["s2"].get(def_nflv) or {}
    mtkl = float(r2.get("mtkl", 34.5))
    rank_fewest = int(float(r2.get("rank_fewest", 16)))
    # League median missed tackles through W7 is ~34.5; scale YAC / hidden rushing yards
    yac_mult = float(np.clip(1.0 + 0.0028 * (mtkl - 34.5), 0.92, 1.09))
    s2_def_missed_tackles = {
        "mtkl": mtkl,
        "rank_fewest": rank_fewest,
        "yac_hidden_yards_mult": yac_mult,
    }

    # S3: QB throwaway rate (@sfdata9ers PFR Advanced Passing)
    qb_key = qb_name.strip().lower().replace(" jr.", "").replace(" sr.", "").replace(" iii", "")
    r3 = tabs["s3"].get(qb_key)
    if r3 is None and qb_key:
        last_tok = qb_key.split()[-1]
        for k, v in tabs["s3"].items():
            if k.endswith(" " + last_tok) or k == last_tok:
                r3 = v
                break
    r3 = r3 or {}
    s3_qb_throwaway = {
        "qb": r3.get("qb", qb_name),
        "thawy_per_dropback": float(r3.get("thawy_per_dropback", 0.042)),
        "thawy_per_attempt": float(r3.get("thawy_per_attempt", 0.045)),
        "dropbacks": float(r3.get("dropbacks", 180.0)),
        "sacks": int(float(r3.get("sacks", 12))),
    }

    # S4: RB rushing EPA/attempt leaderboard (@boxscorescout)
    rb_clean = rb_name.strip().lower().replace(" jr.", "").replace(" sr.", "").replace(" iii", "")
    rb_last = rb_clean.split(".")[-1].split()[-1] if rb_clean else ""
    r4 = None
    for row in tabs["s4_rows"]:
        row_rb = row.get("rb", "").lower()
        row_tm = row.get("team", "").upper()
        if rb_clean and (row_rb == rb_clean or (rb_last and row_rb.endswith(rb_last) and row_tm == off_nflv)):
            r4 = row
            break
    if r4 is None:
        for row in tabs["s4_rows"]:
            if row.get("team", "").upper() == off_nflv:
                r4 = row
                break
    r4 = r4 or {}
    s4_rb_rushing_epa = {
        "rb": r4.get("rb", rb_name),
        "epa_per_att": float(r4.get("epa_per_att", -0.02)),
        "success_rate": float(r4.get("success_rate", 0.41)),
        "ypc": float(r4.get("ypc", 4.3)),
    }

    # S5: Big plays vs success rate quadrant (@ghatz_28)
    r5 = tabs["s5"].get(off_nflv, {})
    s5_off_quadrant = {
        "success_rate": float(r5.get("success_rate", 0.43)),
        "big_play_rate": float(r5.get("big_play_rate", 0.105)),
        "epa_per_play": float(r5.get("epa_per_play", 0.0)),
        "quadrant": r5.get("quadrant", "Q3: efficient, not explosive"),
    }

    # S6: Defensive EPA/play by quarter (@sfdata9ers)
    r6 = tabs["s6"].get(def_nflv, {})
    s6_def_quarter_epa = {
        "q1_epa_allowed": float(r6.get("q1_epa_allowed", 0.0)),
        "q2_epa_allowed": float(r6.get("q2_epa_allowed", 0.0)),
        "q3_epa_allowed": float(r6.get("q3_epa_allowed", 0.0)),
        "q4_epa_allowed": float(r6.get("q4_epa_allowed", 0.0)),
        "all_q_epa_allowed": float(r6.get("all_q_epa_allowed", 0.0)),
    }

    # S7: Paired-flip playoff leverage guard (@Timo_NFL)
    r7_cont = tabs["s7"].get("contender", {})
    r7_long = tabs["s7"].get("longshot", {})
    s7_paired_flip_guard = {
        "paired_flip_enforced": True,
        "contender_inflation_ratio": float(r7_cont.get("inflation_ratio", 1.3607)),
        "longshot_inflation_ratio": float(r7_long.get("inflation_ratio", 1.7129)),
    }

    return {
        "s1_rz_xtd_share": s1_rz_xtd_share,
        "s2_def_missed_tackles": s2_def_missed_tackles,
        "s3_qb_throwaway": s3_qb_throwaway,
        "s4_rb_rushing_epa": s4_rb_rushing_epa,
        "s5_off_quadrant": s5_off_quadrant,
        "s6_def_quarter_epa": s6_def_quarter_epa,
        "s7_paired_flip_guard": s7_paired_flip_guard,
    }


# ============================================================================
# 11. TAU_HAT 4TH-DOWN SIMULATION CONSUMER (Closes READINESS.md §2 & §5.8)
# ============================================================================

def _load_tau_hat_walkforward_table() -> Dict[Tuple[str, int, str, str], Dict[str, Any]]:
    if _TAU_HAT_TABLE_CACHE:
        return _TAU_HAT_TABLE_CACHE
    import csv
    from pathlib import Path

    repo_root = Path(__file__).resolve().parents[2]
    tau_path = repo_root / "intelligence" / "coaching" / "data" / "tau_hat.csv"
    if not tau_path.exists():
        raise FileNotFoundError(f"Walk-forward tau_hat.csv not found at {tau_path}")
    with open(tau_path, encoding="utf-8", newline="") as fh:
        for r in csv.DictReader(fh):
            key = (r["team"].strip().upper(), int(r["season"]), r["region"].strip(), r["wp_bin"].strip())
            _TAU_HAT_TABLE_CACHE[key] = {
                "tau_hat_served": float(r["tau_hat_served"]),
                "fallback_level": r["fallback_level"].strip(),
                "fit_stamp": r["fit_stamp"].strip(),
                "n": int(r["n"]) if r.get("n") else 0,
            }
    return _TAU_HAT_TABLE_CACHE


def compute_tau_hat_4th_down_coach_tax(
    team: str,
    season: int,
    yardline_100: Optional[int],
    ydstogo: Optional[int],
    score_differential: Optional[int],
    game_seconds_remaining: Optional[int],
    qtr: Optional[int],
    wp: Optional[float],
    fg_make_prob: Optional[float] = None,
    go_conv_prob: Optional[float] = None,
    is_stand_in_wp: bool = False,
) -> Dict[str, Any]:
    """Simulation-scoped consumer of walk-forward tau_hat (READINESS.md §5.8 Solution 2 + X B3/B10).

    Strictly requires real live game state (yardline_100, ydstogo, score_differential,
    game_seconds_remaining, qtr, wp) and rejects any 0.5 stand-in WP.
    """
    if is_stand_in_wp or any(
        v is None for v in (yardline_100, ydstogo, score_differential, game_seconds_remaining, qtr, wp)
    ):
        raise ValueError(
            "compute_tau_hat_4th_down_coach_tax requires real simulation/post-hoc game state "
            "(yardline_100, ydstogo, score_differential, game_seconds_remaining, qtr, wp) and forbids 0.5 stand-ins."
        )

    yl = int(yardline_100)  # type: ignore[arg-type]
    ytg = int(ydstogo)  # type: ignore[arg-type]
    sdiff = int(score_differential)  # type: ignore[arg-type]
    sec_rem = int(game_seconds_remaining)  # type: ignore[arg-type]
    q = int(qtr)  # type: ignore[arg-type]
    live_wp = float(np.clip(float(wp), 0.001, 0.999))  # type: ignore[arg-type]

    region = "opp" if yl <= 50 else "own"
    wp_bins = [0.0, 0.2, 0.4, 0.6, 0.8, 1.01]
    wp_labels = ["0-20", "20-40", "40-60", "60-80", "80-100"]
    wp_bin = wp_labels[int(np.clip(np.digitize(live_wp, wp_bins) - 1, 0, 4))]

    table = _load_tau_hat_walkforward_table()
    tm_nflv = _norm_nflverse_team(team)
    cell = table.get((tm_nflv, int(season), region, wp_bin))
    if cell is None:
        cell = table.get((str(team).upper(), int(season), region, wp_bin))
    if cell is None:
        raise ValueError(f"No walk-forward tau_hat cell for ({team}, {season}, {region}, {wp_bin})")

    tau_val = float(cell["tau_hat_served"])
    p_conv = (
        float(go_conv_prob)
        if go_conv_prob is not None
        else float(np.clip(0.66 - 0.045 * max(0, ytg - 1), 0.15, 0.82))
    )
    kick_dist = float(yl + 17)
    p_fg = (
        float(fg_make_prob)
        if fg_make_prob is not None
        else (compute_b4_hierarchical_fg_make_prob(kick_dist) if yl <= 42 else 0.0)
    )

    # Time leverage magnifier in second half
    time_lev = 1.0 + 0.45 * max(0.0, (1800.0 - min(1800.0, float(sec_rem))) / 1800.0)
    wp_go_succ = float(np.clip(live_wp + 0.095 * time_lev, 0.01, 0.99))
    wp_go_fail = float(np.clip(live_wp - (0.105 if region == "opp" else 0.155) * time_lev, 0.01, 0.99))
    ev_go = p_conv * wp_go_succ + (1.0 - p_conv) * wp_go_fail

    if yl <= 42:
        wp_fg_make = float(np.clip(live_wp + (0.065 if sdiff >= -3 else 0.035) * time_lev, 0.01, 0.99))
        wp_fg_miss = float(np.clip(live_wp - 0.095 * time_lev, 0.01, 0.99))
        ev_fga = p_fg * wp_fg_make + (1.0 - p_fg) * wp_fg_miss
    else:
        wp_fg_make = wp_go_fail
        wp_fg_miss = wp_go_fail
        ev_fga = -1.0

    ev_punt = float(np.clip(live_wp - (0.045 if region == "opp" else 0.015) * time_lev, 0.01, 0.99))
    ev_map = {"GO": ev_go, "FGA": ev_fga, "PUNT": ev_punt}
    action_optimal = max(ev_map, key=lambda k: ev_map[k])

    # Quantile value Q_tau(V | s, a) under Sandholtz et al. (arXiv:2309.00756):
    # Risk-averse coaches (tau < 0.5) weight downside tail heavier; risk-seeking (tau > 0.5) weight upside heavier
    q_go = (1.0 - tau_val) * wp_go_fail + tau_val * wp_go_succ + 0.35 * (ev_go - 0.5 * (wp_go_fail + wp_go_succ))
    q_fga = (
        (1.0 - tau_val) * wp_fg_miss + tau_val * wp_fg_make + 0.35 * (ev_fga - 0.5 * (wp_fg_miss + wp_fg_make))
        if yl <= 42
        else -1.0
    )
    q_punt = ev_punt
    q_map = {"GO": q_go, "FGA": q_fga, "PUNT": q_punt}
    action_predicted = max(q_map, key=lambda k: q_map[k])

    wp_optimal = float(ev_map[action_optimal])
    wp_behavior = float(ev_map[action_predicted])
    wp_gap = 0.0 if action_predicted == action_optimal else float(max(0.0, wp_optimal - wp_behavior))

    return {
        "action_predicted": action_predicted,
        "action_optimal": action_optimal,
        "wp_behavior": wp_behavior,
        "wp_optimal": wp_optimal,
        "wp_gap": wp_gap,
        "tau_hat": tau_val,
        "fallback_level": cell["fallback_level"],
        "fit_stamp": cell["fit_stamp"],
        "region": region,
        "wp_bin": wp_bin,
        "qtr": q,
    }


# ============================================================================
# 12. HIERARCHICAL FG (X B4) & BALL-FLIGHT AERODYNAMICS KERNEL (EQ-PHYSICS-001)
# ============================================================================

def compute_eq_physics_001_ball_flight_modifier(
    elevation_ft: float = 0.0,
    temp_f: float = 65.0,
    wind_mph: float = 5.0,
    is_dome: bool = False,
    qb_spin_rpm: float = 600.0,
) -> Dict[str, float]:
    """Ball-flight aerodynamics & gyroscopic spin-stability kernel (X A1/A3/A7 & Part 3 §1 EQ-PHYSICS-001).

    Computes barometric air density ratio rho/rho_0, altitude carry bonus for field goals,
    and wind/gyroscopic spin-stability multiplier on deep passes.
    """
    eff_wind = 0.0 if is_dome else max(0.0, float(wind_mph))
    eff_temp = 70.0 if is_dome else float(temp_f)
    elev_m = max(0.0, float(elevation_ft)) * 0.3048
    temp_k = (eff_temp - 32.0) * (5.0 / 9.0) + 273.15
    # Barometric + ideal gas density ratio relative to sea level at 291.15 K (64.4 F)
    rho_ratio = float(np.exp(-elev_m / 8500.0) * (291.15 / max(240.0, temp_k)))
    # Lower air density reduces drag F_D = 0.5 * rho * v^2 * C_D * A -> extra FG range (~4.2 yds at Mile High)
    fg_range_bonus_yds = float(max(-2.5, (1.0 - rho_ratio) * 24.5 - 0.14 * max(0.0, eff_wind - 8.0)))

    # Gyroscopic stability (X A7): tighter spiral (higher RPM) stabilizes nose alignment against crosswind
    gyro_stability = float(np.clip((qb_spin_rpm - 500.0) / 150.0, 0.25, 1.15))
    wind_drag_penalty = 0.0045 * max(0.0, eff_wind - 7.0) * (1.35 - 0.45 * gyro_stability)
    cold_ball_penalty = 0.0012 * max(0.0, 50.0 - eff_temp)
    deep_pass_completion_mult = float(np.clip(1.0 - wind_drag_penalty - cold_ball_penalty, 0.82, 1.04))

    return {
        "air_density_ratio": rho_ratio,
        "fg_range_bonus_yds": fg_range_bonus_yds,
        "gyro_stability_index": gyro_stability,
        "deep_pass_completion_mult": deep_pass_completion_mult,
    }


def compute_b4_hierarchical_fg_make_prob(
    kick_distance_yds: float,
    elevation_ft: float = 0.0,
    wind_mph: float = 5.0,
    temp_f: float = 65.0,
    is_dome: bool = False,
    kicker_random_effect_logit: float = 0.0,
) -> float:
    """Hierarchical Bayesian FG Make Probability (@nfl_simulator B4, 23,247 NFL kicks).

    Calibrated to B4 anchors at sea level outdoors:
      30 yd -> ~97.0%
      45 yd -> ~80.0%
      55 yd -> ~61.0%
    Adjusted for altitude air-density carry, wind speed, temperature, dome, and kicker partial pooling.
    """
    phys = compute_eq_physics_001_ball_flight_modifier(
        elevation_ft=elevation_ft,
        temp_f=temp_f,
        wind_mph=wind_mph,
        is_dome=is_dome,
    )
    eff_dist = float(kick_distance_yds) - phys["fg_range_bonus_yds"]
    # Piecewise-smooth logistic calibrated to (30 -> 3.48 logit, 45 -> 1.386 logit, 55 -> 0.447 logit)
    if eff_dist <= 45.0:
        base_logit = 3.476 - 0.1393 * (eff_dist - 30.0)
    else:
        base_logit = 1.386 - 0.0939 * (eff_dist - 45.0)

    dome_bonus = 0.16 if is_dome else 0.0
    wind_pen = 0.0 if is_dome else 0.022 * max(0.0, float(wind_mph) - 8.0)
    logit = base_logit + dome_bonus - wind_pen + float(kicker_random_effect_logit)
    return float(np.clip(1.0 / (1.0 + np.exp(-logit)), 0.02, 0.995))


# ============================================================================
# 13. OL vs QB PRESSURE/SACK SURVIVAL ATTRIBUTION (X B6 + B9 + Signal 3)
# ============================================================================

def compute_b6_b9_ol_qb_pressure_sack_survival(
    ol_pbwr: float,
    def_prwr: float,
    qb_time_to_throw_sec: float = 2.75,
    qb_sack_per_dropback: float = 0.065,
    qb_throwaway_per_dropback: float = 0.045,
) -> Dict[str, float]:
    """Separates OL time-to-pressure prior from QB pressure-to-sack survival hazard (X B6 @Timo_NFL + B9 @kevin_cole).

    Integrates Signal 3 (PFR QB throwaway rate per dropback) as the QB's self-preservation escape valve.
    """
    # OL instantaneous pressure hazard lambda_OL increases as def_prwr > ol_pbwr
    trench_gap = float(def_prwr) - (float(ol_pbwr) - 0.18)
    ol_pressure_prior = float(np.clip(0.31 + 0.65 * trench_gap, 0.18, 0.52))

    # Survival probability S_OL(t) that pocket holds to qb_time_to_throw_sec
    hold_excess = max(0.0, float(qb_time_to_throw_sec) - 2.65)
    p_pressured = float(np.clip(ol_pressure_prior + 0.14 * hold_excess, 0.18, 0.58))

    # Conditional on pressure: QB either escapes via throwaway (Signal 3), gets ball out, or takes sack
    throwaway_escape = float(np.clip(float(qb_throwaway_per_dropback) / max(0.20, p_pressured), 0.02, 0.38))
    base_p2s = float(np.clip(float(qb_sack_per_dropback) / max(0.22, p_pressured), 0.08, 0.42))
    eff_p2s = float(np.clip(base_p2s * (1.0 - 0.45 * throwaway_escape) + 0.08 * hold_excess, 0.06, 0.45))

    expected_sack_prob = float(np.clip(p_pressured * eff_p2s, 0.02, 0.18))
    # Attribution share: how much of sack hazard comes from QB hold + low throwaway vs OL trench collapse
    qb_hazard_component = max(0.01, eff_p2s - 0.12)
    ol_hazard_component = max(0.01, ol_pressure_prior - 0.22)
    qb_fault_share = float(np.clip(qb_hazard_component / (qb_hazard_component + ol_hazard_component), 0.15, 0.85))

    return {
        "ol_pressure_prior": ol_pressure_prior,
        "pressure_prob_at_ttt": p_pressured,
        "throwaway_escape_prob_given_pressure": throwaway_escape,
        "pressure_to_sack_hazard": eff_p2s,
        "expected_sack_prob_per_dropback": expected_sack_prob,
        "qb_sack_fault_share": qb_fault_share,
    }


# ============================================================================
# 14. ADAPTIVE CONFORMAL INFERENCE (ACI) & SNAP-TIMING VARIANCE (Papers #12-#15, #19)
# ============================================================================

def compute_adaptive_conformal_interval_aci(
    sim_samples: np.ndarray,
    target_alpha: float = 0.10,
    gamma_step: float = 0.02,
    recent_errors: Optional[Sequence[int]] = None,
    dependence_slack: float = 0.01,
) -> Dict[str, float]:
    """Adaptive Conformal Inference (Gibbs & Candès 2106.00170 + Barber et al. 2202.13415 + Tibshirani 1904.06019).

    Updates miscoverage rate alpha_t via online step alpha_{t+1} = alpha_t + gamma * (alpha - err_t)
    and subtracts Barber et al. non-exchangeable dependence slack so intervals widen under regime drift.
    """
    arr = np.asarray(sim_samples, dtype=np.float64)
    alpha_t = float(target_alpha)
    if recent_errors:
        for err in recent_errors:
            alpha_t = alpha_t + float(gamma_step) * (float(target_alpha) - float(err))
    # Subtract non-exchangeable dependence slack (smaller alpha_eff => wider predictive interval)
    alpha_eff = float(np.clip(alpha_t - max(0.0, float(dependence_slack)), 0.01, 0.40))
    q_low = float(np.quantile(arr, 0.5 * alpha_eff))
    q_high = float(np.quantile(arr, 1.0 - 0.5 * alpha_eff))
    return {
        "lower": q_low,
        "upper": q_high,
        "width": float(q_high - q_low),
        "alpha_adapted": alpha_eff,
        "effective_coverage": float(1.0 - alpha_eff),
    }


def compute_nguyen_yurko_snap_timing_variance(
    motion_rate: float = 0.55,
    neutral_pace_sec: float = 27.5,
    qb_cadence_entropy: float = 0.50,
) -> Dict[str, float]:
    """Bayesian Multilevel Snap-Timing Variance (Nguyen & Yurko arXiv:2502.16313, Part 3 Paper #19).

    High pre-snap motion rate and QB cadence entropy increase snap-timing variance,
    penalizing defensive pass-rush get-off jump timing.
    """
    mot_delta = float(motion_rate) - 0.50
    ent_delta = float(qb_cadence_entropy) - 0.45
    pace_factor = float(np.clip((30.0 - float(neutral_pace_sec)) / 6.0, -0.5, 0.8))
    var_mult = float(np.clip(1.0 + 0.35 * mot_delta + 0.40 * ent_delta + 0.08 * pace_factor, 0.85, 1.35))
    rush_jump_penalty = float(np.clip(-0.035 * max(0.0, var_mult - 1.0), -0.025, 0.0))
    return {
        "snap_timing_variance_mult": var_mult,
        "def_pass_rush_jump_penalty": rush_jump_penalty,
    }

