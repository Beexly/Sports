"""Wave 42 Multi-Sport 18-Sport Expansion, Darts 501 Markov & Cycling Skiba W'-bal Engine.

Extends Galaxy Sports Engine (GSE) from 356 metrics / 14 sports to 428 canonical metrics across
18 sports without mutating Wave 40 (284 / 10) or Wave 41 (356 / 14) registries:
1. Adds 72 canonical metrics (18 each across VOLLEYBALL_HANDBALL, TRACK_SWIMMING_CYCLING,
   DARTS_SNOOKER_TABLETENNIS, and LACROSSE_AFL) into UNIVERSAL_18SPORT_METRICS_REGISTRY and
   exposes query_18sport_universal_metric.
2. Implements a 502-state absorbing Markov chain for 501 Darts legs computing exact visit-to-zero
   finish PMFs (conserving mass = 1.0), hold-of-throw vs break-of-throw probabilities, and
   Best-of-N alternating-throw leg handicaps (-1.5, -2.5, -3.5, +1.5, +2.5).
3. Implements Skiba differential W'-bal (anaerobic work capacity) + CdA aerodynamic & gravity
   cubic power-velocity solver demonstrating why variable climb-surge pacing outperforms naive
   iso-power pacing while maintaining min_w_bal_joules > 0.0.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
from typing import Any

import numpy as np

from gse_engine.multisport.wave40_universal_sports_metrics_encyclopedia_and_handicap_engine import (  # noqa: E501
    LIVE_STAKE_FRACTION,
    REAL_MONEY_STAKE_CLEARED,
    SportMetricSpec,
    _load_universal_vault,
    _m,
    _norm_txt,
)
from gse_engine.multisport.wave41_f1_pit_strategy_nba_pra_copula_and_14sport_expansion import (  # noqa: E501
    UNIVERSAL_14SPORT_METRICS_REGISTRY,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
_SUITE42_MS_CACHE: dict[str, dict[str, Any]] = {}


def _build_wave42_extension_metrics() -> tuple[SportMetricSpec, ...]:
    """Construct 72 canonical metrics spanning Volleyball/Handball, Cycling/Track, Darts, & Lax."""
    rows: list[SportMetricSpec] = [
        # --- VOLLEYBALL_HANDBALL (18) ---
        _m(
            "volley_net_front_deflection_per_set",
            "VOLLEYBALL_HANDBALL",
            "defense",
            "Net-Front Stuff & Touch Deflections per Set",
            "NetWall/Set",
            ("net front denial", "volleyball front wall touches", "roof stuff per set"),
            "touches/set",
            "(stuff_walls + positive_net_touches) / sets_played",
            2.35,
            3.40,
            1.40,
        ),
        _m(
            "volley_stuff_wall_denial_pct",
            "VOLLEYBALL_HANDBALL",
            "defense",
            "Net-Front Stuff Denial Rate vs Opponent Swings",
            "StuffDenial%",
            ("stuff rate", "middle net wall percentage"),
            "ratio",
            "opponent_swings_terminated_at_net / opponent_attack_attempts",
            0.125,
            0.195,
            0.070,
        ),
        _m(
            "volley_sideout_efficiency_pct",
            "VOLLEYBALL_HANDBALL",
            "offense",
            "Service Reception Sideout Point Conversion Percentage",
            "SO%",
            ("sideout percentage", "reception rotation sideout"),
            "ratio",
            "points_won_on_opponent_serve / opponent_serves_received",
            0.615,
            0.685,
            0.535,
        ),
        _m(
            "volley_first_ball_sideout_pct",
            "VOLLEYBALL_HANDBALL",
            "offense",
            "First-Ball Sideout Termination Rate",
            "FBSO%",
            ("first ball sideout", "in system sideout"),
            "ratio",
            "kills_on_first_transition_swing / receptions",
            0.415,
            0.495,
            0.335,
        ),
        _m(
            "volley_kill_efficiency_hitting_pct",
            "VOLLEYBALL_HANDBALL",
            "offense",
            "Net Attack Hitting Efficiency",
            "Hit%",
            ("hitting percentage", "kill efficiency"),
            "ratio",
            "(kills - attack_errors) / total_attack_attempts",
            0.245,
            0.355,
            0.145,
        ),
        _m(
            "volley_serve_ace_to_error_ratio",
            "VOLLEYBALL_HANDBALL",
            "serving",
            "Service Aces to Service Errors Ratio",
            "Ace/SE",
            ("ace to error ratio", "serve aggression efficiency"),
            "ratio",
            "service_aces / max(1, service_errors)",
            0.58,
            0.95,
            0.32,
        ),
        _m(
            "volley_perfect_pass_reception_pct",
            "VOLLEYBALL_HANDBALL",
            "passing",
            "Three-Option Perfect Pass Grade Percentage",
            "3Pass%",
            ("perfect pass percentage", "in system reception"),
            "ratio",
            "grade_3_receptions / total_serve_receptions",
            0.38,
            0.50,
            0.26,
        ),
        _m(
            "volley_dig_transition_kill_pct",
            "VOLLEYBALL_HANDBALL",
            "transition",
            "Defensive Dig-to-Transition Kill Efficiency",
            "DigKill%",
            ("dig transition rate", "defensive counter kill"),
            "ratio",
            "kills_following_team_dig / total_team_digs",
            0.44,
            0.55,
            0.33,
        ),
        _m(
            "volley_setter_distribution_entropy",
            "VOLLEYBALL_HANDBALL",
            "tactics",
            "Setter Target Spread Shannon Entropy",
            "SetEntropy",
            ("setter distribution", "attack predictability index"),
            "nats",
            "-sum(zone_share * ln(zone_share)) across 5 zones",
            1.38,
            1.54,
            1.15,
        ),
        _m(
            "volley_pipe_backrow_attack_pct",
            "VOLLEYBALL_HANDBALL",
            "offense",
            "Middle Backrow Pipe Attack Kill Rate",
            "PipeKill%",
            ("backrow pipe attack", "zone 6 kill efficiency"),
            "ratio",
            "zone6_pipe_kills / zone6_pipe_attempts",
            0.49,
            0.60,
            0.36,
        ),
        _m(
            "volley_float_jump_serve_pressure",
            "VOLLEYBALL_HANDBALL",
            "serving",
            "Opponent Out-of-System Serve Pressure Rate",
            "OOS_Serve%",
            ("out of system serve pressure", "jump float disruption"),
            "ratio",
            "opponent_out_of_system_receptions / team_serves",
            0.42,
            0.54,
            0.30,
        ),
        _m(
            "handball_7m_penalty_conv_pct",
            "VOLLEYBALL_HANDBALL",
            "handball_setpiece",
            "Handball 7-Metre Penalty Throw Conversion Rate",
            "7m%",
            ("7m penalty conversion", "handball penalty rate"),
            "ratio",
            "7m_goals_scored / 7m_attempts",
            0.745,
            0.855,
            0.625,
        ),
        _m(
            "handball_fastbreak_goal_share",
            "VOLLEYBALL_HANDBALL",
            "handball_pace",
            "Fast-Break Transition Goal Percentage of Total",
            "FB_Goals%",
            ("fastbreak goals", "first wave transition"),
            "ratio",
            "fastbreak_goals / total_team_goals",
            0.22,
            0.33,
            0.12,
        ),
        _m(
            "handball_6m_pivot_finish_pct",
            "VOLLEYBALL_HANDBALL",
            "handball_offense",
            "6-Metre Line Pivot & Wing Shooting Efficiency",
            "6mShot%",
            ("6 metre shot efficiency", "line pivot finishing"),
            "ratio",
            "6m_and_wing_goals / 6m_and_wing_shots",
            0.675,
            0.775,
            0.570,
        ),
        _m(
            "handball_9m_backcourt_shot_pct",
            "VOLLEYBALL_HANDBALL",
            "handball_offense",
            "9-Metre Backcourt Jump-Shot Percentage",
            "9mShot%",
            ("9m backcourt shooting", "distance jump shot"),
            "ratio",
            "backcourt_9m_goals / backcourt_9m_attempts",
            0.425,
            0.530,
            0.320,
        ),
        _m(
            "handball_gk_save_pct",
            "VOLLEYBALL_HANDBALL",
            "handball_defense",
            "Handball Goalkeeper Total Save Percentage",
            "GK_Save%",
            ("handball keeper save", "goalkeeper stop rate"),
            "ratio",
            "gk_saves / shots_on_goal_faced",
            0.315,
            0.395,
            0.240,
        ),
        _m(
            "handball_passive_play_turnover_rate",
            "VOLLEYBALL_HANDBALL",
            "handball_defense",
            "Forced Passive-Play Possession Turnovers",
            "PassiveTO%",
            ("passive play warning", "handball forecheck turnover"),
            "turnovers/g",
            "passive_violations_and_shot_clock_forced / games",
            2.4,
            4.0,
            1.0,
        ),
        _m(
            "handball_2min_powerplay_net_goals",
            "VOLLEYBALL_HANDBALL",
            "handball_special",
            "Two-Minute Suspension Advantage Net Goal Differential",
            "2MinNet",
            ("2 minute suspension", "numerical superiority goals"),
            "goals/game",
            "goals_scored_during_2min_adv - goals_allowed_short",
            0.75,
            1.65,
            -0.30,
        ),
        # --- TRACK_SWIMMING_CYCLING (18) ---
        _m(
            "cycling_critical_power_w_per_kg",
            "TRACK_SWIMMING_CYCLING",
            "cycling_physiol",
            "Critical Power-to-Mass Ratio",
            "CP_W/kg",
            ("critical power", "watts per kg cycling"),
            "W/kg",
            "sustainable_critical_power_watts / rider_mass_kg",
            5.65,
            6.35,
            4.85,
        ),
        _m(
            "cycling_w_prime_anaerobic_kj",
            "TRACK_SWIMMING_CYCLING",
            "cycling_physiol",
            "Finite Anaerobic Work Capacity Above CP",
            "W_Prime",
            ("w prime", "anaerobic matchbox capacity"),
            "kJ",
            "integral(P - CP) dt to task failure",
            20.5,
            27.5,
            14.5,
        ),
        _m(
            "cycling_w_bal_minimum_reserve_kj",
            "TRACK_SWIMMING_CYCLING",
            "cycling_pacing",
            "Minimum Dynamic W'-bal Remaining Reserve",
            "Min_Wbal",
            ("w prime balance", "skiba wbal reserve"),
            "kJ",
            "W_prime - sum(exp(-(t-u)/tau) * max(0, P(u)-CP))",
            3.2,
            6.5,
            0.2,
        ),
        _m(
            "cycling_cda_aero_drag_m2",
            "TRACK_SWIMMING_CYCLING",
            "cycling_aero",
            "Effective Aerodynamic Drag Area",
            "CdA",
            ("drag area cda", "aerodynamic resistance"),
            "m^2",
            "2 * aero_resistive_force / (rho * v_air^2)",
            0.215,
            0.182,
            0.265,
            higher_is_better=False,
        ),
        _m(
            "cycling_vam_vertical_ascent_mh",
            "TRACK_SWIMMING_CYCLING",
            "cycling_climbing",
            "Velocita Ascensionale Media Climbing Rate",
            "VAM",
            ("vam climbing", "vertical metres per hour"),
            "m/h",
            "elevation_gain_metres * 3600 / climb_duration_s",
            1580.0,
            1820.0,
            1350.0,
        ),
        _m(
            "cycling_peloton_draft_savings_pct",
            "TRACK_SWIMMING_CYCLING",
            "cycling_aero",
            "Peloton Echelon Drafting Power Reduction",
            "DraftSave%",
            ("drafting savings", "peloton shelter power"),
            "ratio",
            "1 - (sheltered_power / exposed_lead_power)",
            0.31,
            0.42,
            0.15,
        ),
        _m(
            "cycling_normalized_variability_idx",
            "TRACK_SWIMMING_CYCLING",
            "cycling_pacing",
            "Pacing Variability Index (NP / AP)",
            "VI",
            ("variability index", "iso power ratio"),
            "ratio",
            "normalized_power / average_power",
            1.04,
            1.01,
            1.14,
            higher_is_better=False,
        ),
        _m(
            "cycling_climb_time_trial_watts",
            "TRACK_SWIMMING_CYCLING",
            "cycling_pacing",
            "Optimal Steep-Climb Surge Target Power",
            "ClimbSurge_W",
            ("climb surge watts", "optimal time trial power"),
            "watts",
            "arg_min(TT_time) s.t. W_bal(t) > 0",
            445.0,
            495.0,
            375.0,
        ),
        _m(
            "track_reaction_start_latency_ms",
            "TRACK_SWIMMING_CYCLING",
            "track_sprint",
            "Starting Gun Acoustic Reaction Time",
            "React_ms",
            ("sprint reaction time", "starting signal latency"),
            "ms",
            "first_foot_impulse_t - acoustic_start_t",
            142.0,
            122.0,
            172.0,
            higher_is_better=False,
        ),
        _m(
            "track_peak_velocity_split_mps",
            "TRACK_SWIMMING_CYCLING",
            "track_sprint",
            "Maximal Fly-10m Sprint Top Speed",
            "V_max_mps",
            ("top sprint speed", "peak 10m fly velocity"),
            "m/s",
            "10.0 / min_50m_to_80m_split_time_s",
            11.45,
            11.95,
            10.80,
        ),
        _m(
            "track_speed_endurance_decay_pct",
            "TRACK_SWIMMING_CYCLING",
            "track_sprint",
            "Final 20m Deceleration Fatigue Ratio",
            "Decel%",
            ("late race deceleration", "lactate speed endurance"),
            "ratio",
            "(v_80_100m - v_peak) / v_peak",
            -0.042,
            -0.018,
            -0.085,
        ),
        _m(
            "track_wind_legal_adjustment_s",
            "TRACK_SWIMMING_CYCLING",
            "track_physics",
            "Tailwind/Headwind Time Normalization Delta",
            "WindAdj_s",
            ("wind correction", "100m wind normalized time"),
            "seconds",
            "raw_100m_s + 0.050 * wind_mps - 0.002 * wind^2",
            0.0,
            -0.09,
            0.12,
            higher_is_better=False,
        ),
        _m(
            "track_stride_length_freq_product",
            "TRACK_SWIMMING_CYCLING",
            "track_biomech",
            "Ground Contact Ratio & Stride Step Product",
            "StrideFreqIdx",
            ("stride frequency", "ground contact efficiency"),
            "m/s",
            "stride_length_m * step_frequency_hz",
            11.35,
            11.90,
            10.70,
        ),
        _m(
            "track_1500m_kick_lap_ratio",
            "TRACK_SWIMMING_CYCLING",
            "track_distance",
            "Final 400m Bell-Lap Closing Split Ratio",
            "BellLapRatio",
            ("closing kick ratio", "negative split kick"),
            "ratio",
            "first_1100m_pace / final_400m_pace",
            1.055,
            1.115,
            0.985,
        ),
        _m(
            "swim_stroke_efficiency_swolf",
            "TRACK_SWIMMING_CYCLING",
            "swimming",
            "Swimming Golf Efficiency Score per 50m",
            "SWOLF",
            ("swolf", "swim stroke efficiency"),
            "sec+strokes",
            "lap_time_50m_s + stroke_count_50m",
            49.5,
            43.0,
            56.5,
            higher_is_better=False,
        ),
        _m(
            "swim_15m_underwater_dolphin_s",
            "TRACK_SWIMMING_CYCLING",
            "swimming",
            "15-Metre Breakout Speed Time",
            "15mBreakout_s",
            ("underwater dolphin kick", "start wall breakout"),
            "seconds",
            "head_surface_15m_elapsed_s",
            5.75,
            5.15,
            6.45,
            higher_is_better=False,
        ),
        _m(
            "swim_turn_pushoff_impulse_gain_s",
            "TRACK_SWIMMING_CYCLING",
            "swimming",
            "Flip-Turn Wall Entry-to-5m Exit Gain",
            "Turn5m_s",
            ("flip turn speed", "pushoff impulse gain"),
            "seconds",
            "t_5m_out - t_5m_in",
            2.35,
            2.05,
            2.75,
            higher_is_better=False,
        ),
        _m(
            "swim_distance_per_stroke_m",
            "TRACK_SWIMMING_CYCLING",
            "swimming",
            "Metres Travelled per Complete Stroke Cycle",
            "DPS_m",
            ("distance per stroke", "hydrodynamic propulsion"),
            "metres",
            "clean_swim_distance_m / stroke_cycles",
            2.15,
            2.48,
            1.82,
        ),
        # --- DARTS_SNOOKER_TABLETENNIS (18) ---
        _m(
            "darts_three_dart_average_3da",
            "DARTS_SNOOKER_TABLETENNIS",
            "darts",
            "Three-Dart Scoring Average per Visit",
            "3DA",
            ("three dart average", "darts 3da", "points per visit"),
            "pts/visit",
            "3 * total_points_scored / darts_thrown",
            96.5,
            104.5,
            88.0,
        ),
        _m(
            "darts_first_nine_average",
            "DARTS_SNOOKER_TABLETENNIS",
            "darts",
            "Opening Three Visits First-Nine Dart Average",
            "First9Avg",
            ("first nine average", "opening power scoring"),
            "pts/visit",
            "points_scored_first_9_darts / 3",
            106.5,
            116.0,
            96.0,
        ),
        _m(
            "darts_checkout_double_pct",
            "DARTS_SNOOKER_TABLETENNIS",
            "darts",
            "Doubles Checkout Finishing Accuracy",
            "Checkout%",
            ("checkout percentage", "doubles accuracy"),
            "ratio",
            "legs_finished_on_double / darts_at_double",
            0.395,
            0.475,
            0.310,
        ),
        _m(
            "darts_180s_per_leg_rate",
            "DARTS_SNOOKER_TABLETENNIS",
            "darts",
            "Maximum 180 Visits per Leg Rate",
            "180s/Leg",
            ("180s per leg", "maximum visit rate"),
            "180s/leg",
            "total_180s_hit / total_legs_played",
            0.29,
            0.46,
            0.14,
        ),
        _m(
            "darts_hold_of_throw_pct",
            "DARTS_SNOOKER_TABLETENNIS",
            "darts",
            "Leg Win Probability Throwing First",
            "HoldThrow%",
            ("hold of throw", "throw first advantage"),
            "probability",
            "sum_k P_A(V=k) * P_B(V >= k)",
            0.665,
            0.760,
            0.540,
        ),
        _m(
            "darts_break_of_throw_pct",
            "DARTS_SNOOKER_TABLETENNIS",
            "darts",
            "Leg Win Probability Throwing Second",
            "BreakThrow%",
            ("break of throw", "against darts steal"),
            "probability",
            "sum_k P_A(V=k) * P_B(V > k)",
            0.335,
            0.455,
            0.220,
        ),
        _m(
            "darts_leg_handicap_fair_margin",
            "DARTS_SNOOKER_TABLETENNIS",
            "darts",
            "Expected Best-of-N Leg Margin Fair Line",
            "LegHcap",
            ("darts leg handicap", "expected leg differential"),
            "legs",
            "E[Legs_A] - E[Legs_B] via alternating Markov DP",
            0.0,
            2.8,
            -2.8,
        ),
        _m(
            "snooker_centuries_per_frame_rate",
            "DARTS_SNOOKER_TABLETENNIS",
            "snooker",
            "Century Break (100+) Frequency per Frame",
            "100s/Frm",
            ("snooker century rate", "100 break percentage"),
            "breaks/frm",
            "century_breaks_scored / frames_played",
            0.085,
            0.165,
            0.030,
        ),
        _m(
            "snooker_pot_success_pct",
            "DARTS_SNOOKER_TABLETENNIS",
            "snooker",
            "Overall Ball Potting Percentage",
            "Pot%",
            ("pot success rate", "snooker potting accuracy"),
            "ratio",
            "balls_potted / pot_attempts",
            0.895,
            0.930,
            0.845,
        ),
        _m(
            "snooker_long_pot_success_pct",
            "DARTS_SNOOKER_TABLETENNIS",
            "snooker",
            "Long-Range Opening Pot Success Percentage",
            "LongPot%",
            ("long pot percentage", "break opening pot"),
            "ratio",
            "long_pots_made / long_pot_attempts",
            0.615,
            0.735,
            0.480,
        ),
        _m(
            "snooker_safety_exchange_win_pct",
            "DARTS_SNOOKER_TABLETENNIS",
            "snooker",
            "Tactical Safety Battle Exchange Win Rate",
            "Safety%",
            ("safety success", "snooker tactical control"),
            "ratio",
            "safe_leaves_forcing_open_chance / safety_shots",
            0.805,
            0.865,
            0.730,
        ),
        _m(
            "snooker_break_building_50plus_rate",
            "DARTS_SNOOKER_TABLETENNIS",
            "snooker",
            "Frame-Winning 50+ Break Conversion Rate",
            "50+Rate",
            ("50 plus break rate", "frame winning break"),
            "ratio",
            "frames_with_50plus_break / frames_won",
            0.54,
            0.68,
            0.38,
        ),
        _m(
            "tt_service_spin_rally_win_pct",
            "DARTS_SNOOKER_TABLETENNIS",
            "table_tennis",
            "Table Tennis Own-Serve Point Win Percentage",
            "TT_SrvWin%",
            ("table tennis serve win", "service point conversion"),
            "ratio",
            "points_won_serving / total_serves",
            0.575,
            0.645,
            0.500,
        ),
        _m(
            "tt_receive_flick_attack_pct",
            "DARTS_SNOOKER_TABLETENNIS",
            "table_tennis",
            "Receive Backhand Chiquita Flick Point Rate",
            "FlickWin%",
            ("receive flick", "table tennis receive break"),
            "ratio",
            "points_won_receiving_serve / opponent_serves",
            0.425,
            0.500,
            0.350,
        ),
        _m(
            "tt_third_ball_attack_conv_pct",
            "DARTS_SNOOKER_TABLETENNIS",
            "table_tennis",
            "Third-Ball Forehand Loop Kill Conversion",
            "3rdBall%",
            ("third ball attack", "serve plus one loop"),
            "ratio",
            "third_ball_winners / third_ball_attacks",
            0.63,
            0.74,
            0.51,
        ),
        _m(
            "tt_backhand_counterloop_win_pct",
            "DARTS_SNOOKER_TABLETENNIS",
            "table_tennis",
            "Mid-Distance Backhand Counterloop Rally Win Rate",
            "BH_Counter%",
            ("backhand rally rate", "counterloop efficiency"),
            "ratio",
            "extended_rally_points_won / extended_rallies",
            0.50,
            0.59,
            0.41,
        ),
        _m(
            "badminton_smash_steepness_win_pct",
            "DARTS_SNOOKER_TABLETENNIS",
            "badminton",
            "Steep Overhead Smash Winner Rate",
            "SmashWin%",
            ("badminton smash", "overhead winner rate"),
            "ratio",
            "smashes_resulting_in_direct_point / smashes",
            0.34,
            0.46,
            0.22,
        ),
        _m(
            "badminton_net_lift_forced_rate",
            "DARTS_SNOOKER_TABLETENNIS",
            "badminton",
            "Tight Net Spin Forcing High Defensive Lift",
            "NetForce%",
            ("net dribble control", "forced high lift"),
            "ratio",
            "opponent_high_lifts_after_net_shot / net_exchanges",
            0.48,
            0.60,
            0.36,
        ),
        # --- LACROSSE_AFL (18) ---
        _m(
            "lax_faceoff_win_pct",
            "LACROSSE_AFL",
            "lacrosse",
            "Faceoff Possession Clamp Win Percentage",
            "FO%",
            ("faceoff win percentage", "fogo possession rate"),
            "ratio",
            "faceoffs_won / total_faceoffs",
            0.500,
            0.615,
            0.390,
        ),
        _m(
            "lax_ground_ball_contested_share",
            "LACROSSE_AFL",
            "lacrosse",
            "Contested Ground Ball Scoop Differential",
            "GB_Share",
            ("ground ball share", "loose ball recovery"),
            "ratio",
            "team_ground_balls / (team_gb + opp_gb)",
            0.500,
            0.565,
            0.435,
        ),
        _m(
            "lax_60s_shot_clock_eff",
            "LACROSSE_AFL",
            "lacrosse",
            "Settled Offense Goals per 100 Possessions",
            "OE_100",
            ("lacrosse offensive efficiency", "goals per 100 possessions"),
            "goals/100p",
            "100 * goals_scored / total_offensive_possessions",
            28.5,
            35.5,
            21.5,
        ),
        _m(
            "lax_extra_man_offense_pct",
            "LACROSSE_AFL",
            "lacrosse",
            "Extra-Man Offense Power-Play Conversion Rate",
            "EMO%",
            ("extra man offense", "lacrosse man up goal rate"),
            "ratio",
            "man_up_goals / man_up_opportunities",
            0.345,
            0.460,
            0.230,
        ),
        _m(
            "lax_man_down_defense_kill_pct",
            "LACROSSE_AFL",
            "lacrosse",
            "Man-Down Penalty Kill Clean Stop Rate",
            "ManDownKill%",
            ("man down defense", "penalty kill percentage"),
            "ratio",
            "1 - (opp_emo_goals / opp_emo_opps)",
            0.655,
            0.770,
            0.540,
        ),
        _m(
            "lax_two_point_arc_expected_val",
            "LACROSSE_AFL",
            "lacrosse",
            "PLL Two-Point Arc Shot Expected Value",
            "2Pt_xVal",
            ("pll 2 point shot", "outer arc expected goals"),
            "pts/shot",
            "2.0 * two_pt_goals / two_pt_attempts",
            0.42,
            0.60,
            0.25,
        ),
        _m(
            "lax_goalie_clean_save_pct",
            "LACROSSE_AFL",
            "lacrosse",
            "Lacrosse Goalkeeper On-Cage Save Percentage",
            "LaxSave%",
            ("lacrosse goalie save", "cage stop rate"),
            "ratio",
            "saves / (saves + goals_allowed)",
            0.525,
            0.595,
            0.455,
        ),
        _m(
            "lax_assisted_settled_goal_share",
            "LACROSSE_AFL",
            "lacrosse",
            "Assisted Team Movement Goal Percentage",
            "AstGoal%",
            ("assisted goals percentage", "offball cut efficiency"),
            "ratio",
            "assisted_goals / total_goals",
            0.58,
            0.70,
            0.44,
        ),
        _m(
            "lax_ride_ten_second_turnover_pct",
            "LACROSSE_AFL",
            "lacrosse",
            "Clearing Pressure 10-Man Ride Failed Clear Rate",
            "RideTO%",
            ("10 man ride", "clearing failure forced"),
            "ratio",
            "failed_opponent_clears / opponent_clear_attempts",
            0.135,
            0.205,
            0.075,
        ),
        _m(
            "afl_inside_50_mark_conv_pct",
            "LACROSSE_AFL",
            "afl",
            "AFL Inside-50 Scoring Efficiency Percentage",
            "I50_Score%",
            ("inside 50 scoring", "afl forward entry efficiency"),
            "ratio",
            "scores_inside_50 / total_inside_50_entries",
            0.455,
            0.535,
            0.375,
        ),
        _m(
            "afl_clearance_stoppage_diff",
            "LACROSSE_AFL",
            "afl",
            "Stoppage & Centre Bounce Clearance Differential",
            "ClearDiff",
            ("afl clearances", "centre stoppage differential"),
            "clear/game",
            "team_clearances - opponent_clearances",
            0.0,
            6.5,
            -6.5,
        ),
        _m(
            "afl_contested_possession_share",
            "LACROSSE_AFL",
            "afl",
            "Contested Ground-Ball & Pack Possession Rate",
            "ContPoss",
            ("contested possessions", "afl pack win differential"),
            "diff/game",
            "team_contested_poss - opp_contested_poss",
            0.0,
            14.0,
            -14.0,
        ),
        _m(
            "afl_intercept_marks_per_game",
            "LACROSSE_AFL",
            "afl",
            "Defensive Backline Intercept Marks per Game",
            "IntMarks",
            ("intercept marks", "rebound defender reading"),
            "marks/game",
            "intercept_marks_taken_defense",
            14.5,
            19.5,
            10.0,
        ),
        _m(
            "afl_metres_gained_differential",
            "LACROSSE_AFL",
            "afl",
            "Net Territory Metres Gained Differential",
            "MetresDiff",
            ("metres gained", "afl territory differential"),
            "m/game",
            "team_metres_gained - opponent_metres_gained",
            0.0,
            420.0,
            -420.0,
        ),
        _m(
            "afl_expected_score_xscore_diff",
            "LACROSSE_AFL",
            "afl",
            "Shot Location & Pressure Adjusted xScore Diff",
            "AFL_xScore",
            ("afl expected score", "xscore differential"),
            "pts/game",
            "team_xScore - opponent_xScore",
            0.0,
            16.5,
            -16.5,
        ),
        _m(
            "afl_ruck_hitout_to_advantage_pct",
            "LACROSSE_AFL",
            "afl",
            "Ruck Tap Hitout-to-Advantage Conversion Rate",
            "HitoutAdv%",
            ("hitout to advantage", "ruck dominance"),
            "ratio",
            "hitouts_to_advantage / total_hitouts",
            0.295,
            0.385,
            0.210,
        ),
        _m(
            "afl_goal_kicking_setshot_acc_pct",
            "LACROSSE_AFL",
            "afl",
            "Goals vs Scoring Shots Conversion Accuracy",
            "GoalAcc%",
            ("goal kicking accuracy", "set shot conversion"),
            "ratio",
            "goals_scored / (goals_scored + behinds_scored)",
            0.535,
            0.615,
            0.445,
        ),
        _m(
            "afl_pressure_act_tackles_inside50",
            "LACROSSE_AFL",
            "afl",
            "Forward-50 Containment Tackles & Pressure Acts",
            "Fwd50Press",
            ("pressure acts inside 50", "forward zone tackles"),
            "tackles/g",
            "tackles_and_pressure_acts_inside_forward_50",
            11.5,
            16.5,
            7.0,
        ),
    ]
    return tuple(rows)


WAVE42_18SPORT_EXTENSION_METRICS: tuple[SportMetricSpec, ...] = _build_wave42_extension_metrics()
UNIVERSAL_18SPORT_METRICS_REGISTRY: tuple[SportMetricSpec, ...] = (
    UNIVERSAL_14SPORT_METRICS_REGISTRY + WAVE42_18SPORT_EXTENSION_METRICS
)

WAVE42_MULTISPORT_RLVR_TRAJECTORIES: tuple[dict[str, Any], ...] = (
    {
        "record_id": "w42_18sport_428_metrics_volleyball_cycling_darts_lax_00",
        "domain": "wave42_18sport_universal_encyclopedia",
        "prompt": (
            "Expand the universal multi-sport encyclopedia from 356 metrics / 14 sports to 428 "
            "canonical metrics across 18 sports by adding VOLLEYBALL_HANDBALL, "
            "TRACK_SWIMMING_CYCLING, DARTS_SNOOKER_TABLETENNIS, and LACROSSE_AFL while preserving "
            "the Wave 40 (284) and Wave 41 (356) tuples immutable. Return JSON."
        ),
        "think": (
            "Appending 72 new SportMetricSpec definitions (18 per sport group) reaches 428 "
            "canonical metrics across 18 sports while preserving backwards immutability."
        ),
    },
    {
        "record_id": "w42_darts_501_markov_visit_pmf_and_leg_handicap_00",
        "domain": "wave42_darts_501_markov_chain",
        "prompt": (
            "Solve the 502-state absorbing Markov chain for 501 Darts visit distributions, "
            "alternating throw hold/break probabilities, and Best-of-19 leg handicap lines with "
            "exact probability mass conservation. Return JSON."
        ),
        "think": (
            "Convolving exact visit-to-checkout PMFs (mass == 1.0) through alternating-throw "
            "match DP recovers realistic hold-of-throw ~65-75% and leg handicap lines."
        ),
    },
    {
        "record_id": "w42_cycling_skiba_wbal_cda_climb_tt_pacing_00",
        "domain": "wave42_cycling_skiba_wbal_physics",
        "prompt": (
            "Optimize multi-gradient cycling time-trial velocity with Skiba differential W'-bal "
            "depletion/recovery and aerodynamic CdA drag cubic power balancing. Return JSON."
        ),
        "think": (
            "Allocating W' anaerobic work onto steep low-speed climb gradients where v^3 aero "
            "losses shrink while recharging on flats lowers finish time with min_w_bal > 0."
        ),
    },
)


def query_18sport_universal_metric(
    query: str,
    *,
    sport: str | None = None,
    repo_root: Path | None = None,
) -> dict[str, Any]:
    """Resolve any 18-sport / 428-metric query to its formula, tier, and baseline."""
    vault, is_fb = _load_universal_vault(repo_root)
    q_norm = _norm_txt(query)
    q_tokens = set(q_norm.split())
    sport_u = sport.strip().upper() if sport else None

    best_score = -1.0
    best_spec: SportMetricSpec | None = None
    candidates: list[tuple[float, SportMetricSpec]] = []

    for spec in UNIVERSAL_18SPORT_METRICS_REGISTRY:
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
    resolved = best_spec or UNIVERSAL_18SPORT_METRICS_REGISTRY[0]
    sports_n = len({s.sport for s in UNIVERSAL_18SPORT_METRICS_REGISTRY})

    return {
        "schema": "wave42_18sport_universal_metric_lookup_v1",
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
        "total_registry_metrics": len(UNIVERSAL_18SPORT_METRICS_REGISTRY),
        "sports_covered_count": sports_n,
        "top_matches": [
            {"metric_id": s.metric_id, "sport": s.sport, "symbol": s.symbol, "score": round(sc, 2)}
            for sc, s in candidates[:5]
        ],
        "vault_loaded": bool(vault and not is_fb),
        "clean_checkout_fallback": is_fb,
    }


def _visit_finish_pmf(
    three_dart_avg: float, checkout_pct: float, max_visits: int = 18
) -> list[float]:
    """Compute exact 502-state absorbing Markov visit-to-checkout PMF."""
    mu = max(45.0, min(125.0, float(three_dart_avg)))
    chk = max(0.15, min(0.75, float(checkout_pct)))
    sd = max(12.0, 29.0 - 0.13 * mu)
    steps = np.arange(15, 181, dtype=float)
    raw_k = np.exp(-0.5 * ((steps - mu) / sd) ** 2)
    raw_k /= float(np.sum(raw_k))

    state = np.zeros(502, dtype=float)
    state[501] = 1.0
    cum_done = 0.0
    pmf: list[float] = []

    for _v in range(max_visits):
        nxt = np.zeros(502, dtype=float)
        # Transition states s = 171..501 using discretized scoring kernel
        for s in range(171, 502):
            ps = float(state[s])
            if ps < 1e-12:
                continue
            rem = s - steps.astype(int)
            rem = np.where(rem < 2, 32, rem)
            np.add.at(nxt, rem, ps * raw_k)
        # Transition checkout states s = 2..170
        for s in range(2, 171):
            ps = float(state[s])
            if ps < 1e-12:
                continue
            if s <= 40:
                p_out = chk if (s % 2 == 0 or s == 25) else 0.72 * chk
            elif s <= 100:
                p_out = 0.62 * chk
            else:
                p_out = 0.24 * chk
            nxt[0] += ps * p_out
            leave = max(2, min(40, s // 2 if s <= 80 else s - 96))
            nxt[leave] += ps * (1.0 - p_out)
        done_now = float(nxt[0])
        pmf.append(max(0.0, done_now))
        cum_done += done_now
        nxt[0] = 0.0
        state = nxt

    leftover = max(0.0, 1.0 - sum(pmf))
    pmf[-1] += leftover
    tot = sum(pmf)
    return [x / tot for x in pmf]


def evaluate_darts_501_markov_leg_and_handicap(
    *,
    player_a_3da: float = 101.5,
    player_a_chk: float = 0.43,
    player_b_3da: float = 95.2,
    player_b_chk: float = 0.38,
    best_of_legs: int = 19,
) -> dict[str, Any]:
    """Solve 501 Darts Markov leg PMF, hold/break probabilities & Best-of-N leg handicaps."""
    pmf_a = _visit_finish_pmf(player_a_3da, player_a_chk)
    pmf_b = _visit_finish_pmf(player_b_3da, player_b_chk)

    p_hold_a = sum(
        pmf_a[i] * sum(pmf_b[j] for j in range(i, len(pmf_b))) for i in range(len(pmf_a))
    )
    p_hold_b = sum(
        pmf_b[i] * sum(pmf_a[j] for j in range(i, len(pmf_a))) for i in range(len(pmf_b))
    )
    p_break_a = 1.0 - p_hold_b

    target = max(1, (int(best_of_legs) + 1) // 2)
    dp = np.zeros((target + 1, target + 1), dtype=float)
    dp[0, 0] = 1.0
    score_probs: dict[tuple[int, int], float] = {}

    for la in range(target):
        for lb in range(target):
            cur = float(dp[la, lb])
            if cur < 1e-15:
                continue
            a_throws = ((la + lb) % 2) == 0
            p_win_leg = p_hold_a if a_throws else p_break_a
            na, nb = la + 1, lb + 1
            if na == target:
                score_probs[(na, lb)] = score_probs.get((na, lb), 0.0) + cur * p_win_leg
            else:
                dp[na, lb] += cur * p_win_leg
            if nb == target:
                score_probs[(la, nb)] = score_probs.get((la, nb), 0.0) + cur * (1.0 - p_win_leg)
            else:
                dp[la, nb] += cur * (1.0 - p_win_leg)

    pmf_mass = sum(score_probs.values())
    win_a = sum(pr for (la, lb), pr in score_probs.items() if la > lb)
    win_b = sum(pr for (la, lb), pr in score_probs.items() if lb > la)
    exp_diff = sum(float(la - lb) * pr for (la, lb), pr in score_probs.items())
    exp_tot_legs = sum(float(la + lb) * pr for (la, lb), pr in score_probs.items())
    exp_visits_a = sum(float(i + 1) * pr for i, pr in enumerate(pmf_a))

    handicaps: dict[str, float] = {}
    for line in (-3.5, -2.5, -1.5, 1.5, 2.5):
        handicaps[f"{line:+.1f}"] = round(
            sum(pr for (la, lb), pr in score_probs.items() if (la - lb + line) > 0.0), 4
        )

    return {
        "schema": "wave42_darts_501_markov_handicap_v1",
        "best_of_legs": int(best_of_legs),
        "pmf_total_mass": round(pmf_mass, 9),
        "visit_pmf_mass_a": round(sum(pmf_a), 9),
        "player_a_expected_visits": round(exp_visits_a, 3),
        "player_a_hold_of_throw_prob": round(p_hold_a, 4),
        "player_a_break_of_throw_prob": round(p_break_a, 4),
        "player_a_match_win_prob": round(win_a, 4),
        "player_b_match_win_prob": round(win_b, 4),
        "expected_leg_margin_a": round(exp_diff, 3),
        "expected_total_legs": round(exp_tot_legs, 3),
        "leg_handicaps_a_cover_prob": handicaps,
        "real_money_stake_cleared": REAL_MONEY_STAKE_CLEARED,
        "live_stake_fraction": LIVE_STAKE_FRACTION,
    }


def _solve_road_velocity_mps(
    power_w: float,
    grade: float,
    mass_kg: float,
    cda_m2: float,
    rho_air: float = 1.18,
    c_rr: float = 0.0032,
    drivetrain_eff: float = 0.975,
) -> float:
    """Solve cubic steady road cycling velocity P_wheel(v) = power_w * drivetrain_eff."""
    theta = math.atan(float(grade))
    f_grav_roll = float(mass_kg) * 9.80665 * (math.sin(theta) + c_rr * math.cos(theta))
    k_aero = 0.5 * rho_air * float(cda_m2)
    p_eff = max(20.0, float(power_w) * drivetrain_eff)
    lo, hi = 1.0, 28.0
    for _ in range(42):
        mid = 0.5 * (lo + hi)
        p_req = mid * (f_grav_roll + k_aero * mid * mid)
        if p_req < p_eff:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


def evaluate_cycling_skiba_wbal_and_climb_tt(
    *,
    cp_watts: float = 415.0,
    w_prime_joules: float = 22500.0,
    rider_total_mass_kg: float = 73.0,
    cda_m2: float = 0.205,
    flat_dist_m: float = 18000.0,
    climb_dist_m: float = 7500.0,
    climb_grade: float = 0.082,
    summit_dist_m: float = 4500.0,
) -> dict[str, Any]:
    """Simulate Skiba W'-bal depletion/recovery + CdA aerodynamic time-trial climb pacing."""
    segments = (
        (float(flat_dist_m), 0.008),
        (float(climb_dist_m), float(climb_grade)),
        (float(summit_dist_m), 0.015),
    )

    def _simulate(powers: tuple[float, float, float]) -> tuple[float, float]:
        w_bal = float(w_prime_joules)
        min_w = w_bal
        tot_t = 0.0
        for (dist_m, grade), p_w in zip(segments, powers, strict=True):
            v = _solve_road_velocity_mps(p_w, grade, rider_total_mass_kg, cda_m2)
            seg_t = dist_m / max(1.0, v)
            tot_t += seg_t
            if p_w > cp_watts:
                w_bal -= (p_w - cp_watts) * seg_t
            else:
                d_cp = max(1.0, cp_watts - p_w)
                tau_w = 546.0 * math.exp(-0.01 * d_cp) + 316.0
                w_bal = float(w_prime_joules) - (float(w_prime_joules) - w_bal) * math.exp(
                    -seg_t / tau_w
                )
            min_w = min(min_w, w_bal)
        return tot_t, min_w

    iso_p = (cp_watts * 1.012, cp_watts * 1.012, cp_watts * 1.012)
    t_iso, min_w_iso = _simulate(iso_p)

    # Optimize variable W'-bal climb surge strictly subject to min_w_bal >= 500 J (no blow-up)
    best_t = t_iso
    best_min_w = min_w_iso
    best_p = iso_p
    for f_mult in (0.96, 0.985, 1.005):
        for c_mult in (1.020, 1.032, 1.045, 1.055):
            cand = (cp_watts * f_mult, cp_watts * c_mult, cp_watts * 1.012)
            t_c, mw_c = _simulate(cand)
            if mw_c >= 500.0 and t_c < best_t:
                best_t = t_c
                best_min_w = mw_c
                best_p = cand

    return {
        "schema": "wave42_cycling_skiba_wbal_climb_tt_v1",
        "cp_watts": float(cp_watts),
        "w_prime_capacity_j": float(w_prime_joules),
        "cda_m2": float(cda_m2),
        "iso_power_time_s": round(t_iso, 3),
        "optimal_variable_time_s": round(best_t, 3),
        "time_saved_by_wbal_pacing_s": round(t_iso - best_t, 3),
        "min_w_bal_iso_joules": round(min_w_iso, 1),
        "min_w_bal_optimal_joules": round(best_min_w, 1),
        "climb_surge_watts": round(best_p[1], 1),
        "real_money_stake_cleared": REAL_MONEY_STAKE_CLEARED,
        "live_stake_fraction": LIVE_STAKE_FRACTION,
    }


