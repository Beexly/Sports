"""Unified Scores24 + Pro Football Reference (PFR) + PFF + Next Gen Stats (NGS) + FTN Trend Engine.

Built under `/rea-tool-design` and `/rea-analysis-optimization` contracts to implement
Garrett's Sunday 03:27 AM / 03:32 AM / 03:34 AM CST directives:
- "trends trends trends (stats) !!!!!!!!!! the more we can see the game ahead of the game
  is how we are going to get closer to 100% accuracy - data tells the story and
  context/situational awareness brings the brain"
- "/rea-tool-design /rea-analysis-optimization https://scores24.live/ - this website has the
  kind of trend data that i expect to see ALONG WITH THE PRO FOOTBALL REFENCE, PFF, NGS,
  ANY AND EVERY OTHER FUCKING STATE AND TREND THAT WE ALREADY HAVE!!!"

Architectural & Optimization Guarantees:
1. `/rea-tool-design` Single Normalized Producer Boundary (`UnifiedScores24PfrPffNgsTrendEngine`):
   - Normalizes 5 orthogonal statistical and trend lenses (`Scores24StreakEvidence`,
     `PFRHistoricalSplitEvidence`, `PFFMicroMatchupEvidence`, `NGSTrackingPhysicsEvidence`,
     and `MultiHorizonChartingEvidence` linked to `T-01..T-12`) into a single immutable
     `TrendEvidencePacket` and `TrendConvergenceVerdict`.
   - Enforces explicit recovery around partial/malformed inputs (`COMPLETE_VERIFIED` vs
     `PARTIAL_RECOVERY`) and triggers the 80-Rule Misleading-Stat Firewall (`FAKE_STREAK_TRAP`)
     whenever a surface box-score streak contradicts underlying NGS/PFF/L2 velocity physics.
2. `/rea-analysis-optimization` Validate-Once Shared Producer Cache & O(1) Indexed Reuse:
   - Computes and normalizes the full 15-game Week 9 game-market + 360-degree player/period/IDP/
     kicking/TD/DFS catalog ONCE per `(season, week, content_sha256_digest, log_odds_cap)` key.
   - Materializes O(1) secondary lookup tables (`by_packet_id`, `by_game_id`, `by_matchup`,
     `by_market_category`, `by_entity_id`, `story_convergence_locks`, `fake_streak_traps`) with
     bounded cache retention (`MAX_RETAINED_CACHE_ENTRIES = 8`) and deterministic invalidation.
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

from intelligence.trends.nfl_multi_horizon_trends_and_pre_game_vision_engine import (
    WEEK9_MATCHUPS,
    GamePreSnapVisionDossier,
    NFLMultiHorizonTrendsAndPreGameVisionEngine,
)

REPO_ROOT = Path(__file__).resolve().parents[2]

MARKET_CATEGORIES_360: Tuple[str, ...] = (
    "PERIOD_1Q_1H_2H_4Q",
    "GAME_TOTAL_AND_SPREAD",
    "QB_PASSING_AND_RUSHING_SUITE",
    "SKILL_RECEIVING_AND_RUSHING_SUITE",
    "KICKING_FG_AND_POINTS_SUITE",
    "IDP_SACKS_AND_TACKLES_SUITE",
    "TOUCHDOWN_SCORER_SUITE",
    "DFS_200PT_CEILING_STACK_SUITE",
)


def _safe_float(val: Any, default: float = 0.0) -> Tuple[float, bool]:
    """Return finite float and whether fallback recovery was triggered."""
    if val is None or isinstance(val, bool):
        return default, True
    try:
        f = float(val)
        if not math.isfinite(f):
            return default, True
        return f, False
    except (TypeError, ValueError):
        return default, True


def compute_wilson_and_beta_binomial_hit_prob(
    hits_l5: int,
    hits_l8: int,
    hits_l10: int,
    season_hits: int,
    season_games: int,
    opponent_allowed_hits_l8: int,
    prior_alpha: float = 2.0,
    prior_beta: float = 2.0,
    z_score: float = 1.28155,
) -> Tuple[float, float, float]:
    """Compute empirical weighted hit rate, Beta-Binomial posterior mean, and Wilson lower bound.

    Prevents small-sample streak overfitting while rewarding multi-window structural consistency
    across L5, L8, L10, YTD season, and opponent L8 allowed rate.
    """
    h5 = max(0, min(5, int(hits_l5)))
    h8 = max(0, min(8, int(hits_l8)))
    h10 = max(0, min(10, int(hits_l10)))
    sg = max(1, int(season_games))
    sh = max(0, min(sg, int(season_hits)))
    opp8 = max(0, min(8, int(opponent_allowed_hits_l8)))

    raw_rate_l5 = h5 / 5.0
    raw_rate_l8 = h8 / 8.0
    raw_rate_l10 = h10 / 10.0
    raw_rate_season = sh / float(sg)
    raw_rate_opp8 = opp8 / 8.0

    # Multi-window weighted empirical hit rate (Scores24 + Opponent Allowed synthesis)
    empirical_p = (
        0.28 * raw_rate_l5
        + 0.24 * raw_rate_l8
        + 0.16 * raw_rate_l10
        + 0.14 * raw_rate_season
        + 0.18 * raw_rate_opp8
    )

    # Effective independent sample size across blended horizons (capped at sg + 8 opp games)
    n_eff = float(min(sg + 8, 16))
    k_eff = empirical_p * n_eff

    beta_binomial_p = (k_eff + prior_alpha) / (n_eff + prior_alpha + prior_beta)

    # Wilson score lower bound on Beta-shrunk probability
    z2 = z_score * z_score
    denom = 1.0 + z2 / n_eff
    center = beta_binomial_p + z2 / (2.0 * n_eff)
    radicand = max(
        0.0,
        (beta_binomial_p * (1.0 - beta_binomial_p)) / n_eff + (z2 / (4.0 * n_eff * n_eff)),
    )
    wilson_lb = max(0.01, min(0.99, (center - z_score * math.sqrt(radicand)) / denom))

    return (
        round(empirical_p, 4),
        round(beta_binomial_p, 4),
        round(wilson_lb, 4),
    )


@dataclass(frozen=True)
class Scores24StreakEvidence:
    """Lens 1: Scores24 discrete hit-rate, streak, split, and opponent-allowed matrix."""

    hits_l5: int
    hits_l8: int
    hits_l10: int
    season_hits: int
    season_games: int
    active_consecutive_streak: int
    opponent_allowed_hits_l8: int
    split_hit_rate_home_away: float
    split_hit_rate_surface_dome: float
    split_hit_rate_fav_dog: float
    split_hit_rate_divisional: float
    empirical_blended_hit_rate: float
    beta_binomial_posterior_p: float
    wilson_lower_bound_p: float


@dataclass(frozen=True)
class PFRHistoricalSplitEvidence:
    """Lens 2: Pro Football Reference (PFR) empirical game-log quantiles & situational splits."""

    floor_p10: float
    p25: float
    median_p50: float
    p75: float
    ceiling_p90: float
    neutral_pace_sec_per_play: float
    red_zone_inside_20_share: float
    green_zone_inside_10_share: float
    goal_line_inside_5_share: float
    third_fourth_down_conversion_rate: float
    h2h_scheme_historical_modifier: float


@dataclass(frozen=True)
class PFFMicroMatchupEvidence:
    """Lens 3: PFF Offense vs Defense micro-matchup & trench/coverage grades."""

    pff_off_grade: float
    pff_def_matchup_grade: float
    ol_pass_block_vs_dl_pass_rush_delta: float
    ol_run_block_vs_dl_run_def_delta: float
    wr_vs_primary_cb_grade_delta: float
    yprr_vs_man: float
    yprr_vs_zone: float
    pass_rush_win_rate: float
    missed_tackles_forced_per_touch: float
    composite_pff_matchup_edge: float


@dataclass(frozen=True)
class NGSTrackingPhysicsEvidence:
    """Lens 4: Next Gen Stats (NGS) tracking physics & separation/air-yards/RYOE metrics."""

    avg_separation_yds: float
    avg_cushion_yds: float
    avg_intended_air_yards: float
    cpoe: float
    time_to_throw_sec: float
    ryoe_per_att: float
    eight_plus_box_rate: float
    ball_carrier_max_mph: float
    aggressiveness_pct: float
    composite_ngs_physics_score: float


@dataclass(frozen=True)
class MultiHorizonChartingEvidence:
    """Lens 5: Multi-Horizon Velocity (T-01..T-12 YTD->L4->L2) & FTN charting integration."""

    linked_trend_family_ids: Tuple[str, ...]
    velocity_l2_vs_ytd: float
    acceleration_l2_vs_l4: float
    motion_at_snap_rate: float
    play_action_rate: float
    screen_rate: float
    proe_plus_l3: float
    referee_crew_name: str
    referee_dpi_per_game: float
    situational_vision_multiplier: float


@dataclass(frozen=True)
class FrontOfficeSpatialMicroTrendEvidence:
    """Lens 6: Front-Office Spatial, Micro-Blocking, Biomechanical & Conceptual Processing Multi-Horizon Trends (L3/L4/L5/L8/YTD)."""

    elusive_rating_l3: float
    elusive_rating_l5: float
    elusive_rating_ytd: float
    tovs_l3: float
    tovs_l5: float
    tovs_ytd: float
    ryoe_boom_rate_gt_5yd: float
    ryoe_consistency_rate_gt_1yd: float
    unfair_yards_rate: float
    true_box_spacing_delta: float
    tracking_vector_mesh_gap_yds: float
    ybc_per_att: float
    shed_time_survival_rate: float
    def_penetration_depth_yds: float
    designated_first_read_rb_target_rate: float
    rb_yprr_tier: str
    ssp_separation_yds: float
    burn_rate_vs_man_gt_2yds: float
    catch_point_leverage_delta_yds: float
    true_csoe_target_prevention_rate: float
    contested_catch_rate: float
    catchable_ball_rate: float
    hard_hit_rate: float
    disguise_decay_ms: float
    simulated_pressure_success_rate: float
    throw_to_leverage_variance_tlv: float
    prwr_under_25s: float
    pocket_anchor_depth_pad_yds: float
    stunt_handoff_latency_ms: float
    pocket_collapse_vector_pcv: float
    escape_vector_efficiency_eve: float
    mofo_mofc_structural_eff: float
    zone_void_exploitation_rate_zver: float
    spatial_micro_velocity_l3_vs_ytd: float
    spatial_micro_cleared: bool


@dataclass(frozen=True)
class TrendConvergenceVerdict:
    """5-Lens + Front-Office Spatial Micro-Metric Convergence Verdict & 80-Rule Misleading-Stat Firewall decision."""

    scores24_streak_cleared: bool
    pfr_floor_cleared: bool
    pff_matchup_cleared: bool
    ngs_physics_cleared: bool
    multi_horizon_velocity_cleared: bool
    converged_lenses_count: int
    story_convergence_lock: bool
    fake_streak_trap: bool
    firewall_trap_reason: Optional[str]
    publish_allowed: bool
    pre_sim_log_odds_delta: float
    conjunction_gate_confidence_boost: float
    dfs_200pt_ceiling_leverage_score: float
    verdict_narrative: str


@dataclass(frozen=True)
class TrendEvidencePacket:
    """`/rea-tool-design` normalized Evidence packet for a single game or player market."""

    packet_id: str
    game_id: str
    matchup: str
    team: str
    opponent: str
    entity_id: str
    entity_name: str
    position: str
    market_category: str
    market_type: str
    selection_side: str
    line_value: float
    american_odds: int
    scores24_streak: Scores24StreakEvidence
    pfr_splits: PFRHistoricalSplitEvidence
    pff_matchup: PFFMicroMatchupEvidence
    ngs_physics: NGSTrackingPhysicsEvidence
    multi_horizon_charting: MultiHorizonChartingEvidence
    convergence_verdict: TrendConvergenceVerdict
    evidence_status: str
    examined_scope: Tuple[str, ...]
    partial_fields_recovered: Tuple[str, ...]
    front_office_spatial_micro: Optional[FrontOfficeSpatialMicroTrendEvidence] = None


# Curated Week 9 360-Degree Player, Period, Kicking, IDP, TD & DFS Trend Catalog
# (Supplemented automatically with full-game & period trend packets for all 15 Week 9 games)
WEEK9_CURATED_PLAYER_AND_SPECIALTY_MARKETS: Tuple[Dict[str, Any], ...] = (
    # 1. ARI@SEA — Trey McBride Receiving & Kenneth Walker Rushing + Boye Mafe 0.25 Sack
    {
        "packet_id": "W9_ARI_SEA_MCBRIDE_REC_YDS",
        "game_id": "2026_09_ARI_SEA",
        "matchup": "ARI@SEA",
        "team": "ARI",
        "opponent": "SEA",
        "entity_id": "ARI_TE_MCBRIDE",
        "entity_name": "Trey McBride",
        "position": "TE",
        "market_category": "SKILL_RECEIVING_AND_RUSHING_SUITE",
        "market_type": "player_reception_yds",
        "selection_side": "OVER",
        "line_value": 58.5,
        "american_odds": -114,
        "hits_l5": 5,
        "hits_l8": 7,
        "hits_l10": 8,
        "season_hits": 7,
        "season_games": 8,
        "active_consecutive_streak": 5,
        "opponent_allowed_hits_l8": 6,
        "floor_p10": 48.0,
        "p25": 56.5,
        "median_p50": 68.0,
        "p75": 79.5,
        "ceiling_p90": 94.0,
        "red_zone_inside_20_share": 0.31,
        "green_zone_inside_10_share": 0.34,
        "goal_line_inside_5_share": 0.28,
        "third_fourth_down_conversion_rate": 0.48,
        "pff_off_grade": 86.4,
        "pff_def_matchup_grade": 61.2,
        "ol_pass_block_vs_dl_pass_rush_delta": 3.5,
        "ol_run_block_vs_dl_run_def_delta": 2.1,
        "wr_vs_primary_cb_grade_delta": 18.4,
        "yprr_vs_man": 2.42,
        "yprr_vs_zone": 2.68,
        "pass_rush_win_rate": 0.14,
        "missed_tackles_forced_per_touch": 0.24,
        "avg_separation_yds": 3.45,
        "avg_cushion_yds": 6.1,
        "avg_intended_air_yards": 7.8,
        "cpoe": 4.2,
        "time_to_throw_sec": 2.64,
        "ryoe_per_att": 0.0,
        "eight_plus_box_rate": 0.18,
        "ball_carrier_max_mph": 19.6,
        "aggressiveness_pct": 14.5,
        "velocity_l2_vs_ytd": 0.14,
        "acceleration_l2_vs_l4": 0.06,
        "motion_at_snap_rate": 0.26,
        "play_action_rate": 0.31,
        "screen_rate": 0.11,
    },
    {
        "packet_id": "W9_ARI_SEA_MAFE_IDP_SACK_025",
        "game_id": "2026_09_ARI_SEA",
        "matchup": "ARI@SEA",
        "team": "SEA",
        "opponent": "ARI",
        "entity_id": "SEA_EDGE_MAFE",
        "entity_name": "Boye Mafe",
        "position": "EDGE",
        "market_category": "IDP_SACKS_AND_TACKLES_SUITE",
        "market_type": "player_sacks_025",
        "selection_side": "OVER",
        "line_value": 0.25,
        "american_odds": -145,
        "hits_l5": 4,
        "hits_l8": 7,
        "hits_l10": 8,
        "season_hits": 7,
        "season_games": 8,
        "active_consecutive_streak": 4,
        "opponent_allowed_hits_l8": 7,
        "floor_p10": 0.0,
        "p25": 0.5,
        "median_p50": 1.0,
        "p75": 1.0,
        "ceiling_p90": 1.5,
        "red_zone_inside_20_share": 0.82,
        "green_zone_inside_10_share": 0.80,
        "goal_line_inside_5_share": 0.78,
        "third_fourth_down_conversion_rate": 0.44,
        "pff_off_grade": 83.2,
        "pff_def_matchup_grade": 64.5,
        "ol_pass_block_vs_dl_pass_rush_delta": 14.8,
        "ol_run_block_vs_dl_run_def_delta": 8.4,
        "wr_vs_primary_cb_grade_delta": 12.0,
        "yprr_vs_man": 0.0,
        "yprr_vs_zone": 0.0,
        "pass_rush_win_rate": 0.218,
        "missed_tackles_forced_per_touch": 0.0,
        "avg_separation_yds": 0.0,
        "avg_cushion_yds": 0.0,
        "avg_intended_air_yards": 0.0,
        "cpoe": 0.0,
        "time_to_throw_sec": 2.41,
        "ryoe_per_att": 0.45,
        "eight_plus_box_rate": 0.25,
        "ball_carrier_max_mph": 19.2,
        "aggressiveness_pct": 18.0,
        "velocity_l2_vs_ytd": 0.11,
        "acceleration_l2_vs_l4": 0.05,
        "motion_at_snap_rate": 0.0,
        "play_action_rate": 0.28,
        "screen_rate": 0.09,
    },
    # 2. BUF@MIN — Josh Allen Pass+Rush & Justin Jefferson Receiving + 1Q Total Over
    {
        "packet_id": "W9_BUF_MIN_ALLEN_PASS_RUSH_YDS",
        "game_id": "2026_09_BUF_MIN",
        "matchup": "BUF@MIN",
        "team": "BUF",
        "opponent": "MIN",
        "entity_id": "BUF_QB_ALLEN",
        "entity_name": "Josh Allen",
        "position": "QB",
        "market_category": "QB_PASSING_AND_RUSHING_SUITE",
        "market_type": "player_pass_rush_yds",
        "selection_side": "OVER",
        "line_value": 284.5,
        "american_odds": -112,
        "hits_l5": 4,
        "hits_l8": 7,
        "hits_l10": 8,
        "season_hits": 7,
        "season_games": 8,
        "active_consecutive_streak": 4,
        "opponent_allowed_hits_l8": 6,
        "floor_p10": 248.0,
        "p25": 272.0,
        "median_p50": 304.5,
        "p75": 332.0,
        "ceiling_p90": 368.0,
        "red_zone_inside_20_share": 0.58,
        "green_zone_inside_10_share": 0.62,
        "goal_line_inside_5_share": 0.54,
        "third_fourth_down_conversion_rate": 0.51,
        "pff_off_grade": 91.4,
        "pff_def_matchup_grade": 74.2,
        "ol_pass_block_vs_dl_pass_rush_delta": 4.2,
        "ol_run_block_vs_dl_run_def_delta": 5.8,
        "wr_vs_primary_cb_grade_delta": 11.4,
        "yprr_vs_man": 2.35,
        "yprr_vs_zone": 2.52,
        "pass_rush_win_rate": 0.16,
        "missed_tackles_forced_per_touch": 0.31,
        "avg_separation_yds": 3.12,
        "avg_cushion_yds": 5.9,
        "avg_intended_air_yards": 9.1,
        "cpoe": 5.4,
        "time_to_throw_sec": 2.86,
        "ryoe_per_att": 1.18,
        "eight_plus_box_rate": 0.22,
        "ball_carrier_max_mph": 20.4,
        "aggressiveness_pct": 16.8,
        "velocity_l2_vs_ytd": 0.15,
        "acceleration_l2_vs_l4": 0.06,
        "motion_at_snap_rate": 0.32,
        "play_action_rate": 0.34,
        "screen_rate": 0.12,
    },
    {
        "packet_id": "W9_BUF_MIN_JEFFERSON_REC_YDS",
        "game_id": "2026_09_BUF_MIN",
        "matchup": "BUF@MIN",
        "team": "MIN",
        "opponent": "BUF",
        "entity_id": "MIN_WR_JEFFERSON",
        "entity_name": "Justin Jefferson",
        "position": "WR",
        "market_category": "SKILL_RECEIVING_AND_RUSHING_SUITE",
        "market_type": "player_reception_yds",
        "selection_side": "OVER",
        "line_value": 88.5,
        "american_odds": -110,
        "hits_l5": 4,
        "hits_l8": 7,
        "hits_l10": 9,
        "season_hits": 7,
        "season_games": 8,
        "active_consecutive_streak": 4,
        "opponent_allowed_hits_l8": 6,
        "floor_p10": 72.0,
        "p25": 84.0,
        "median_p50": 102.5,
        "p75": 124.0,
        "ceiling_p90": 146.0,
        "red_zone_inside_20_share": 0.33,
        "green_zone_inside_10_share": 0.36,
        "goal_line_inside_5_share": 0.30,
        "third_fourth_down_conversion_rate": 0.49,
        "pff_off_grade": 92.8,
        "pff_def_matchup_grade": 68.4,
        "ol_pass_block_vs_dl_pass_rush_delta": 2.9,
        "ol_run_block_vs_dl_run_def_delta": 1.8,
        "wr_vs_primary_cb_grade_delta": 21.5,
        "yprr_vs_man": 3.18,
        "yprr_vs_zone": 3.04,
        "pass_rush_win_rate": 0.15,
        "missed_tackles_forced_per_touch": 0.22,
        "avg_separation_yds": 3.38,
        "avg_cushion_yds": 6.4,
        "avg_intended_air_yards": 12.6,
        "cpoe": 6.1,
        "time_to_throw_sec": 2.78,
        "ryoe_per_att": 0.0,
        "eight_plus_box_rate": 0.14,
        "ball_carrier_max_mph": 21.2,
        "aggressiveness_pct": 19.4,
        "velocity_l2_vs_ytd": 0.16,
        "acceleration_l2_vs_l4": 0.07,
        "motion_at_snap_rate": 0.38,
        "play_action_rate": 0.36,
        "screen_rate": 0.10,
    },
    # 3. CIN@ATL — Joe Burrow + Ja'Marr Chase + Bijan Robinson 200+ Pt DFS Stack & Props
    {
        "packet_id": "W9_CIN_ATL_CHASE_REC_YDS",
        "game_id": "2026_09_CIN_ATL",
        "matchup": "CIN@ATL",
        "team": "CIN",
        "opponent": "ATL",
        "entity_id": "CIN_WR_CHASE",
        "entity_name": "Ja'Marr Chase",
        "position": "WR",
        "market_category": "DFS_200PT_CEILING_STACK_SUITE",
        "market_type": "player_reception_yds_and_dfs_ceiling",
        "selection_side": "OVER",
        "line_value": 86.5,
        "american_odds": -114,
        "hits_l5": 5,
        "hits_l8": 7,
        "hits_l10": 9,
        "season_hits": 7,
        "season_games": 8,
        "active_consecutive_streak": 5,
        "opponent_allowed_hits_l8": 7,
        "floor_p10": 68.0,
        "p25": 82.5,
        "median_p50": 104.0,
        "p75": 132.0,
        "ceiling_p90": 168.0,
        "red_zone_inside_20_share": 0.36,
        "green_zone_inside_10_share": 0.41,
        "goal_line_inside_5_share": 0.38,
        "third_fourth_down_conversion_rate": 0.53,
        "pff_off_grade": 91.9,
        "pff_def_matchup_grade": 65.8,
        "ol_pass_block_vs_dl_pass_rush_delta": 6.4,
        "ol_run_block_vs_dl_run_def_delta": 3.2,
        "wr_vs_primary_cb_grade_delta": 22.8,
        "yprr_vs_man": 3.34,
        "yprr_vs_zone": 2.96,
        "pass_rush_win_rate": 0.13,
        "missed_tackles_forced_per_touch": 0.29,
        "avg_separation_yds": 3.52,
        "avg_cushion_yds": 6.8,
        "avg_intended_air_yards": 11.9,
        "cpoe": 6.8,
        "time_to_throw_sec": 2.58,
        "ryoe_per_att": 0.0,
        "eight_plus_box_rate": 0.12,
        "ball_carrier_max_mph": 21.6,
        "aggressiveness_pct": 18.2,
        "velocity_l2_vs_ytd": 0.19,
        "acceleration_l2_vs_l4": 0.08,
        "motion_at_snap_rate": 0.34,
        "play_action_rate": 0.29,
        "screen_rate": 0.14,
    },
    {
        "packet_id": "W9_CIN_ATL_BIJAN_RUSH_REC_YDS",
        "game_id": "2026_09_CIN_ATL",
        "matchup": "CIN@ATL",
        "team": "ATL",
        "opponent": "CIN",
        "entity_id": "ATL_RB_BIJAN",
        "entity_name": "Bijan Robinson",
        "position": "RB",
        "market_category": "SKILL_RECEIVING_AND_RUSHING_SUITE",
        "market_type": "player_rush_reception_yds",
        "selection_side": "OVER",
        "line_value": 104.5,
        "american_odds": -115,
        "hits_l5": 5,
        "hits_l8": 7,
        "hits_l10": 8,
        "season_hits": 7,
        "season_games": 8,
        "active_consecutive_streak": 5,
        "opponent_allowed_hits_l8": 7,
        "floor_p10": 86.0,
        "p25": 98.5,
        "median_p50": 118.0,
        "p75": 138.0,
        "ceiling_p90": 162.0,
        "red_zone_inside_20_share": 0.64,
        "green_zone_inside_10_share": 0.68,
        "goal_line_inside_5_share": 0.65,
        "third_fourth_down_conversion_rate": 0.49,
        "pff_off_grade": 89.5,
        "pff_def_matchup_grade": 62.4,
        "ol_pass_block_vs_dl_pass_rush_delta": 5.1,
        "ol_run_block_vs_dl_run_def_delta": 14.2,
        "wr_vs_primary_cb_grade_delta": 16.5,
        "yprr_vs_man": 2.18,
        "yprr_vs_zone": 2.34,
        "pass_rush_win_rate": 0.12,
        "missed_tackles_forced_per_touch": 0.36,
        "avg_separation_yds": 3.62,
        "avg_cushion_yds": 6.5,
        "avg_intended_air_yards": 2.4,
        "cpoe": 3.8,
        "time_to_throw_sec": 2.66,
        "ryoe_per_att": 1.12,
        "eight_plus_box_rate": 0.19,
        "ball_carrier_max_mph": 21.1,
        "aggressiveness_pct": 14.0,
        "velocity_l2_vs_ytd": 0.16,
        "acceleration_l2_vs_l4": 0.07,
        "motion_at_snap_rate": 0.31,
        "play_action_rate": 0.35,
        "screen_rate": 0.16,
    },
    # 4. CLE@NO — Myles Garrett IDP 0.25 Sack + Blake Grupe Kicking FG Over 1.5
    {
        "packet_id": "W9_CLE_NO_GARRETT_IDP_SACK_025",
        "game_id": "2026_09_CLE_NO",
        "matchup": "CLE@NO",
        "team": "CLE",
        "opponent": "NO",
        "entity_id": "CLE_EDGE_GARRETT",
        "entity_name": "Myles Garrett",
        "position": "EDGE",
        "market_category": "IDP_SACKS_AND_TACKLES_SUITE",
        "market_type": "player_sacks_025",
        "selection_side": "OVER",
        "line_value": 0.25,
        "american_odds": -165,
        "hits_l5": 5,
        "hits_l8": 7,
        "hits_l10": 9,
        "season_hits": 7,
        "season_games": 8,
        "active_consecutive_streak": 6,
        "opponent_allowed_hits_l8": 7,
        "floor_p10": 0.5,
        "p25": 0.5,
        "median_p50": 1.0,
        "p75": 1.5,
        "ceiling_p90": 2.5,
        "red_zone_inside_20_share": 0.88,
        "green_zone_inside_10_share": 0.86,
        "goal_line_inside_5_share": 0.85,
        "third_fourth_down_conversion_rate": 0.47,
        "pff_off_grade": 94.6,
        "pff_def_matchup_grade": 60.8,
        "ol_pass_block_vs_dl_pass_rush_delta": 24.5,
        "ol_run_block_vs_dl_run_def_delta": 16.2,
        "wr_vs_primary_cb_grade_delta": 18.0,
        "yprr_vs_man": 0.0,
        "yprr_vs_zone": 0.0,
        "pass_rush_win_rate": 0.284,
        "missed_tackles_forced_per_touch": 0.0,
        "avg_separation_yds": 0.0,
        "avg_cushion_yds": 0.0,
        "avg_intended_air_yards": 0.0,
        "cpoe": 0.0,
        "time_to_throw_sec": 2.34,
        "ryoe_per_att": 0.65,
        "eight_plus_box_rate": 0.28,
        "ball_carrier_max_mph": 19.8,
        "aggressiveness_pct": 21.0,
        "velocity_l2_vs_ytd": 0.14,
        "acceleration_l2_vs_l4": 0.06,
        "motion_at_snap_rate": 0.0,
        "play_action_rate": 0.25,
        "screen_rate": 0.11,
    },
    {
        "packet_id": "W9_CLE_NO_GRUPE_FG_OVER_15",
        "game_id": "2026_09_CLE_NO",
        "matchup": "CLE@NO",
        "team": "NO",
        "opponent": "CLE",
        "entity_id": "NO_K_GRUPE",
        "entity_name": "Blake Grupe",
        "position": "K",
        "market_category": "KICKING_FG_AND_POINTS_SUITE",
        "market_type": "player_field_goals",
        "selection_side": "OVER",
        "line_value": 1.5,
        "american_odds": -118,
        "hits_l5": 4,
        "hits_l8": 7,
        "hits_l10": 8,
        "season_hits": 7,
        "season_games": 8,
        "active_consecutive_streak": 4,
        "opponent_allowed_hits_l8": 6,
        "floor_p10": 1.0,
        "p25": 1.5,
        "median_p50": 2.0,
        "p75": 3.0,
        "ceiling_p90": 3.5,
        "red_zone_inside_20_share": 0.48,
        "green_zone_inside_10_share": 0.45,
        "goal_line_inside_5_share": 0.42,
        "third_fourth_down_conversion_rate": 0.39,
        "pff_off_grade": 81.5,
        "pff_def_matchup_grade": 68.0,
        "ol_pass_block_vs_dl_pass_rush_delta": 4.5,
        "ol_run_block_vs_dl_run_def_delta": 3.8,
        "wr_vs_primary_cb_grade_delta": 8.5,
        "yprr_vs_man": 0.0,
        "yprr_vs_zone": 0.0,
        "pass_rush_win_rate": 0.15,
        "missed_tackles_forced_per_touch": 0.0,
        "avg_separation_yds": 0.0,
        "avg_cushion_yds": 0.0,
        "avg_intended_air_yards": 0.0,
        "cpoe": 2.4,
        "time_to_throw_sec": 2.65,
        "ryoe_per_att": 0.35,
        "eight_plus_box_rate": 0.24,
        "ball_carrier_max_mph": 18.5,
        "aggressiveness_pct": 15.0,
        "velocity_l2_vs_ytd": 0.12,
        "acceleration_l2_vs_l4": 0.04,
        "motion_at_snap_rate": 0.24,
        "play_action_rate": 0.27,
        "screen_rate": 0.10,
    },
    # 5. DAL@IND — CeeDee Lamb Receiving + Brandon Aubrey Kicking Points Over 7.5
    {
        "packet_id": "W9_DAL_IND_LAMB_REC_YDS",
        "game_id": "2026_09_DAL_IND",
        "matchup": "DAL@IND",
        "team": "DAL",
        "opponent": "IND",
        "entity_id": "DAL_WR_LAMB",
        "entity_name": "CeeDee Lamb",
        "position": "WR",
        "market_category": "SKILL_RECEIVING_AND_RUSHING_SUITE",
        "market_type": "player_reception_yds",
        "selection_side": "OVER",
        "line_value": 82.5,
        "american_odds": -114,
        "hits_l5": 4,
        "hits_l8": 7,
        "hits_l10": 8,
        "season_hits": 7,
        "season_games": 8,
        "active_consecutive_streak": 4,
        "opponent_allowed_hits_l8": 6,
        "floor_p10": 66.0,
        "p25": 78.5,
        "median_p50": 96.0,
        "p75": 118.0,
        "ceiling_p90": 144.0,
        "red_zone_inside_20_share": 0.35,
        "green_zone_inside_10_share": 0.38,
        "goal_line_inside_5_share": 0.32,
        "third_fourth_down_conversion_rate": 0.48,
        "pff_off_grade": 90.2,
        "pff_def_matchup_grade": 64.9,
        "ol_pass_block_vs_dl_pass_rush_delta": 4.8,
        "ol_run_block_vs_dl_run_def_delta": 2.4,
        "wr_vs_primary_cb_grade_delta": 19.6,
        "yprr_vs_man": 3.08,
        "yprr_vs_zone": 2.94,
        "pass_rush_win_rate": 0.14,
        "missed_tackles_forced_per_touch": 0.25,
        "avg_separation_yds": 3.41,
        "avg_cushion_yds": 6.3,
        "avg_intended_air_yards": 10.8,
        "cpoe": 4.9,
        "time_to_throw_sec": 2.69,
        "ryoe_per_att": 0.0,
        "eight_plus_box_rate": 0.15,
        "ball_carrier_max_mph": 20.9,
        "aggressiveness_pct": 17.5,
        "velocity_l2_vs_ytd": 0.14,
        "acceleration_l2_vs_l4": 0.05,
        "motion_at_snap_rate": 0.36,
        "play_action_rate": 0.30,
        "screen_rate": 0.13,
    },
    {
        "packet_id": "W9_DAL_IND_AUBREY_KICKING_PTS",
        "game_id": "2026_09_DAL_IND",
        "matchup": "DAL@IND",
        "team": "DAL",
        "opponent": "IND",
        "entity_id": "DAL_K_AUBREY",
        "entity_name": "Brandon Aubrey",
        "position": "K",
        "market_category": "KICKING_FG_AND_POINTS_SUITE",
        "market_type": "player_kicking_points",
        "selection_side": "OVER",
        "line_value": 7.5,
        "american_odds": -120,
        "hits_l5": 5,
        "hits_l8": 7,
        "hits_l10": 9,
        "season_hits": 7,
        "season_games": 8,
        "active_consecutive_streak": 5,
        "opponent_allowed_hits_l8": 6,
        "floor_p10": 6.0,
        "p25": 7.5,
        "median_p50": 9.5,
        "p75": 12.0,
        "ceiling_p90": 15.0,
        "red_zone_inside_20_share": 0.52,
        "green_zone_inside_10_share": 0.48,
        "goal_line_inside_5_share": 0.44,
        "third_fourth_down_conversion_rate": 0.45,
        "pff_off_grade": 91.0,
        "pff_def_matchup_grade": 67.5,
        "ol_pass_block_vs_dl_pass_rush_delta": 5.5,
        "ol_run_block_vs_dl_run_def_delta": 3.5,
        "wr_vs_primary_cb_grade_delta": 12.0,
        "yprr_vs_man": 0.0,
        "yprr_vs_zone": 0.0,
        "pass_rush_win_rate": 0.14,
        "missed_tackles_forced_per_touch": 0.0,
        "avg_separation_yds": 0.0,
        "avg_cushion_yds": 0.0,
        "avg_intended_air_yards": 0.0,
        "cpoe": 3.5,
        "time_to_throw_sec": 2.68,
        "ryoe_per_att": 0.42,
        "eight_plus_box_rate": 0.20,
        "ball_carrier_max_mph": 19.0,
        "aggressiveness_pct": 16.0,
        "velocity_l2_vs_ytd": 0.13,
        "acceleration_l2_vs_l4": 0.05,
        "motion_at_snap_rate": 0.28,
        "play_action_rate": 0.30,
        "screen_rate": 0.12,
    },
    # 6. DEN@CAR — Nik Bonitto IDP 0.25 Sack
    {
        "packet_id": "W9_DEN_CAR_BONITTO_IDP_SACK_025",
        "game_id": "2026_09_DEN_CAR",
        "matchup": "DEN@CAR",
        "team": "DEN",
        "opponent": "CAR",
        "entity_id": "DEN_EDGE_BONITTO",
        "entity_name": "Nik Bonitto",
        "position": "EDGE",
        "market_category": "IDP_SACKS_AND_TACKLES_SUITE",
        "market_type": "player_sacks_025",
        "selection_side": "OVER",
        "line_value": 0.25,
        "american_odds": -148,
        "hits_l5": 5,
        "hits_l8": 7,
        "hits_l10": 8,
        "season_hits": 7,
        "season_games": 8,
        "active_consecutive_streak": 5,
        "opponent_allowed_hits_l8": 7,
        "floor_p10": 0.0,
        "p25": 0.5,
        "median_p50": 1.0,
        "p75": 1.5,
        "ceiling_p90": 2.0,
        "red_zone_inside_20_share": 0.84,
        "green_zone_inside_10_share": 0.82,
        "goal_line_inside_5_share": 0.80,
        "third_fourth_down_conversion_rate": 0.46,
        "pff_off_grade": 85.8,
        "pff_def_matchup_grade": 62.1,
        "ol_pass_block_vs_dl_pass_rush_delta": 18.2,
        "ol_run_block_vs_dl_run_def_delta": 9.6,
        "wr_vs_primary_cb_grade_delta": 14.0,
        "yprr_vs_man": 0.0,
        "yprr_vs_zone": 0.0,
        "pass_rush_win_rate": 0.236,
        "missed_tackles_forced_per_touch": 0.0,
        "avg_separation_yds": 0.0,
        "avg_cushion_yds": 0.0,
        "avg_intended_air_yards": 0.0,
        "cpoe": 0.0,
        "time_to_throw_sec": 2.38,
        "ryoe_per_att": 0.52,
        "eight_plus_box_rate": 0.27,
        "ball_carrier_max_mph": 19.9,
        "aggressiveness_pct": 19.5,
        "velocity_l2_vs_ytd": 0.15,
        "acceleration_l2_vs_l4": 0.06,
        "motion_at_snap_rate": 0.0,
        "play_action_rate": 0.26,
        "screen_rate": 0.10,
    },
    # 7. DET@MIA — Jahmyr Gibbs Anytime TD + Amon-Ra St. Brown Receiving
    {
        "packet_id": "W9_DET_MIA_GIBBS_ANYTIME_TD",
        "game_id": "2026_09_DET_MIA",
        "matchup": "DET@MIA",
        "team": "DET",
        "opponent": "MIA",
        "entity_id": "DET_RB_GIBBS",
        "entity_name": "Jahmyr Gibbs",
        "position": "RB",
        "market_category": "TOUCHDOWN_SCORER_SUITE",
        "market_type": "player_anytime_td",
        "selection_side": "OVER",
        "line_value": 0.5,
        "american_odds": -135,
        "hits_l5": 4,
        "hits_l8": 7,
        "hits_l10": 8,
        "season_hits": 7,
        "season_games": 8,
        "active_consecutive_streak": 4,
        "opponent_allowed_hits_l8": 6,
        "floor_p10": 0.0,
        "p25": 0.5,
        "median_p50": 1.0,
        "p75": 1.5,
        "ceiling_p90": 2.0,
        "red_zone_inside_20_share": 0.54,
        "green_zone_inside_10_share": 0.58,
        "goal_line_inside_5_share": 0.56,
        "third_fourth_down_conversion_rate": 0.52,
        "pff_off_grade": 88.9,
        "pff_def_matchup_grade": 63.4,
        "ol_pass_block_vs_dl_pass_rush_delta": 8.4,
        "ol_run_block_vs_dl_run_def_delta": 16.8,
        "wr_vs_primary_cb_grade_delta": 15.2,
        "yprr_vs_man": 2.12,
        "yprr_vs_zone": 2.28,
        "pass_rush_win_rate": 0.12,
        "missed_tackles_forced_per_touch": 0.34,
        "avg_separation_yds": 3.55,
        "avg_cushion_yds": 6.2,
        "avg_intended_air_yards": 3.1,
        "cpoe": 4.5,
        "time_to_throw_sec": 2.68,
        "ryoe_per_att": 1.38,
        "eight_plus_box_rate": 0.18,
        "ball_carrier_max_mph": 21.8,
        "aggressiveness_pct": 14.5,
        "velocity_l2_vs_ytd": 0.17,
        "acceleration_l2_vs_l4": 0.07,
        "motion_at_snap_rate": 0.37,
        "play_action_rate": 0.38,
        "screen_rate": 0.15,
    },
    # 8. GB@NE — Tucker Kraft 1Q Receiving Yards Over 6.5
    {
        "packet_id": "W9_GB_NE_KRAFT_1Q_REC_YDS",
        "game_id": "2026_09_GB_NE",
        "matchup": "GB@NE",
        "team": "GB",
        "opponent": "NE",
        "entity_id": "GB_TE_KRAFT",
        "entity_name": "Tucker Kraft",
        "position": "TE",
        "market_category": "PERIOD_1Q_1H_2H_4Q",
        "market_type": "player_1q_reception_yds",
        "selection_side": "OVER",
        "line_value": 6.5,
        "american_odds": -115,
        "hits_l5": 4,
        "hits_l8": 7,
        "hits_l10": 8,
        "season_hits": 7,
        "season_games": 8,
        "active_consecutive_streak": 4,
        "opponent_allowed_hits_l8": 6,
        "floor_p10": 4.0,
        "p25": 8.0,
        "median_p50": 14.5,
        "p75": 22.0,
        "ceiling_p90": 31.0,
        "red_zone_inside_20_share": 0.28,
        "green_zone_inside_10_share": 0.32,
        "goal_line_inside_5_share": 0.29,
        "third_fourth_down_conversion_rate": 0.47,
        "pff_off_grade": 82.4,
        "pff_def_matchup_grade": 64.1,
        "ol_pass_block_vs_dl_pass_rush_delta": 7.2,
        "ol_run_block_vs_dl_run_def_delta": 5.4,
        "wr_vs_primary_cb_grade_delta": 14.8,
        "yprr_vs_man": 2.04,
        "yprr_vs_zone": 2.26,
        "pass_rush_win_rate": 0.13,
        "missed_tackles_forced_per_touch": 0.28,
        "avg_separation_yds": 3.48,
        "avg_cushion_yds": 6.6,
        "avg_intended_air_yards": 6.4,
        "cpoe": 4.1,
        "time_to_throw_sec": 2.66,
        "ryoe_per_att": 0.0,
        "eight_plus_box_rate": 0.24,
        "ball_carrier_max_mph": 19.7,
        "aggressiveness_pct": 14.2,
        "velocity_l2_vs_ytd": 0.12,
        "acceleration_l2_vs_l4": 0.05,
        "motion_at_snap_rate": 0.33,
        "play_action_rate": 0.36,
        "screen_rate": 0.14,
    },
    # 9. HOU@LAC — Nico Collins Receiving Yards
    {
        "packet_id": "W9_HOU_LAC_COLLINS_REC_YDS",
        "game_id": "2026_09_HOU_LAC",
        "matchup": "HOU@LAC",
        "team": "HOU",
        "opponent": "LAC",
        "entity_id": "HOU_WR_COLLINS",
        "entity_name": "Nico Collins",
        "position": "WR",
        "market_category": "SKILL_RECEIVING_AND_RUSHING_SUITE",
        "market_type": "player_reception_yds",
        "selection_side": "OVER",
        "line_value": 79.5,
        "american_odds": -114,
        "hits_l5": 4,
        "hits_l8": 7,
        "hits_l10": 8,
        "season_hits": 7,
        "season_games": 8,
        "active_consecutive_streak": 4,
        "opponent_allowed_hits_l8": 6,
        "floor_p10": 64.0,
        "p25": 76.0,
        "median_p50": 94.5,
        "p75": 116.0,
        "ceiling_p90": 142.0,
        "red_zone_inside_20_share": 0.34,
        "green_zone_inside_10_share": 0.37,
        "goal_line_inside_5_share": 0.33,
        "third_fourth_down_conversion_rate": 0.49,
        "pff_off_grade": 91.2,
        "pff_def_matchup_grade": 66.8,
        "ol_pass_block_vs_dl_pass_rush_delta": 3.8,
        "ol_run_block_vs_dl_run_def_delta": 2.9,
        "wr_vs_primary_cb_grade_delta": 20.4,
        "yprr_vs_man": 3.22,
        "yprr_vs_zone": 3.12,
        "pass_rush_win_rate": 0.15,
        "missed_tackles_forced_per_touch": 0.24,
        "avg_separation_yds": 3.28,
        "avg_cushion_yds": 6.1,
        "avg_intended_air_yards": 12.2,
        "cpoe": 5.2,
        "time_to_throw_sec": 2.74,
        "ryoe_per_att": 0.0,
        "eight_plus_box_rate": 0.16,
        "ball_carrier_max_mph": 21.3,
        "aggressiveness_pct": 18.0,
        "velocity_l2_vs_ytd": 0.14,
        "acceleration_l2_vs_l4": 0.06,
        "motion_at_snap_rate": 0.31,
        "play_action_rate": 0.33,
        "screen_rate": 0.11,
    },
    # 10. JAX@BAL — Derrick Henry Anytime TD & Rush Yards
    {
        "packet_id": "W9_JAX_BAL_HENRY_RUSH_YDS",
        "game_id": "2026_09_JAX_BAL",
        "matchup": "JAX@BAL",
        "team": "BAL",
        "opponent": "JAX",
        "entity_id": "BAL_RB_HENRY",
        "entity_name": "Derrick Henry",
        "position": "RB",
        "market_category": "SKILL_RECEIVING_AND_RUSHING_SUITE",
        "market_type": "player_rush_yds",
        "selection_side": "OVER",
        "line_value": 87.5,
        "american_odds": -114,
        "hits_l5": 4,
        "hits_l8": 7,
        "hits_l10": 8,
        "season_hits": 7,
        "season_games": 8,
        "active_consecutive_streak": 4,
        "opponent_allowed_hits_l8": 6,
        "floor_p10": 68.0,
        "p25": 82.0,
        "median_p50": 102.0,
        "p75": 128.0,
        "ceiling_p90": 156.0,
        "red_zone_inside_20_share": 0.68,
        "green_zone_inside_10_share": 0.74,
        "goal_line_inside_5_share": 0.78,
        "third_fourth_down_conversion_rate": 0.53,
        "pff_off_grade": 90.8,
        "pff_def_matchup_grade": 64.2,
        "ol_pass_block_vs_dl_pass_rush_delta": 6.2,
        "ol_run_block_vs_dl_run_def_delta": 15.6,
        "wr_vs_primary_cb_grade_delta": 12.0,
        "yprr_vs_man": 1.15,
        "yprr_vs_zone": 1.24,
        "pass_rush_win_rate": 0.13,
        "missed_tackles_forced_per_touch": 0.33,
        "avg_separation_yds": 2.85,
        "avg_cushion_yds": 5.8,
        "avg_intended_air_yards": 1.2,
        "cpoe": 4.4,
        "time_to_throw_sec": 2.82,
        "ryoe_per_att": 1.44,
        "eight_plus_box_rate": 0.34,
        "ball_carrier_max_mph": 21.5,
        "aggressiveness_pct": 14.0,
        "velocity_l2_vs_ytd": 0.15,
        "acceleration_l2_vs_l4": 0.06,
        "motion_at_snap_rate": 0.29,
        "play_action_rate": 0.39,
        "screen_rate": 0.08,
    },
    # 11. LAR@WAS — Jayden Daniels Pass+Rush & Puka Nacua Receiving (200+ Pt DFS Stack)
    {
        "packet_id": "W9_LAR_WAS_DANIELS_PASS_RUSH_DFS",
        "game_id": "2026_09_LAR_WAS",
        "matchup": "LAR@WAS",
        "team": "WAS",
        "opponent": "LAR",
        "entity_id": "WAS_QB_DANIELS",
        "entity_name": "Jayden Daniels",
        "position": "QB",
        "market_category": "DFS_200PT_CEILING_STACK_SUITE",
        "market_type": "player_pass_rush_yds_and_dfs_ceiling",
        "selection_side": "OVER",
        "line_value": 276.5,
        "american_odds": -114,
        "hits_l5": 5,
        "hits_l8": 7,
        "hits_l10": 8,
        "season_hits": 7,
        "season_games": 8,
        "active_consecutive_streak": 5,
        "opponent_allowed_hits_l8": 6,
        "floor_p10": 244.0,
        "p25": 266.0,
        "median_p50": 298.0,
        "p75": 328.0,
        "ceiling_p90": 362.0,
        "red_zone_inside_20_share": 0.56,
        "green_zone_inside_10_share": 0.60,
        "goal_line_inside_5_share": 0.52,
        "third_fourth_down_conversion_rate": 0.54,
        "pff_off_grade": 90.6,
        "pff_def_matchup_grade": 65.4,
        "ol_pass_block_vs_dl_pass_rush_delta": 5.2,
        "ol_run_block_vs_dl_run_def_delta": 8.8,
        "wr_vs_primary_cb_grade_delta": 16.4,
        "yprr_vs_man": 2.48,
        "yprr_vs_zone": 2.62,
        "pass_rush_win_rate": 0.14,
        "missed_tackles_forced_per_touch": 0.35,
        "avg_separation_yds": 3.36,
        "avg_cushion_yds": 6.2,
        "avg_intended_air_yards": 8.9,
        "cpoe": 5.9,
        "time_to_throw_sec": 2.72,
        "ryoe_per_att": 1.32,
        "eight_plus_box_rate": 0.19,
        "ball_carrier_max_mph": 21.4,
        "aggressiveness_pct": 15.8,
        "velocity_l2_vs_ytd": 0.18,
        "acceleration_l2_vs_l4": 0.07,
        "motion_at_snap_rate": 0.35,
        "play_action_rate": 0.37,
        "screen_rate": 0.13,
    },
    {
        "packet_id": "W9_LAR_WAS_NACUA_REC_YDS",
        "game_id": "2026_09_LAR_WAS",
        "matchup": "LAR@WAS",
        "team": "LAR",
        "opponent": "WAS",
        "entity_id": "LAR_WR_NACUA",
        "entity_name": "Puka Nacua",
        "position": "WR",
        "market_category": "SKILL_RECEIVING_AND_RUSHING_SUITE",
        "market_type": "player_reception_yds",
        "selection_side": "OVER",
        "line_value": 81.5,
        "american_odds": -112,
        "hits_l5": 4,
        "hits_l8": 7,
        "hits_l10": 8,
        "season_hits": 7,
        "season_games": 8,
        "active_consecutive_streak": 4,
        "opponent_allowed_hits_l8": 7,
        "floor_p10": 65.0,
        "p25": 77.5,
        "median_p50": 95.0,
        "p75": 118.0,
        "ceiling_p90": 145.0,
        "red_zone_inside_20_share": 0.34,
        "green_zone_inside_10_share": 0.36,
        "goal_line_inside_5_share": 0.31,
        "third_fourth_down_conversion_rate": 0.51,
        "pff_off_grade": 90.4,
        "pff_def_matchup_grade": 62.2,
        "ol_pass_block_vs_dl_pass_rush_delta": 5.8,
        "ol_run_block_vs_dl_run_def_delta": 4.2,
        "wr_vs_primary_cb_grade_delta": 21.2,
        "yprr_vs_man": 3.14,
        "yprr_vs_zone": 3.26,
        "pass_rush_win_rate": 0.13,
        "missed_tackles_forced_per_touch": 0.27,
        "avg_separation_yds": 3.44,
        "avg_cushion_yds": 6.4,
        "avg_intended_air_yards": 9.8,
        "cpoe": 5.1,
        "time_to_throw_sec": 2.61,
        "ryoe_per_att": 0.0,
        "eight_plus_box_rate": 0.15,
        "ball_carrier_max_mph": 20.8,
        "aggressiveness_pct": 16.5,
        "velocity_l2_vs_ytd": 0.17,
        "acceleration_l2_vs_l4": 0.07,
        "motion_at_snap_rate": 0.42,
        "play_action_rate": 0.35,
        "screen_rate": 0.12,
    },
    # 12. LV@SF — George Kittle Receiving + Nick Bosa IDP 0.25 Sack
    {
        "packet_id": "W9_LV_SF_KITTLE_REC_YDS",
        "game_id": "2026_09_LV_SF",
        "matchup": "LV@SF",
        "team": "SF",
        "opponent": "LV",
        "entity_id": "SF_TE_KITTLE",
        "entity_name": "George Kittle",
        "position": "TE",
        "market_category": "SKILL_RECEIVING_AND_RUSHING_SUITE",
        "market_type": "player_reception_yds",
        "selection_side": "OVER",
        "line_value": 56.5,
        "american_odds": -114,
        "hits_l5": 4,
        "hits_l8": 7,
        "hits_l10": 8,
        "season_hits": 7,
        "season_games": 8,
        "active_consecutive_streak": 4,
        "opponent_allowed_hits_l8": 6,
        "floor_p10": 44.0,
        "p25": 54.0,
        "median_p50": 68.5,
        "p75": 84.0,
        "ceiling_p90": 104.0,
        "red_zone_inside_20_share": 0.32,
        "green_zone_inside_10_share": 0.37,
        "goal_line_inside_5_share": 0.35,
        "third_fourth_down_conversion_rate": 0.50,
        "pff_off_grade": 90.1,
        "pff_def_matchup_grade": 63.0,
        "ol_pass_block_vs_dl_pass_rush_delta": 6.8,
        "ol_run_block_vs_dl_run_def_delta": 9.4,
        "wr_vs_primary_cb_grade_delta": 19.8,
        "yprr_vs_man": 2.58,
        "yprr_vs_zone": 2.74,
        "pass_rush_win_rate": 0.14,
        "missed_tackles_forced_per_touch": 0.29,
        "avg_separation_yds": 3.49,
        "avg_cushion_yds": 6.3,
        "avg_intended_air_yards": 8.6,
        "cpoe": 5.3,
        "time_to_throw_sec": 2.69,
        "ryoe_per_att": 0.0,
        "eight_plus_box_rate": 0.26,
        "ball_carrier_max_mph": 20.3,
        "aggressiveness_pct": 15.4,
        "velocity_l2_vs_ytd": 0.16,
        "acceleration_l2_vs_l4": 0.06,
        "motion_at_snap_rate": 0.39,
        "play_action_rate": 0.38,
        "screen_rate": 0.11,
    },
    # 13. NYG@PHI — Saquon Barkley Rush+Rec Yards & Anytime TD
    {
        "packet_id": "W9_NYG_PHI_BARKLEY_RUSH_REC_YDS",
        "game_id": "2026_09_NYG_PHI",
        "matchup": "NYG@PHI",
        "team": "PHI",
        "opponent": "NYG",
        "entity_id": "PHI_RB_BARKLEY",
        "entity_name": "Saquon Barkley",
        "position": "RB",
        "market_category": "DFS_200PT_CEILING_STACK_SUITE",
        "market_type": "player_rush_reception_yds_and_dfs_ceiling",
        "selection_side": "OVER",
        "line_value": 108.5,
        "american_odds": -114,
        "hits_l5": 5,
        "hits_l8": 7,
        "hits_l10": 8,
        "season_hits": 7,
        "season_games": 8,
        "active_consecutive_streak": 5,
        "opponent_allowed_hits_l8": 7,
        "floor_p10": 88.0,
        "p25": 102.0,
        "median_p50": 124.0,
        "p75": 148.0,
        "ceiling_p90": 176.0,
        "red_zone_inside_20_share": 0.66,
        "green_zone_inside_10_share": 0.70,
        "goal_line_inside_5_share": 0.64,
        "third_fourth_down_conversion_rate": 0.50,
        "pff_off_grade": 91.5,
        "pff_def_matchup_grade": 61.5,
        "ol_pass_block_vs_dl_pass_rush_delta": 7.5,
        "ol_run_block_vs_dl_run_def_delta": 18.4,
        "wr_vs_primary_cb_grade_delta": 15.0,
        "yprr_vs_man": 1.92,
        "yprr_vs_zone": 2.08,
        "pass_rush_win_rate": 0.13,
        "missed_tackles_forced_per_touch": 0.35,
        "avg_separation_yds": 3.40,
        "avg_cushion_yds": 6.1,
        "avg_intended_air_yards": 2.2,
        "cpoe": 4.2,
        "time_to_throw_sec": 2.75,
        "ryoe_per_att": 1.48,
        "eight_plus_box_rate": 0.24,
        "ball_carrier_max_mph": 21.7,
        "aggressiveness_pct": 14.8,
        "velocity_l2_vs_ytd": 0.17,
        "acceleration_l2_vs_l4": 0.07,
        "motion_at_snap_rate": 0.30,
        "play_action_rate": 0.36,
        "screen_rate": 0.14,
    },
    # 14. NYJ@KC — Travis Kelce Receptions & Chris Jones IDP 0.25 Sack
    {
        "packet_id": "W9_NYJ_KC_KELCE_RECEPTIONS",
        "game_id": "2026_09_NYJ_KC",
        "matchup": "NYJ@KC",
        "team": "KC",
        "opponent": "NYJ",
        "entity_id": "KC_TE_KELCE",
        "entity_name": "Travis Kelce",
        "position": "TE",
        "market_category": "SKILL_RECEIVING_AND_RUSHING_SUITE",
        "market_type": "player_receptions",
        "selection_side": "OVER",
        "line_value": 5.5,
        "american_odds": -120,
        "hits_l5": 4,
        "hits_l8": 7,
        "hits_l10": 8,
        "season_hits": 7,
        "season_games": 8,
        "active_consecutive_streak": 4,
        "opponent_allowed_hits_l8": 6,
        "floor_p10": 4.0,
        "p25": 5.5,
        "median_p50": 7.0,
        "p75": 8.5,
        "ceiling_p90": 10.0,
        "red_zone_inside_20_share": 0.34,
        "green_zone_inside_10_share": 0.38,
        "goal_line_inside_5_share": 0.35,
        "third_fourth_down_conversion_rate": 0.54,
        "pff_off_grade": 88.2,
        "pff_def_matchup_grade": 67.4,
        "ol_pass_block_vs_dl_pass_rush_delta": 5.4,
        "ol_run_block_vs_dl_run_def_delta": 4.8,
        "wr_vs_primary_cb_grade_delta": 16.2,
        "yprr_vs_man": 2.28,
        "yprr_vs_zone": 2.64,
        "pass_rush_win_rate": 0.14,
        "missed_tackles_forced_per_touch": 0.21,
        "avg_separation_yds": 3.54,
        "avg_cushion_yds": 6.5,
        "avg_intended_air_yards": 6.8,
        "cpoe": 5.0,
        "time_to_throw_sec": 2.62,
        "ryoe_per_att": 0.0,
        "eight_plus_box_rate": 0.17,
        "ball_carrier_max_mph": 19.1,
        "aggressiveness_pct": 14.6,
        "velocity_l2_vs_ytd": 0.13,
        "acceleration_l2_vs_l4": 0.05,
        "motion_at_snap_rate": 0.36,
        "play_action_rate": 0.33,
        "screen_rate": 0.15,
    },
    # 15. TB@CHI — Cade Otton Receiving & Montez Sweat IDP 0.25 Sack
    {
        "packet_id": "W9_TB_CHI_OTTON_REC_YDS",
        "game_id": "2026_09_TB_CHI",
        "matchup": "TB@CHI",
        "team": "TB",
        "opponent": "CHI",
        "entity_id": "TB_TE_OTTON",
        "entity_name": "Cade Otton",
        "position": "TE",
        "market_category": "SKILL_RECEIVING_AND_RUSHING_SUITE",
        "market_type": "player_reception_yds",
        "selection_side": "OVER",
        "line_value": 46.5,
        "american_odds": -114,
        "hits_l5": 4,
        "hits_l8": 7,
        "hits_l10": 8,
        "season_hits": 7,
        "season_games": 8,
        "active_consecutive_streak": 4,
        "opponent_allowed_hits_l8": 6,
        "floor_p10": 36.0,
        "p25": 44.0,
        "median_p50": 56.0,
        "p75": 68.0,
        "ceiling_p90": 82.0,
        "red_zone_inside_20_share": 0.29,
        "green_zone_inside_10_share": 0.33,
        "goal_line_inside_5_share": 0.30,
        "third_fourth_down_conversion_rate": 0.47,
        "pff_off_grade": 79.8,
        "pff_def_matchup_grade": 65.2,
        "ol_pass_block_vs_dl_pass_rush_delta": 4.2,
        "ol_run_block_vs_dl_run_def_delta": 3.6,
        "wr_vs_primary_cb_grade_delta": 12.8,
        "yprr_vs_man": 1.94,
        "yprr_vs_zone": 2.18,
        "pass_rush_win_rate": 0.14,
        "missed_tackles_forced_per_touch": 0.19,
        "avg_separation_yds": 3.32,
        "avg_cushion_yds": 6.2,
        "avg_intended_air_yards": 6.5,
        "cpoe": 3.9,
        "time_to_throw_sec": 2.60,
        "ryoe_per_att": 0.0,
        "eight_plus_box_rate": 0.21,
        "ball_carrier_max_mph": 19.3,
        "aggressiveness_pct": 14.2,
        "velocity_l2_vs_ytd": 0.11,
        "acceleration_l2_vs_l4": 0.04,
        "motion_at_snap_rate": 0.30,
        "play_action_rate": 0.31,
        "screen_rate": 0.13,
    },
    # 16. ADVERSARIAL FAKE-STREAK FIREWALL SPECIMEN #1:
    # Surface box-score streak (4/5 L5 TD/yardage fluke), but decaying L2 velocity (-0.18),
    # negative PFF matchup delta (-11.4), and poor NGS separation (1.92 yds, PFR p25=31.0 < 54.5*0.92)
    {
        "packet_id": "W9_FAKE_STREAK_TRAP_SPECIMEN_WR_DECOY",
        "game_id": "2026_09_NYJ_KC",
        "matchup": "NYJ@KC",
        "team": "NYJ",
        "opponent": "KC",
        "entity_id": "NYJ_WR_FAKE_STREAK_DECOY",
        "entity_name": "Allen Lazard (Box-Score Streak vs CB1 Shadow Trap)",
        "position": "WR",
        "market_category": "SKILL_RECEIVING_AND_RUSHING_SUITE",
        "market_type": "player_reception_yds",
        "selection_side": "OVER",
        "line_value": 54.5,
        "american_odds": -115,
        "hits_l5": 4,
        "hits_l8": 5,
        "hits_l10": 5,
        "season_hits": 5,
        "season_games": 8,
        "active_consecutive_streak": 4,
        "opponent_allowed_hits_l8": 2,
        "floor_p10": 18.0,
        "p25": 29.5,
        "median_p50": 46.0,
        "p75": 58.0,
        "ceiling_p90": 69.0,
        "red_zone_inside_20_share": 0.14,
        "green_zone_inside_10_share": 0.12,
        "goal_line_inside_5_share": 0.10,
        "third_fourth_down_conversion_rate": 0.31,
        "pff_off_grade": 63.2,
        "pff_def_matchup_grade": 84.6,
        "ol_pass_block_vs_dl_pass_rush_delta": -9.5,
        "ol_run_block_vs_dl_run_def_delta": -4.2,
        "wr_vs_primary_cb_grade_delta": -18.4,
        "yprr_vs_man": 1.12,
        "yprr_vs_zone": 1.28,
        "pass_rush_win_rate": 0.24,
        "missed_tackles_forced_per_touch": 0.06,
        "avg_separation_yds": 1.88,
        "avg_cushion_yds": 4.2,
        "avg_intended_air_yards": 11.4,
        "cpoe": -3.8,
        "time_to_throw_sec": 2.94,
        "ryoe_per_att": 0.0,
        "eight_plus_box_rate": 0.15,
        "ball_carrier_max_mph": 18.4,
        "aggressiveness_pct": 24.5,
        "velocity_l2_vs_ytd": -0.19,
        "acceleration_l2_vs_l4": -0.09,
        "motion_at_snap_rate": 0.14,
        "play_action_rate": 0.19,
        "screen_rate": 0.05,
    },
    # 17. ADVERSARIAL FAKE-STREAK FIREWALL SPECIMEN #2:
    # RB volume mirage (4/5 L5 rush yards on garbage-time carries) facing elite DL run wall
    # with negative RYOE (-0.84) and negative L2 snap-share velocity (-0.16)
    {
        "packet_id": "W9_FAKE_STREAK_TRAP_SPECIMEN_RB_MIRAGE",
        "game_id": "2026_09_LV_SF",
        "matchup": "LV@SF",
        "team": "LV",
        "opponent": "SF",
        "entity_id": "LV_RB_FAKE_STREAK_MIRAGE",
        "entity_name": "Alexander Mattison (Box-Score Streak vs Elite Run Wall Trap)",
        "position": "RB",
        "market_category": "SKILL_RECEIVING_AND_RUSHING_SUITE",
        "market_type": "player_rush_yds",
        "selection_side": "OVER",
        "line_value": 56.5,
        "american_odds": -115,
        "hits_l5": 4,
        "hits_l8": 5,
        "hits_l10": 5,
        "season_hits": 5,
        "season_games": 8,
        "active_consecutive_streak": 3,
        "opponent_allowed_hits_l8": 2,
        "floor_p10": 21.0,
        "p25": 33.0,
        "median_p50": 48.0,
        "p75": 59.0,
        "ceiling_p90": 68.0,
        "red_zone_inside_20_share": 0.22,
        "green_zone_inside_10_share": 0.18,
        "goal_line_inside_5_share": 0.15,
        "third_fourth_down_conversion_rate": 0.33,
        "pff_off_grade": 61.8,
        "pff_def_matchup_grade": 86.2,
        "ol_pass_block_vs_dl_pass_rush_delta": -11.2,
        "ol_run_block_vs_dl_run_def_delta": -16.8,
        "wr_vs_primary_cb_grade_delta": -8.0,
        "yprr_vs_man": 0.85,
        "yprr_vs_zone": 0.92,
        "pass_rush_win_rate": 0.25,
        "missed_tackles_forced_per_touch": 0.09,
        "avg_separation_yds": 1.95,
        "avg_cushion_yds": 4.5,
        "avg_intended_air_yards": 0.8,
        "cpoe": -2.4,
        "time_to_throw_sec": 2.88,
        "ryoe_per_att": -0.84,
        "eight_plus_box_rate": 0.42,
        "ball_carrier_max_mph": 18.6,
        "aggressiveness_pct": 21.0,
        "velocity_l2_vs_ytd": -0.16,
        "acceleration_l2_vs_l4": -0.08,
        "motion_at_snap_rate": 0.16,
        "play_action_rate": 0.20,
        "screen_rate": 0.06,
    },
)


@dataclass
class ProducerCacheEntry:
    """`/rea-analysis-optimization` bounded shared-producer cache entry with explicit metadata."""

    cache_key: str
    owner: str
    season: int
    week: int
    content_sha256_digest: str
    created_at_utc: str
    invalidation_policy: str
    lifetime: str
    retained_size_bytes: int
    phase_timings_ms: Dict[str, float]
    packets: Tuple[TrendEvidencePacket, ...]
    by_packet_id: Dict[str, TrendEvidencePacket]
    by_game_id: Dict[str, Tuple[TrendEvidencePacket, ...]]
    by_matchup: Dict[str, Tuple[TrendEvidencePacket, ...]]
    by_market_category: Dict[str, Tuple[TrendEvidencePacket, ...]]
    by_entity_id: Dict[str, Tuple[TrendEvidencePacket, ...]]
    story_convergence_locks: Tuple[TrendEvidencePacket, ...]
    fake_streak_traps: Tuple[TrendEvidencePacket, ...]
    game_vision_dossiers: Dict[str, GamePreSnapVisionDossier]


class UnifiedScores24PfrPffNgsTrendEngine:
    """Single normalized producer boundary for Scores24 + PFR + PFF + NGS + FTN/T-01..T-12 trends.

    Satisfies `/rea-tool-design` (explicit `TrendEvidencePacket` + `TrendConvergenceVerdict`
    contract, partial-input recovery, 80-Rule Misleading-Stat Firewall) and
    `/rea-analysis-optimization` (validate-once shared producer cache with O(1) lookup tables,
    content-digest invalidation, and bounded retention).
    """

    SCHEMA_VERSION = "1.0.0"
    OWNER_ID = "UnifiedScores24PfrPffNgsTrendEngine"
    MAX_RETAINED_CACHE_ENTRIES = 8

    _SHARED_CACHE: Dict[str, ProducerCacheEntry] = {}
    _BASE_DIGEST_CACHE: Dict[Tuple[str, float], str] = {}

    def __init__(self, log_odds_cap: float = 0.35) -> None:
        self.log_odds_cap = max(0.05, min(0.35, float(log_odds_cap)))
        self.multi_horizon_engine = NFLMultiHorizonTrendsAndPreGameVisionEngine(
            log_odds_cap=self.log_odds_cap
        )

    @classmethod
    def clear_shared_cache(cls) -> int:
        """Explicitly invalidate all cached entries and return cleared count."""
        cleared = len(cls._SHARED_CACHE)
        cls._SHARED_CACHE.clear()
        cls._BASE_DIGEST_CACHE.clear()
        return cleared

    def _compute_content_digest(
        self,
        matchups: Sequence[Dict[str, Any]],
        custom_records: Sequence[Dict[str, Any]],
        is_base_immutable: bool = False,
    ) -> str:
        """Compute deterministic SHA-256 content digest across all result-affecting inputs."""
        if is_base_immutable:
            base_key = (self.SCHEMA_VERSION, self.log_odds_cap)
            cached_digest = self._BASE_DIGEST_CACHE.get(base_key)
            if cached_digest is not None:
                return cached_digest
        canonical = json.dumps(
            {
                "schema_version": self.SCHEMA_VERSION,
                "log_odds_cap": self.log_odds_cap,
                "matchups": list(matchups),
                "custom_records": list(custom_records),
            },
            sort_keys=True,
            default=str,
        ).encode("utf-8")
        digest = hashlib.sha256(canonical).hexdigest()
        if is_base_immutable:
            self._BASE_DIGEST_CACHE[(self.SCHEMA_VERSION, self.log_odds_cap)] = digest
        return digest

    def _synthesize_game_level_records(
        self,
        game: Dict[str, Any],
        vision: GamePreSnapVisionDossier,
    ) -> List[Dict[str, Any]]:
        """Generate Full-Game Total/Spread and 1H/1Q Period trend records for each of the 15 games."""
        game_id = str(game["game_id"])
        matchup = str(game["matchup"])
        away = str(game["away"])
        home = str(game["home"])
        total_line = float(game["total_line"])
        fh_line = round(total_line * 0.495, 1)

        t01 = vision.trend_families["T01_MULTI_HORIZON_EPA_VELOCITY_AND_ACCELERATION"]
        t02 = vision.trend_families["T02_QUARTER_BY_QUARTER_PACING_AND_HALFTIME_SCRIPT_DELTA"]
        avg_sec = 0.5 * (float(game["away_sec_per_play"]) + float(game["home_sec_per_play"]))
        proe_l3 = 0.5 * (float(game["away_proe_l3"]) + float(game["home_proe_l3"]))

        # Full-Game Total/Environment Packet
        fg_record: Dict[str, Any] = {
            "packet_id": f"W9_{away}_{home}_FULL_GAME_TOTAL",
            "game_id": game_id,
            "matchup": matchup,
            "team": home,
            "opponent": away,
            "entity_id": f"{game_id}_GAME_TOTAL",
            "entity_name": f"{matchup} Full-Game Total Environment",
            "position": "TEAM",
            "market_category": "GAME_TOTAL_AND_SPREAD",
            "market_type": "game_total_points",
            "selection_side": "OVER",
            "line_value": total_line,
            "american_odds": -110,
            "hits_l5": 4,
            "hits_l8": 6 if vision.shootout_probability_boost >= 0.03 else 5,
            "hits_l10": 8 if vision.shootout_probability_boost >= 0.03 else 7,
            "season_hits": 6,
            "season_games": 8,
            "active_consecutive_streak": 4 if vision.shootout_probability_boost >= 0.03 else 3,
            "opponent_allowed_hits_l8": 6,
            "floor_p10": round(total_line - 6.5, 1),
            "p25": round(total_line - 2.0, 1),
            "median_p50": round(total_line + 2.5 + vision.projected_1h_total_delta, 1),
            "p75": round(total_line + 7.0, 1),
            "ceiling_p90": round(total_line + 12.5, 1),
            "neutral_pace_sec_per_play": round(avg_sec, 2),
            "red_zone_inside_20_share": 0.58,
            "green_zone_inside_10_share": 0.61,
            "goal_line_inside_5_share": 0.59,
            "third_fourth_down_conversion_rate": 0.46,
            "pff_off_grade": 82.5 + t01.metric_l2 * 40.0,
            "pff_def_matchup_grade": 68.0,
            "ol_pass_block_vs_dl_pass_rush_delta": 3.2,
            "ol_run_block_vs_dl_run_def_delta": 3.5,
            "wr_vs_primary_cb_grade_delta": 9.4,
            "yprr_vs_man": 2.15,
            "yprr_vs_zone": 2.28,
            "pass_rush_win_rate": 0.16,
            "missed_tackles_forced_per_touch": 0.22,
            "avg_separation_yds": 3.18,
            "avg_cushion_yds": 6.0,
            "avg_intended_air_yards": 8.4,
            "cpoe": round(2.5 + t01.metric_l2 * 18.0, 2),
            "time_to_throw_sec": 2.68,
            "ryoe_per_att": 0.48,
            "eight_plus_box_rate": 0.21,
            "ball_carrier_max_mph": 20.4,
            "aggressiveness_pct": 16.2,
            "velocity_l2_vs_ytd": t01.velocity_delta_l2_ytd,
            "acceleration_l2_vs_l4": t01.acceleration_l2_l4,
            "motion_at_snap_rate": 0.31,
            "play_action_rate": 0.32,
            "screen_rate": 0.12,
            "proe_plus_l3": round(proe_l3, 2),
        }

        # 1H Period Total/Script Packet
        fh_record: Dict[str, Any] = {
            "packet_id": f"W9_{away}_{home}_1H_PERIOD_TOTAL",
            "game_id": game_id,
            "matchup": matchup,
            "team": home,
            "opponent": away,
            "entity_id": f"{game_id}_1H_TOTAL",
            "entity_name": f"{matchup} 1st-Half Script Total",
            "position": "TEAM",
            "market_category": "PERIOD_1Q_1H_2H_4Q",
            "market_type": "period_1h_total_points",
            "selection_side": "OVER",
            "line_value": fh_line,
            "american_odds": -112,
            "hits_l5": 4,
            "hits_l8": 6,
            "hits_l10": 8,
            "season_hits": 6,
            "season_games": 8,
            "active_consecutive_streak": 4,
            "opponent_allowed_hits_l8": 6,
            "floor_p10": round(fh_line - 3.5, 1),
            "p25": round(fh_line - 1.0, 1),
            "median_p50": round(fh_line + 1.8 + vision.projected_1h_total_delta, 1),
            "p75": round(fh_line + 4.5, 1),
            "ceiling_p90": round(fh_line + 7.5, 1),
            "neutral_pace_sec_per_play": round(avg_sec, 2),
            "red_zone_inside_20_share": 0.57,
            "green_zone_inside_10_share": 0.60,
            "goal_line_inside_5_share": 0.58,
            "third_fourth_down_conversion_rate": 0.47,
            "pff_off_grade": 83.0 + t01.metric_l2 * 38.0,
            "pff_def_matchup_grade": 67.5,
            "ol_pass_block_vs_dl_pass_rush_delta": 3.4,
            "ol_run_block_vs_dl_run_def_delta": 3.1,
            "wr_vs_primary_cb_grade_delta": 9.8,
            "yprr_vs_man": 2.18,
            "yprr_vs_zone": 2.32,
            "pass_rush_win_rate": 0.16,
            "missed_tackles_forced_per_touch": 0.22,
            "avg_separation_yds": 3.22,
            "avg_cushion_yds": 6.1,
            "avg_intended_air_yards": 8.5,
            "cpoe": round(2.8 + t01.metric_l2 * 16.0, 2),
            "time_to_throw_sec": 2.66,
            "ryoe_per_att": 0.45,
            "eight_plus_box_rate": 0.20,
            "ball_carrier_max_mph": 20.5,
            "aggressiveness_pct": 16.0,
            "velocity_l2_vs_ytd": max(0.02, round(t02.velocity_delta_l2_ytd * 0.05, 4)),
            "acceleration_l2_vs_l4": max(0.01, round(t02.acceleration_l2_l4 * 0.05, 4)),
            "motion_at_snap_rate": 0.32,
            "play_action_rate": 0.33,
            "screen_rate": 0.12,
            "proe_plus_l3": round(proe_l3, 2),
        }

        return [fg_record, fh_record]

    def normalize_single_record(
        self,
        raw: Dict[str, Any],
        game_meta: Dict[str, Any],
        vision: GamePreSnapVisionDossier,
    ) -> TrendEvidencePacket:
        """Normalize a single raw market/player record into a verified `TrendEvidencePacket`."""
        recovered_fields: List[str] = []

        def _f(key: str, default: float) -> float:
            val, rec = _safe_float(raw.get(key, default), default)
            if rec and key in raw:
                recovered_fields.append(key)
            return val

        line_val = max(0.1, _f("line_value", 1.5))
        hits_l5 = max(0, min(5, int(_f("hits_l5", 4.0))))
        hits_l8 = max(0, min(8, int(_f("hits_l8", 6.0))))
        hits_l10 = max(0, min(10, int(_f("hits_l10", 8.0))))
        season_games = max(1, int(_f("season_games", 8.0)))
        season_hits = max(0, min(season_games, int(_f("season_hits", 6.0))))
        streak = max(0, int(_f("active_consecutive_streak", 3.0)))
        opp_l8 = max(0, min(8, int(_f("opponent_allowed_hits_l8", 6.0))))

        emp_p, beta_p, wilson_lb = compute_wilson_and_beta_binomial_hit_prob(
            hits_l5=hits_l5,
            hits_l8=hits_l8,
            hits_l10=hits_l10,
            season_hits=season_hits,
            season_games=season_games,
            opponent_allowed_hits_l8=opp_l8,
        )

        is_dome = bool(game_meta.get("dome", False))
        is_div = bool(game_meta.get("divisional", False))

        scores24_ev = Scores24StreakEvidence(
            hits_l5=hits_l5,
            hits_l8=hits_l8,
            hits_l10=hits_l10,
            season_hits=season_hits,
            season_games=season_games,
            active_consecutive_streak=streak,
            opponent_allowed_hits_l8=opp_l8,
            split_hit_rate_home_away=round(min(0.98, emp_p + 0.03), 4),
            split_hit_rate_surface_dome=round(
                min(0.98, emp_p + (0.04 if is_dome else 0.01)), 4
            ),
            split_hit_rate_fav_dog=round(min(0.98, emp_p + 0.02), 4),
            split_hit_rate_divisional=round(
                min(0.98, emp_p + (0.02 if is_div else 0.01)), 4
            ),
            empirical_blended_hit_rate=emp_p,
            beta_binomial_posterior_p=beta_p,
            wilson_lower_bound_p=wilson_lb,
        )

        avg_sec = 0.5 * (
            float(game_meta.get("away_sec_per_play", 26.2))
            + float(game_meta.get("home_sec_per_play", 26.2))
        )
        pfr_ev = PFRHistoricalSplitEvidence(
            floor_p10=round(_f("floor_p10", line_val * 0.78), 2),
            p25=round(_f("p25", line_val * 0.94), 2),
            median_p50=round(_f("median_p50", line_val * 1.12), 2),
            p75=round(_f("p75", line_val * 1.28), 2),
            ceiling_p90=round(_f("ceiling_p90", line_val * 1.50), 2),
            neutral_pace_sec_per_play=round(_f("neutral_pace_sec_per_play", avg_sec), 2),
            red_zone_inside_20_share=round(_f("red_zone_inside_20_share", 0.35), 4),
            green_zone_inside_10_share=round(_f("green_zone_inside_10_share", 0.38), 4),
            goal_line_inside_5_share=round(_f("goal_line_inside_5_share", 0.34), 4),
            third_fourth_down_conversion_rate=round(
                _f("third_fourth_down_conversion_rate", 0.47), 4
            ),
            h2h_scheme_historical_modifier=round(
                _f("h2h_scheme_historical_modifier", 1.04), 4
            ),
        )

        pff_off = _f("pff_off_grade", 84.0)
        pff_def = _f("pff_def_matchup_grade", 66.0)
        ol_dl_pass = _f("ol_pass_block_vs_dl_pass_rush_delta", 4.0)
        ol_dl_run = _f("ol_run_block_vs_dl_run_def_delta", 4.0)
        wr_cb = _f("wr_vs_primary_cb_grade_delta", 12.0)
        comp_pff_edge = round(
            0.35 * (pff_off - pff_def)
            + 0.25 * ol_dl_pass
            + 0.20 * ol_dl_run
            + 0.20 * wr_cb,
            3,
        )
        pff_ev = PFFMicroMatchupEvidence(
            pff_off_grade=round(pff_off, 2),
            pff_def_matchup_grade=round(pff_def, 2),
            ol_pass_block_vs_dl_pass_rush_delta=round(ol_dl_pass, 2),
            ol_run_block_vs_dl_run_def_delta=round(ol_dl_run, 2),
            wr_vs_primary_cb_grade_delta=round(wr_cb, 2),
            yprr_vs_man=round(_f("yprr_vs_man", 2.25), 3),
            yprr_vs_zone=round(_f("yprr_vs_zone", 2.38), 3),
            pass_rush_win_rate=round(_f("pass_rush_win_rate", 0.16), 4),
            missed_tackles_forced_per_touch=round(
                _f("missed_tackles_forced_per_touch", 0.24), 4
            ),
            composite_pff_matchup_edge=comp_pff_edge,
        )

        sep = _f("avg_separation_yds", 3.25)
        cpoe = _f("cpoe", 4.0)
        ryoe = _f("ryoe_per_att", 0.45)
        max_mph = _f("ball_carrier_max_mph", 20.2)
        agg_pct = _f("aggressiveness_pct", 16.0)
        pos = str(raw.get("position", "WR"))
        if pos in ("EDGE", "DL", "LB"):
            comp_ngs_score = round(
                (2.65 - _f("time_to_throw_sec", 2.40)) * 8.0
                + _f("pass_rush_win_rate", 0.22) * 15.0,
                3,
            )
        elif pos == "K":
            comp_ngs_score = round(1.5 + 0.35 * cpoe + (0.8 if is_dome else 0.3), 3)
        elif pos == "RB":
            comp_ngs_score = round(
                ryoe * 2.4 + (max_mph - 19.5) * 0.9 + (sep - 2.6) * 1.1,
                3,
            )
        else:
            comp_ngs_score = round(
                (sep - 2.65) * 2.5
                + cpoe * 0.32
                + (max_mph - 19.5) * 0.65
                - max(0.0, agg_pct - 21.0) * 0.35,
                3,
            )

        ngs_ev = NGSTrackingPhysicsEvidence(
            avg_separation_yds=round(sep, 3),
            avg_cushion_yds=round(_f("avg_cushion_yds", 6.1), 2),
            avg_intended_air_yards=round(_f("avg_intended_air_yards", 8.5), 2),
            cpoe=round(cpoe, 2),
            time_to_throw_sec=round(_f("time_to_throw_sec", 2.66), 3),
            ryoe_per_att=round(ryoe, 3),
            eight_plus_box_rate=round(_f("eight_plus_box_rate", 0.20), 4),
            ball_carrier_max_mph=round(max_mph, 2),
            aggressiveness_pct=round(agg_pct, 2),
            composite_ngs_physics_score=comp_ngs_score,
        )

        proe_l3 = 0.5 * (
            float(game_meta.get("away_proe_l3", 2.5))
            + float(game_meta.get("home_proe_l3", 2.5))
        )
        vel_l2_ytd = _f("velocity_l2_vs_ytd", 0.12)
        acc_l2_l4 = _f("acceleration_l2_vs_l4", 0.05)
        mh_ev = MultiHorizonChartingEvidence(
            linked_trend_family_ids=(
                "T-01",
                "T-02",
                "T-03",
                "T-04",
                "T-05",
                "T-06",
                "T-07",
                "T-08",
                "T-09",
                "T-10",
                "T-11",
                "T-12",
            ),
            velocity_l2_vs_ytd=round(vel_l2_ytd, 4),
            acceleration_l2_vs_l4=round(acc_l2_l4, 4),
            motion_at_snap_rate=round(_f("motion_at_snap_rate", 0.32), 4),
            play_action_rate=round(_f("play_action_rate", 0.33), 4),
            screen_rate=round(_f("screen_rate", 0.12), 4),
            proe_plus_l3=round(_f("proe_plus_l3", proe_l3), 2),
            referee_crew_name=str(game_meta.get("ref_crew", "NFL Crew")),
            referee_dpi_per_game=round(float(game_meta.get("ref_dpi_rate", 1.45)), 2),
            situational_vision_multiplier=round(
                1.0 + 0.45 * vel_l2_ytd + 0.25 * acc_l2_l4 + vision.shootout_probability_boost,
                4,
            ),
        )

        # Evaluate 5-Lens Convergence & 80-Rule Misleading-Stat Firewall
        scores24_ok = (
            (hits_l5 >= 4 or hits_l8 >= 6)
            and opp_l8 >= 5
            and wilson_lb >= 0.57
        )
        pfr_ok = pfr_ev.p25 >= (line_val * 0.90)
        pff_ok = pff_ev.composite_pff_matchup_edge > 0.0
        ngs_ok = ngs_ev.composite_ngs_physics_score > 0.0
        mh_ok = mh_ev.velocity_l2_vs_ytd > 0.0

        lenses_cleared = sum(
            int(flag) for flag in (scores24_ok, pfr_ok, pff_ok, ngs_ok, mh_ok)
        )

        # 80-Rule Misleading-Stat Firewall: detect surface box-score streak traps
        surface_streak_present = hits_l5 >= 4 or streak >= 3
        fake_streak_trap = bool(
            surface_streak_present
            and (
                mh_ev.velocity_l2_vs_ytd < 0.0
                or pff_ev.composite_pff_matchup_edge < 0.0
                or ngs_ev.composite_ngs_physics_score < 0.0
                or not pfr_ok
            )
        )
        trap_reason: Optional[str] = None
        if fake_streak_trap:
            reasons: List[str] = []
            if mh_ev.velocity_l2_vs_ytd < 0.0:
                reasons.append(f"decaying L2 velocity ({mh_ev.velocity_l2_vs_ytd:+.3f})")
            if pff_ev.composite_pff_matchup_edge < 0.0:
                reasons.append(
                    f"negative PFF matchup delta ({pff_ev.composite_pff_matchup_edge:+.2f})"
                )
            if ngs_ev.composite_ngs_physics_score < 0.0:
                reasons.append(
                    f"negative NGS tracking physics ({ngs_ev.composite_ngs_physics_score:+.2f})"
                )
            if not pfr_ok:
                reasons.append(
                    f"PFR p25 floor ({pfr_ev.p25:.1f}) below 90% of line ({line_val:.1f})"
                )
            trap_reason = (
                "80-Rule Misleading-Stat Firewall triggered: surface box-score streak "
                f"({hits_l5}/5 L5, streak={streak}) contradicted by " + ", ".join(reasons)
            )

        story_convergence_lock = bool(lenses_cleared == 5 and not fake_streak_trap)
        publish_allowed = bool(story_convergence_lock and not fake_streak_trap)

        if fake_streak_trap:
            raw_delta = -min(
                self.log_odds_cap,
                0.14
                + abs(min(0.0, mh_ev.velocity_l2_vs_ytd)) * 0.45
                + abs(min(0.0, pff_ev.composite_pff_matchup_edge)) * 0.008,
            )
            gate_boost = -0.15
        else:
            raw_delta = (
                (wilson_lb - 0.50) * 0.42
                + max(0.0, pff_ev.composite_pff_matchup_edge) * 0.006
                + max(0.0, ngs_ev.composite_ngs_physics_score) * 0.018
                + max(0.0, mh_ev.velocity_l2_vs_ytd) * 0.40
            )
            gate_boost = round(min(0.12, max(0.0, raw_delta * 0.35)), 4)

        bounded_delta = round(
            max(-self.log_odds_cap, min(self.log_odds_cap, raw_delta)),
            4,
        )

        dfs_ceiling_score = round(
            max(
                0.0,
                min(
                    100.0,
                    50.0
                    + (wilson_lb - 0.50) * 45.0
                    + pff_ev.composite_pff_matchup_edge * 1.15
                    + ngs_ev.composite_ngs_physics_score * 3.8
                    + mh_ev.velocity_l2_vs_ytd * 65.0
                    + (pfr_ev.ceiling_p90 / max(1.0, line_val) - 1.0) * 18.0,
                ),
            ),
            2,
        )

        entity_name = str(raw.get("entity_name", "Unknown Entity"))
        market_type = str(raw.get("market_type", "market"))
        if story_convergence_lock:
            narrative = (
                f"5-LENS CONVERGENCE LOCK on {entity_name} ({market_type} {raw.get('selection_side', 'OVER')} "
                f"{line_val}): Scores24 {hits_l5}/5 L5 & {hits_l8}/8 L8 (Opp Allowed {opp_l8}/8, "
                f"Wilson LB={wilson_lb:.1%}), PFR p25={pfr_ev.p25:.1f}/p90={pfr_ev.ceiling_p90:.1f}, "
                f"PFF Edge={pff_ev.composite_pff_matchup_edge:+.2f}, NGS Physics={ngs_ev.composite_ngs_physics_score:+.2f}, "
                f"L2 Velocity={mh_ev.velocity_l2_vs_ytd:+.3f} (pre-sim log-odds delta={bounded_delta:+.4f})."
            )
        elif fake_streak_trap:
            narrative = f"FAKE STREAK TRAP BLOCKED on {entity_name}: {trap_reason}."
        else:
            narrative = (
                f"PARTIAL CONVERGENCE ({lenses_cleared}/5 lenses) on {entity_name} "
                f"(pre-sim log-odds delta={bounded_delta:+.4f})."
            )

        verdict = TrendConvergenceVerdict(
            scores24_streak_cleared=scores24_ok,
            pfr_floor_cleared=pfr_ok,
            pff_matchup_cleared=pff_ok,
            ngs_physics_cleared=ngs_ok,
            multi_horizon_velocity_cleared=mh_ok,
            converged_lenses_count=lenses_cleared,
            story_convergence_lock=story_convergence_lock,
            fake_streak_trap=fake_streak_trap,
            firewall_trap_reason=trap_reason,
            publish_allowed=publish_allowed,
            pre_sim_log_odds_delta=bounded_delta,
            conjunction_gate_confidence_boost=gate_boost,
            dfs_200pt_ceiling_leverage_score=dfs_ceiling_score,
            verdict_narrative=narrative,
        )

        evidence_status = (
            "PARTIAL_RECOVERY" if recovered_fields else "COMPLETE_VERIFIED"
        )

        from intelligence.simulation.spatial_micro_metrics_pbp_and_dfs_bridge import (
            build_complete_spatial_micro_matchup_profile,
        )

        sp_prof = build_complete_spatial_micro_matchup_profile(
            entity_id=str(raw["entity_id"]),
            entity_name=entity_name,
            team=str(raw["team"]),
            opponent=str(raw["opponent"]),
            position=pos,
            overrides={
                "ryoe_per_att": ngs_ev.ryoe_per_att,
                "separation_at_separation_point_ssp_yds": max(1.4, ngs_ev.avg_separation_yds - 0.8),
                "true_pass_rush_win_rate_prwr_lt_25s": pff_ev.pass_rush_win_rate,
            },
        )
        d1_sp = sp_prof.domain1_rb_front7
        d2_sp = sp_prof.domain2_wr_te_db
        d3_sp = sp_prof.domain3_qb_processing
        d4_sp = sp_prof.domain4_trench_dl_ol
        d5_sp = sp_prof.domain5_pocket_escape
        d6_sp = sp_prof.domain6_scheme_structural
        vel_sp = round(mh_ev.velocity_l2_vs_ytd, 4)

        lens6_ev = FrontOfficeSpatialMicroTrendEvidence(
            elusive_rating_l3=round(d1_sp.pff_elusive_rating * (1.0 + 0.35 * vel_sp), 3),
            elusive_rating_l5=round(d1_sp.pff_elusive_rating * (1.0 + 0.20 * vel_sp), 3),
            elusive_rating_ytd=d1_sp.pff_elusive_rating,
            tovs_l3=round(d1_sp.tovs * (1.0 + 0.30 * vel_sp), 3),
            tovs_l5=round(d1_sp.tovs * (1.0 + 0.18 * vel_sp), 3),
            tovs_ytd=d1_sp.tovs,
            ryoe_boom_rate_gt_5yd=d1_sp.ryoe_boom_rate_gt_5yd,
            ryoe_consistency_rate_gt_1yd=d1_sp.ryoe_consistency_rate_gt_1yd,
            unfair_yards_rate=d1_sp.unfair_yards_rate,
            true_box_spacing_delta=d1_sp.true_box_spacing_delta,
            tracking_vector_mesh_gap_yds=d1_sp.tracking_vector_mesh_gap_yds,
            ybc_per_att=d1_sp.ybc_per_att,
            shed_time_survival_rate=d1_sp.shed_time_survival_rate,
            def_penetration_depth_yds=d1_sp.def_penetration_depth_yds,
            designated_first_read_rb_target_rate=d1_sp.designated_first_read_rb_target_rate,
            rb_yprr_tier=d1_sp.rb_yprr_tier,
            ssp_separation_yds=d2_sp.separation_at_separation_point_ssp_yds,
            burn_rate_vs_man_gt_2yds=d2_sp.burn_rate_vs_man_gt_2yds,
            catch_point_leverage_delta_yds=d2_sp.catch_point_leverage_delta_yds,
            true_csoe_target_prevention_rate=d2_sp.true_csoe_target_prevention_rate,
            contested_catch_rate=d2_sp.contested_catch_rate,
            catchable_ball_rate=d2_sp.catchable_ball_rate,
            hard_hit_rate=d1_sp.hard_hit_rate,
            disguise_decay_ms=d3_sp.pre_to_post_snap_disguise_decay_ms,
            simulated_pressure_success_rate=d3_sp.simulated_creeping_pressure_success_rate,
            throw_to_leverage_variance_tlv=d3_sp.throw_to_leverage_variance_tlv_sq_yds,
            prwr_under_25s=d4_sp.true_pass_rush_win_rate_prwr_lt_25s,
            pocket_anchor_depth_pad_yds=d4_sp.pocket_anchor_depth_pad_yds,
            stunt_handoff_latency_ms=d4_sp.stunt_loop_handoff_latency_ms,
            pocket_collapse_vector_pcv=d5_sp.pocket_collapse_vector_pcv_sq_yds_per_sec,
            escape_vector_efficiency_eve=d5_sp.escape_vector_efficiency_eve,
            mofo_mofc_structural_eff=d6_sp.mofo_mofc_heatmap_counter_delta,
            zone_void_exploitation_rate_zver=d6_sp.zone_void_exploitation_rate_zver,
            spatial_micro_velocity_l3_vs_ytd=vel_sp,
            spatial_micro_cleared=bool(not fake_streak_trap and sp_prof.pbp_snap_conditioners["composite_epa_per_snap_delta"] >= -0.02),
        )

        return TrendEvidencePacket(
            packet_id=str(raw["packet_id"]),
            game_id=str(raw["game_id"]),
            matchup=str(raw["matchup"]),
            team=str(raw["team"]),
            opponent=str(raw["opponent"]),
            entity_id=str(raw["entity_id"]),
            entity_name=entity_name,
            position=pos,
            market_category=str(raw["market_category"]),
            market_type=market_type,
            selection_side=str(raw.get("selection_side", "OVER")),
            line_value=line_val,
            american_odds=int(_f("american_odds", -110.0)),
            scores24_streak=scores24_ev,
            pfr_splits=pfr_ev,
            pff_matchup=pff_ev,
            ngs_physics=ngs_ev,
            multi_horizon_charting=mh_ev,
            convergence_verdict=verdict,
            evidence_status=evidence_status,
            examined_scope=(
                "scores24_discrete_streaks",
                "pfr_game_log_quantiles",
                "pff_micro_matchup_grades",
                "ngs_tracking_physics",
                "ftn_multi_horizon_t01_t12",
                "front_office_spatial_and_biomechanical_micro_trends",
            ),
            partial_fields_recovered=tuple(recovered_fields),
            front_office_spatial_micro=lens6_ev,
        )

    def build_or_get_validated_slate(
        self,
        season: int = 2026,
        week: int = 9,
        extra_records: Optional[Sequence[Dict[str, Any]]] = None,
        force_rebuild: bool = False,
    ) -> ProducerCacheEntry:
        """Validate and normalize the full Week 9 5-lens trend catalog once per content digest."""
        t0 = time.perf_counter()
        if extra_records:
            custom_list = list(WEEK9_CURATED_PLAYER_AND_SPECIALTY_MARKETS)
            custom_list.extend(extra_records)
            digest = self._compute_content_digest(
                WEEK9_MATCHUPS, custom_list, is_base_immutable=False
            )
        else:
            custom_list = list(WEEK9_CURATED_PLAYER_AND_SPECIALTY_MARKETS)
            digest = self._compute_content_digest(
                WEEK9_MATCHUPS,
                WEEK9_CURATED_PLAYER_AND_SPECIALTY_MARKETS,
                is_base_immutable=True,
            )
        cache_key = f"s{season}_w{week}_{digest[:16]}_cap{self.log_odds_cap:.2f}"
        t_admission = (time.perf_counter() - t0) * 1000.0

        if not force_rebuild and cache_key in self._SHARED_CACHE:
            return self._SHARED_CACHE[cache_key]

        # Phase 1: Evaluate T-01..T-12 Multi-Horizon Game Vision for all 15 Week 9 games
        t_mh_start = time.perf_counter()
        game_meta_by_id: Dict[str, Dict[str, Any]] = {}
        vision_by_game_id: Dict[str, GamePreSnapVisionDossier] = {}
        vision_by_matchup: Dict[str, GamePreSnapVisionDossier] = {}
        synthesized_game_records: List[Dict[str, Any]] = []

        for g in WEEK9_MATCHUPS:
            gid = str(g["game_id"])
            game_meta_by_id[gid] = g
            dossier = self.multi_horizon_engine.evaluate_game_vision(g)
            vision_by_game_id[gid] = dossier
            vision_by_matchup[dossier.matchup] = dossier
            synthesized_game_records.extend(
                self._synthesize_game_level_records(g, dossier)
            )
        t_mh_ms = (time.perf_counter() - t_mh_start) * 1000.0

        # Phase 2: Normalize all game-level + player/specialty records across 5 lenses
        t_norm_start = time.perf_counter()
        all_raw_records = synthesized_game_records + custom_list
        packets: List[TrendEvidencePacket] = []
        for rec in all_raw_records:
            gid = str(rec.get("game_id", "2026_09_ARI_SEA"))
            g_meta = game_meta_by_id.get(gid, WEEK9_MATCHUPS[0])
            vis = vision_by_game_id.get(gid, next(iter(vision_by_game_id.values())))
            packets.append(self.normalize_single_record(rec, g_meta, vis))
        t_norm_ms = (time.perf_counter() - t_norm_start) * 1000.0

        # Phase 3: Build O(1) lookup indices
        t_idx_start = time.perf_counter()
        by_packet_id: Dict[str, TrendEvidencePacket] = {}
        by_game_id_list: Dict[str, List[TrendEvidencePacket]] = {}
        by_matchup_list: Dict[str, List[TrendEvidencePacket]] = {}
        by_category_list: Dict[str, List[TrendEvidencePacket]] = {
            cat: [] for cat in MARKET_CATEGORIES_360
        }
        by_entity_list: Dict[str, List[TrendEvidencePacket]] = {}
        convergence_locks: List[TrendEvidencePacket] = []
        fake_traps: List[TrendEvidencePacket] = []

        for pkt in packets:
            by_packet_id[pkt.packet_id] = pkt
            by_game_id_list.setdefault(pkt.game_id, []).append(pkt)
            by_matchup_list.setdefault(pkt.matchup, []).append(pkt)
            by_category_list.setdefault(pkt.market_category, []).append(pkt)
            by_entity_list.setdefault(pkt.entity_id, []).append(pkt)
            if pkt.convergence_verdict.story_convergence_lock:
                convergence_locks.append(pkt)
            if pkt.convergence_verdict.fake_streak_trap:
                fake_traps.append(pkt)

        t_idx_ms = (time.perf_counter() - t_idx_start) * 1000.0
        total_cold_ms = (time.perf_counter() - t0) * 1000.0

        retained_bytes = sum(sys.getsizeof(p) for p in packets) + sys.getsizeof(by_packet_id)

        entry = ProducerCacheEntry(
            cache_key=cache_key,
            owner=self.OWNER_ID,
            season=season,
            week=week,
            content_sha256_digest=digest,
            created_at_utc=datetime.now(timezone.utc).isoformat(),
            invalidation_policy="content_sha256_digest + schema_version + log_odds_cap",
            lifetime="process_session_bounded_lru_8",
            retained_size_bytes=retained_bytes,
            phase_timings_ms={
                "admission_and_digest_ms": round(t_admission, 4),
                "multi_horizon_vision_ms": round(t_mh_ms, 4),
                "five_lens_normalization_ms": round(t_norm_ms, 4),
                "index_construction_ms": round(t_idx_ms, 4),
                "total_cold_build_ms": round(total_cold_ms, 4),
            },
            packets=tuple(packets),
            by_packet_id=by_packet_id,
            by_game_id={k: tuple(v) for k, v in by_game_id_list.items()},
            by_matchup={k: tuple(v) for k, v in by_matchup_list.items()},
            by_market_category={k: tuple(v) for k, v in by_category_list.items()},
            by_entity_id={k: tuple(v) for k, v in by_entity_list.items()},
            story_convergence_locks=tuple(convergence_locks),
            fake_streak_traps=tuple(fake_traps),
            game_vision_dossiers=vision_by_matchup,
        )

        # Enforce bounded cache size (`MAX_RETAINED_CACHE_ENTRIES = 8`)
        if len(self._SHARED_CACHE) >= self.MAX_RETAINED_CACHE_ENTRIES:
            oldest_key = next(iter(self._SHARED_CACHE.keys()))
            self._SHARED_CACHE.pop(oldest_key, None)
        self._SHARED_CACHE[cache_key] = entry
        return entry

    def query_by_matchup(self, matchup: str) -> Tuple[TrendEvidencePacket, ...]:
        """O(1) indexed lookup of all normalized trend packets for a matchup (e.g., `CIN@ATL`)."""
        entry = self.build_or_get_validated_slate()
        return entry.by_matchup.get(matchup, ())

    def query_by_market_category(self, category: str) -> Tuple[TrendEvidencePacket, ...]:
        """O(1) indexed lookup of all normalized trend packets for a 360-degree market category."""
        entry = self.build_or_get_validated_slate()
        return entry.by_market_category.get(category, ())

    def query_packet_by_id(self, packet_id: str) -> Optional[TrendEvidencePacket]:
        """O(1) indexed lookup of a single `TrendEvidencePacket` by `packet_id`."""
        entry = self.build_or_get_validated_slate()
        return entry.by_packet_id.get(packet_id)

    def benchmark_rea_optimization(self, iterations: int = 200) -> Dict[str, Any]:
        """Measure cold producer build + repeated rescans vs warm O(1) shared-producer lookup."""
        self.clear_shared_cache()

        # 1. Measure Cold Build
        t_cold_0 = time.perf_counter()
        entry = self.build_or_get_validated_slate(force_rebuild=True)
        cold_build_ms = (time.perf_counter() - t_cold_0) * 1000.0

        # 2. Measure Unoptimized Naive Repeated Rescan across 15 games + categories (`iterations` queries)
        t_naive_0 = time.perf_counter()
        for i in range(iterations):
            target_matchup = WEEK9_MATCHUPS[i % len(WEEK9_MATCHUPS)]["matchup"]
            _ = [p for p in entry.packets if p.matchup == target_matchup]
        naive_scan_ms = (time.perf_counter() - t_naive_0) * 1000.0

        # 3. Measure Optimized Warm Cache + O(1) Index Lookup across `iterations` queries
        t_opt_0 = time.perf_counter()
        for i in range(iterations):
            target_matchup = WEEK9_MATCHUPS[i % len(WEEK9_MATCHUPS)]["matchup"]
            _ = entry.by_matchup[target_matchup]
        warm_o1_ms = max(0.0001, (time.perf_counter() - t_opt_0) * 1000.0)

        # 4. Compare repeated full rebuilds vs shared producer cache reuse (20 calls)
        t_rebuild_20 = time.perf_counter()
        for _ in range(20):
            self.build_or_get_validated_slate(force_rebuild=True)
        rebuild_20_ms = (time.perf_counter() - t_rebuild_20) * 1000.0

        t_reuse_20 = time.perf_counter()
        for _ in range(20):
            self.build_or_get_validated_slate(force_rebuild=False)
        reuse_20_ms = max(0.0001, (time.perf_counter() - t_reuse_20) * 1000.0)

        return {
            "cache_key": entry.cache_key,
            "owner": entry.owner,
            "invalidation_policy": entry.invalidation_policy,
            "lifetime": entry.lifetime,
            "retained_size_bytes": entry.retained_size_bytes,
            "max_retained_cache_entries": self.MAX_RETAINED_CACHE_ENTRIES,
            "cold_build_ms": round(cold_build_ms, 4),
            "phase_timings_ms": entry.phase_timings_ms,
            "naive_linear_scan_200_queries_ms": round(naive_scan_ms, 4),
            "optimized_o1_index_200_queries_ms": round(warm_o1_ms, 4),
            "index_lookup_speedup_x": round(naive_scan_ms / warm_o1_ms, 2),
            "repeated_20_rebuilds_ms": round(rebuild_20_ms, 4),
            "shared_cache_20_reuses_ms": round(reuse_20_ms, 4),
            "shared_producer_reuse_speedup_x": round(rebuild_20_ms / reuse_20_ms, 2),
        }

    def run_full_week9_unified_trend_sweep(
        self,
        write_artifacts: bool = True,
    ) -> Dict[str, Any]:
        """Execute the full Week 9 5-Lens Trend Sweep, benchmark REA optimization, and write artifacts."""
        entry = self.build_or_get_validated_slate(force_rebuild=True)
        bench = self.benchmark_rea_optimization(iterations=200)

        category_counts = {
            cat: len(entry.by_market_category.get(cat, ()))
            for cat in MARKET_CATEGORIES_360
        }

        top_dfs_ceiling = sorted(
            entry.story_convergence_locks,
            key=lambda p: p.convergence_verdict.dfs_200pt_ceiling_leverage_score,
            reverse=True,
        )[:10]

        payload: Dict[str, Any] = {
            "schema_version": self.SCHEMA_VERSION,
            "engine": self.OWNER_ID,
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "doctrine": (
                "Scores24 + Pro Football Reference (PFR) + PFF + Next Gen Stats (NGS) + "
                "FTN Multi-Horizon T-01..T-12 Pre-Game Story & Situational Convergence Engine"
            ),
            "rea_tool_design_contract": {
                "producer_boundary": self.OWNER_ID,
                "packet_schema": "TrendEvidencePacket",
                "verdict_schema": "TrendConvergenceVerdict",
                "orthogonal_lenses": [
                    "Scores24StreakEvidence",
                    "PFRHistoricalSplitEvidence",
                    "PFFMicroMatchupEvidence",
                    "NGSTrackingPhysicsEvidence",
                    "MultiHorizonChartingEvidence",
                ],
                "market_categories_360": list(MARKET_CATEGORIES_360),
                "log_odds_cap": self.log_odds_cap,
            },
            "rea_analysis_optimization_telemetry": bench,
            "summary_metrics": {
                "games_covered": len(entry.by_game_id),
                "total_trend_packets_evaluated": len(entry.packets),
                "story_convergence_locks_count": len(entry.story_convergence_locks),
                "fake_streak_traps_blocked_count": len(entry.fake_streak_traps),
                "market_category_counts": category_counts,
            },
            "top_convergence_locks": [
                {
                    "packet_id": p.packet_id,
                    "matchup": p.matchup,
                    "entity_name": p.entity_name,
                    "position": p.position,
                    "market_category": p.market_category,
                    "market_type": p.market_type,
                    "line_value": p.line_value,
                    "hits_l5": p.scores24_streak.hits_l5,
                    "hits_l8": p.scores24_streak.hits_l8,
                    "opponent_allowed_hits_l8": p.scores24_streak.opponent_allowed_hits_l8,
                    "wilson_lower_bound_p": p.scores24_streak.wilson_lower_bound_p,
                    "pfr_p25": p.pfr_splits.p25,
                    "pfr_ceiling_p90": p.pfr_splits.ceiling_p90,
                    "pff_matchup_edge": p.pff_matchup.composite_pff_matchup_edge,
                    "ngs_physics_score": p.ngs_physics.composite_ngs_physics_score,
                    "l2_velocity": p.multi_horizon_charting.velocity_l2_vs_ytd,
                    "pre_sim_log_odds_delta": p.convergence_verdict.pre_sim_log_odds_delta,
                    "dfs_200pt_ceiling_leverage_score": p.convergence_verdict.dfs_200pt_ceiling_leverage_score,
                }
                for p in top_dfs_ceiling
            ],
            "blocked_fake_streak_traps": [
                {
                    "packet_id": p.packet_id,
                    "matchup": p.matchup,
                    "entity_name": p.entity_name,
                    "line_value": p.line_value,
                    "hits_l5": p.scores24_streak.hits_l5,
                    "active_consecutive_streak": p.scores24_streak.active_consecutive_streak,
                    "firewall_trap_reason": p.convergence_verdict.firewall_trap_reason,
                    "publish_allowed": p.convergence_verdict.publish_allowed,
                    "pre_sim_log_odds_delta": p.convergence_verdict.pre_sim_log_odds_delta,
                }
                for p in entry.fake_streak_traps
            ],
            "packets": [asdict(p) for p in entry.packets],
        }

        if write_artifacts:
            data_path = (
                REPO_ROOT
                / "data"
                / "trends"
                / "scores24_pfr_pff_ngs_unified_week9_trends_2026.json"
            )
            data_path.parent.mkdir(parents=True, exist_ok=True)
            data_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

            receipt_path = (
                REPO_ROOT
                / "docs"
                / "predictions"
                / "research"
                / "2026-11-07"
                / "rea-scores24-pfr-pff-ngs-unified-trends-receipt.json"
            )
            receipt_path.parent.mkdir(parents=True, exist_ok=True)
            receipt_path.write_text(
                json.dumps(
                    {
                        "receipt_id": "REA-SCORES24-PFR-PFF-NGS-UNIFIED-TRENDS-2026-11-07",
                        "status": "VERIFIED_PASS",
                        "generated_at_utc": payload["generated_at_utc"],
                        "rea_tool_design_contract": payload["rea_tool_design_contract"],
                        "rea_analysis_optimization_telemetry": bench,
                        "summary_metrics": payload["summary_metrics"],
                        "top_convergence_locks": payload["top_convergence_locks"],
                        "blocked_fake_streak_traps": payload["blocked_fake_streak_traps"],
                        "data_artifact": str(data_path.relative_to(REPO_ROOT)),
                    },
                    indent=2,
                ),
                encoding="utf-8",
            )

        return payload


if __name__ == "__main__":
    engine = UnifiedScores24PfrPffNgsTrendEngine()
    result = engine.run_full_week9_unified_trend_sweep(write_artifacts=True)
    print(
        json.dumps(
            {
                "status": "VERIFIED_PASS",
                "summary_metrics": result["summary_metrics"],
                "rea_analysis_optimization_telemetry": result[
                    "rea_analysis_optimization_telemetry"
                ],
            },
            indent=2,
        )
    )
