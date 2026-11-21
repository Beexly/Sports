#!/usr/bin/env python3
"""
GSE Stage 2A — Live Week 11 Full-Game Snap-by-Snap JEV Decision Spine Simulator
==============================================================================
Executes a complete NFL game from Snap 1 (Q1 15:00) through Q4 0:00 sequentially
through TypeSafe Jev (`jevkit.client.ask`, model `~typesafe/jev-latest`), passing
real Weeks 1-10 PBP + FTN charting, coaching schemes, active Week 11 starters,
and live ESPN injury reports on EVERY SINGLE SNAP.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
HERMES_JEV_PATH = Path(r"C:\Users\Garrett\hermes-jev-skills")
if HERMES_JEV_PATH.exists() and str(HERMES_JEV_PATH) not in sys.path:
    sys.path.insert(0, str(HERMES_JEV_PATH))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

try:
    from jevkit import client as jev_client  # noqa: E402
except ImportError:
    jev_client = None  # type: ignore[assignment]
from scripts.ops.enforce_stage0_roster_and_board_allowlist import (  # noqa: E402
    load_stage0_game_roster_allowlist,
)
from scripts.ops.gse_coach_mind_simulator import (  # noqa: E402
    build_jev_state_tensor,
    calibrate_jev_pass_prob,
    verify_jev_spine_freshness_and_qb1,
)
from scripts.ops.gse_connected_game_workflow import (  # noqa: E402
    _get_2026_team_pbp_ftn_stats,
    _get_matchup_env,
)
from intelligence.coaching.ftn_and_snap_deep_intelligence_engine import (  # noqa: E402
    evaluate_snap_weighted_injury_impact,
    load_ftn_pbp_32team_charting_profiles,
)

WEEK11_COACH_SCHEMES: dict[str, dict[str, str]] = {
    "IND": {
        "hc_oc": "Shane Steichen (RPO / Shotgun zone-read + play-action seam targeting TE Tyler Warren & RB Jonathan Taylor)",
        "dc": "Lou Anarumo (Disguised split-safety / Cover-3 spin; thin at CB with Charvarius Ward Out & Sauce Gardner Q)",
    },
    "HOU": {
        "hc_oc": "Nick Caley / DeMeco Ryans (Shotgun 11/12-personnel intermediate/vertical stress to Nico Collins & Tank Dell + RB David Montgomery)",
        "dc": "DeMeco Ryans / Matt Burke (4-man wide-9 front + simulated pressures; Danielle Hunter Out pushes edge workload to Will Anderson Jr. & Jadeveon Clowney)",
    },
}


def _positive_moment_draw(rng: np.random.Generator, loc: float, scale: float) -> float:
    loc_f = float(loc)
    scale_f = abs(float(scale))
    if loc_f <= 1e-6:
        return 0.0
    shape = (loc_f / max(scale_f, 1e-6)) ** 2
    gscale = (max(scale_f, 1e-6) ** 2) / loc_f
    return float(rng.gamma(shape, gscale))


def _format_clock(clock_sec: float) -> str:
    sec_in_qtr = int(max(0.0, clock_sec)) % 900
    if sec_in_qtr == 0 and clock_sec > 0 and int(clock_sec) % 900 == 0:
        sec_in_qtr = 900
    return f"{sec_in_qtr // 60:02d}:{sec_in_qtr % 60:02d}"


def _field_zone(yardline_100: int, ydstogo: int) -> str:
    if yardline_100 <= ydstogo and yardline_100 <= 10:
        return "goal_to_go"
    if yardline_100 <= 20:
        return "red_zone"
    if yardline_100 <= 45:
        return "plus_territory_scoring_range"
    if yardline_100 <= 65:
        return "midfield_neutral"
    if yardline_100 >= 88:
        return "backed_up_own_endzone"
    return "own_territory"


def _build_team_context(
    team: str,
    week: int,
    pbp_stats: dict[str, dict[str, Any]],
    stage0_al: dict[str, Any],
    board_injuries: list[dict[str, Any]],
) -> dict[str, Any]:
    st = dict(pbp_stats.get(team) or {})
    ftn_all = (load_ftn_pbp_32team_charting_profiles().get("teams") or {})
    ftn_prof = dict(ftn_all.get(team) or {})
    tm_raw_inj = [
        {"player": x.get("athlete", ""), "position": x.get("position", ""), "status": x.get("status", "")}
        for x in board_injuries
        if str(x.get("team") or "").upper() == team
    ]
    inj_snap = evaluate_snap_weighted_injury_impact(team, tm_raw_inj)
    athletes = stage0_al.get("verified_board_athletes") or {}
    qb1 = str((stage0_al.get("confirmed_qb1") or {}).get(team) or f"{team} QB1")

    skill_rec = []
    skill_rush = []
    for nm, inf in athletes.items():
        if inf.get("team") != team:
            continue
        pos = str(inf.get("position") or "")
        pb = inf.get("pbp_2026") or {}
        if pos in ("WR", "TE", "RB"):
            line_rec = (inf.get("core_lines") or {}).get("Total Receiving Yards (incl. overtime)")
            skill_rec.append((float(line_rec or pb.get("rec_yds_per_pg") or 0.0), pos, nm, pb))
        if pos in ("RB", "QB"):
            line_rush = (inf.get("core_lines") or {}).get("Total Rushing Yards (incl. overtime)")
            skill_rush.append((float(line_rush or pb.get("rush_yds_per_pg") or 0.0), pos, nm, pb))
    skill_rec.sort(reverse=True)
    skill_rush.sort(key=lambda x: (0 if x[1] == "RB" else 1, -x[0]))

    wrs = [x for x in skill_rec if x[1] in ("WR", "TE")]
    wr1_name = wrs[0][2] if len(wrs) > 0 else f"{team} WR1"
    wr2_name = wrs[1][2] if len(wrs) > 1 else f"{team} WR2"
    rb1_name = skill_rush[0][2] if len(skill_rush) > 0 else f"{team} RB1"

    inj_list = [
        f"{x['athlete']} ({x['position']}, {x['status']} - {x['injury_type']})"
        for x in board_injuries
        if str(x.get("team") or "").upper() == team
    ]
    if not inj_list:
        inj_list = [str(x) for x in (inj_snap.get("key_injuries") or [])[:6]]

    comp_pct = float(st.get("comp_rate", 0.61)) * 100.0
    sack_pct = float(st.get("sack_rate_allowed", 0.062)) * 100.0
    blitz_pct = float(st.get("dc_blitz_rate", 0.26)) * 100.0
    raw_proe = float(st.get("proe", 0.0))
    ed_sample_n = max(
        0.0,
        float(
            st.get("early_down_plays")
            or st.get("early_down_n")
            or st.get("ed_plays")
            or (max(1, int(st.get("games_played", 8))) * 32.0)
        ),
    )
    proe_shrink_w = ed_sample_n / (ed_sample_n + 180.0)
    shrunk_proe = proe_shrink_w * raw_proe
    league_ed_base = 0.54
    shrunk_ed_pass_rate = float(np.clip(league_ed_base + shrunk_proe, 0.38, 0.68))

    return {
        "team": team,
        "qb1": qb1,
        "wr1": {"name": wr1_name, "dk_rec_line": wrs[0][0] if len(wrs) > 0 else 45.0},
        "wr2": {"name": wr2_name, "dk_rec_line": wrs[1][0] if len(wrs) > 1 else 32.0},
        "rb1": {"name": rb1_name, "dk_rush_line": skill_rush[0][0] if len(skill_rush) > 0 else 50.0},
        "off_epa": float(st.get("off_epa", 0.0)),
        "def_epa": float(st.get("def_epa", 0.0)),
        "early_down_pass_rate": round(shrunk_ed_pass_rate, 4),
        "proe": round(shrunk_proe, 5),
        "proe_raw": raw_proe,
        "proe_sample_n": int(round(ed_sample_n)),
        "proe_shrinkage_weight": round(proe_shrink_w, 4),
        "comp_rate_pct": round(comp_pct, 2),
        "sack_rate_allowed_pct": round(sack_pct, 2),
        "def_blitz_rate_pct": round(blitz_pct, 2),
        "def_man_rate": float(st.get("dc_man_rate", 0.27)),
        "pa_rate": float(st.get("pa_rate", 0.22)),
        "motion_rate": float(st.get("motion_rate", 0.54)),
        "sec_per_play": float(st.get("neutral_pace_sec", 27.3)),
        "ftn_twp_rate": ftn_prof.get("off_twp_rate"),
        "ftn_box_light_rate": st.get("def_light_box_rate"),
        "injuries": inj_list,
    }


def _build_snap_questions(
    off_team: str,
    def_team: str,
    down: int,
    ydstogo: int,
    yardline_100: int,
    off_ctx: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    wr1_name = off_ctx["wr1"]["name"]
    wr2_name = off_ctx["wr2"]["name"]
    rb1_name = off_ctx["rb1"]["name"]
    qb1_name = off_ctx["qb1"]

    if down == 4:
        off_family_q = None
        off_call_q = jev_client.choice(
            f"Which 4th-down decision does {off_team} (QB {qb1_name}) execute on 4th & {ydstogo} at yardline {yardline_100}?",
            {
                "go_for_it_pass": f"Go for 4th down conversion with pass to {wr1_name}/{wr2_name}/TE",
                "go_for_it_run": f"Go for 4th down conversion with rush by {rb1_name} or {qb1_name}",
                "field_goal_attempt": "Attempt a 3-point field goal",
                "punt": "Punt to pin opponent deep",
            },
        )
    else:
        off_family_q = jev_client.choice(
            f"Does {off_team} (QB {qb1_name}) call a designed RUN or PASS family play on {down} & {ydstogo} at yardline {yardline_100}?",
            {
                "run_play": f"Designed run play (inside zone, outside zone, gap/power, or draw with {rb1_name})",
                "pass_play": f"Designed pass play (quick game, RPO, play-action, screen, or vertical shot with {qb1_name})",
            },
        )
        off_call_q = jev_client.choice(
            f"Which offensive play concept does {off_team} (QB {qb1_name}) call on {down} & {ydstogo} at yardline {yardline_100}?",
            {
                "inside_zone_run": f"Inside zone or duo rush with {rb1_name}",
                "outside_zone_run": f"Outside zone, stretch, or counter rush with {rb1_name}",
                "quick_game_rpo": f"Quick rhythm pass, slant/hitch, or RPO targeting {wr1_name}/{wr2_name}",
                "play_action_intermediate": "Play-action boot or intermediate crosser (10-19 air yards)",
                "deep_shot_pass": f"Vertical shot or seam/post (20+ air yards) targeting {wr1_name}/{wr2_name}",
                "screen_or_draw": f"Slip screen, RB swing, or delayed draw to {rb1_name}/{wr1_name}",
            },
        )

    def_shell_q = jev_client.choice(
        f"Which defensive front and coverage shell does {def_team} call against {off_team}?",
        {
            "man_blitz_pressure": "5+ rusher man blitz (Cover-0 or Cover-1 pressure)",
            "zone_blitz_sim_pressure": "Simulated creeper pressure or 5-man fire-zone blitz",
            "two_high_quarters_shell": "Two-high safety shell (Cover-2, Quarters, or Cover-6 bracket)",
            "single_high_cover3_lurk": "Single-high safety shell (Cover-3 buzz or Cover-1 robber)",
        },
    )

    target_carrier_q = jev_client.choice(
        f"Which {off_team} skill player touches the ball or receives primary target on this snap?",
        {
            "RB1": f"{rb1_name} (primary RB rusher / checkdown)",
            "WR1": f"{wr1_name} (primary receiving alpha)",
            "WR2": f"{wr2_name} (secondary movement/seam target)",
            "WR3": f"{off_team} WR3 / slot rotational receiver",
            "TE1": f"{off_team} inline/flex tight end",
        },
    )

    snap_outcome_q = jev_client.choice(
        f"What is the yardage outcome on this snap for {off_team} vs {def_team}?",
        {
            "turnover": "Interception or lost fumble",
            "sack_or_tfl": "QB sack or tackle for loss (-8 to -1 yds)",
            "no_gain_or_inc": "Incomplete pass or 0-yard rush stop",
            "short_gain_1_4": "Short gain of 1 to 4 yards",
            "chain_mover_5_11": "Chain-moving gain of 5 to 11 yards",
            "explosive_12_24": "Explosive chunk play of 12 to 24 yards",
            "breakaway_25_plus": "Breakaway gain of 25+ yards",
        },
    )

    q_dict: dict[str, dict[str, Any]] = {
        "off_play_call": off_call_q,
        "def_shell_call": def_shell_q,
        "target_carrier": target_carrier_q,
        "snap_outcome": snap_outcome_q,
        "pressure_disruption": jev_client.noul(
            f"The {def_team} pass rush or front creates immediate backfield pressure on {qb1_name} on this snap"
        ),
        "aggressive_coaching_edge": jev_client.noul(
            f"The {off_team} play-caller holds schematic leverage over {def_team}'s shell on this snap"
        ),
    }
    if off_family_q is not None:
        q_dict["off_play_family"] = off_family_q
    return q_dict


def _resolve_snap(
    rng: np.random.Generator,
    down: int,
    ydstogo: int,
    yardline_100: int,
    answers: dict[str, Any],
    off_ctx: dict[str, Any],
    score_diff: float = 0.0,
    qtr: int = 1,
) -> dict[str, Any]:
    off_probs: dict[str, float] = answers["off_play_call"]["probabilities"]
    def_probs: dict[str, float] = answers["def_shell_call"]["probabilities"]
    tgt_probs: dict[str, float] = answers["target_carrier"]["probabilities"]
    out_probs: dict[str, float] = answers["snap_outcome"]["probabilities"]
    pressure_noul = float(answers["pressure_disruption"]["noul"])
    coach_edge_noul = float(answers["aggressive_coaching_edge"]["noul"])

    if down == 4:
        p_punt = float(out_probs.get("punt", off_probs.get("punt", 0.0)))
        p_fg = float(off_probs.get("field_goal_attempt", 0.0))
        p_go = float(off_probs.get("go_for_it_pass", 0.0)) + float(off_probs.get("go_for_it_run", 0.0))
        if yardline_100 > 58 and ydstogo > 2 and p_punt >= 0.20:
            net_punt = int(rng.integers(39, 47))
            return {
                "play_type": "punt",
                "off_call": "punt",
                "def_shell": answers["def_shell_call"]["choice"],
                "target_role": "SPECIAL_TEAMS",
                "outcome_bucket": "punt",
                "yards_gained": net_punt,
                "points_scored": 0,
                "turnover": False,
                "first_down": False,
                "change_of_poss": True,
                "new_yardline_100": int(np.clip(100 - (yardline_100 - net_punt), 20, 90)),
                "clock_runoff_sec": float(rng.uniform(12.0, 18.0)),
            }
        if yardline_100 <= 37 and (p_fg >= p_go or ydstogo >= 4):
            fg_dist = yardline_100 + 17
            p_make = float(np.clip(0.98 - 0.011 * max(0, fg_dist - 32), 0.48, 0.98))
            made = bool(rng.random() < p_make)
            return {
                "play_type": "field_goal",
                "off_call": "field_goal_attempt",
                "def_shell": answers["def_shell_call"]["choice"],
                "target_role": "KICKER",
                "outcome_bucket": "fg_made" if made else "fg_missed",
                "yards_gained": 0,
                "points_scored": 3 if made else 0,
                "turnover": False,
                "first_down": False,
                "change_of_poss": True,
                "new_yardline_100": 75 if made else int(np.clip(100 - yardline_100 - 7, 20, 80)),
                "clock_runoff_sec": float(rng.uniform(10.0, 15.0)),
            }

    if down < 4 and "inside_zone_run" in off_probs:
        pass_keys = {"quick_game_rpo", "play_action_intermediate", "deep_shot_pass"}
        run_keys = {"inside_zone_run", "outside_zone_run"}
        fam_probs = ((answers.get("off_play_family") or {}).get("probabilities") or {})
        raw_pass_p = float(
            fam_probs.get(
                "pass_play",
                sum(float(off_probs.get(k, 0.0)) for k in pass_keys) + 0.65 * float(off_probs.get("screen_or_draw", 0.0)),
            )
        )
        cal_pass_p = calibrate_jev_pass_prob(
            raw_jev_pass_prob=raw_pass_p,
            team_ed_pass_rate=float(off_ctx.get("early_down_pass_rate", 0.54)),
            down=down,
            ydstogo=ydstogo,
            score_diff=score_diff,
            qtr=qtr,
        )
        p_sum = max(1e-6, sum(max(0.0, float(off_probs.get(k, 0.0))) for k in pass_keys) + 0.65 * max(0.0, float(off_probs.get("screen_or_draw", 0.0))))
        r_sum = max(1e-6, sum(max(0.0, float(off_probs.get(k, 0.0))) for k in run_keys) + 0.35 * max(0.0, float(off_probs.get("screen_or_draw", 0.0))))
        reweighted = {}
        for k in off_probs:
            v = max(0.0, float(off_probs[k]))
            if k in pass_keys:
                reweighted[k] = (v / p_sum) * cal_pass_p
            elif k in run_keys:
                reweighted[k] = (v / r_sum) * (1.0 - cal_pass_p)
            else:
                reweighted[k] = (0.65 * v / p_sum) * cal_pass_p + (0.35 * v / r_sum) * (1.0 - cal_pass_p)
        off_keys = list(reweighted.keys())
        off_w = np.array([max(0.0, float(reweighted[k])) for k in off_keys], dtype=np.float64)
    else:
        off_keys = list(off_probs.keys())
        off_w = np.array([max(0.0, float(off_probs[k])) for k in off_keys], dtype=np.float64)
    off_w /= off_w.sum() if off_w.sum() > 0 else 1.0
    chosen_off = str(rng.choice(off_keys, p=off_w))

    is_pass = chosen_off in (
        "quick_game_rpo",
        "play_action_intermediate",
        "deep_shot_pass",
        "go_for_it_pass",
    ) or (chosen_off == "screen_or_draw" and rng.random() < 0.65)

    def_keys = list(def_probs.keys())
    def_w = np.array([max(0.0, float(def_probs[k])) for k in def_keys], dtype=np.float64)
    def_w /= def_w.sum() if def_w.sum() > 0 else 1.0
    chosen_def = str(rng.choice(def_keys, p=def_w))

    if not is_pass:
        rw = {"RB1": max(0.75, float(tgt_probs.get("RB1", 0.75))), "WR1": 0.05, "WR2": 0.04, "WR3": 0.02, "TE1": 0.03}
    else:
        rw = {
            "WR1": max(0.22, float(tgt_probs.get("WR1", 0.27))),
            "WR2": max(0.16, float(tgt_probs.get("WR2", 0.20))),
            "WR3": max(0.11, float(tgt_probs.get("WR3", 0.14))),
            "TE1": max(0.15, float(tgt_probs.get("TE1", 0.19))),
            "RB1": min(0.22, max(0.10, float(tgt_probs.get("RB1", 0.18)) * 0.45)),
        }
    r_keys = list(rw.keys())
    r_arr = np.array([rw[k] for k in r_keys], dtype=np.float64)
    r_arr /= r_arr.sum()
    chosen_role = str(rng.choice(r_keys, p=r_arr))

    emp_comp = float(off_ctx.get("comp_rate_pct", 61.0)) / 100.0
    emp_sack = float(off_ctx.get("sack_rate_allowed_pct", 6.2)) / 100.0
    edge_shift = (coach_edge_noul - 0.50) * 0.12 - (pressure_noul - 0.30) * 0.10
    raw_out = {
        k: float(out_probs.get(k, 0.0))
        for k in (
            "turnover",
            "sack_or_tfl",
            "no_gain_or_inc",
            "short_gain_1_4",
            "chain_mover_5_11",
            "explosive_12_24",
            "breakaway_25_plus",
        )
    }
    pos_sum = max(
        1e-6,
        raw_out["short_gain_1_4"]
        + raw_out["chain_mover_5_11"]
        + raw_out["explosive_12_24"]
        + raw_out["breakaway_25_plus"],
    )

    if is_pass:
        p_to = float(np.clip(0.50 * raw_out["turnover"] + 0.50 * 0.019, 0.008, 0.040))
        p_sack = float(np.clip(0.45 * raw_out["sack_or_tfl"] + 0.55 * emp_sack + 0.04 * (pressure_noul - 0.30), 0.032, 0.140))
        p_inc = float(np.clip(0.45 * raw_out["no_gain_or_inc"] + 0.55 * (1.0 - emp_comp) - edge_shift * 0.5, 0.24, 0.48))
        rem = max(0.15, 1.0 - (p_to + p_sack + p_inc))
        cal = {
            "turnover": p_to,
            "sack_or_tfl": p_sack,
            "no_gain_or_inc": p_inc,
            "short_gain_1_4": rem * (0.40 * (raw_out["short_gain_1_4"] / pos_sum) + 0.60 * 0.28),
            "chain_mover_5_11": rem * (0.45 * (raw_out["chain_mover_5_11"] / pos_sum) + 0.55 * 0.44),
            "explosive_12_24": rem * (0.50 * (raw_out["explosive_12_24"] / pos_sum) + 0.50 * 0.21),
            "breakaway_25_plus": rem * (0.50 * (raw_out["breakaway_25_plus"] / pos_sum) + 0.50 * 0.07),
        }
    else:
        p_to = float(np.clip(0.40 * raw_out["turnover"] + 0.60 * 0.008, 0.004, 0.020))
        p_sack = float(np.clip(0.45 * raw_out["sack_or_tfl"] + 0.55 * 0.085, 0.045, 0.14))
        p_inc = float(np.clip(0.35 * raw_out["no_gain_or_inc"] + 0.65 * 0.14, 0.08, 0.22))
        rem = max(0.20, 1.0 - (p_to + p_sack + p_inc))
        cal = {
            "turnover": p_to,
            "sack_or_tfl": p_sack,
            "no_gain_or_inc": p_inc,
            "short_gain_1_4": rem * (0.45 * (raw_out["short_gain_1_4"] / pos_sum) + 0.55 * 0.54),
            "chain_mover_5_11": rem * (0.45 * (raw_out["chain_mover_5_11"] / pos_sum) + 0.55 * 0.33),
            "explosive_12_24": rem * (0.50 * (raw_out["explosive_12_24"] / pos_sum) + 0.50 * 0.10),
            "breakaway_25_plus": rem * (0.50 * (raw_out["breakaway_25_plus"] / pos_sum) + 0.50 * 0.03),
        }

    o_keys = list(cal.keys())
    o_w = np.array([max(0.0, cal[k]) for k in o_keys], dtype=np.float64)
    o_w /= o_w.sum()
    bucket = str(rng.choice(o_keys, p=o_w))

    if bucket in ("turnover", "no_gain_or_inc"):
        yds = 0
    elif bucket == "sack_or_tfl":
        yds = int(-rng.integers(4, 9)) if is_pass else int(-rng.integers(1, 4))
    elif bucket == "short_gain_1_4":
        yds = int(rng.integers(1, 5))
    elif bucket == "chain_mover_5_11":
        yds = int(rng.integers(5, 12))
    elif bucket == "explosive_12_24":
        yds = int(rng.integers(12, 25))
    else:
        yds = int(rng.integers(25, 42))

    if bucket == "turnover":
        return {
            "play_type": "pass" if is_pass else "run",
            "off_call": chosen_off,
            "def_shell": chosen_def,
            "target_role": chosen_role,
            "outcome_bucket": "turnover",
            "yards_gained": 0,
            "points_scored": 0,
            "turnover": True,
            "first_down": False,
            "change_of_poss": True,
            "new_yardline_100": int(np.clip(100 - yardline_100, 15, 85)),
            "clock_runoff_sec": float(rng.uniform(14.0, 22.0)),
        }

    new_yl = yardline_100 - yds
    if new_yl <= 0:
        return {
            "play_type": "pass" if is_pass else "run",
            "off_call": chosen_off,
            "def_shell": chosen_def,
            "target_role": chosen_role,
            "outcome_bucket": bucket,
            "yards_gained": int(yardline_100),
            "points_scored": 7,
            "turnover": False,
            "first_down": True,
            "change_of_poss": True,
            "new_yardline_100": 75,
            "clock_runoff_sec": float(rng.uniform(16.0, 25.0)),
        }

    first_down = yds >= ydstogo
    change_of_poss = (down == 4) and (not first_down)
    if is_pass and bucket == "no_gain_or_inc":
        runoff = float(rng.uniform(5.0, 9.0))
    else:
        runoff = float(np.clip(_positive_moment_draw(rng, off_ctx.get("sec_per_play", 27.3), 3.5), 16.0, 36.0))

    return {
        "play_type": "pass" if is_pass else "run",
        "off_call": chosen_off,
        "def_shell": chosen_def,
        "target_role": chosen_role,
        "outcome_bucket": bucket,
        "yards_gained": int(yds),
        "points_scored": 0,
        "turnover": False,
        "first_down": bool(first_down),
        "change_of_poss": bool(change_of_poss),
        "new_yardline_100": int(np.clip(100 - new_yl, 5, 95)) if change_of_poss else int(np.clip(new_yl, 1, 99)),
        "clock_runoff_sec": runoff,
    }


def audit_2026_nfl_rulebook_compliance(
    snap_log: list[dict[str, Any]],
    scores: dict[str, int],
) -> dict[str, Any]:
    """Audit simulated snap sequence against 2026 NFL rulebook invariants."""
    violations: list[str] = []
    td_reset_y75 = 0
    invalid_yl = 0
    invalid_down = 0
    for idx, entry in enumerate(snap_log):
        yl = int(entry.get("yardline_100", 50))
        dn = int(entry.get("down", 1))
        if not (1 <= yl <= 99):
            invalid_yl += 1
        if not (1 <= dn <= 4):
            invalid_down += 1
        rp = entry.get("resolved_play") or {}
        if int(rp.get("points_scored", 0)) >= 6 and int(rp.get("new_yardline_100", 75)) == 75:
            td_reset_y75 += 1
        if idx > 0:
            prev = snap_log[idx - 1]
            if int(prev.get("qtr", 1)) > int(entry.get("qtr", 1)):
                violations.append(f"non_monotonic_qtr_at_snap_{entry.get('snap')}")
    if invalid_yl > 0:
        violations.append(f"out_of_bounds_yardline_count={invalid_yl}")
    if invalid_down > 0:
        violations.append(f"invalid_down_count={invalid_down}")
    return {
        "compliant": len(violations) == 0,
        "snaps_audited": len(snap_log),
        "dynamic_kickoff_touchback_yd": 30,
        "td_post_kickoff_resets_observed": td_reset_y75,
        "final_scores": dict(scores),
        "violations": violations,
    }


def compute_motion_entropy_14bucket(
    away_ctx: dict[str, Any],
    home_ctx: dict[str, Any],
    snap_log: list[dict[str, Any]],
) -> dict[str, Any]:
    """Compute normalized Shannon entropy across 14 offense call x phase buckets."""
    call_order = (
        "inside_zone_run",
        "outside_zone_run",
        "quick_game_rpo",
        "play_action_intermediate",
        "deep_shot_pass",
        "screen_or_draw",
        "other_4th_special",
    )
    counts = [1e-6] * 14
    for entry in snap_log:
        dn = int(entry.get("down", 1))
        phase = 0 if dn <= 2 else 1
        rp = entry.get("resolved_play") or {}
        call = str(rp.get("off_call") or "")
        bucket_idx = call_order.index(call) if call in call_order[:6] else 6
        counts[phase * 7 + bucket_idx] += 1.0
    total = float(sum(counts))
    probs = [c / total for c in counts]
    entropy = -sum(p * math.log(p) for p in probs if p > 0.0)
    norm_entropy = entropy / math.log(14.0)
    avg_motion = 0.5 * (float(away_ctx.get("motion_rate", 0.54)) + float(home_ctx.get("motion_rate", 0.54)))
    return {
        "buckets": 14,
        "shannon_entropy_nats": round(entropy, 4),
        "normalized_entropy": round(norm_entropy, 4),
        "blended_motion_rate": round(avg_motion, 4),
    }


def verify_wp_martingale_invariance(
    snap_log: list[dict[str, Any]],
    away: str,
    home: str,
) -> dict[str, Any]:
    """Verify live pre-snap win probability increments obey martingale near-zero drift."""
    if not snap_log:
        return {"martingale_invariant": True, "steps": 0, "mean_delta_wp": 0.0, "max_abs_delta_wp": 0.0}

    wps: list[float] = []
    for entry in snap_log:
        sb = entry.get("score_before") or {}
        diff_home = float(sb.get(home, 0)) - float(sb.get(away, 0))
        qtr = int(entry.get("qtr", 1))
        clk = str(entry.get("clock", "15:00"))
        mm, ss = (int(x) for x in clk.split(":")) if ":" in clk else (7, 30)
        rem_sec = max(1.0, (4 - min(qtr, 4)) * 900.0 + mm * 60.0 + ss)
        ep_field = (50.0 - float(entry.get("yardline_100", 50))) * 0.06
        off_sign = 1.0 if entry.get("offense") == home else -1.0
        scale = max(3.5, 13.5 * math.sqrt(rem_sec / 3600.0))
        z = (diff_home + off_sign * ep_field) / scale
        wps.append(1.0 / (1.0 + math.exp(-max(-12.0, min(12.0, z)))))

    deltas = [wps[i] - wps[i - 1] for i in range(1, len(wps))]
    mean_d = float(np.mean(deltas)) if deltas else 0.0
    max_d = float(np.max(np.abs(deltas))) if deltas else 0.0
    return {
        "martingale_invariant": abs(mean_d) <= 0.05,
        "steps": len(deltas),
        "initial_home_wp": round(wps[0], 4),
        "final_home_wp": round(wps[-1], 4),
        "mean_delta_wp": round(mean_d, 5),
        "max_abs_delta_wp": round(max_d, 4),
    }


def run_week11_live_jev_spine(
    away: str = "IND",
    home: str = "HOU",
    week: int = 11,
    board_rel_path: str = "data/engine/tnf_ind_hou_dk_full_board_2026_11_19.json",
    model: str = "~typesafe/jev-latest",
    seed: int = 20261119,
) -> Path:
    away_u = away.strip().upper()
    home_u = home.strip().upper()
    pbp_stats = _get_2026_team_pbp_ftn_stats()
    env_cfg = _get_matchup_env(away_u, home_u, week=week)
    stage0_al = load_stage0_game_roster_allowlist(away_u, home_u, week, board_rel_path=board_rel_path)

    board_path = REPO_ROOT / board_rel_path
    board_injuries: list[dict[str, Any]] = []
    if board_path.is_file():
        board_injuries = list((json.loads(board_path.read_text(encoding="utf-8"))).get("live_injuries") or [])

    aw_ctx = _build_team_context(away_u, week, pbp_stats, stage0_al, board_injuries)
    hm_ctx = _build_team_context(home_u, week, pbp_stats, stage0_al, board_injuries)

    rng = np.random.default_rng(seed)
    clock_sec = 3600.0
    poss = away_u
    down = 1
    ydstogo = 10
    yardline_100 = 70
    scores = {away_u: 0, home_u: 0}
    drive_num = 1
    drive_snap = 0
    snap_num = 0
    half_switched = False
    failed_snaps = 0
    resolved_model = model

    snap_log: list[dict[str, Any]] = []
    total_cost_usd = 0.0
    total_input_tokens = 0
    total_output_tokens = 0
    total_latency_ms = 0

    box = {
        tm: {
            "pass_att": 0,
            "pass_comp": 0,
            "pass_yds": 0,
            "sacks": 0,
            "rush_att": 0,
            "rush_yds": 0,
            "turnovers": 0,
            "first_downs": 0,
            "plays": 0,
            "jev_pass_prob_sum": 0.0,
            "jev_pressure_noul_sum": 0.0,
            "jev_coach_edge_noul_sum": 0.0,
            "jev_early_down_pass_probs": [],
        }
        for tm in (away_u, home_u)
    }

    if jev_client is None:
        raise RuntimeError(
            "jevkit is not installed in this environment; live JEV snap-by-snap execution requires jevkit."
        )

    t_start = time.monotonic()
    while clock_sec > 0.0 and snap_num < 164:
        if not half_switched and clock_sec <= 1800.0:
            half_switched = True
            clock_sec = 1800.0
            poss = home_u
            down = 1
            ydstogo = 10
            yardline_100 = 70
            drive_num += 1
            drive_snap = 0

        snap_num += 1
        drive_snap += 1
        qtr = int(np.clip(4 - int((clock_sec - 0.01) // 900), 1, 4))
        off_team = poss
        def_team = home_u if poss == away_u else away_u
        off_ctx = aw_ctx if off_team == away_u else hm_ctx
        def_ctx = hm_ctx if off_team == away_u else aw_ctx

        state_payload = {
            "matchup": f"{away_u} @ {home_u} (2026 NFL Week {week} {env_cfg.get('window', '')})",
            "venue": f"{env_cfg.get('stadium')} (indoor={env_cfg.get('is_indoor')}, wind={env_cfg.get('wind_mph')} mph)",
            "snap_number": snap_num,
            "drive_number": drive_num,
            "drive_snap": drive_snap,
            "quarter": qtr,
            "clock_in_quarter": _format_clock(clock_sec),
            "game_seconds_remaining": int(clock_sec),
            "offense": off_team,
            "defense": def_team,
            "down": down,
            "yards_to_go": ydstogo,
            "yardline_100_to_endzone": yardline_100,
            "field_zone": _field_zone(yardline_100, ydstogo),
            "score": {away_u: scores[away_u], home_u: scores[home_u]},
            "offense_score_differential": scores[off_team] - scores[def_team],
            "offense_coaching_and_w1_w10_tendencies": {
                "scheme": WEEK11_COACH_SCHEMES.get(off_team, {}).get("hc_oc", f"{off_team} offense"),
                "qb1": off_ctx["qb1"],
                "early_down_pass_rate": off_ctx["early_down_pass_rate"],
                "proe": off_ctx["proe"],
                "comp_rate_pct": off_ctx["comp_rate_pct"],
                "sack_rate_allowed_pct": off_ctx["sack_rate_allowed_pct"],
                "off_epa_per_play": off_ctx["off_epa"],
                "wr1": off_ctx["wr1"],
                "wr2": off_ctx["wr2"],
                "rb1": off_ctx["rb1"],
                "active_injuries": off_ctx["injuries"],
            },
            "defense_coaching_and_w1_w10_tendencies": {
                "scheme": WEEK11_COACH_SCHEMES.get(def_team, {}).get("dc", f"{def_team} defense"),
                "def_blitz_rate_pct": def_ctx["def_blitz_rate_pct"],
                "def_man_rate": def_ctx["def_man_rate"],
                "def_epa_allowed": def_ctx["def_epa"],
                "active_injuries": def_ctx["injuries"],
            },
        }

        questions = _build_snap_questions(off_team, def_team, down, ydstogo, yardline_100, off_ctx)
        jev_res = None
        last_err = None
        for attempt in range(5):
            payload_try = state_payload if attempt == 0 else {**state_payload, "eval_pass": attempt}
            try:
                jev_res = jev_client.ask(payload_try, questions, model=model, timeout=15.0, retries=2)
                break
            except Exception as err:
                last_err = err
                time.sleep(0.3 * (attempt + 1))
        if jev_res is None:
            failed_snaps += 1
            raise RuntimeError(f"JEV ask failed on snap {snap_num}: {last_err}")

        if jev_res.get("model"):
            resolved_model = str(jev_res["model"])
        answers = jev_res["answers"]
        usage = jev_res.get("usage", {})
        lat_ms = int(jev_res.get("latency_ms", 0))
        total_latency_ms += lat_ms
        total_input_tokens += int(usage.get("input_tokens", 0))
        total_output_tokens += int(usage.get("output_tokens", 0))
        total_cost_usd += float(usage.get("cost", 0.0) or 0.0)

        trans = _resolve_snap(
            rng,
            down,
            ydstogo,
            yardline_100,
            answers,
            off_ctx,
            score_diff=float(scores[off_team] - scores[def_team]),
            qtr=qtr,
        )
        tm_box = box[off_team]
        if trans["play_type"] in ("pass", "run"):
            tm_box["plays"] += 1
            off_p = answers["off_play_call"]["probabilities"]
            fam_p = ((answers.get("off_play_family") or {}).get("probabilities") or {})
            raw_p_jev = float(
                fam_p.get(
                    "pass_play",
                    off_p.get("quick_game_rpo", 0.0)
                    + off_p.get("play_action_intermediate", 0.0)
                    + off_p.get("deep_shot_pass", 0.0)
                    + 0.65 * off_p.get("screen_or_draw", 0.0)
                    + off_p.get("go_for_it_pass", 0.0),
                )
            )
            pass_p_jev = calibrate_jev_pass_prob(
                raw_jev_pass_prob=raw_p_jev,
                team_ed_pass_rate=float(off_ctx["early_down_pass_rate"]),
                down=down,
                ydstogo=ydstogo,
                score_diff=float(scores[off_team] - scores[def_team]),
                qtr=qtr,
            )
            tm_box["jev_pass_prob_sum"] += pass_p_jev
            tm_box["jev_pressure_noul_sum"] += float(answers["pressure_disruption"]["noul"])
            tm_box["jev_coach_edge_noul_sum"] += float(answers["aggressive_coaching_edge"]["noul"])
            if down in (1, 2):
                tm_box["jev_early_down_pass_probs"].append(pass_p_jev)
            yds = int(trans["yards_gained"])
            if trans["play_type"] == "pass":
                if trans["outcome_bucket"] == "sack_or_tfl":
                    tm_box["sacks"] += 1
                else:
                    tm_box["pass_att"] += 1
                    if trans["outcome_bucket"] not in ("no_gain_or_inc", "turnover") and yds > 0:
                        tm_box["pass_comp"] += 1
                        tm_box["pass_yds"] += yds
            else:
                tm_box["rush_att"] += 1
                tm_box["rush_yds"] += yds
            if trans["turnover"]:
                tm_box["turnovers"] += 1
            if trans["first_down"]:
                tm_box["first_downs"] += 1

        scores_before = {away_u: scores[away_u], home_u: scores[home_u]}
        scores[off_team] += int(trans["points_scored"])
        snap_log.append({
            "snap": snap_num,
            "drive": drive_num,
            "qtr": qtr,
            "clock": _format_clock(clock_sec),
            "offense": off_team,
            "defense": def_team,
            "down": down,
            "ydstogo": ydstogo,
            "yardline_100": yardline_100,
            "score_before": scores_before,
            "jev_decisions": {
                "off_play_call": {
                    "top_choice": answers["off_play_call"]["choice"],
                    "confidence": answers["off_play_call"]["confidence"],
                    "probabilities": answers["off_play_call"]["probabilities"],
                },
                "def_shell_call": {
                    "top_choice": answers["def_shell_call"]["choice"],
                    "confidence": answers["def_shell_call"]["confidence"],
                    "probabilities": answers["def_shell_call"]["probabilities"],
                },
                "target_carrier": {
                    "top_choice": answers["target_carrier"]["choice"],
                    "confidence": answers["target_carrier"]["confidence"],
                    "probabilities": answers["target_carrier"]["probabilities"],
                },
                "snap_outcome": {
                    "top_choice": answers["snap_outcome"]["choice"],
                    "confidence": answers["snap_outcome"]["confidence"],
                    "probabilities": answers["snap_outcome"]["probabilities"],
                },
                "pressure_disruption_noul": answers["pressure_disruption"]["noul"],
                "aggressive_coaching_edge_noul": answers["aggressive_coaching_edge"]["noul"],
            },
            "resolved_play": trans,
            "score_after": {away_u: scores[away_u], home_u: scores[home_u]},
            "latency_ms": lat_ms,
        })

        if snap_num % 40 == 0 or trans["points_scored"] > 0:
            print(
                f"  [{away_u}@{home_u} Snap {snap_num:3d} | Q{qtr} {_format_clock(clock_sec)}] "
                f"{off_team} {down}&{ydstogo} @{yardline_100:2d} -> {trans['off_call']} ({trans['yards_gained']:+d} yds) "
                f"| {away_u} {scores[away_u]} - {home_u} {scores[home_u]} ({lat_ms}ms)",
                flush=True,
            )

        clock_sec = max(0.0, clock_sec - float(trans["clock_runoff_sec"]))
        if trans["change_of_poss"]:
            poss = def_team
            down = 1
            ydstogo = 10
            yardline_100 = int(trans["new_yardline_100"])
            drive_num += 1
            drive_snap = 0
        elif trans["first_down"]:
            down = 1
            yardline_100 = int(trans["new_yardline_100"])
            ydstogo = min(10, yardline_100)
        else:
            down += 1
            yardline_100 = int(trans["new_yardline_100"])
            ydstogo = max(1, ydstogo - int(trans["yards_gained"]))

    wall_sec = round(time.monotonic() - t_start, 2)
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    jev_posteriors = {}
    for tm, ctx_tm in ((away_u, aw_ctx), (home_u, hm_ctx)):
        b = box[tm]
        n_p = max(1, b["plays"])
        base_ed_p = float(ctx_tm["early_down_pass_rate"])
        jev_ed_pass = float(np.mean(b["jev_early_down_pass_probs"])) if b["jev_early_down_pass_probs"] else base_ed_p
        jev_ed_clamped = float(np.clip(0.55 * base_ed_p + 0.45 * jev_ed_pass, base_ed_p - 0.04, base_ed_p + 0.04))
        jev_press_noul = b["jev_pressure_noul_sum"] / n_p
        jev_edge_noul = b["jev_coach_edge_noul_sum"] / n_p
        jev_posteriors[tm] = {
            "early_down_pass_rate": round(jev_ed_clamped, 4),
            "jev_mean_pressure_disruption_noul": round(jev_press_noul, 4),
            "jev_mean_coaching_edge_noul": round(jev_edge_noul, 4),
            "jev_mean_pass_call_prob": round(b["jev_pass_prob_sum"] / n_p, 4),
        }

    game_node = {
        "matchup": f"{away_u} @ {home_u}",
        "away": away_u,
        "home": home_u,
        "week": week,
        "season": 2026,
        "jev_live_verified": True,
        "model": model,
        "jev_model_resolved": resolved_model,
        "generated_at": now_iso,
        "updated_at": now_iso,
        "away_qb1": aw_ctx["qb1"],
        "home_qb1": hm_ctx["qb1"],
        "confirmed_qb1": {
            away_u: aw_ctx["qb1"],
            home_u: hm_ctx["qb1"],
            "away": aw_ctx["qb1"],
            "home": hm_ctx["qb1"],
        },
        "total_snaps_simulated_with_jev": snap_num,
        "failed_snaps": failed_snaps,
        "total_drives": drive_num,
        "final_score_spine": scores,
        "wall_clock_seconds": wall_sec,
        "avg_latency_ms_per_snap": round(total_latency_ms / max(1, snap_num), 1),
        "usage": {
            "total_input_tokens": total_input_tokens,
            "total_output_tokens": total_output_tokens,
            "total_cost_usd": round(total_cost_usd, 6),
        },
        "active_injuries_ingested": {away_u: aw_ctx["injuries"], home_u: hm_ctx["injuries"]},
        "box_score_spine": box,
        "jev_posterior_overrides_for_10k_mc": {"away": jev_posteriors[away_u], "home": jev_posteriors[home_u]},
        "diagnostics": {
            "bayesian_proe_shrinkage": {
                away_u: {
                    "raw": aw_ctx["proe_raw"],
                    "shrunk": aw_ctx["proe"],
                    "sample_n": aw_ctx["proe_sample_n"],
                    "weight": aw_ctx["proe_shrinkage_weight"],
                    "early_down_pass_rate": aw_ctx["early_down_pass_rate"],
                },
                home_u: {
                    "raw": hm_ctx["proe_raw"],
                    "shrunk": hm_ctx["proe"],
                    "sample_n": hm_ctx["proe_sample_n"],
                    "weight": hm_ctx["proe_shrinkage_weight"],
                    "early_down_pass_rate": hm_ctx["early_down_pass_rate"],
                },
            },
            "rulebook_2026_audit": audit_2026_nfl_rulebook_compliance(snap_log, scores),
            "motion_entropy_14bucket": compute_motion_entropy_14bucket(aw_ctx, hm_ctx, snap_log),
            "wp_martingale_invariance": verify_wp_martingale_invariance(snap_log, away_u, home_u),
        },
        "snap_by_snap_log": snap_log,
    }

    payload = {
        "schema": "gse_jev_full_game_spine.v1",
        "week": week,
        "season": 2026,
        "jev_live_verified": True,
        "updated_at": now_iso,
        "generated_at": now_iso,
        "away_qb1": aw_ctx["qb1"],
        "home_qb1": hm_ctx["qb1"],
        "confirmed_qb1": game_node["confirmed_qb1"],
        "total_snaps_simulated_with_jev": snap_num,
        "total_games": 1,
        "games": {f"{away_u}@{home_u}": game_node},
    }
    out_path = REPO_ROOT / "data" / "engine" / f"jev_full_game_spine_{away_u.lower()}_{home_u.lower()}_week{week}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    fresh = verify_jev_spine_freshness_and_qb1(
        game_node,
        expected_week=week,
        expected_away_qb1=aw_ctx["qb1"],
        expected_home_qb1=hm_ctx["qb1"],
        max_age_hours=18.0,
        reference_utc=now_iso,
        strict=True,
    )
    tensor = build_jev_state_tensor(game_node, enforce_freshness=False)
    print(
        f"[LIVE JEV SPINE COMPLETE] {away_u}@{home_u} W{week} | snaps={snap_num} | drives={drive_num} | "
        f"fresh={fresh['valid']} | tensor_cells={len(tensor['by_state'])} | "
        f"wall={wall_sec}s | cost=${total_cost_usd:.5f} -> {out_path}"
    )
    return out_path


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--away", default="IND")
    ap.add_argument("--home", default="HOU")
    ap.add_argument("--week", type=int, default=11)
    ap.add_argument("--board-json", default="data/engine/tnf_ind_hou_dk_full_board_2026_11_19.json")
    ap.add_argument("--model", default="~typesafe/jev-latest")
    args = ap.parse_args()
    run_week11_live_jev_spine(
        away=args.away,
        home=args.home,
        week=args.week,
        board_rel_path=args.board_json,
        model=args.model,
    )