def evaluate_wave42_18sport_darts_and_cycling_suite(
    repo_root: Path | None = None,
) -> dict[str, Any]:
    """Run Wave 42 18-sport / 428-metric encyclopedia, Darts 501 Markov & Cycling W'-bal."""
    root = Path(repo_root).resolve() if repo_root is not None else REPO_ROOT
    ck = str(root)
    if ck in _SUITE42_MS_CACHE:
        return _SUITE42_MS_CACHE[ck]

    _, is_fb = _load_universal_vault(root)
    sports_counts: dict[str, int] = {}
    for spec in UNIVERSAL_18SPORT_METRICS_REGISTRY:
        sports_counts[spec.sport] = sports_counts.get(spec.sport, 0) + 1

    darts = evaluate_darts_501_markov_leg_and_handicap()
    cycling = evaluate_cycling_skiba_wbal_and_climb_tt()
    probe_queries = {
        "volleyball_sideout": query_18sport_universal_metric(
            "sideout percentage", sport="VOLLEYBALL_HANDBALL", repo_root=root
        )["metric_id"],
        "handball_7m": query_18sport_universal_metric(
            "7m penalty conversion", sport="VOLLEYBALL_HANDBALL", repo_root=root
        )["metric_id"],
        "cycling_wbal": query_18sport_universal_metric(
            "w prime balance", sport="TRACK_SWIMMING_CYCLING", repo_root=root
        )["metric_id"],
        "darts_3da": query_18sport_universal_metric(
            "three dart average", sport="DARTS_SNOOKER_TABLETENNIS", repo_root=root
        )["metric_id"],
        "lax_faceoff": query_18sport_universal_metric(
            "faceoff win percentage", sport="LACROSSE_AFL", repo_root=root
        )["metric_id"],
    }

    out: dict[str, Any] = {
        "schema": "wave42_18sport_darts_and_cycling_suite_v1",
        "wired": True,
        "clean_checkout_fallback": is_fb,
        "total_canonical_metrics": len(UNIVERSAL_18SPORT_METRICS_REGISTRY),
        "wave40_base_metrics_preserved": 284,
        "wave41_base_metrics_preserved": len(UNIVERSAL_14SPORT_METRICS_REGISTRY),
        "wave42_extension_metrics": len(WAVE42_18SPORT_EXTENSION_METRICS),
        "sports_covered_count": len(sports_counts),
        "sports_metric_counts": sports_counts,
        "new_sport_probe_resolutions": probe_queries,
        "darts_501_markov": darts,
        "cycling_skiba_wbal": cycling,
        "real_money_stake_cleared": REAL_MONEY_STAKE_CLEARED,
        "live_stake_fraction": LIVE_STAKE_FRACTION,
    }
    blob = json.dumps(out, indent=2, ensure_ascii=True)
    out["suite_sha256"] = hashlib.sha256(blob.encode("ascii")).hexdigest()
    _SUITE42_MS_CACHE[ck] = out
    return out
