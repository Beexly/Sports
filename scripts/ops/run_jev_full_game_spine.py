#!/usr/bin/env python3
"""
GSE Stage 2A — Full-Game Snap-by-Snap JEV Decision Spine Simulator
===================================================================
Executes a complete NFL game from Snap 1 (Q1 15:00) through the final snap (Q4 0:00)
sequentially through TypeSafe Jev (`jevkit.client.ask`, model `typesafe/jev-1.14` /
`~typesafe/jev-latest`).

On EVERY SINGLE SNAP of the game (~150-165 snaps), Jev evaluates the live pre-snap
state (quarter, clock, possession, down, distance, field position, score differential,
drive context, real 2026 W1-W7 & W6-W7 coaching/film tendencies, trench pressure rates,
and active Week 8 injury designations) and returns calibrated probability distributions
(`probabilities` + `noul`) in a single forward pass for:
  1. `off_play_call` (`choice`)
  2. `def_shell_call` (`choice`)
  3. `target_carrier` (`choice`)
  4. `snap_outcome` (`choice`)
  5. `pressure_disruption` (`noul`)
  6. `aggressive_coaching_edge` (`noul`)

Those live snap-by-snap Jev distributions both:
  (a) Advance the full play-by-play game spine from Q1 15:00 to Q4 0:00, logging every
      snap, drive, play call, defensive shell, target/ballcarrier, and yardage outcome.
  (b) Populate the state-conditioned Jev Transition Tensor (`w1_w7_override` + Jev
      posteriors) that drives the 10,000-world 175-snap PBP Monte Carlo engine in
      `scripts/ops/gse_coach_mind_simulator.py`.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import csv
import json
import sys
import threading
import time
from pathlib import Path
from typing import Any

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
HERMES_JEV_PATH = Path(r"C:\Users\Garrett\hermes-jev-skills")
if HERMES_JEV_PATH.exists() and str(HERMES_JEV_PATH) not in sys.path:
    sys.path.insert(0, str(HERMES_JEV_PATH))

from jevkit import client as jev_client  # noqa: E402

TRENDS_JSON_PATH = REPO_ROOT / "data" / "engine" / "nfl_2026_w1_w7_trends_and_usage.json"
INJURIES_CSV_PATH = REPO_ROOT / "data" / "nflverse" / "injuries_2026.csv"
DEFAULT_OUT_PATH = REPO_ROOT / "data" / "engine" / "nfl_2026_w8_jev_full_game_spine.json"

WEEK8_ALL_MATCHUPS: list[tuple[str, str]] = [
    ("CAR", "GB"),
    ("BAL", "BUF"),
    ("TEN", "CIN"),
    ("ARI", "DAL"),
    ("MIN", "DET"),
    ("LV", "NYJ"),
    ("CLE", "PIT"),
    ("ATL", "TB"),
    ("IND", "JAX"),
    ("LAC", "LAR"),
    ("KC", "DEN"),
    ("NE", "MIA"),
    ("PHI", "WSH"),
    ("CHI", "SEA"),
]


COACH_ARCHETYPES: dict[str, dict[str, str]] = {
    "CAR": {
        "hc_oc": "Dave Canales (West Coast zone-action + RPO quick game, heavy RB1 Chuba Hubbard workload)",
        "dc": "Ejiro Evero (Fangio 2-high match quarters + simulated creeper pressures)",
    },
    "GB": {
        "hc_oc": "Matt LaFleur (Shanahan/LaFleur illusion-of-complexity motion + play-action intermediate crossers)",
        "dc": "Jeff Hafley (Aggressive 33.2% blitz + single-high Cover-1/Cover-3 vision & break)",
    },
    "BAL": {
        "hc_oc": "John Harbaugh / Todd Monken (Heavy pistol/12-personnel power-option + vertical play-action)",
        "dc": "Zach Orr (Disguised split-safety simulated pressures + nickel mug fronts)",
    },
    "BUF": {
        "hc_oc": "Sean McDermott / Joe Brady (11/12-personnel gap/duo rush + Josh Allen intermediate/scramble drill)",
        "dc": "Bobby Babich (Two-high quarters/Cover-2 shell + disciplined 4-man rush lane integrity)",
    },
    "TEN": {
        "hc_oc": "Brian Callahan (West Coast 11-personnel horizontal stretch + quick-game RPO)",
        "dc": "Dennard Wilson (Aggressive press-man + interior stunted blitzes)",
    },
    "CIN": {
        "hc_oc": "Zac Taylor / Dan Pitcher (Shotgun spread empty/11-personnel high-PROE vertical & choice routes)",
        "dc": "Al Golden (Hybrid Cover-3/Quarters with late safety rotation)",
    },
    "ARI": {
        "hc_oc": "Jonathan Gannon / Drew Petzing (12/13-personnel heavy motion + gap run + Trey McBride seam)",
        "dc": "Nick Rallis (3-safety disguised two-high shells + simulated creeper blitzes)",
    },
    "DAL": {
        "hc_oc": "Brian Schottenheimer (High-tempo 11-personnel vertical isolation + CeeDee Lamb slot motion)",
        "dc": "Matt Eberflus (Cover-3/Tampa-2 zone discipline + 4-man edge speed rush)",
    },
    "MIN": {
        "hc_oc": "Kevin O'Connell (McVay/O'Connell condensed formations + deep play-action digs/crossers)",
        "dc": "Brian Flores (League-high zero/fire-zone blitzes + 8-in-box mugged A-gap drop-8 traps)",
    },
    "DET": {
        "hc_oc": "Dan Campbell (Under-center duo/outside zone + high-motion play-action dagger/leak concepts)",
        "dc": "Kelvin Sheppard (Aggressive single-high press-man + interior blitz pressure)",
    },
    "LV": {
        "hc_oc": "Pete Carroll / Chip Kelly (Spread tempo zone-read + tight-end seam/screen game)",
        "dc": "Patrick Graham (Multiple 3-4/4-2-5 hybrid fronts + Cover-3/Cover-1 robber)",
    },
    "NYJ": {
        "hc_oc": "Aaron Glenn / Tanner Engstrand (Outside zone + play-action boot + Garrett Wilson target funnel)",
        "dc": "Steve Wilks (4-man wide-9 pass rush + pattern-match quarters/Cover-3)",
    },
    "CLE": {
        "hc_oc": "Kevin Stefanski (Wide-zone play-action boot + 12-personnel tight end crossers)",
        "dc": "Jim Schwartz (Wide-9 attack front + single-high man-free/Cover-3 press)",
    },
    "PIT": {
        "hc_oc": "Mike Tomlin / Arthur Smith (Heavy 12/13-personnel outside zone + play-action deep over routes)",
        "dc": "Teryl Austin (Single-high Cover-3/Cover-1 + edge blitzes)",
    },
    "ATL": {
        "hc_oc": "Raheem Morris / Zac Robinson (McVay pistol/shotgun motion + Bijan Robinson wide zone + PA crossers)",
        "dc": "Jeff Ulbrich (Aggressive 4-3 attacking front + Cover-3/Quarters disguised blitzes)",
    },
    "TB": {
        "hc_oc": "Todd Bowles / Josh Grizzard (11-personnel motion stacks + Baker Mayfield quick rhythm & slot fades)",
        "dc": "Todd Bowles (Exotic overload zone/man blitzes + 2-high quarters shell)",
    },
    "IND": {
        "hc_oc": "Shane Steichen (RPO/zone-read power + vertical shot plays)",
        "dc": "Lou Anarumo (Chameleon coverage shells + half-field bracket + timely slot blitzes)",
    },
    "JAX": {
        "hc_oc": "Liam Coen (Shanahan/McVay motion shifts + outside zone + Brian Thomas Jr. vertical/crosser)",
        "dc": "Anthony Campanile (Aggressive 4-man rush + Cover-3/match quarters)",
    },
    "LAC": {
        "hc_oc": "Jim Harbaugh / Greg Roman (Heavy gap/power run + play-action deep posts to Ladd McConkey)",
        "dc": "Jesse Minter (Macdonald/Minter 2-high quarters disguise + simulated creeper pressures)",
    },
    "LAR": {
        "hc_oc": "Sean McVay (Condensed 11-personnel jet motion + duo rush + Puka Nacua option/dig routes)",
        "dc": "Chris Shula (3-4 disguised two-high shells + stunt/creeper rush)",
    },
    "KC": {
        "hc_oc": "Andy Reid (12/13-personnel motion + RPO/option routes + high PROE)",
        "dc": "Steve Spagnuolo (Exotic slot/safety blitzes + simulated zero/fire-zone traps)",
    },
    "DEN": {
        "hc_oc": "Sean Payton (Multiple personnel groupings + quick rhythm screen/boot game)",
        "dc": "Vance Joseph (High-pressure man blitz + Patrick Surtain II shadow island)",
    },
    "NE": {
        "hc_oc": "Mike Vrabel / Josh McDaniels (Erhardt-Perkins option routes + power/draw run + Drake Maye boot)",
        "dc": "Terrell Williams (Multiple hybrid fronts + Cover-1/Cover-3 match)",
    },
    "MIA": {
        "hc_oc": "Mike McDaniel (Pre-snap cheat motion + outside zone + quick-rhythm RPO inbreakers)",
        "dc": "Anthony Weaver (Baltimore-style simulated pressures + 2-high quarters shell)",
    },
    "PHI": {
        "hc_oc": "Nick Sirianni / Kevin Patullo (Inside zone/RPO + Tank Bigsby gap rush + AJ Brown/DeVonta isolation)",
        "dc": "Vic Fangio (Two-high Cover-4/Cover-6 match quarters + light box 4-man rush)",
    },
    "WSH": {
        "hc_oc": "Dan Quinn / Kliff Kingsbury (No-huddle shotgun tempo RPO + Jayden Daniels read-option/verticals)",
        "dc": "Joe Whitt Jr. (Single-high Cover-3 press + aggressive stunt/blitz packages)",
    },
    "WAS": {
        "hc_oc": "Dan Quinn / Kliff Kingsbury (No-huddle shotgun tempo RPO + Jayden Daniels read-option/verticals)",
        "dc": "Joe Whitt Jr. (Single-high Cover-3 press + aggressive stunt/blitz packages)",
    },
    "CHI": {
        "hc_oc": "Ben Johnson (Multiple motion/shifts + duo/counter rush + Caleb Williams play-action crossers)",
        "dc": "Dennis Allen (Aggressive press-man + disguised overload blitzes)",
    },
    "SEA": {
        "hc_oc": "Mike Macdonald / Klint Kubiak (Wide-zone play-action boot + Jaxon Smith-Njigba slot motion)",
        "dc": "Mike Macdonald (Disguised 2-high quarters + simulated creeper pressures)",
    },
}


def normalize_team_tendencies(team: str, trends_teams: dict[str, Any]) -> dict[str, Any]:
    """Normalize `nfl_2026_w1_w7_trends_and_usage.json` team dictionary into the exact schema
    consumed by `build_snap_questions`, `state_payload`, `resolve_snap_transition`, and `jev_posteriors`."""
    lookup_key = "WAS" if team == "WSH" else team
    raw = dict(trends_teams.get(team) or trends_teams.get(lookup_key) or {})
    top_rec = raw.get("top_receivers") or []
    top_rush = raw.get("top_rushers") or []

    wr1_obj = raw.get("wr1") or (
        {
            "name": top_rec[0].get("player", f"{team} WR1"),
            "targets_per_game": top_rec[0].get("targets_per_game", 7.5),
            "target_share_pct": top_rec[0].get("target_share_pct", raw.get("wr1_target_share", 24.0)),
            "rec_yards_per_game": top_rec[0].get("rec_yards_per_game", 62.0),
        }
        if len(top_rec) > 0
        else {"name": f"{team} WR1", "targets_per_game": 7.5, "target_share_pct": 24.0, "rec_yards_per_game": 62.0}
    )
    wr2_obj = raw.get("wr2") or (
        {
            "name": top_rec[1].get("player", f"{team} WR2"),
            "targets_per_game": top_rec[1].get("targets_per_game", 5.2),
            "target_share_pct": top_rec[1].get("target_share_pct", 17.5),
            "rec_yards_per_game": top_rec[1].get("rec_yards_per_game", 44.0),
        }
        if len(top_rec) > 1
        else {"name": f"{team} WR2", "targets_per_game": 5.2, "target_share_pct": 17.5, "rec_yards_per_game": 44.0}
    )
    rb1_obj = raw.get("rb1") or (
        {
            "name": top_rush[0].get("player", f"{team} RB1"),
            "carries_per_game": top_rush[0].get("carries_per_game", 14.5),
            "carry_share_pct": top_rush[0].get("carry_share_pct", raw.get("rb1_carry_share", 58.0)),
            "rush_yards_per_game": top_rush[0].get("rush_yards_per_game", 58.0),
        }
        if len(top_rush) > 0
        else {"name": f"{team} RB1", "carries_per_game": 14.5, "carry_share_pct": 58.0, "rush_yards_per_game": 58.0}
    )

    c_w17 = float(raw.get("comp_rate_w1_w7", 0.635))
    if c_w17 <= 1.5:
        c_w17 = round(c_w17 * 100.0, 2)
    c_w67 = float(raw.get("comp_rate_w6_w7", c_w17 / 100.0))
    if c_w67 <= 1.5:
        c_w67 = round(c_w67 * 100.0, 2)

    sack_allowed = float(raw.get("sack_rate_allowed") or raw.get("sack_rate_allowed_pct", 6.2))
    def_blitz = float(raw.get("def_blitz_rate") or raw.get("def_blitz_rate_pct", 26.0))
    def_press = float(raw.get("def_pressure_rate") or raw.get("def_blitz_rate_pct", 24.5))

    return {
        **raw,
        "wr1": wr1_obj,
        "wr2": wr2_obj,
        "rb1": rb1_obj,
        "early_down_pass_rate": float(raw.get("early_down_pass_rate", 0.54)),
        "comp_rate_w1_w7": c_w17,
        "comp_rate_w6_w7": c_w67,
        "sack_rate_allowed": sack_allowed,
        "epa_per_play": float(raw.get("epa_per_play") or raw.get("off_epa_per_play", 0.0)),
        "def_blitz_rate": def_blitz,
        "def_pressure_rate": def_press,
        "def_epa_allowed": float(raw.get("def_epa_allowed") or raw.get("def_epa_per_play", 0.0)),
        "sec_per_play": float(raw.get("sec_per_play") or raw.get("neutral_sec_per_snap", 27.2)),
        "wr1_target_share": float(raw.get("wr1_target_share") or wr1_obj.get("target_share_pct", 24.0)),
        "rb1_carry_share": float(raw.get("rb1_carry_share") or rb1_obj.get("carry_share_pct", 60.0)),
    }


def load_team_injury_summary(team: str) -> list[str]:
    """Load real Week 8 practice statuses + Week 7 Out/Doubtful/Questionable from injuries_2026.csv."""
    if not INJURIES_CSV_PATH.is_file():
        return []
    out: list[str] = []
    seen: set[str] = set()
    target_teams = {team}
    if team in ("WSH", "WAS"):
        target_teams.update(("WSH", "WAS"))
    if team in ("LAR", "LA"):
        target_teams.update(("LAR", "LA"))
    with open(INJURIES_CSV_PATH, "r", encoding="utf-8") as f:
        rows = [r for r in csv.DictReader(f) if str(r.get("week", "")) in ("7", "8")]
    rows.sort(key=lambda r: int(r.get("week", 0)), reverse=True)
    for r in rows:
        tm = str(r.get("team", "")).strip()
        if tm not in target_teams:
            continue
        name = str(r.get("full_name", "")).strip()
        if not name or name in seen:
            continue
        seen.add(name)
        pos = str(r.get("position", "")).strip()
        wk = int(r.get("week", 0))
        rep = str(r.get("report_status", "")).strip()
        prac = str(r.get("practice_status", "")).strip()
        inj = str(r.get("report_primary_injury", "") or r.get("practice_primary_injury", "")).strip()
        if wk == 8 and ("Did Not Participate" in prac or "Limited" in prac):
            tag = "DNP" if "Did Not Participate" in prac else "LP"
            out.append(f"{name} ({pos}, W8 {tag}{f' - {inj}' if inj else ''})")
        elif rep in ("Out", "Doubtful", "Questionable"):
            out.append(f"{name} ({pos}, {rep}{f' - {inj}' if inj else ''})")
    return out[:8]


def format_clock(clock_sec: float) -> str:
    sec_in_qtr = int(max(0.0, clock_sec)) % 900
    if sec_in_qtr == 0 and clock_sec > 0 and int(clock_sec) % 900 == 0:
        sec_in_qtr = 900
    mm = sec_in_qtr // 60
    ss = sec_in_qtr % 60
    return f"{mm:02d}:{ss:02d}"


def field_zone_name(yardline_100: int, ydstogo: int) -> str:
    if yardline_100 <= ydstogo and yardline_100 <= 10:
        return "goal_to_go"
    if yardline_100 <= 20:
        return "red_zone"
    if yardline_100 <= 45:
        return "plus_territory_scoring_range"
    if yardline_100 <= 65:
        return "midfield_neutral"
    if yardline_100 >= 88:
        return "backed_up_shadow_of_own_goalpost"
    return "own_territory"


def build_snap_questions(
    off_team: str,
    def_team: str,
    down: int,
    ydstogo: int,
    yardline_100: int,
    off_tend: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    wr1_name = off_tend.get("wr1", {}).get("name", f"{off_team} WR1")
    wr2_name = off_tend.get("wr2", {}).get("name", f"{off_team} WR2")
    rb1_name = off_tend.get("rb1", {}).get("name", f"{off_team} RB1")

    if down == 4:
        off_call_q = jev_client.choice(
            f"Which 4th-down decision and play call does {off_team} execute on 4th & {ydstogo} at yardline {yardline_100}?",
            {
                "go_for_it_pass": f"Go for 4th down conversion with a pass concept ({wr1_name} / {wr2_name} / TE1)",
                "go_for_it_run": f"Go for 4th down conversion with an interior or outside rush ({rb1_name} / QB sneak)",
                "field_goal_attempt": "Send out the field goal unit to attempt a 3-point kick",
                "punt": "Send out the punt unit to pin the opponent deep",
            },
        )
    else:
        off_call_q = jev_client.choice(
            f"Which offensive play concept does {off_team} call on Down {down} & {ydstogo} at yardline {yardline_100}?",
            {
                "inside_zone_run": f"Inside zone or duo rush with {rb1_name}",
                "outside_zone_run": f"Outside zone, stretch, or counter rush with {rb1_name}",
                "quick_game_rpo": f"Quick rhythm pass, hitch/slant, or RPO targeting {wr1_name}/{wr2_name}",
                "play_action_intermediate": "Play-action boot or intermediate dig/crosser (10-19 air yards)",
                "deep_shot_pass": f"Vertical shot or post/go concept (20+ air yards) to {wr1_name}/{wr2_name}",
                "screen_or_draw": f"Slip screen, tunnel screen, or delayed draw to {rb1_name}/{wr1_name}",
            },
        )

    def_shell_q = jev_client.choice(
        f"Which defensive front and coverage shell does {def_team} call against {off_team} on this snap?",
        {
            "man_blitz_pressure": "5+ rusher man blitz (Cover-0 or Cover-1 pressure)",
            "zone_blitz_sim_pressure": "Simulated creeper pressure or 5-man fire-zone blitz",
            "two_high_quarters_shell": "Two-high safety shell (Cover-2, Quarters, or Cover-6 bracket)",
            "single_high_cover3_lurk": "Single-high safety shell (Cover-3 buzz or Cover-1 robber lurk)",
        },
    )

    target_carrier_q = jev_client.choice(
        f"Which primary {off_team} skill player touches the ball or is targeted on this snap?",
        {
            "RB1": f"{rb1_name} (RB1 primary rusher / checkdown outlet)",
            "WR1": f"{wr1_name} (WR1 alpha perimeter/slot target)",
            "WR2": f"{wr2_name} (WR2 secondary perimeter/movement target)",
            "WR3": f"{off_team} WR3 / slot rotational receiver",
            "TE1": f"{off_team} TE1 inline/seam tight end",
        },
    )

    snap_outcome_q = jev_client.choice(
        f"What is the resulting yardage and play outcome of this snap for {off_team} vs {def_team}?",
        {
            "turnover": "Interception or lost fumble (change of possession)",
            "sack_or_tfl": "Quarterback sack or tackle for loss in the backfield (-8 to -1 yards)",
            "no_gain_or_inc": "Incomplete pass or 0-yard stuffed rush at the line of scrimmage",
            "short_gain_1_4": "Short positive gain of 1 to 4 yards",
            "chain_mover_5_11": "Solid chain-moving gain of 5 to 11 yards",
            "explosive_12_24": "Explosive chunk play of 12 to 24 yards",
            "breakaway_25_plus": "Breakaway play of 25+ yards",
        },
    )

    return {
        "off_play_call": off_call_q,
        "def_shell_call": def_shell_q,
        "target_carrier": target_carrier_q,
        "snap_outcome": snap_outcome_q,
        "pressure_disruption": jev_client.noul(
            f"The {def_team} pass rush or defensive front creates immediate backfield pressure or disruption on this snap"
        ),
        "aggressive_coaching_edge": jev_client.noul(
            f"The {off_team} play-caller holds a schematic leverage advantage against {def_team}'s shell on this snap"
        ),
    }


def resolve_snap_transition(
    rng: np.random.Generator,
    down: int,
    ydstogo: int,
    yardline_100: int,
    answers: dict[str, Any],
    off_tend: dict[str, Any],
    def_tend: dict[str, Any],
) -> dict[str, Any]:
    """Use Jev's returned probability distributions (`probabilities` + `noul`) plus empirical
    W1-W7 coaching calibration to resolve the exact snap outcome and yardage."""
    off_probs: dict[str, float] = answers["off_play_call"]["probabilities"]
    def_probs: dict[str, float] = answers["def_shell_call"]["probabilities"]
    tgt_probs: dict[str, float] = answers["target_carrier"]["probabilities"]
    out_probs: dict[str, float] = answers["snap_outcome"]["probabilities"]
    pressure_noul = float(answers["pressure_disruption"]["noul"])
    coach_edge_noul = float(answers["aggressive_coaching_edge"]["noul"])

    # Handle 4th down special units first
    if down == 4:
        p_punt = float(out_probs.get("punt", 0.0)) if "punt" in out_probs else float(off_probs.get("punt", 0.0))
        p_fg = float(off_probs.get("field_goal_attempt", 0.0))
        p_go = float(off_probs.get("go_for_it_pass", 0.0)) + float(off_probs.get("go_for_it_run", 0.0))
        # Realistic NFL 4th down coaching rules blended with Jev 4th-down probabilities
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

    # Sample offensive play call from Jev's calibrated distribution
    off_keys = list(off_probs.keys())
    off_weights = np.array([max(0.0, float(off_probs[k])) for k in off_keys], dtype=np.float64)
    off_weights /= off_weights.sum()
    chosen_off_call = str(rng.choice(off_keys, p=off_weights))

    is_pass = chosen_off_call in (
        "quick_game_rpo",
        "play_action_intermediate",
        "deep_shot_pass",
        "go_for_it_pass",
    ) or (chosen_off_call == "screen_or_draw" and rng.random() < 0.65)

    # Sample defensive shell from Jev's distribution
    def_keys = list(def_probs.keys())
    def_weights = np.array([max(0.0, float(def_probs[k])) for k in def_keys], dtype=np.float64)
    def_weights /= def_weights.sum()
    chosen_def_shell = str(rng.choice(def_keys, p=def_weights))

    # Sample primary target/ballcarrier conditioned on pass vs run + Jev's target distribution
    if not is_pass:
        # Run play: heavily weight RB1
        run_role_weights = {
            "RB1": max(0.75, float(tgt_probs.get("RB1", 0.75))),
            "WR1": float(tgt_probs.get("WR1", 0.08)) * 0.35,
            "WR2": float(tgt_probs.get("WR2", 0.08)) * 0.35,
            "WR3": 0.02,
            "TE1": 0.03,
        }
        r_keys = list(run_role_weights.keys())
        r_w = np.array([run_role_weights[k] for k in r_keys], dtype=np.float64)
        r_w /= r_w.sum()
        chosen_role = str(rng.choice(r_keys, p=r_w))
    else:
        pass_role_weights = {
            "WR1": max(0.24, float(tgt_probs.get("WR1", 0.28))),
            "WR2": max(0.16, float(tgt_probs.get("WR2", 0.20))),
            "WR3": max(0.11, float(tgt_probs.get("WR3", 0.14))),
            "TE1": max(0.16, float(tgt_probs.get("TE1", 0.20))),
            "RB1": min(0.22, max(0.10, float(tgt_probs.get("RB1", 0.18)) * 0.45)),
        }
        p_keys = list(pass_role_weights.keys())
        p_w = np.array([pass_role_weights[k] for k in p_keys], dtype=np.float64)
        p_w /= p_w.sum()
        chosen_role = str(rng.choice(p_keys, p=p_w))

    # Blend Jev's `snap_outcome` distribution with empirical W1-W7 completion/sack physics so
    # zero-gain/incompletion rates match real NFL play-by-play while honoring Jev's snap read
    emp_comp = float(off_tend.get("comp_rate_w1_w7", 63.5)) / 100.0
    emp_sack = float(off_tend.get("sack_rate_allowed", 6.2)) / 100.0
    edge_shift = (coach_edge_noul - 0.50) * 0.12 - (pressure_noul - 0.30) * 0.10

    raw_out = {k: float(out_probs.get(k, 0.0)) for k in (
        "turnover",
        "sack_or_tfl",
        "no_gain_or_inc",
        "short_gain_1_4",
        "chain_mover_5_11",
        "explosive_12_24",
        "breakaway_25_plus",
    )}

    if is_pass:
        # Calibrate incompletion + sack + completion buckets with Jev + empirical W1-W7
        p_to = float(np.clip(0.50 * raw_out["turnover"] + 0.50 * 0.018, 0.008, 0.038))
        p_sack = float(np.clip(0.45 * raw_out["sack_or_tfl"] + 0.55 * emp_sack + 0.04 * (pressure_noul - 0.30), 0.035, 0.135))
        p_inc = float(np.clip(0.45 * raw_out["no_gain_or_inc"] + 0.55 * (1.0 - emp_comp) - edge_shift * 0.5, 0.24, 0.46))
        rem = max(0.15, 1.0 - (p_to + p_sack + p_inc))
        pos_sum = max(
            1e-6,
            raw_out["short_gain_1_4"]
            + raw_out["chain_mover_5_11"]
            + raw_out["explosive_12_24"]
            + raw_out["breakaway_25_plus"],
        )
        p_short = rem * (0.40 * (raw_out["short_gain_1_4"] / pos_sum) + 0.60 * 0.28)
        p_chain = rem * (0.45 * (raw_out["chain_mover_5_11"] / pos_sum) + 0.55 * 0.44)
        p_expl = rem * (0.50 * (raw_out["explosive_12_24"] / pos_sum) + 0.50 * 0.21)
        p_break = rem * (0.50 * (raw_out["breakaway_25_plus"] / pos_sum) + 0.50 * 0.07)
    else:
        # Rush play calibration
        p_to = float(np.clip(0.40 * raw_out["turnover"] + 0.60 * 0.008, 0.004, 0.020))
        p_sack = float(np.clip(0.45 * raw_out["sack_or_tfl"] + 0.55 * 0.085, 0.045, 0.14))
        p_inc = float(np.clip(0.35 * raw_out["no_gain_or_inc"] + 0.65 * 0.14, 0.08, 0.22))
        rem = max(0.20, 1.0 - (p_to + p_sack + p_inc))
        pos_sum = max(
            1e-6,
            raw_out["short_gain_1_4"]
            + raw_out["chain_mover_5_11"]
            + raw_out["explosive_12_24"]
            + raw_out["breakaway_25_plus"],
        )
        p_short = rem * (0.45 * (raw_out["short_gain_1_4"] / pos_sum) + 0.55 * 0.54)
        p_chain = rem * (0.45 * (raw_out["chain_mover_5_11"] / pos_sum) + 0.55 * 0.33)
        p_expl = rem * (0.50 * (raw_out["explosive_12_24"] / pos_sum) + 0.50 * 0.10)
        p_break = rem * (0.50 * (raw_out["breakaway_25_plus"] / pos_sum) + 0.50 * 0.03)

    cal_probs = {
        "turnover": p_to,
        "sack_or_tfl": p_sack,
        "no_gain_or_inc": p_inc,
        "short_gain_1_4": p_short,
        "chain_mover_5_11": p_chain,
        "explosive_12_24": p_expl,
        "breakaway_25_plus": p_break,
    }
    o_keys = list(cal_probs.keys())
    o_w = np.array([max(0.0, cal_probs[k]) for k in o_keys], dtype=np.float64)
    o_w /= o_w.sum()
    outcome_bucket = str(rng.choice(o_keys, p=o_w))

    if outcome_bucket == "turnover":
        yds = 0
    elif outcome_bucket == "sack_or_tfl":
        yds = int(-rng.integers(4, 9)) if is_pass else int(-rng.integers(1, 4))
    elif outcome_bucket == "no_gain_or_inc":
        yds = 0
    elif outcome_bucket == "short_gain_1_4":
        yds = int(rng.integers(1, 5))
    elif outcome_bucket == "chain_mover_5_11":
        yds = int(rng.integers(5, 12))
    elif outcome_bucket == "explosive_12_24":
        yds = int(rng.integers(12, 25))
    else:
        yds = int(rng.integers(25, 42))

    if outcome_bucket == "turnover":
        return {
            "play_type": "pass" if is_pass else "run",
            "off_call": chosen_off_call,
            "def_shell": chosen_def_shell,
            "target_role": chosen_role,
            "outcome_bucket": "turnover",
            "yards_gained": 0,
            "points_scored": 0,
            "turnover": True,
            "first_down": False,
            "change_of_poss": True,
            "new_yardline_100": int(np.clip(100 - yardline_100, 15, 85)),
            "clock_runoff_sec": float(rng.uniform(14.0, 22.0)),
            "calibrated_outcome_probs": {k: round(float(o_w[i]), 4) for i, k in enumerate(o_keys)},
        }

    new_yl = yardline_100 - yds
    is_td = new_yl <= 0
    if is_td:
        yds = yardline_100
        return {
            "play_type": "pass" if is_pass else "run",
            "off_call": chosen_off_call,
            "def_shell": chosen_def_shell,
            "target_role": chosen_role,
            "outcome_bucket": outcome_bucket,
            "yards_gained": int(yds),
            "points_scored": 7,
            "turnover": False,
            "first_down": True,
            "change_of_poss": True,
            "new_yardline_100": 75,
            "clock_runoff_sec": float(rng.uniform(16.0, 25.0)),
            "calibrated_outcome_probs": {k: round(float(o_w[i]), 4) for i, k in enumerate(o_keys)},
        }

    first_down = yds >= ydstogo
    change_of_poss = (down == 4) and (not first_down)
    if is_pass and outcome_bucket == "no_gain_or_inc":
        runoff = float(rng.uniform(5.0, 9.0))
    else:
        base_pace = float(off_tend.get("sec_per_play", 27.2))
        runoff = float(np.clip(rng.normal(base_pace, 3.5), 16.0, 36.0))

    return {
        "play_type": "pass" if is_pass else "run",
        "off_call": chosen_off_call,
        "def_shell": chosen_def_shell,
        "target_role": chosen_role,
        "outcome_bucket": outcome_bucket,
        "yards_gained": int(yds),
        "points_scored": 0,
        "turnover": False,
        "first_down": bool(first_down),
        "change_of_poss": bool(change_of_poss),
        "new_yardline_100": int(np.clip(100 - new_yl, 5, 95)) if change_of_poss else int(np.clip(new_yl, 1, 99)),
        "clock_runoff_sec": runoff,
        "calibrated_outcome_probs": {k: round(float(o_w[i]), 4) for i, k in enumerate(o_keys)},
    }


def simulate_full_game_with_jev(
    away: str,
    home: str,
    trends_teams: dict[str, Any],
    model: str = "~typesafe/jev-latest",
    seed: int = 20261029,
) -> dict[str, Any]:
    """Run an entire 60-minute NFL game from Snap 1 (Q1 15:00) to Q4 0:00 through live Jev."""
    rng = np.random.default_rng(seed)
    aw_tend = normalize_team_tendencies(away, trends_teams)
    hm_tend = normalize_team_tendencies(home, trends_teams)
    aw_inj = load_team_injury_summary(away)
    hm_inj = load_team_injury_summary(home)
    resolved_model = model

    clock_sec = 3600.0
    poss = away  # Away receives opening kickoff
    down = 1
    ydstogo = 10
    yardline_100 = 75
    scores = {away: 0, home: 0}
    drive_num = 1
    drive_snap = 0
    snap_num = 0
    half_switched = False

    snap_log: list[dict[str, Any]] = []
    total_cost_usd = 0.0
    total_input_tokens = 0
    total_output_tokens = 0
    total_latency_ms = 0

    # Aggregators for team/player box score & state-conditioned Jev posteriors
    box: dict[str, dict[str, Any]] = {
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
            "role_yds": {"WR1": 0, "WR2": 0, "WR3": 0, "TE1": 0, "RB1": 0},
            "role_touches": {"WR1": 0, "WR2": 0, "WR3": 0, "TE1": 0, "RB1": 0},
            "jev_pass_prob_sum": 0.0,
            "jev_pressure_noul_sum": 0.0,
            "jev_coach_edge_noul_sum": 0.0,
            "jev_early_down_pass_probs": [],
            "jev_sack_probs": [],
            "jev_comp_probs": [],
            "jev_wr1_target_probs": [],
            "jev_rb1_touch_probs": [],
        }
        for tm in (away, home)
    }

    t_start = time.monotonic()
    while clock_sec > 0.0 and snap_num < 168:
        # Halftime possession switch at Q3 15:00 (clock_sec <= 1800)
        if not half_switched and clock_sec <= 1800.0:
            half_switched = True
            clock_sec = 1800.0
            poss = home
            down = 1
            ydstogo = 10
            yardline_100 = 75
            drive_num += 1
            drive_snap = 0

        snap_num += 1
        drive_snap += 1
        qtr = int(np.clip(4 - int((clock_sec - 0.01) // 900), 1, 4))
        off_team = poss
        def_team = home if poss == away else away
        off_tend = aw_tend if off_team == away else hm_tend
        def_tend = hm_tend if off_team == away else aw_tend
        off_inj = aw_inj if off_team == away else hm_inj
        def_inj = hm_inj if off_team == away else aw_inj

        state_payload = {
            "matchup": f"{away} @ {home} (2026 NFL Week 8)",
            "snap_number": snap_num,
            "drive_number": drive_num,
            "drive_snap": drive_snap,
            "quarter": qtr,
            "clock_in_quarter": format_clock(clock_sec),
            "game_seconds_remaining": int(clock_sec),
            "offense": off_team,
            "defense": def_team,
            "down": down,
            "yards_to_go": ydstogo,
            "yardline_100_to_endzone": yardline_100,
            "field_zone": field_zone_name(yardline_100, ydstogo),
            "score": {away: scores[away], home: scores[home]},
            "offense_score_differential": scores[off_team] - scores[def_team],
            "offense_coaching_and_w1_w7_tendencies": {
                "scheme": COACH_ARCHETYPES.get(off_team, {}).get("hc_oc", f"{off_team} offense"),
                "early_down_pass_rate": off_tend.get("early_down_pass_rate"),
                "comp_rate_w1_w7": off_tend.get("comp_rate_w1_w7"),
                "comp_rate_w6_w7_recent": off_tend.get("comp_rate_w6_w7"),
                "sack_rate_allowed": off_tend.get("sack_rate_allowed"),
                "epa_per_play": off_tend.get("epa_per_play"),
                "wr1": off_tend.get("wr1", {}),
                "wr2": off_tend.get("wr2", {}),
                "rb1": off_tend.get("rb1", {}),
                "active_injuries": off_inj,
            },
            "defense_coaching_and_w1_w7_tendencies": {
                "scheme": COACH_ARCHETYPES.get(def_team, {}).get("dc", f"{def_team} defense"),
                "def_blitz_rate": def_tend.get("def_blitz_rate"),
                "def_pressure_rate": def_tend.get("def_pressure_rate"),
                "def_epa_allowed": def_tend.get("def_epa_allowed"),
                "active_injuries": def_inj,
            },
        }

        questions = build_snap_questions(off_team, def_team, down, ydstogo, yardline_100, off_tend)

        # Call Jev (`~typesafe/jev-latest` fallback to `typesafe/jev-1.14` with retry nonce for argmax ties)
        jev_res = None
        last_err = None
        for attempt in range(6):
            payload_try = state_payload if attempt == 0 else {**state_payload, "eval_pass": attempt}
            try_model = model if attempt % 2 == 0 else "typesafe/jev-1.14"
            try:
                jev_res = jev_client.ask(payload_try, questions, model=try_model, timeout=12.0, retries=2)
                break
            except Exception as err:
                last_err = err
        if jev_res is None:
            raise RuntimeError(f"Jev ask failed after 6 attempts: {last_err}")
        if jev_res.get("model"):
            resolved_model = str(jev_res["model"])

        answers = jev_res["answers"]
        usage = jev_res.get("usage", {})
        lat_ms = int(jev_res.get("latency_ms", 0))
        total_latency_ms += lat_ms
        total_input_tokens += int(usage.get("input_tokens", 0))
        total_output_tokens += int(usage.get("output_tokens", 0))
        total_cost_usd += float(usage.get("cost", 0.0) or 0.0)

        trans = resolve_snap_transition(rng, down, ydstogo, yardline_100, answers, off_tend, def_tend)

        # Update team/player box score & Jev posterior trackers
        tm_box = box[off_team]
        if trans["play_type"] in ("pass", "run"):
            tm_box["plays"] += 1
            off_p = answers["off_play_call"]["probabilities"]
            pass_p_jev = float(
                off_p.get("quick_game_rpo", 0.0)
                + off_p.get("play_action_intermediate", 0.0)
                + off_p.get("deep_shot_pass", 0.0)
                + 0.65 * off_p.get("screen_or_draw", 0.0)
                + off_p.get("go_for_it_pass", 0.0)
            )
            tm_box["jev_pass_prob_sum"] += pass_p_jev
            tm_box["jev_pressure_noul_sum"] += float(answers["pressure_disruption"]["noul"])
            tm_box["jev_coach_edge_noul_sum"] += float(answers["aggressive_coaching_edge"]["noul"])
            if down in (1, 2):
                tm_box["jev_early_down_pass_probs"].append(pass_p_jev)
            out_p = answers["snap_outcome"]["probabilities"]
            tm_box["jev_sack_probs"].append(float(out_p.get("sack_or_tfl", 0.04)))
            comp_p_jev = float(
                out_p.get("short_gain_1_4", 0.0)
                + out_p.get("chain_mover_5_11", 0.0)
                + out_p.get("explosive_12_24", 0.0)
                + out_p.get("breakaway_25_plus", 0.0)
            )
            tm_box["jev_comp_probs"].append(comp_p_jev)
            tgt_p = answers["target_carrier"]["probabilities"]
            tm_box["jev_wr1_target_probs"].append(float(tgt_p.get("WR1", 0.25)))
            tm_box["jev_rb1_touch_probs"].append(float(tgt_p.get("RB1", 0.60)))

            role = trans["target_role"]
            yds = int(trans["yards_gained"])
            if trans["play_type"] == "pass":
                if trans["outcome_bucket"] == "sack_or_tfl":
                    tm_box["sacks"] += 1
                else:
                    tm_box["pass_att"] += 1
                    if trans["outcome_bucket"] not in ("no_gain_or_inc", "turnover") and yds > 0:
                        tm_box["pass_comp"] += 1
                        tm_box["pass_yds"] += yds
                        if role in tm_box["role_yds"]:
                            tm_box["role_yds"][role] += yds
                            tm_box["role_touches"][role] += 1
            else:
                tm_box["rush_att"] += 1
                tm_box["rush_yds"] += yds
                if role in tm_box["role_yds"]:
                    tm_box["role_yds"][role] += max(0, yds)
                    tm_box["role_touches"][role] += 1

            if trans["turnover"]:
                tm_box["turnovers"] += 1
            if trans["first_down"]:
                tm_box["first_downs"] += 1

        scores[off_team] += int(trans["points_scored"])

        snap_record = {
            "snap": snap_num,
            "drive": drive_num,
            "qtr": qtr,
            "clock": format_clock(clock_sec),
            "offense": off_team,
            "defense": def_team,
            "down": down,
            "ydstogo": ydstogo,
            "yardline_100": yardline_100,
            "score_before": {away: scores[away] - (trans["points_scored"] if off_team == away else 0), home: scores[home] - (trans["points_scored"] if off_team == home else 0)},
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
            "score_after": {away: scores[away], home: scores[home]},
            "latency_ms": lat_ms,
        }
        snap_log.append(snap_record)

        if snap_num % 40 == 0 or trans["points_scored"] > 0:
            print(
                f"  [{away}@{home} Snap {snap_num:3d} | Q{qtr} {format_clock(clock_sec)}] {off_team} {down}&{ydstogo} @{yardline_100:2d} -> "
                f"{trans['off_call']} vs {trans['def_shell']} ({trans['target_role']}): {trans['yards_gained']:+d} yds "
                f"[{trans['outcome_bucket']}] | Score {away} {scores[away]} - {home} {scores[home]} ({lat_ms}ms)",
                flush=True,
            )

        # Advance game state to next snap
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

    # Compute Jev-calibrated posterior overrides for the 10,000-world PBP Monte Carlo simulator
    jev_posteriors: dict[str, dict[str, float]] = {}
    for tm in (away, home):
        b = box[tm]
        t_orig = aw_tend if tm == away else hm_tend
        n_p = max(1, b["plays"])
        jev_ed_pass = float(np.mean(b["jev_early_down_pass_probs"])) if b["jev_early_down_pass_probs"] else float(t_orig.get("early_down_pass_rate", 0.54))
        jev_wr1_sh = float(np.mean(b["jev_wr1_target_probs"])) * 100.0 if b["jev_wr1_target_probs"] else float(t_orig.get("wr1_target_share", 24.0))
        jev_rb1_sh = float(np.mean(b["jev_rb1_touch_probs"])) * 100.0 if b["jev_rb1_touch_probs"] else float(t_orig.get("rb1_carry_share", 60.0))
        jev_press_noul = b["jev_pressure_noul_sum"] / n_p
        jev_edge_noul = b["jev_coach_edge_noul_sum"] / n_p

        jev_posteriors[tm] = {
            "early_down_pass_rate": round(0.55 * float(t_orig.get("early_down_pass_rate", 0.54)) + 0.45 * jev_ed_pass, 4),
            "comp_rate_w1_w7": round(float(t_orig.get("comp_rate_w1_w7", 63.5)) + 4.0 * (jev_edge_noul - 0.50), 2),
            "comp_rate_w6_w7": round(float(t_orig.get("comp_rate_w6_w7", 63.5)) + 4.0 * (jev_edge_noul - 0.50), 2),
            "sack_rate_allowed": round(0.60 * float(t_orig.get("sack_rate_allowed", 6.2)) + 0.40 * (jev_press_noul * 22.0), 2),
            "def_pressure_rate": round(float(t_orig.get("def_pressure_rate", 21.5)), 2),
            "wr1_target_share": round(0.60 * float(t_orig.get("wr1_target_share", 24.0)) + 0.40 * min(36.0, max(18.0, jev_wr1_sh)), 2),
            "rb1_carry_share": round(0.65 * float(t_orig.get("rb1_carry_share", 60.0)) + 0.35 * min(82.0, max(45.0, jev_rb1_sh)), 2),
            "jev_mean_pressure_disruption_noul": round(jev_press_noul, 4),
            "jev_mean_coaching_edge_noul": round(jev_edge_noul, 4),
            "jev_mean_pass_call_prob": round(b["jev_pass_prob_sum"] / n_p, 4),
        }

    return {
        "matchup": f"{away} @ {home}",
        "model": model,
        "jev_model_resolved": resolved_model,
        "generated_at": "2026-10-29T16:55:00Z",
        "total_snaps_simulated_with_jev": snap_num,
        "total_drives": drive_num,
        "final_score_spine": scores,
        "wall_clock_seconds": wall_sec,
        "avg_latency_ms_per_snap": round(total_latency_ms / max(1, snap_num), 1),
        "usage": {
            "total_input_tokens": total_input_tokens,
            "total_output_tokens": total_output_tokens,
            "total_cost_usd": round(total_cost_usd, 6),
        },
        "active_injuries_ingested": {away: aw_inj, home: hm_inj},
        "box_score_spine": box,
        "jev_posterior_overrides_for_10k_mc": {
            "away": jev_posteriors[away],
            "home": jev_posteriors[home],
        },
        "snap_by_snap_log": snap_log,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--away", default="")
    ap.add_argument("--home", default="")
    ap.add_argument("--model", default="~typesafe/jev-latest")
    ap.add_argument("--workers", type=int, default=7)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--out", default=str(DEFAULT_OUT_PATH))
    args = ap.parse_args()

    trends_raw = json.loads(TRENDS_JSON_PATH.read_text(encoding="utf-8"))
    trends_teams = trends_raw.get("teams", {})

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    existing: dict[str, Any] = {}
    if out_path.is_file():
        try:
            existing = json.loads(out_path.read_text(encoding="utf-8"))
        except Exception:
            existing = {}
    games_map: dict[str, Any] = dict(existing.get("games", {}) if isinstance(existing, dict) else {})
    save_lock = threading.Lock()

    def persist_games_map() -> None:
        with save_lock:
            ordered_games: dict[str, Any] = {}
            for aw_k, hm_k in WEEK8_ALL_MATCHUPS:
                mk = f"{aw_k}@{hm_k}"
                if mk in games_map:
                    ordered_games[mk] = games_map[mk]
            for mk, val in games_map.items():
                if mk not in ordered_games:
                    ordered_games[mk] = val
            payload = {
                "schema": "gse_jev_full_game_spine.v1",
                "updated_at": "2026-10-29T16:55:00Z",
                "total_games": len(ordered_games),
                "games": ordered_games,
            }
            out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    if args.away and args.home:
        matchups_to_run = [(args.away, args.home)]
    else:
        matchups_to_run = list(WEEK8_ALL_MATCHUPS)

    pending: list[tuple[int, str, str]] = []
    for idx, (aw, hm) in enumerate(matchups_to_run):
        m_key = f"{aw}@{hm}"
        cached = games_map.get(m_key)
        if (
            not args.force
            and isinstance(cached, dict)
            and int(cached.get("total_snaps_simulated_with_jev", 0)) >= 100
        ):
            sc = cached.get("final_score_spine", {})
            print(
                f"[CACHED JEV SPINE] {m_key} already completed ({cached.get('total_snaps_simulated_with_jev')} snaps, "
                f"Spine Final {aw} {sc.get(aw)} - {hm} {sc.get(hm)}) — keeping cached spine.",
                flush=True,
            )
        else:
            pending.append((idx, aw, hm))

    if pending:
        print(
            f"[GSE JEV FULL-GAME SPINE] Launching {len(pending)} Week 8 games concurrently "
            f"(ThreadPoolExecutor max_workers={args.workers}, model={args.model})...",
            flush=True,
        )

        def _worker(item: tuple[int, str, str]) -> tuple[str, dict[str, Any]]:
            idx, aw, hm = item
            m_key = f"{aw}@{hm}"
            game_seed = 20261029 + idx * 101
            spine = simulate_full_game_with_jev(aw, hm, trends_teams, model=args.model, seed=game_seed)
            with save_lock:
                games_map[m_key] = spine
            persist_games_map()
            print(
                f"\n[JEV FULL-GAME SPINE COMPLETE] {aw} @ {hm} | "
                f"Snaps: {spine['total_snaps_simulated_with_jev']} | "
                f"Drives: {spine['total_drives']} | "
                f"Spine Final: {aw} {spine['final_score_spine'][aw]} - {hm} {spine['final_score_spine'][hm]} | "
                f"Avg Latency: {spine['avg_latency_ms_per_snap']}ms/snap | "
                f"Wall Time: {spine['wall_clock_seconds']}s | "
                f"Cost: ${spine['usage']['total_cost_usd']:.5f}",
                flush=True,
            )
            return m_key, spine

        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futs = [pool.submit(_worker, item) for item in pending]
            for fut in as_completed(futs):
                fut.result()
    else:
        persist_games_map()

    total_snaps_all = sum(int(g.get("total_snaps_simulated_with_jev", 0)) for g in games_map.values())
    total_cost_all = sum(float((g.get("usage") or {}).get("total_cost_usd", 0.0)) for g in games_map.values())
    print(
        f"\n[ALL {len(games_map)} WEEK 8 JEV FULL-GAME SPINES READY] "
        f"Total Snaps: {total_snaps_all} | Total API Cost: ${total_cost_all:.5f} | Saved -> {out_path}",
        flush=True,
    )


if __name__ == "__main__":
    main()
