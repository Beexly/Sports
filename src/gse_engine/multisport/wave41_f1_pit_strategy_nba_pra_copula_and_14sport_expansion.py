"""Wave 41 Multi-Sport 14-Sport Expansion, F1 Pit Undercut & NBA PRA NegBin-Copula PropSim.

Extends Galaxy Sports Engine (GSE) from 284 metrics / 10 sports to 356 canonical metrics across
14 sports without mutating Wave 40's base 10-sport registry:
1. Adds 72 canonical metrics (18 each across MOTORSPORTS, BOXING, ESPORTS, CRICKET_RUGBY) and
   exposes UNIVERSAL_14SPORT_METRICS_REGISTRY + query_14sport_universal_metric.
2. Implements F1 fuel-corrected stint tire degradation, nonlinear compound cliff modeling
   (Soft / Medium / Hard), and clean-air undercut pit-window optimization.
3. Implements NBA Points + Rebounds + Assists (PRA) PropSim coupling overdispersed Negative
   Binomial marginals (Var = mu + mu^2 / k) via a deterministic Student-t copula (df = 5)
   with usage-coupled positive PTS-AST correlation and zero Gaussian shortcut.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
from typing import Any

import numpy as np
from scipy.stats import nbinom  # type: ignore[import-untyped]
from scipy.stats import t as student_t

from gse_engine.multisport.wave40_universal_sports_metrics_encyclopedia_and_handicap_engine import (  # noqa: E501
    LIVE_STAKE_FRACTION,
    REAL_MONEY_STAKE_CLEARED,
    UNIVERSAL_SPORTS_METRICS_REGISTRY,
    SportMetricSpec,
    _load_universal_vault,
    _m,
    _norm_txt,
)

REPO_ROOT = Path(__file__).resolve().parents[3]

_COMPOUND_PROFILES: dict[str, dict[str, float]] = {
    "SOFT": {"grip_gain_s": 0.68, "linear_deg": 0.082, "cliff_lap": 14.0, "cliff_quad": 0.018},
    "MEDIUM": {"grip_gain_s": 0.25, "linear_deg": 0.048, "cliff_lap": 23.0, "cliff_quad": 0.011},
    "HARD": {"grip_gain_s": 0.00, "linear_deg": 0.026, "cliff_lap": 34.0, "cliff_quad": 0.006},
}

_SUITE41_MS_CACHE: dict[str, dict[str, Any]] = {}


def _build_wave41_extension_metrics() -> tuple[SportMetricSpec, ...]:
    """Construct 72 canonical metrics spanning MOTORSPORTS, BOXING, ESPORTS & CRICKET_RUGBY."""
    rows: list[SportMetricSpec] = [
        # --- MOTORSPORTS (18) ---
        _m(
            "f1_fuel_corrected_lap_delta",
            "MOTORSPORTS",
            "pace",
            "Fuel-Corrected Lap Time Delta",
            "FC_LapDelta",
            ("fuel corrected pace", "f1 race pace delta", "clean air lap time"),
            "seconds",
            "lap_time_s + fuel_mass_kg * fuel_coeff - sc_baseline",
            0.0,
            -0.38,
            0.45,
            higher_is_better=False,
        ),
        _m(
            "f1_tyre_thermal_deg_s_per_lap",
            "MOTORSPORTS",
            "strategy",
            "Tire Thermal Degradation Rate per Lap",
            "TyreDeg/Lap",
            ("tire degradation", "tyre deg", "f1 stint falloff"),
            "s/lap",
            "d_lap_time_d_lap_fuel_adjusted",
            0.055,
            0.028,
            0.105,
            higher_is_better=False,
        ),
        _m(
            "f1_tyre_cliff_lap_index",
            "MOTORSPORTS",
            "strategy",
            "Nonlinear Tire Compound Cliff Lap Index",
            "CliffLap",
            ("tire cliff", "rubber shear knee lap"),
            "lap",
            "stint_lap_where_d2_lap_d_lap2_exceeds_threshold",
            22.0,
            30.0,
            13.0,
        ),
        _m(
            "f1_undercut_pit_delta_s",
            "MOTORSPORTS",
            "strategy",
            "Net Undercut Pit-Window Delta",
            "UndercutDelta",
            ("undercut delta", "pit undercut gain", "pit stop window"),
            "seconds",
            "2 * outlap_fresh_gain - car_ahead_deg - traffic_penalty",
            0.15,
            1.25,
            -0.80,
        ),
        _m(
            "f1_overcut_clean_air_gain_s",
            "MOTORSPORTS",
            "strategy",
            "Overcut Clean-Air Track Extension Gain",
            "OvercutGain",
            ("overcut", "clean air stint extension"),
            "seconds",
            "clean_air_pace_delta - pitted_car_traffic_delay",
            0.0,
            0.95,
            -0.75,
        ),
        _m(
            "f1_drs_overtake_prob",
            "MOTORSPORTS",
            "passing",
            "DRS Straight-Line Closing Overtake Probability",
            "DRS_PassProb",
            ("drs overtake", "f1 overtake probability"),
            "probability",
            "sigmoid(closing_speed_kph + ers_delta - dirty_air_loss)",
            0.32,
            0.65,
            0.12,
        ),
        _m(
            "f1_ers_deployment_kj",
            "MOTORSPORTS",
            "powertrain",
            "ERS MGU-K Battery Deployment Efficiency",
            "ERS_kJ",
            ("ers deploy", "mgu k battery harvest"),
            "kJ/lap",
            "mgu_k_deploy_kj / 4000.0 * overtake_clip_ratio",
            0.84,
            0.95,
            0.68,
        ),
        _m(
            "f1_pit_lane_stationary_loss_s",
            "MOTORSPORTS",
            "execution",
            "Stationary Pit Stop Duration",
            "PitStop_s",
            ("pit stop time", "pit crew stationary time"),
            "seconds",
            "wheelgun_off_to_jack_drop_s",
            2.65,
            2.10,
            3.60,
            higher_is_better=False,
        ),
        _m(
            "f1_safety_car_pit_discount_prob",
            "MOTORSPORTS",
            "variance",
            "Circuit Safety Car / VSC Pit Discount Probability",
            "SC_Prob",
            ("safety car probability", "vsc pit discount"),
            "probability",
            "historical_vsc_sc_events_per_lap * wall_proximity",
            0.42,
            0.78,
            0.15,
            predictive_tier="TIER_2_SYNTHESIS",
        ),
        _m(
            "f1_track_evolution_grip_s",
            "MOTORSPORTS",
            "surface",
            "Circuit Track Rubber Evolution Gain",
            "TrackEvo_s",
            ("track evolution", "rubbered in surface delta"),
            "seconds",
            "q1_to_q3_baseline_grip_gain_s",
            0.55,
            1.15,
            0.20,
        ),
        _m(
            "f1_dirty_air_wake_loss_s",
            "MOTORSPORTS",
            "aero",
            "Following Wake Downforce Loss Penalty",
            "DirtyAir_s",
            ("dirty air", "wake turbulence loss"),
            "seconds",
            "lap_delta_inside_1_2s_follow_gap",
            0.48,
            0.22,
            0.85,
            higher_is_better=False,
        ),
        _m(
            "f1_braking_zone_stability_g",
            "MOTORSPORTS",
            "chassis",
            "Peak Trail-Braking Longitudinal Deceleration",
            "Brake_G",
            ("braking g force", "trail brake stability"),
            "g",
            "max_longitudinal_decel_g_before_lockup",
            4.85,
            5.45,
            4.10,
        ),
        _m(
            "f1_apex_minimum_speed_kph",
            "MOTORSPORTS",
            "chassis",
            "High-Speed Corner Apex Minimum Speed",
            "ApexMinKPH",
            ("minimum corner speed", "apex speed telemetry"),
            "kph",
            "telemetry_v_min_sector_corner",
            174.0,
            183.0,
            165.0,
        ),
        _m(
            "f1_traction_exit_slip_pct",
            "MOTORSPORTS",
            "chassis",
            "Corner-Exit Rear Wheelspin Slip Ratio",
            "TractionSlip",
            ("exit traction", "rear wheelspin ratio"),
            "ratio",
            "(v_wheel_rear - v_gps) / v_gps",
            0.065,
            0.038,
            0.110,
            higher_is_better=False,
        ),
        _m(
            "nascar_green_flag_speed_pct",
            "MOTORSPORTS",
            "pace",
            "NASCAR Total Green Flag Speed Percentile",
            "NASCAR_GFS",
            ("green flag speed", "nascar loop speed"),
            "percentile",
            "weighted_clean_green_lap_rank_pct",
            50.0,
            88.0,
            22.0,
        ),
        _m(
            "nascar_drafting_pack_prob",
            "MOTORSPORTS",
            "variance",
            "Superspeedway Drafting Pack Lead-Swap Entropy",
            "DraftPack",
            ("superspeedway draft", "daytona talladega variance"),
            "probability",
            "pack_density * tandem_push_rate",
            0.44,
            0.72,
            0.18,
            predictive_tier="TIER_2_SYNTHESIS",
        ),
        _m(
            "motorsport_qualifying_sector_variance_s",
            "MOTORSPORTS",
            "consistency",
            "Three-Sector Qualifying Variance",
            "Q_SectorSD",
            ("qualifying variance", "ideal lap minus actual lap"),
            "seconds",
            "actual_q3_lap - sum_best_microsectors",
            0.18,
            0.05,
            0.42,
            higher_is_better=False,
        ),
        _m(
            "f1_power_unit_thermal_derate_pct",
            "MOTORSPORTS",
            "powertrain",
            "High-Altitude Engine Cooling Derate",
            "PU_Derate",
            ("mexico city altitude derate", "thermal derating"),
            "ratio",
            "clip_power_loss / nominal_ice_kw",
            0.03,
            0.01,
            0.09,
            higher_is_better=False,
        ),
        # --- BOXING (18) ---
        _m(
            "boxing_jabs_landed_per_round",
            "BOXING",
            "striking",
            "Jabs Landed per Round",
            "Jabs/Rd",
            ("jabs landed", "compubox jabs per round"),
            "punches/rd",
            "total_jabs_connected / rounds_fought",
            5.8,
            9.5,
            3.2,
        ),
        _m(
            "boxing_power_punches_landed_pct",
            "BOXING",
            "striking",
            "Power Punch Connect Percentage",
            "PwrConnect%",
            ("power punch percentage", "compubox power connect"),
            "ratio",
            "power_punches_landed / power_punches_thrown",
            0.365,
            0.455,
            0.265,
        ),
        _m(
            "boxing_punch_deflection_pct",
            "BOXING",
            "defense",
            "Opponent Punch Deflection & Slip Rate",
            "Deflect%",
            ("defensive miss percentage", "slip and roll defense"),
            "ratio",
            "1 - opponent_total_connect_pct",
            0.735,
            0.835,
            0.630,
        ),
        _m(
            "boxing_guard_parry_rate",
            "BOXING",
            "defense",
            "High-Guard & Catch-and-Shoot Parry Efficiency",
            "ParryRate",
            ("guard parry", "clean shot prevention"),
            "ratio",
            "gloved_parries / opponent_lead_entries",
            0.31,
            0.46,
            0.18,
        ),
        _m(
            "boxing_ring_generalship_pressure_pct",
            "BOXING",
            "control",
            "Center-Ring Forward Footwork Dominance",
            "RingCtrl%",
            ("ring generalship", "front foot pressure"),
            "ratio",
            "center_circle_control_s / round_duration_s",
            0.50,
            0.68,
            0.32,
        ),
        _m(
            "boxing_knockdown_prob_per_round",
            "BOXING",
            "finish",
            "Per-Round Knockdown Hazard Rate",
            "KD_Prob/Rd",
            ("knockdown probability", "round finish hazard"),
            "probability",
            "hazard_rate(power_clean_per_min, opp_chin_absorption)",
            0.038,
            0.095,
            0.010,
        ),
        _m(
            "boxing_counter_punch_connect_pct",
            "BOXING",
            "striking",
            "Counter-Punch Connect Rate",
            "Counter%",
            ("counterpunch rate", "reactive counter accuracy"),
            "ratio",
            "counter_landed / counter_attempts",
            0.41,
            0.54,
            0.28,
        ),
        _m(
            "boxing_body_shot_attrition_share",
            "BOXING",
            "tactics",
            "Body Punch Target Share",
            "BodyShare",
            ("body shot ratio", "body attack attrition"),
            "ratio",
            "body_punches_landed / total_power_landed",
            0.27,
            0.38,
            0.15,
        ),
        _m(
            "boxing_clinch_control_sec_per_round",
            "BOXING",
            "control",
            "In-Fighting Clinch Control Time",
            "ClinchSec",
            ("clinch time", "inside tie up control"),
            "s/rd",
            "clinch_neutralization_seconds / rounds_fought",
            14.0,
            26.0,
            4.0,
        ),
        _m(
            "boxing_cardio_output_decay_r8_r12",
            "BOXING",
            "conditioning",
            "Championship Rounds Output Decay Ratio",
            "CardioRatio",
            ("championship rounds cardio", "late output retention"),
            "ratio",
            "punches_thrown_r8_12 / punches_thrown_r1_4",
            0.94,
            1.12,
            0.74,
        ),
        _m(
            "boxing_southpaw_open_stance_edge",
            "BOXING",
            "matchup",
            "Open-Stance Lead-Foot & Straight-Left Edge",
            "OpenStance+",
            ("southpaw vs orthodox", "stance matchup delta"),
            "margin",
            "clean_power_diff_open_vs_closed_stance",
            0.0,
            0.075,
            -0.060,
        ),
        _m(
            "boxing_chin_durability_absorption_idx",
            "BOXING",
            "durability",
            "Career Clean-Headshot Absorption Resilience",
            "ChinIdx",
            ("chin durability", "knockdown resistance"),
            "index",
            "inverse_decay(career_knockdowns, clean_shots_absorbed)",
            1.00,
            1.35,
            0.65,
        ),
        _m(
            "boxing_reach_leverage_diff_in",
            "BOXING",
            "anthropometry",
            "Reach Differential in Inches",
            "ReachDiff_in",
            ("reach advantage", "wingspan differential"),
            "inches",
            "fighter_reach_in - opponent_reach_in",
            0.0,
            3.5,
            -3.5,
        ),
        _m(
            "boxing_judges_swing_round_variance",
            "BOXING",
            "scoring",
            "Ten-Point Must Judges Swing-Round Variance",
            "JudgeSD",
            ("scorecard variance", "split decision risk"),
            "points",
            "sd_of_3_official_cards_across_close_rounds",
            2.1,
            1.0,
            3.8,
            higher_is_better=False,
        ),
        _m(
            "boxing_cut_stoppage_vulnerability_idx",
            "BOXING",
            "medical",
            "Periorbital Laceration Stoppage Risk",
            "CutRiskIdx",
            ("cut risk", "eye swelling tko"),
            "index",
            "historical_tko_doctor_stoppage_scar_rate",
            0.04,
            0.01,
            0.14,
            higher_is_better=False,
        ),
        _m(
            "boxing_corner_recovery_hr_drop_bpm",
            "BOXING",
            "conditioning",
            "60-Second Between-Round Heart-Rate Recovery",
            "HR_Drop60",
            ("corner recovery", "heart rate drop"),
            "bpm",
            "hr_bell_end - hr_60s_stool",
            28.0,
            38.0,
            17.0,
        ),
        _m(
            "boxing_feint_reaction_latency_ms",
            "BOXING",
            "tactics",
            "High-Guard Feint Bait Success Rate",
            "FeintSucc",
            ("feint draw", "guard reaction bait"),
            "ratio",
            "clean_followups_after_feint / feints_thrown",
            0.22,
            0.35,
            0.12,
        ),
        _m(
            "boxing_championship_rounds_output_ratio",
            "BOXING",
            "conditioning",
            "Rounds 10-12 Landed Differential",
            "ChampRdDiff",
            ("rounds 10 to 12 differential", "late round surge"),
            "punches/rd",
            "landed_r10_12 - opp_landed_r10_12",
            0.0,
            5.5,
            -4.5,
        ),
        # --- ESPORTS (18) ---
        _m(
            "esports_kast_pct",
            "ESPORTS",
            "consistency",
            "KAST Kill-Assist-Survived-Traded Percentage",
            "KAST%",
            ("kast", "round impact consistency"),
            "ratio",
            "rounds_with_kill_assist_survival_or_trade / rounds_played",
            0.715,
            0.775,
            0.640,
        ),
        _m(
            "esports_adr_damage_per_round",
            "ESPORTS",
            "firepower",
            "Average Damage per Round",
            "ADR",
            ("average damage per round", "cs2 adr"),
            "hp/rd",
            "total_health_damage / rounds_played",
            74.5,
            87.0,
            61.0,
        ),
        _m(
            "esports_hltv_rating_2_1",
            "ESPORTS",
            "composite",
            "Composite Tactical FPS Player Rating",
            "Rating2.1",
            ("hltv rating", "player impact rating"),
            "index",
            "weighted_composite(KPR, DPR, KAST, Impact, ADR)",
            1.02,
            1.22,
            0.84,
        ),
        _m(
            "esports_opening_duel_win_pct",
            "ESPORTS",
            "entry",
            "First-Kill Opening Duel Win Rate",
            "FK_Win%",
            ("opening duel", "first kill win rate"),
            "ratio",
            "opening_kills / opening_attempts",
            0.50,
            0.58,
            0.42,
        ),
        _m(
            "esports_clutch_1vx_win_pct",
            "ESPORTS",
            "clutch",
            "1vX Post-Plant / Solo Clutch Conversion Rate",
            "Clutch%",
            ("clutch percentage", "1vx conversion"),
            "ratio",
            "clutches_won / clutch_situations_entered",
            0.18,
            0.28,
            0.10,
        ),
        _m(
            "esports_flash_assist_per_round",
            "ESPORTS",
            "utility",
            "Flashbang Blind Assists per Round",
            "FlashAst/Rd",
            ("flash assists", "tactical utility setup"),
            "assists/rd",
            "teammate_kills_on_flashed_opponents / rounds",
            0.055,
            0.095,
            0.025,
        ),
        _m(
            "esports_utility_damage_per_round",
            "ESPORTS",
            "utility",
            "HE Grenade & Molotov Utility Damage",
            "UD/Rd",
            ("utility damage", "grenade damage per round"),
            "hp/rd",
            "(he_dmg + molotov_dmg) / rounds_played",
            5.2,
            8.0,
            2.8,
        ),
        _m(
            "esports_eco_round_conversion_pct",
            "ESPORTS",
            "economy",
            "Full-Save / Force-Buy Upset Win Rate",
            "EcoConv%",
            ("force buy win rate", "eco conversion"),
            "ratio",
            "eco_rounds_won / eco_rounds_played",
            0.16,
            0.25,
            0.08,
        ),
        _m(
            "esports_trade_kill_efficiency_pct",
            "ESPORTS",
            "coordination",
            "Teammate Death Refrag Within 3 Seconds Rate",
            "Trade%",
            ("trade kill efficiency", "refrag rate"),
            "ratio",
            "deaths_traded_within_3s / total_team_deaths",
            0.22,
            0.29,
            0.15,
        ),
        _m(
            "esports_gold_diff_at_15",
            "ESPORTS",
            "moba_laning",
            "League Gold Differential at 15 Minutes",
            "GD@15",
            ("gold diff at 15", "gd15 laning lead"),
            "gold",
            "team_gold_15m - opponent_gold_15m",
            0.0,
            1850.0,
            -1600.0,
        ),
        _m(
            "esports_cs_per_min_diff",
            "ESPORTS",
            "moba_laning",
            "Creep Score per Minute Laning Differential",
            "CSD/min",
            ("cs per min diff", "wave management lead"),
            "cs/min",
            "player_cspm - lane_opponent_cspm",
            0.0,
            1.1,
            -1.0,
        ),
        _m(
            "esports_first_blood_participation_pct",
            "ESPORTS",
            "moba_early",
            "First Blood Team Participation Rate",
            "FB%",
            ("first blood rate", "early map skirmish"),
            "ratio",
            "games_with_team_first_blood / games_played",
            0.50,
            0.64,
            0.36,
        ),
        _m(
            "esports_objective_neutral_setup_rate",
            "ESPORTS",
            "macro",
            "Dragon / Baron / Objective Control Rate",
            "ObjCtrl%",
            ("dragon control", "neutral objective setup"),
            "ratio",
            "major_neutral_objectives_secured / total_spawned",
            0.50,
            0.63,
            0.37,
        ),
        _m(
            "esports_vision_score_per_min",
            "ESPORTS",
            "macro",
            "Fog-of-War Ward Control Score per Minute",
            "VS/min",
            ("vision score", "ward clear efficiency"),
            "score/min",
            "(wards_placed_value + wards_cleared_value) / game_minutes",
            1.65,
            2.25,
            1.10,
        ),
        _m(
            "esports_map_veto_delta_elo",
            "ESPORTS",
            "draft",
            "Pick/Ban Map Pool Elo Differential",
            "MapVetoElo",
            ("map veto edge", "cs2 map pool elo"),
            "elo_pts",
            "map_specific_elo(pick) - baseline_series_elo",
            0.0,
            85.0,
            -85.0,
        ),
        _m(
            "esports_pistol_round_win_pct",
            "ESPORTS",
            "economy",
            "Pistol Round Win Rate",
            "Pistol%",
            ("pistol win rate", "opening half economy"),
            "ratio",
            "pistol_rounds_won / total_pistol_rounds",
            0.50,
            0.62,
            0.38,
        ),
        _m(
            "esports_save_economy_discipline_pct",
            "ESPORTS",
            "economy",
            "Correct Retake-vs-Save Retention Index",
            "SaveEcon%",
            ("weapon save discipline", "round carry over"),
            "ratio",
            "rifles_saved_in_unwinnable_postplants / attempts",
            0.64,
            0.80,
            0.45,
        ),
        _m(
            "esports_side_bias_ct_win_delta",
            "ESPORTS",
            "map_balance",
            "Defensive Half Expected Round Share Delta",
            "CT_SideDelta",
            ("ct side bias", "defensive map win delta"),
            "ratio",
            "team_ct_win_pct - map_baseline_ct_win_pct",
            0.0,
            0.09,
            -0.08,
        ),
        # --- CRICKET_RUGBY (18) ---
        _m(
            "cricket_batting_strike_rate",
            "CRICKET_RUGBY",
            "batting",
            "Runs Scored per 100 Balls Faced",
            "Bat_SR",
            ("batting strike rate", "runs per 100 balls"),
            "runs/100b",
            "100 * runs_scored / legal_balls_faced",
            134.0,
            162.0,
            112.0,
        ),
        _m(
            "cricket_economy_rate_rpo",
            "CRICKET_RUGBY",
            "bowling",
            "Bowling Runs Conceded per Over",
            "EconRate",
            ("bowling economy", "runs per over"),
            "runs/over",
            "runs_conceded / overs_bowled",
            7.85,
            6.20,
            9.60,
            higher_is_better=False,
        ),
        _m(
            "cricket_net_run_rate",
            "CRICKET_RUGBY",
            "composite",
            "Match-Adjusted Net Run Rate Differential",
            "NRR",
            ("net run rate", "tournament run rate"),
            "runs/over",
            "(runs_for / overs_faced) - (runs_against / overs_bowled)",
            0.0,
            0.95,
            -0.85,
        ),
        _m(
            "cricket_true_batting_average",
            "CRICKET_RUGBY",
            "batting",
            "Runs per Dismissal Batting Average",
            "BatAvg",
            ("batting average", "runs per dismissal"),
            "runs",
            "total_runs / total_dismissals",
            31.5,
            46.0,
            20.0,
        ),
        _m(
            "cricket_wickets_in_hand_dls_pct",
            "CRICKET_RUGBY",
            "chase_resources",
            "DLS Remaining Resources Index",
            "DLS_Res%",
            ("wickets in hand", "dls resources remaining"),
            "ratio",
            "dls_resource_table(overs_remaining, wickets_lost)",
            0.55,
            0.78,
            0.28,
        ),
        _m(
            "cricket_powerplay_boundary_pct",
            "CRICKET_RUGBY",
            "batting",
            "Overs 1-6 Powerplay Boundary Share",
            "PP_Bnd%",
            ("powerplay boundaries", "fours and sixes rate"),
            "ratio",
            "boundary_runs_pp / balls_faced_pp",
            0.54,
            0.68,
            0.38,
        ),
        _m(
            "cricket_death_overs_yorker_pct",
            "CRICKET_RUGBY",
            "bowling",
            "Death Overs (16-20) Wide-Yorker Execution Rate",
            "DeathExec%",
            ("death bowling execution", "yorker length accuracy"),
            "ratio",
            "yorker_or_slow_bouncer_dots_and_singles / death_balls",
            0.46,
            0.62,
            0.31,
        ),
        _m(
            "cricket_expected_runs_above_par",
            "CRICKET_RUGBY",
            "pitch_adjusted",
            "Venue & Phase Adjusted Runs Above Par",
            "xRuns+",
            ("runs above par", "cricviz expected runs"),
            "runs",
            "actual_runs - xRuns_pitch_line_length_model",
            0.0,
            18.0,
            -15.0,
        ),
        _m(
            "cricket_bowling_dot_ball_pct",
            "CRICKET_RUGBY",
            "bowling",
            "Zero-Run Dot Ball Pressure Percentage",
            "Dot%",
            ("dot ball percentage", "scoring suppression"),
            "ratio",
            "dot_balls_bowled / legal_balls_bowled",
            0.38,
            0.49,
            0.27,
        ),
        _m(
            "rugby_gainline_success_pct",
            "CRICKET_RUGBY",
            "carry",
            "Gainline Advantage Carry Success Rate",
            "Gainline%",
            ("gainline success", "front foot carry rate"),
            "ratio",
            "carries_crossing_gainline / total_carries",
            0.54,
            0.64,
            0.42,
        ),
        _m(
            "rugby_ruck_speed_sec",
            "CRICKET_RUGBY",
            "breakdown",
            "Average Ruck Recycling Speed",
            "RuckSpeed_s",
            ("ruck speed", "quick ball recycle time"),
            "seconds",
            "mean(scrumhalf_pass_t - tackle_completion_t)",
            3.35,
            2.65,
            4.20,
            higher_is_better=False,
        ),
        _m(
            "rugby_breakdown_steal_turnovers",
            "CRICKET_RUGBY",
            "breakdown",
            "Defensive Jackal & Counter-Ruck Steals per 80 Min",
            "JackalSteals",
            ("breakdown turnovers", "ruck steals per game"),
            "steals/80m",
            "breakdown_turnovers_won * (80 / team_minutes)",
            4.2,
            7.0,
            1.8,
        ),
        _m(
            "rugby_lineout_throw_success_pct",
            "CRICKET_RUGBY",
            "set_piece",
            "Own-Throw Lineout Retention Percentage",
            "Lineout%",
            ("lineout win rate", "set piece lineout retention"),
            "ratio",
            "own_lineouts_won / own_lineouts_thrown",
            0.865,
            0.935,
            0.780,
        ),
        _m(
            "rugby_scrum_penalty_conceded_rate",
            "CRICKET_RUGBY",
            "set_piece",
            "Scrum Penalty Win Differential Rate",
            "ScrumPenDiff",
            ("scrum dominance", "scrum penalty ratio"),
            "pen/game",
            "scrum_penalties_won - scrum_penalties_conceded",
            0.0,
            2.2,
            -2.0,
        ),
        _m(
            "rugby_metres_after_contact",
            "CRICKET_RUGBY",
            "carry",
            "Post-Contact Carry Metres per Carry",
            "PostContact_m",
            ("metres after contact", "collision dominance"),
            "m/carry",
            "total_post_contact_metres / total_carries",
            2.1,
            2.9,
            1.4,
        ),
        _m(
            "rugby_tackle_completion_pct",
            "CRICKET_RUGBY",
            "defense",
            "Defensive Dominant & Made Tackle Percentage",
            "Tackle%",
            ("tackle completion", "rugby defensive rate"),
            "ratio",
            "tackles_made / (tackles_made + tackles_missed)",
            0.855,
            0.910,
            0.785,
        ),
        _m(
            "rugby_kicking_exit_territory_m",
            "CRICKET_RUGBY",
            "territory",
            "Net Territory Gain per Exit Box/Touch Kick",
            "ExitKick_m",
            ("exit territory metres", "touch finding efficiency"),
            "metres",
            "net_metres_gained_from_22m_exit_kicks",
            31.5,
            39.0,
            24.0,
        ),
        _m(
            "rugby_phase_play_try_prob",
            "CRICKET_RUGBY",
            "scoring",
            "Red-22 Multi-Phase Try Conversion Probability",
            "22mTryProb",
            ("22 metre efficiency", "try scoring probability"),
            "probability",
            "tries_scored / entries_inside_opp_22",
            0.29,
            0.44,
            0.18,
        ),
    ]
    return tuple(rows)


WAVE41_14SPORT_EXTENSION_METRICS: tuple[SportMetricSpec, ...] = _build_wave41_extension_metrics()
UNIVERSAL_14SPORT_METRICS_REGISTRY: tuple[SportMetricSpec, ...] = (
    UNIVERSAL_SPORTS_METRICS_REGISTRY + WAVE41_14SPORT_EXTENSION_METRICS
)

WAVE41_MULTISPORT_RLVR_TRAJECTORIES: tuple[dict[str, Any], ...] = (
    {
        "record_id": "w41_14sport_356_metrics_f1_boxing_esports_cricket_00",
        "domain": "wave41_14sport_universal_encyclopedia",
        "prompt": (
            "Expand the universal multi-sport encyclopedia from 284 metrics / 10 sports to "
            "356 canonical metrics across 14 sports by adding MOTORSPORTS, BOXING, ESPORTS, and "
            "CRICKET_RUGBY while keeping the 10-sport Wave 40 base tuple immutable. Return JSON."
        ),
        "think": (
            "Appending 72 new SportMetricSpec metrics (18 per new sport) into "
            "WAVE41_14SPORT_EXTENSION_METRICS yields 356 total metrics across 14 sports without "
            "mutating Wave 40's 284-metric / 10-sport invariant."
        ),
    },
    {
        "record_id": "w41_f1_fuel_corrected_stint_deg_and_undercut_00",
        "domain": "wave41_f1_pit_strategy_undercut",
        "prompt": (
            "Compute Formula 1 fuel-burn pace correction, quadratic tire cliff degradation "
            "across Soft/Medium/Hard compounds, optimal pit lap, and net undercut gain with "
            "traffic penalty. Return JSON."
        ),
        "think": (
            "Separating the 0.033 s/kg fuel burn pace gain per lap from convex tire cliff wear "
            "reveals optimal undercut windows whenever fresh-rubber outlap gains exceed dirty-air "
            "traffic rejoin penalties."
        ),
    },
    {
        "record_id": "w41_nba_pra_negbin_student_t_copula_propsim_00",
        "domain": "wave41_nba_pra_negbin_copula_propsim",
        "prompt": (
            "Simulate NBA Points + Rebounds + Assists (PRA) props using overdispersed Negative "
            "Binomial marginals coupled by a deterministic Student-t copula (df=5) with positive "
            "PTS-AST correlation over 6,000 draws. Return JSON."
        ),
        "think": (
            "Overdispersed Negative Binomial counts (Var > mean) combined with a heavy-tailed "
            "df=5 Student-t copula preserve upper-tail usage correlation between scoring and "
            "playmaking without Gaussian shortcuts."
        ),
    },
)


def query_14sport_universal_metric(
    query: str,
    *,
    sport: str | None = None,
    repo_root: Path | None = None,
) -> dict[str, Any]:
    """Resolve any 14-sport / 356-metric query to its formula, tier, and baseline."""
    vault, is_fb = _load_universal_vault(repo_root)
    q_norm = _norm_txt(query)
    q_tokens = set(q_norm.split())
    sport_u = sport.strip().upper() if sport else None

    best_score = -1.0
    best_spec: SportMetricSpec | None = None
    candidates: list[tuple[float, SportMetricSpec]] = []

    for spec in UNIVERSAL_14SPORT_METRICS_REGISTRY:
        if sport_u is not None and spec.sport != sport_u:
            continue
        id_n = _norm_txt(spec.metric_id)
        sym_n = _norm_txt(spec.symbol)
        dn_n = _norm_txt(spec.display_name)
        al_norms = [_norm_txt(a) for a in spec.aliases]

        score = 0.0
        if q_norm in (id_n, sym_n, dn_n) or q_norm in al_norms:
            score = 100.0
        else:
            if q_norm and any(q_norm in txt for txt in (id_n, sym_n, dn_n, *al_norms)):
                score += 40.0
            all_words = set(id_n.split()) | set(sym_n.split()) | set(dn_n.split())
            for al in al_norms:
                all_words |= set(al.split())
            overlap = len(q_tokens & all_words)
            if overlap > 0:
                score += 12.0 * float(overlap) / max(1.0, float(len(q_tokens)))
                score += 2.0 * float(overlap)

        if score > 0.0:
            candidates.append((score, spec))
            if score > best_score:
                best_score = score
                best_spec = spec

    candidates.sort(key=lambda item: item[0], reverse=True)
    resolved = best_spec or UNIVERSAL_14SPORT_METRICS_REGISTRY[0]
    sports_n = len({s.sport for s in UNIVERSAL_14SPORT_METRICS_REGISTRY})

    return {
        "schema": "wave41_14sport_universal_metric_lookup_v1",
        "query": str(query),
        "found": best_spec is not None,
        "match_score": round(max(0.0, best_score), 3),
        "metric_id": resolved.metric_id,
        "sport": resolved.sport,
        "category": resolved.category,
        "display_name": resolved.display_name,
        "symbol": resolved.symbol,
        "aliases": list(resolved.aliases),
        "unit": resolved.unit,
        "formula_ascii": resolved.formula_ascii,
        "league_baseline": resolved.league_baseline,
        "elite_threshold": resolved.elite_threshold,
        "poor_threshold": resolved.poor_threshold,
        "higher_is_better": resolved.higher_is_better,
        "predictive_tier": resolved.predictive_tier,
        "total_registry_metrics": len(UNIVERSAL_14SPORT_METRICS_REGISTRY),
        "sports_covered_count": sports_n,
        "top_matches": [
            {"metric_id": s.metric_id, "sport": s.sport, "symbol": s.symbol, "score": round(sc, 2)}
            for sc, s in candidates[:5]
        ],
        "vault_loaded": bool(vault and not is_fb),
        "clean_checkout_fallback": is_fb,
    }


def evaluate_f1_stint_degradation_and_undercut_window(
    *,
    base_pace_s: float = 92.4,
    compound: str = "MEDIUM",
    stint_lap: int = 26,
    fuel_burn_kg_per_lap: float = 1.65,
    fuel_effect_s_per_kg: float = 0.033,
    pit_lane_loss_s: float = 21.5,
    traffic_rejoin_penalty_s: float = 0.45,
    car_ahead_deg_s: float = 0.24,
    gap_ahead_s: float = 1.6,
) -> dict[str, Any]:
    """Compute F1 fuel-corrected stint degradation curve and net pit undercut probability."""
    prof = _COMPOUND_PROFILES.get(compound.strip().upper(), _COMPOUND_PROFILES["MEDIUM"])
    fuel_gain_per_lap = float(fuel_burn_kg_per_lap) * float(fuel_effect_s_per_kg)

    def _wear_delta_at_age(age: int) -> float:
        ov = max(0.0, float(age) - prof["cliff_lap"])
        return prof["linear_deg"] * float(age) + prof["cliff_quad"] * (ov * ov)

    fuel_correction_s = fuel_gain_per_lap * float(stint_lap)
    lap_base = float(base_pace_s) - prof["grip_gain_s"] - fuel_correction_s
    cur_pace = lap_base + _wear_delta_at_age(stint_lap)
    fresh_out_pace = lap_base + _wear_delta_at_age(2)
    two_lap_undercut_gross = 2.0 * (cur_pace - fresh_out_pace + float(car_ahead_deg_s))
    net_undercut_gain = two_lap_undercut_gross - float(traffic_rejoin_penalty_s)
    margin_vs_gap = net_undercut_gain - float(gap_ahead_s)
    undercut_prob = 1.0 / (1.0 + math.exp(-max(-20.0, min(20.0, margin_vs_gap / 0.45))))

    # Optimal stint pit lap minimizing cumulative pit-amortized pace loss across 5..35
    best_lap = 5
    best_obj = 1.0e9
    for lap_c in range(5, 36):
        ov_c = max(0.0, float(lap_c) - prof["cliff_lap"])
        deg_pen = 0.5 * prof["linear_deg"] * float(lap_c) + (prof["cliff_quad"] / 3.0) * (ov_c**3)
        amort_pit = float(pit_lane_loss_s) / float(lap_c)
        obj = deg_pen + amort_pit - 0.5 * fuel_gain_per_lap * float(lap_c)
        if obj < best_obj:
            best_obj = obj
            best_lap = lap_c

    return {
        "schema": "wave41_f1_stint_degradation_undercut_v1",
        "compound": compound.strip().upper(),
        "stint_lap": int(stint_lap),
        "fuel_gain_per_lap_s": round(fuel_gain_per_lap, 5),
        "fuel_corrected_cur_lap_s": round(cur_pace, 4),
        "fresh_rubber_lap_s": round(fresh_out_pace, 4),
        "pit_lane_loss_s": float(pit_lane_loss_s),
        "traffic_rejoin_penalty_s": float(traffic_rejoin_penalty_s),
        "net_undercut_gain_s": round(net_undercut_gain, 4),
        "undercut_overtake_prob": round(undercut_prob, 4),
        "optimal_stint_pit_lap": int(best_lap),
        "real_money_stake_cleared": REAL_MONEY_STAKE_CLEARED,
        "live_stake_fraction": LIVE_STAKE_FRACTION,
    }


def evaluate_nba_pra_negbin_copula_propsim(
    *,
    pts_mu: float = 26.5,
    reb_mu: float = 7.4,
    ast_mu: float = 7.1,
    k_pts: float = 14.0,
    k_reb: float = 8.5,
    k_ast: float = 7.5,
    corr_pts_ast: float = 0.34,
    corr_pts_reb: float = 0.16,
    corr_reb_ast: float = 0.22,
    pra_line: float = 40.5,
    copula_df: int = 5,
    n_sims: int = 6000,
    seed: int = 4107,
) -> dict[str, Any]:
    """Simulate NBA PRA prop via overdispersed NegBin marginals & Student-t copula (df=5)."""
    df = max(3, int(copula_df))
    sims = max(1000, int(n_sims))
    rng = np.random.default_rng(int(seed))

    corr = np.array(
        [
            [1.0, float(corr_pts_reb), float(corr_pts_ast)],
            [float(corr_pts_reb), 1.0, float(corr_reb_ast)],
            [float(corr_pts_ast), float(corr_reb_ast), 1.0],
        ],
        dtype=float,
    )
    chol = np.linalg.cholesky(corr)
    z = rng.standard_normal((sims, 3)) @ chol.T
    chi2_draws = rng.chisquare(df, size=sims)[:, None]
    t_draws = z * np.sqrt(float(df) / chi2_draws)
    u = np.clip(student_t.cdf(t_draws, df=df), 1e-6, 1.0 - 1e-6)

    def _nb_sample(u_col: np.ndarray, mu: float, k: float) -> np.ndarray:
        p = float(k) / (float(k) + max(0.1, float(mu)))
        return np.asarray(nbinom.ppf(u_col, float(k), p), dtype=float)

    pts = _nb_sample(u[:, 0], pts_mu, k_pts)
    reb = _nb_sample(u[:, 1], reb_mu, k_reb)
    ast = _nb_sample(u[:, 2], ast_mu, k_ast)
    pra = pts + reb + ast

    p_over = float(np.mean(pra > float(pra_line)))
    var_indep = (
        pts_mu + (pts_mu**2) / k_pts + reb_mu + (reb_mu**2) / k_reb + ast_mu + (ast_mu**2) / k_ast
    )
    mu_tot = pts_mu + reb_mu + ast_mu
    z_indep = (float(pra_line) + 0.5 - mu_tot) / math.sqrt(max(1.0, var_indep))
    p_over_indep_norm = 0.5 * math.erfc(z_indep / math.sqrt(2.0))

    emp_corr_pa = float(np.corrcoef(pts, ast)[0, 1])
    var_overdisp_pts = float(np.var(pts, ddof=1)) / max(1e-6, float(np.mean(pts)))

    return {
        "schema": "wave41_nba_pra_negbin_student_t_copula_v1",
        "copula_family": "student_t_df5_negbin",
        "copula_df": df,
        "n_sims": sims,
        "pra_line": float(pra_line),
        "pra_mean": round(float(np.mean(pra)), 3),
        "pra_sd": round(float(np.std(pra, ddof=1)), 3),
        "p_over_copula": round(p_over, 4),
        "p_over_indep_gaussian": round(p_over_indep_norm, 4),
        "empirical_corr_pts_ast": round(emp_corr_pa, 4),
        "pts_variance_to_mean_ratio": round(var_overdisp_pts, 4),
        "pts_q50_q90": [
            round(float(np.quantile(pts, 0.50)), 2),
            round(float(np.quantile(pts, 0.90)), 2),
        ],
        "reb_q50_q90": [
            round(float(np.quantile(reb, 0.50)), 2),
            round(float(np.quantile(reb, 0.90)), 2),
        ],
        "ast_q50_q90": [
            round(float(np.quantile(ast, 0.50)), 2),
            round(float(np.quantile(ast, 0.90)), 2),
        ],
        "real_money_stake_cleared": REAL_MONEY_STAKE_CLEARED,
        "live_stake_fraction": LIVE_STAKE_FRACTION,
    }


def evaluate_wave41_14sport_and_copula_propsim_suite(
    repo_root: Path | None = None,
) -> dict[str, Any]:
    """Run Wave 41 14-sport / 356-metric encyclopedia, F1 undercut & NBA PRA NegBin copula suite."""
    root = Path(repo_root).resolve() if repo_root is not None else REPO_ROOT
    ck = str(root)
    if ck in _SUITE41_MS_CACHE:
        return _SUITE41_MS_CACHE[ck]

    _, is_fb = _load_universal_vault(root)
    sports_counts: dict[str, int] = {}
    for spec in UNIVERSAL_14SPORT_METRICS_REGISTRY:
        sports_counts[spec.sport] = sports_counts.get(spec.sport, 0) + 1

    f1 = evaluate_f1_stint_degradation_and_undercut_window()
    nba_pra = evaluate_nba_pra_negbin_copula_propsim()
    probe_queries = {
        "motorsports_undercut": query_14sport_universal_metric(
            "undercut delta", sport="MOTORSPORTS", repo_root=root
        )["metric_id"],
        "boxing_jabs": query_14sport_universal_metric(
            "jabs landed", sport="BOXING", repo_root=root
        )["metric_id"],
        "esports_kast": query_14sport_universal_metric(
            "kast", sport="ESPORTS", repo_root=root
        )["metric_id"],
        "cricket_nrr": query_14sport_universal_metric(
            "net run rate", sport="CRICKET_RUGBY", repo_root=root
        )["metric_id"],
        "rugby_ruck": query_14sport_universal_metric(
            "ruck speed", sport="CRICKET_RUGBY", repo_root=root
        )["metric_id"],
    }

    out: dict[str, Any] = {
        "schema": "wave41_14sport_and_copula_propsim_suite_v1",
        "wired": True,
        "clean_checkout_fallback": is_fb,
        "total_canonical_metrics": len(UNIVERSAL_14SPORT_METRICS_REGISTRY),
        "wave40_base_metrics_preserved": len(UNIVERSAL_SPORTS_METRICS_REGISTRY),
        "wave41_extension_metrics": len(WAVE41_14SPORT_EXTENSION_METRICS),
        "sports_covered_count": len(sports_counts),
        "sports_metric_counts": sports_counts,
        "new_sport_probe_resolutions": probe_queries,
        "f1_stint_undercut": f1,
        "nba_pra_negbin_copula": nba_pra,
        "real_money_stake_cleared": REAL_MONEY_STAKE_CLEARED,
        "live_stake_fraction": LIVE_STAKE_FRACTION,
    }
    blob = json.dumps(out, indent=2, ensure_ascii=True)
    out["suite_sha256"] = hashlib.sha256(blob.encode("ascii")).hexdigest()
    _SUITE41_MS_CACHE[ck] = out
    return out
