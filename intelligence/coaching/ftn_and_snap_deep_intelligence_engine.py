"""
ftn_and_snap_deep_intelligence_engine.py
===============================================================================
Clean-room Stream 15N deep pre-simulation intelligence engine built strictly
over GSE's cleared Weeks 1-10 2026 nflverse parquets:
  - intelligence/coaching/data/play_by_play_2026.parquet (26,246 plays)
  - intelligence/coaching/data/ftn_charting_2026.parquet (25,480 FTN plays)
  - data/nflverse/snap_counts_2026.parquet (14,004 player-week rows)
  - data/nflverse/stats_player_week_2026.parquet (10,446 player-week rows)
  - data/engine/week11_espn_live_sync_2026_11_19.json (live TNF/Week 11 injuries)

Provides:
  1. `normalize_nfl_team`: canonical 32-team nflverse abbreviation mapping.
  2. `load_ftn_pbp_32team_charting_profiles`: mtime-cached inner join of PBP x FTN
     yielding real YTD + L4 offensive scheme signatures (motion, PA, RPO, screen,
     no-huddle, UC/shotgun/pistol, multi-back), defensive front & coverage signatures
     (avg box, light/heavy box rates, blitz rate, 5-man front rate), exact FTN
     QB-vs-OL sack fault, real QB sneaks, read progression & drop/catchable/created
     reception splits, true turnover-worthy play (TWP) luck regression gaps, and
     real team kickoff return vs coverage field-position baselines.
  3. `load_snap_and_player_week_32team_profiles`: mtime-cached snap-count lookup
     using individual player active games played (`player_gp`), real RB1 weekly
     bellcow trajectories, and WR/TE WOPR + creation efficiency metrics.
  4. `evaluate_snap_weighted_injury_impact`: weights ESPN Out/Doubtful/Questionable/IR
     statuses by true Weeks 1-10 snap share (`avg_offense_pct` / `avg_defense_pct`)
     and recent 3-week availability so 0-snap backups and already-priced multi-week
     IR absences never inflate team cliffs or equalize asymmetric Questionable risk.
  5. `evaluate_ftn_and_snap_deep_matchup`: bounded, strictly swap-symmetric Stream 15N
     pre-simulation conditioners.
"""

from __future__ import annotations

import json
import math
import re
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

try:
    import pandas as pd
except Exception:  # pragma: no cover - optional runtime fallback
    pd = None


_REPO_ROOT = Path(__file__).resolve().parents[2]
CLEARED_PBP_2026_PATH = Path(__file__).resolve().parent / "data" / "play_by_play_2026.parquet"
CLEARED_FTN_2026_PATH = Path(__file__).resolve().parent / "data" / "ftn_charting_2026.parquet"
CLEARED_SNAP_COUNTS_2026_PATH = _REPO_ROOT / "data" / "nflverse" / "snap_counts_2026.parquet"
CLEARED_STATS_PLAYER_WEEK_2026_PATH = _REPO_ROOT / "data" / "nflverse" / "stats_player_week_2026.parquet"
WEEK11_ESPN_LIVE_SYNC_PATH = _REPO_ROOT / "data" / "engine" / "week11_espn_live_sync_2026_11_19.json"

_TEAM_ALIAS_MAP: Dict[str, str] = {
    "ARI": "ARI",
    "ARZ": "ARI",
    "ATL": "ATL",
    "BAL": "BAL",
    "BLT": "BAL",
    "BUF": "BUF",
    "CAR": "CAR",
    "CHI": "CHI",
    "CIN": "CIN",
    "CLE": "CLE",
    "CLV": "CLE",
    "DAL": "DAL",
    "DEN": "DEN",
    "DET": "DET",
    "GB": "GB",
    "GNB": "GB",
    "GBP": "GB",
    "HOU": "HOU",
    "HST": "HOU",
    "IND": "IND",
    "JAC": "JAX",
    "JAX": "JAX",
    "KC": "KC",
    "KAN": "KC",
    "KCC": "KC",
    "LA": "LA",
    "LAR": "LA",
    "STL": "LA",
    "LAC": "LAC",
    "SD": "LAC",
    "SDC": "LAC",
    "LV": "LV",
    "LVR": "LV",
    "OAK": "LV",
    "MIA": "MIA",
    "MIN": "MIN",
    "NE": "NE",
    "NWE": "NE",
    "NEP": "NE",
    "NO": "NO",
    "NOR": "NO",
    "NOS": "NO",
    "NYG": "NYG",
    "NYJ": "NYJ",
    "PHI": "PHI",
    "PIT": "PIT",
    "SEA": "SEA",
    "SF": "SF",
    "SFO": "SF",
    "TB": "TB",
    "TAM": "TB",
    "TBB": "TB",
    "TEN": "TEN",
    "WAS": "WAS",
    "WSH": "WAS",
}

_OFF_POSITIONS = {
    "QB",
    "RB",
    "FB",
    "WR",
    "TE",
    "OT",
    "T",
    "OG",
    "G",
    "C",
    "OL",
}
_DEF_POSITIONS = {
    "DE",
    "EDGE",
    "OLB",
    "DT",
    "NT",
    "DL",
    "LB",
    "ILB",
    "MLB",
    "CB",
    "DB",
    "S",
    "FS",
    "SS",
}

_POS_LEVERAGE_WEIGHT: Dict[str, float] = {
    "QB": 1.60,
    "CB": 0.92,
    "DB": 0.78,
    "OT": 0.88,
    "T": 0.88,
    "DE": 0.86,
    "EDGE": 0.86,
    "OLB": 0.78,
    "OG": 0.72,
    "G": 0.72,
    "C": 0.74,
    "OL": 0.74,
    "DT": 0.72,
    "NT": 0.68,
    "DL": 0.70,
    "WR": 0.80,
    "TE": 0.64,
    "RB": 0.68,
    "LB": 0.64,
    "ILB": 0.64,
    "MLB": 0.64,
    "S": 0.68,
    "FS": 0.68,
    "SS": 0.68,
}

_FTN_CACHE: Dict[str, Any] = {}
_SNAP_CACHE: Dict[str, Any] = {}


def _clamp(val: float, low: float, high: float) -> float:
    return max(low, min(high, float(val)))


def _soft_cap(val: float, cap: float) -> float:
    if cap <= 0.0:
        return 0.0
    return float(cap * math.tanh(float(val) / cap))


def normalize_nfl_team(team_abbr: str) -> str:
    raw = str(team_abbr or "").strip().upper()
    return _TEAM_ALIAS_MAP.get(raw, raw)


def _normalize_player_key(name: str) -> str:
    s = re.sub(r"[^a-z0-9\s]", " ", str(name or "").lower())
    tokens = [t for t in s.split() if t not in {"jr", "sr", "ii", "iii", "iv", "v"}]
    return " ".join(tokens)


def _classify_offensive_scheme(
    uc_rate: float,
    pa_rate: float,
    motion_rate: float,
    rpo_rate: float,
    no_huddle_rate: float,
    shotgun_rate: float,
) -> Tuple[str, str]:
    if rpo_rate >= 0.085 or (shotgun_rate >= 0.78 and no_huddle_rate >= 0.14):
        return "SPREAD_RPO_AIR_RAID", "SHOTGUN_3X1_SPREAD"
    if uc_rate >= 0.30 and (pa_rate >= 0.24 or motion_rate >= 0.56):
        return "SHANAHAN_MCVAY_OUTSIDE_ZONE", "UNDER_CENTER_PLAY_ACTION"
    if no_huddle_rate <= 0.08 and uc_rate >= 0.20:
        return "ERHARDT_PERKINS", "3X1_TRIPS"
    return "WEST_COAST_TIMING", "SHOTGUN_3X1_WEST_COAST"


def _classify_defensive_front_and_shell(
    light_box_rate: float,
    heavy_box_rate: float,
    blitz_rate: float,
    five_front_rate: float,
) -> Tuple[str, str]:
    if five_front_rate >= 0.28 and blitz_rate < 0.31:
        front = "5_1_PENNY_FRONT"
    elif heavy_box_rate >= 0.22 and light_box_rate < 0.45:
        front = "4_3_BASE_HEAVY"
    elif blitz_rate >= 0.31:
        front = "3_4_BLITZ_PRESSURE"
    else:
        front = "4_2_5_SPLIT_FIELD"

    if blitz_rate >= 0.33:
        shell = "COVER_1_MAN_BLITZ"
    elif light_box_rate >= 0.62 and blitz_rate <= 0.26:
        shell = "COVER_4_QUARTERS"
    elif five_front_rate >= 0.26:
        shell = "COVER_3_MATCH"
    else:
        shell = "COVER_2_TAMPA"
    return front, shell


def load_ftn_pbp_32team_charting_profiles(
    pbp_path: Path = CLEARED_PBP_2026_PATH,
    ftn_path: Path = CLEARED_FTN_2026_PATH,
) -> Dict[str, Any]:
    """
    Mtime-cached PBP x FTN inner join (Weeks 1-10) producing empirical scheme,
    front, coverage shell, progression, drop/created-rec, TWP luck regression,
    and kickoff field-position profiles for all 32 teams.
    """
    if pd is None or not pbp_path.exists() or not ftn_path.exists():
        return {"available": False, "reason": "parquet_or_pandas_missing", "teams": {}}

    mtime_sig = (pbp_path.stat().st_mtime_ns, ftn_path.stat().st_mtime_ns)
    if _FTN_CACHE.get("mtime_sig") == mtime_sig and isinstance(_FTN_CACHE.get("data"), dict):
        return _FTN_CACHE["data"]

    pbp_cols = [
        "game_id",
        "play_id",
        "fixed_drive",
        "week",
        "posteam",
        "defteam",
        "play_type",
        "down",
        "ydstogo",
        "yards_gained",
        "yardline_100",
        "epa",
        "complete_pass",
        "pass_attempt",
        "rush_attempt",
        "sack",
        "qb_hit",
        "tackled_for_loss",
        "pass_defense_1_player_id",
        "yards_after_catch",
        "xyac_mean_yardage",
        "third_down_converted",
        "third_down_failed",
        "field_goal_attempt",
        "field_goal_result",
        "kick_distance",
        "fg_prob",
        "punt_attempt",
        "punt_blocked",
        "return_yards",
        "touchdown",
        "interception",
        "qb_kneel",
        "qb_spike",
        "aborted_play",
        "touchback",
    ]
    ftn_cols = [
        "nflverse_game_id",
        "nflverse_play_id",
        "qb_location",
        "n_offense_backfield",
        "n_defense_box",
        "is_no_huddle",
        "is_motion",
        "is_play_action",
        "is_screen_pass",
        "is_rpo",
        "is_qb_out_of_pocket",
        "is_interception_worthy",
        "is_throw_away",
        "read_thrown",
        "is_catchable_ball",
        "is_contested_ball",
        "is_created_reception",
        "is_drop",
        "is_qb_sneak",
        "n_blitzers",
        "n_pass_rushers",
        "is_qb_fault_sack",
    ]

    pbp = pd.read_parquet(pbp_path, columns=pbp_cols)
    ftn = pd.read_parquet(ftn_path, columns=ftn_cols)

    # Empirical 2026 kickoff return / touchback field position BEFORE scrimmage filtering
    ko = pbp[(pbp["play_type"] == "kickoff") & pbp["posteam"].notna() & pbp["defteam"].notna()].copy()
    # In nflverse PBP, posteam on a kickoff is the receiving team and yardline_100 on the NEXT play is start pos;
    # proxy start yardline cleanly using 100 - (100 - kickoff_return + touchback) if exact post-kick isn't needed:
    # Actually track subsequent scrimmage drive start per receiving team on the very next play in the same game!
    pbp_sorted = pbp.sort_values(["game_id", "play_id"]).copy()
    pbp_sorted["next_play_type"] = pbp_sorted.groupby("game_id")["play_type"].shift(-1)
    pbp_sorted["next_posteam"] = pbp_sorted.groupby("game_id")["posteam"].shift(-1)
    pbp_sorted["next_yl100"] = pbp_sorted.groupby("game_id")["yardline_100"].shift(-1)
    ko_drives = pbp_sorted[
        (pbp_sorted["play_type"] == "kickoff")
        & pbp_sorted["next_play_type"].isin(["pass", "run"])
        & pbp_sorted["next_yl100"].between(40.0, 95.0)
        & pbp_sorted["posteam"].notna()
        & pbp_sorted["defteam"].notna()
    ]
    league_ko_yl = float(ko_drives["next_yl100"].mean()) if len(ko_drives) > 0 else 70.0

    merged = pbp.merge(
        ftn,
        left_on=["game_id", "play_id"],
        right_on=["nflverse_game_id", "nflverse_play_id"],
        how="inner",
    )
    scrim = merged[
        merged["play_type"].isin(["pass", "run"])
        & (merged["qb_kneel"] != 1)
        & (merged["qb_spike"] != 1)
        & (merged["aborted_play"] != 1)
        & merged["posteam"].notna()
        & merged["defteam"].notna()
    ].copy()
    max_week = int(merged["week"].dropna().max()) if len(merged) > 0 else 0
    l4_floor = max(1, max_week - 3)

    scrim["is_db"] = (scrim["pass_attempt"].fillna(0) == 1) | (scrim["sack"].fillna(0) == 1)
    scrim["is_att"] = (scrim["pass_attempt"].fillna(0) == 1) & (scrim["sack"].fillna(0) != 1)

    teams_raw = sorted(set(scrim["posteam"].astype(str)) | set(scrim["defteam"].astype(str)))
    teams_out: Dict[str, Dict[str, Any]] = {}

    for raw_tm in teams_raw:
        tm = normalize_nfl_team(raw_tm)
        off = scrim[scrim["posteam"] == raw_tm]
        dfn = scrim[scrim["defteam"] == raw_tm]
        off_l4 = off[off["week"] >= l4_floor]
        dfn_l4 = dfn[dfn["week"] >= l4_floor]

        n_off = max(1, int(len(off)))
        n_dfn = max(1, int(len(dfn)))
        off_db = off[off["is_db"]]
        off_att = off[off["is_att"]]
        dfn_db = dfn[dfn["is_db"]]
        dfn_att = dfn[dfn["is_att"]]
        n_off_db = max(1, int(len(off_db)))
        n_off_att = max(1, int(len(off_att)))
        n_dfn_db = max(1, int(len(dfn_db)))
        n_dfn_att = max(1, int(len(dfn_att)))

        motion_r = float(off["is_motion"].fillna(False).mean())
        pa_r = float(off_db["is_play_action"].fillna(False).mean()) if len(off_db) > 0 else 0.22
        rpo_r = float(off["is_rpo"].fillna(False).mean())
        screen_r = float(off_db["is_screen_pass"].fillna(False).mean()) if len(off_db) > 0 else 0.08
        no_huddle_r = float(off["is_no_huddle"].fillna(False).mean())
        uc_r = float((off["qb_location"] == "U").mean())
        shotgun_r = float((off["qb_location"] == "S").mean())
        pistol_r = float((off["qb_location"] == "P").mean())
        oop_r = float(off_db["is_qb_out_of_pocket"].fillna(False).mean()) if len(off_db) > 0 else 0.12
        multi_back_r = float((off["n_offense_backfield"].fillna(1) >= 2).mean())

        l4_pa_r = float(off_l4[off_l4["is_db"]]["is_play_action"].fillna(False).mean()) if len(off_l4[off_l4["is_db"]]) >= 15 else pa_r
        l4_motion_r = float(off_l4["is_motion"].fillna(False).mean()) if len(off_l4) >= 30 else motion_r

        off_scheme, off_form = _classify_offensive_scheme(uc_r, pa_r, motion_r, rpo_r, no_huddle_r, shotgun_r)

        avg_box = float(dfn["n_defense_box"].fillna(6).mean())
        light_box_r = float((dfn["n_defense_box"].fillna(6) <= 6).mean())
        heavy_box_r = float((dfn["n_defense_box"].fillna(6) >= 8).mean())
        blitz_r = float((dfn_db["n_blitzers"].fillna(0) >= 1).mean()) if len(dfn_db) > 0 else 0.27
        avg_rushers = float(dfn_db["n_pass_rushers"].fillna(4).mean()) if len(dfn_db) > 0 else 4.25
        five_front_r = float((dfn_db["n_pass_rushers"].fillna(4) >= 5).mean()) if len(dfn_db) > 0 else 0.24
        l4_blitz_r = float((dfn_l4[dfn_l4["is_db"]]["n_blitzers"].fillna(0) >= 1).mean()) if len(dfn_l4[dfn_l4["is_db"]]) >= 15 else blitz_r

        def_front, def_shell = _classify_defensive_front_and_shell(light_box_r, heavy_box_r, blitz_r, five_front_r)

        off_sacks = off_db[off_db["sack"] == 1]
        n_off_sacks = int(len(off_sacks))
        qb_fault_sacks = int(off_sacks["is_qb_fault_sack"].fillna(False).sum()) if n_off_sacks > 0 else 0
        ol_fault_sacks = max(0, n_off_sacks - qb_fault_sacks)
        qb_fault_share = qb_fault_sacks / max(1, n_off_sacks)

        r_read = off_att["read_thrown"].astype(str)
        first_read_r = float((r_read == "1").mean()) if len(off_att) > 0 else 0.65
        sec_read_r = float((r_read == "2").mean()) if len(off_att) > 0 else 0.14
        chk_r = float((r_read == "CHK").mean()) if len(off_att) > 0 else 0.08
        sd_r = float((r_read == "SD").mean()) if len(off_att) > 0 else 0.05
        sec_plays = off_att[r_read == "2"]
        sec_read_epa = float(sec_plays["epa"].fillna(0.0).mean()) if len(sec_plays) >= 8 else 0.0

        catchable_r = float(off_att["is_catchable_ball"].fillna(False).mean()) if len(off_att) > 0 else 0.72
        drop_r = float(off_att["is_drop"].fillna(False).mean()) if len(off_att) > 0 else 0.045
        created_r = float(off_att["is_created_reception"].fillna(False).mean()) if len(off_att) > 0 else 0.035
        contested_r = float(off_att["is_contested_ball"].fillna(False).mean()) if len(off_att) > 0 else 0.14

        off_twp_r = float(off_att["is_interception_worthy"].fillna(False).mean()) if len(off_att) > 0 else 0.025
        off_int_r = float(off_att["interception"].fillna(0).mean()) if len(off_att) > 0 else 0.022
        def_twp_r = float(dfn_att["is_interception_worthy"].fillna(False).mean()) if len(dfn_att) > 0 else 0.025
        def_int_r = float(dfn_att["interception"].fillna(0).mean()) if len(dfn_att) > 0 else 0.022

        # Kickoff field position: lower yardline_100 = CLOSER to opponent endzone = BETTER starting field position
        ko_rec = ko_drives[ko_drives["next_posteam"] == raw_tm]
        ko_cov = ko_drives[ko_drives["defteam"] == raw_tm]
        rec_start_yl100 = float(ko_rec["next_yl100"].mean()) if len(ko_rec) >= 5 else league_ko_yl
        cov_allowed_yl100 = float(ko_cov["next_yl100"].mean()) if len(ko_cov) >= 5 else league_ko_yl

        # Clean-room ST: Field Goal OE (k_prior=30), 50+ rate (k_prior=12), Net Punt & PR defense (k_prior=25)
        fgs = pbp[(pbp["posteam"] == raw_tm) & (pbp["field_goal_attempt"] == 1) & (pbp["aborted_play"] != 1)]
        n_fga = int(len(fgs))
        if n_fga > 0:
            fg_made_s = (fgs["field_goal_result"] == "made").astype(float)
            fg_oe_raw = float((fg_made_s - fgs["fg_prob"].fillna(0.84)).mean())
            fgs50 = fgs[fgs["kick_distance"].fillna(0.0) >= 50.0]
            n_fga50 = int(len(fgs50))
            fg50_rate = float((fgs50["field_goal_result"] == "made").mean()) if n_fga50 > 0 else 0.6966
        else:
            fg_oe_raw, n_fga50, fg50_rate = 0.0, 0, 0.6966
        eb_fg_oe = (n_fga / (n_fga + 30.0)) * fg_oe_raw
        eb_fg50_delta = (n_fga50 / (n_fga50 + 12.0)) * (fg50_rate - 0.6966)

        punts = pbp[(pbp["posteam"] == raw_tm) & (pbp["punt_attempt"] == 1) & (pbp["punt_blocked"] != 1)]
        n_punts = int(len(punts))
        if n_punts > 0:
            net_p_vals = (punts["kick_distance"].fillna(47.6) - punts["return_yards"].fillna(0.0) - 20.0 * punts["touchback"].fillna(0.0))
            raw_punt_net = float(net_p_vals.mean())
            raw_punt_avg = float(punts["kick_distance"].fillna(47.6).mean())
        else:
            raw_punt_net, raw_punt_avg = 42.24, 47.60
        eb_punt_net = 42.24 + (n_punts / (n_punts + 25.0)) * (raw_punt_net - 42.24)
        def_punts = pbp[(pbp["defteam"] == raw_tm) & (pbp["punt_attempt"] == 1) & (pbp["punt_blocked"] != 1)]
        n_pr = int(len(def_punts))
        pr_avg = float(def_punts["return_yards"].fillna(0.0).mean()) if n_pr > 0 else 9.0
        eb_pr_edge = (n_pr / (n_pr + 25.0)) * (pr_avg - 9.0)

        # Clean-room 3rd-Down & Red-Zone efficiency residuals (residualized vs overall EPA + EB shrunk)
        off_epa_c = float(off["epa"].fillna(0.0).mean()) if len(off) > 0 else 0.0
        def_epa_c = float(dfn["epa"].fillna(0.0).mean()) if len(dfn) > 0 else 0.0
        o3 = off[(off["down"] == 3) & ((off["third_down_converted"] == 1) | (off["third_down_failed"] == 1))]
        d3 = dfn[(dfn["down"] == 3) & ((dfn["third_down_converted"] == 1) | (dfn["third_down_failed"] == 1))]
        off_3d_r = float(o3["third_down_converted"].mean()) if len(o3) > 0 else 0.3965
        def_3d_r = float(d3["third_down_converted"].mean()) if len(d3) > 0 else 0.3939
        eb_off_3d_resid = (len(o3) / (len(o3) + 60.0)) * ((off_3d_r - 0.3965) - 0.45 * off_epa_c)
        eb_def_3d_resid = (len(d3) / (len(d3) + 60.0)) * ((def_3d_r - 0.3939) + 0.45 * def_epa_c)

        orz_df = off[off["yardline_100"].fillna(99) <= 20].groupby(["game_id", "fixed_drive"], as_index=False)["touchdown"].max()
        drz_df = dfn[dfn["yardline_100"].fillna(99) <= 20].groupby(["game_id", "fixed_drive"], as_index=False)["touchdown"].max()
        off_rz_r = float(orz_df["touchdown"].mean()) if len(orz_df) > 0 else 0.5806
        def_rz_r = float(drz_df["touchdown"].mean()) if len(drz_df) > 0 else 0.5799
        eb_off_rz_resid = (len(orz_df) / (len(orz_df) + 20.0)) * ((off_rz_r - 0.5806) - 0.75 * off_epa_c)
        eb_def_rz_resid = (len(drz_df) / (len(drz_df) + 20.0)) * ((def_rz_r - 0.5799) + 0.75 * def_epa_c)

        # Clean-room Defensive Pass-Rush OLS (Shard 4 R^2=0.5693) & Coverage/YAC Resistance (r=0.9838)
        dfn_cmp = dfn[dfn["complete_pass"] == 1]
        dfn_rush = dfn[dfn["rush_attempt"] == 1]
        def_sack_r = float(dfn_db["sack"].fillna(0).mean()) if len(dfn_db) > 0 else 0.062
        def_qb_hit_r = float(dfn_db["qb_hit"].fillna(0).mean()) if len(dfn_db) > 0 else 0.145
        def_pressure_dr = 0.030205 + 2.265053 * def_sack_r + 3.439159 * def_qb_hit_r - 0.164583 * blitz_r
        def_pd_r = float(dfn_att["pass_defense_1_player_id"].notna().mean()) if len(dfn_att) > 0 else 0.155
        def_tfl_r = float(dfn_rush["tackled_for_loss"].fillna(0).mean()) if len(dfn_rush) > 0 else 0.055
        def_yac_cmp = float(dfn_cmp["yards_after_catch"].fillna(0.0).mean()) if len(dfn_cmp) > 0 else 5.50
        def_xyac_oe = float((dfn_cmp["yards_after_catch"].fillna(0.0) - dfn_cmp["xyac_mean_yardage"].fillna(4.5)).mean()) if len(dfn_cmp) > 0 else 0.0

        teams_out[tm] = {
            "ftn_scrimmage_plays": n_off,
            "ftn_dropbacks": n_off_db,
            "ftn_attempts": n_off_att,
            "inferred_offensive_scheme": off_scheme,
            "inferred_formation": off_form,
            "inferred_defensive_front": def_front,
            "inferred_coverage_shell": def_shell,
            "motion_rate": round(motion_r, 4),
            "l4_motion_rate": round(l4_motion_r, 4),
            "play_action_rate": round(pa_r, 4),
            "l4_play_action_rate": round(l4_pa_r, 4),
            "rpo_rate": round(rpo_r, 4),
            "screen_rate": round(screen_r, 4),
            "no_huddle_rate": round(no_huddle_r, 4),
            "under_center_rate": round(uc_r, 4),
            "shotgun_rate": round(shotgun_r, 4),
            "pistol_rate": round(pistol_r, 4),
            "out_of_pocket_rate": round(oop_r, 4),
            "multi_back_rate": round(multi_back_r, 4),
            "def_avg_box_count": round(avg_box, 4),
            "def_light_box_rate": round(light_box_r, 4),
            "def_heavy_box_rate": round(heavy_box_r, 4),
            "def_blitz_rate": round(blitz_r, 4),
            "def_l4_blitz_rate": round(l4_blitz_r, 4),
            "def_avg_pass_rushers": round(avg_rushers, 4),
            "def_five_man_front_rate": round(five_front_r, 4),
            "def_sack_rate": round(def_sack_r, 4),
            "def_qb_hit_rate": round(def_qb_hit_r, 4),
            "def_pressure_per_drive": round(def_pressure_dr, 4),
            "def_pd_rate": round(def_pd_r, 4),
            "def_tfl_rate": round(def_tfl_r, 4),
            "def_yac_per_comp": round(def_yac_cmp, 3),
            "def_xyac_over_expected": round(def_xyac_oe, 3),
            "qb_fault_sacks": qb_fault_sacks,
            "ol_fault_sacks": ol_fault_sacks,
            "qb_fault_sack_share": round(qb_fault_share, 4),
            "first_read_rate": round(first_read_r, 4),
            "secondary_read_rate": round(sec_read_r, 4),
            "checkdown_rate": round(chk_r, 4),
            "scramble_drill_rate": round(sd_r, 4),
            "secondary_read_epa": round(sec_read_epa, 4),
            "catchable_ball_rate": round(catchable_r, 4),
            "wr_drop_rate": round(drop_r, 4),
            "created_reception_rate": round(created_r, 4),
            "contested_ball_rate": round(contested_r, 4),
            "off_twp_rate": round(off_twp_r, 4),
            "off_actual_int_rate": round(off_int_r, 4),
            "off_twp_luck_gap": round(off_int_r - off_twp_r, 4),
            "def_twp_forced_rate": round(def_twp_r, 4),
            "def_actual_int_rate": round(def_int_r, 4),
            "def_twp_luck_gap": round(def_int_r - def_twp_r, 4),
            "eb_fg_make_oe": round(eb_fg_oe, 5),
            "eb_fg_50plus_delta": round(eb_fg50_delta, 5),
            "punt_avg_dist": round(raw_punt_avg, 2),
            "eb_punt_net_dist": round(eb_punt_net, 3),
            "eb_pr_edge_yds": round(eb_pr_edge, 3),
            "off_3d_conv_rate": round(off_3d_r, 4),
            "def_3d_allowed_rate": round(def_3d_r, 4),
            "eb_off_3d_resid": round(eb_off_3d_resid, 5),
            "eb_def_3d_resid": round(eb_def_3d_resid, 5),
            "off_rz_td_rate": round(off_rz_r, 4),
            "def_rz_td_allowed_rate": round(def_rz_r, 4),
            "eb_off_rz_resid": round(eb_off_rz_resid, 5),
            "eb_def_rz_resid": round(eb_def_rz_resid, 5),
            "kick_return_avg_start_yl100": round(rec_start_yl100, 3),
            "kick_coverage_avg_allowed_yl100": round(cov_allowed_yl100, 3),
            "kick_return_yl_edge_vs_league": round(league_ko_yl - rec_start_yl100, 3),
            "kick_coverage_yl_edge_vs_league": round(cov_allowed_yl100 - league_ko_yl, 3),
            "n_def_plays": n_dfn,
            "n_def_db": n_dfn_db,
            "n_def_att": n_dfn_att,
        }

    out = {
        "available": True,
        "joined_rows": int(len(merged)),
        "scrimmage_rows": int(len(scrim)),
        "max_week": max_week,
        "league_avg_kickoff_start_yl100": round(league_ko_yl, 3),
        "teams": teams_out,
    }
    _FTN_CACHE["mtime_sig"] = mtime_sig
    _FTN_CACHE["data"] = out
    return out


def load_snap_and_player_week_32team_profiles(
    snap_path: Path = CLEARED_SNAP_COUNTS_2026_PATH,
    spw_path: Path = CLEARED_STATS_PLAYER_WEEK_2026_PATH,
) -> Dict[str, Any]:
    """
    Mtime-cached 32-team snap-count and player-week lookup preserving each player's
    actual active games played (`player_gp`), recent 3-week availability, and real
    WR/TE/RB efficiency concentration.
    """
    if pd is None or not snap_path.exists():
        return {"available": False, "reason": "snap_counts_missing", "player_lookup": {}, "team_skill": {}}

    spw_mtime = spw_path.stat().st_mtime_ns if spw_path.exists() else 0
    mtime_sig = (snap_path.stat().st_mtime_ns, spw_mtime)
    if _SNAP_CACHE.get("mtime_sig") == mtime_sig and isinstance(_SNAP_CACHE.get("data"), dict):
        return _SNAP_CACHE["data"]

    snp = pd.read_parquet(
        snap_path,
        columns=["week", "player", "position", "team", "offense_pct", "defense_pct", "st_pct"],
    )
    max_week = int(snp["week"].dropna().max()) if len(snp) > 0 else 10
    recent_floor = max(1, max_week - 2)

    player_lookup: Dict[Tuple[str, str], Dict[str, Any]] = {}
    snp["tm_norm"] = snp["team"].astype(str).map(normalize_nfl_team)
    snp["p_norm"] = snp["player"].astype(str).map(_normalize_player_key)

    for (tm_norm, p_norm), grp in snp.groupby(["tm_norm", "p_norm"], sort=False):
        if not tm_norm or not p_norm:
            continue
        wks = sorted({int(w) for w in grp["week"].dropna().tolist()})
        gp = len(wks)
        recent = grp[grp["week"] >= recent_floor]
        rec_off = float(recent["offense_pct"].fillna(0.0).mean()) if len(recent) > 0 else 0.0
        rec_def = float(recent["defense_pct"].fillna(0.0).mean()) if len(recent) > 0 else 0.0
        pos_series = grp["position"].dropna()
        pos_val = str(pos_series.iloc[-1]).upper() if len(pos_series) > 0 else ""
        player_lookup[(tm_norm, p_norm)] = {
            "player": str(grp["player"].iloc[-1]),
            "team": tm_norm,
            "position": pos_val,
            "player_gp": gp,
            "weeks_played": wks,
            "last_week_played": max(wks) if wks else 0,
            "avg_offense_pct": round(float(grp["offense_pct"].fillna(0.0).mean()), 4),
            "avg_defense_pct": round(float(grp["defense_pct"].fillna(0.0).mean()), 4),
            "avg_st_pct": round(float(grp["st_pct"].fillna(0.0).mean()), 4),
            "recent_3wk_off_pct": round(rec_off, 4),
            "recent_3wk_def_pct": round(rec_def, 4),
        }

    team_skill: Dict[str, Dict[str, Any]] = {}
    if spw_path.exists():
        spw = pd.read_parquet(
            spw_path,
            columns=[
                "player_display_name",
                "position",
                "week",
                "team",
                "carries",
                "rushing_epa",
                "targets",
                "receptions",
                "receiving_yards",
                "receiving_epa",
                "target_share",
                "air_yards_share",
                "wopr",
            ],
        )
        spw["tm_norm"] = spw["team"].astype(str).map(normalize_nfl_team)
        for tm_norm, tgrp in spw.groupby("tm_norm", sort=False):
            if not tm_norm:
                continue
            wr_te = tgrp[tgrp["position"].isin(["WR", "TE"]) & (tgrp["targets"].fillna(0) >= 1)]
            # Average across active player-weeks (`player_gp` implicit denominator per row)
            top_wopr = 0.0
            wr_te_rec_epa_per_tgt = 0.0
            if len(wr_te) > 0:
                by_p = wr_te.groupby("player_display_name", as_index=False).agg(
                    gp=("week", "nunique"),
                    targets=("targets", "sum"),
                    rec_epa=("receiving_epa", "sum"),
                    wopr=("wopr", "mean"),
                )
                top_wopr = float(by_p["wopr"].max()) if len(by_p) > 0 else 0.0
                tot_tgt = float(by_p["targets"].sum())
                tot_rec_epa = float(by_p["rec_epa"].sum())
                wr_te_rec_epa_per_tgt = tot_rec_epa / max(1.0, tot_tgt)

            rb = tgrp[(tgrp["position"] == "RB") & (tgrp["carries"].fillna(0) >= 1)]
            rb1_rush_epa_per_carry = 0.0
            if len(rb) > 0:
                by_rb = rb.groupby("player_display_name", as_index=False).agg(
                    carries=("carries", "sum"),
                    rush_epa=("rushing_epa", "sum"),
                ).sort_values("carries", ascending=False)
                top_rb = by_rb.iloc[0]
                rb1_rush_epa_per_carry = float(top_rb["rush_epa"] or 0.0) / max(1.0, float(top_rb["carries"] or 1.0))

            team_skill[tm_norm] = {
                "top_receiver_wopr": round(top_wopr, 4),
                "wr_te_rec_epa_per_target": round(wr_te_rec_epa_per_tgt, 4),
                "rb1_rush_epa_per_carry": round(rb1_rush_epa_per_carry, 4),
            }

    out = {
        "available": True,
        "snap_rows": int(len(snp)),
        "max_week": max_week,
        "player_lookup": player_lookup,
        "team_skill": team_skill,
    }
    _SNAP_CACHE["mtime_sig"] = mtime_sig
    _SNAP_CACHE["data"] = out
    return out


def _status_to_miss_prob(status: str) -> Tuple[float, bool]:
    st = str(status or "").strip().lower()
    if "injured" in st or st == "ir" or "pup" in st or "suspend" in st:
        return 0.0, True
    if "out" in st:
        return 1.0, False
    if "doubt" in st:
        return 0.75, False
    if "question" in st:
        return 0.35, False
    return 0.0, False


def _bucket_for_position(pos: str) -> Optional[str]:
    p = str(pos or "").strip().upper()
    if p in ("DE", "EDGE", "OLB"):
        return "edge"
    if p in ("CB", "DB"):
        return "cb"
    if p in ("S", "FS", "SS"):
        return "s"
    if p in ("OT", "T", "OG", "G", "C", "OL"):
        return "ol"
    if p in ("DT", "NT", "DL"):
        return "dt"
    if p == "TE":
        return "te"
    if p in ("LB", "ILB", "MLB"):
        return "lb"
    if p == "QB":
        return "qb"
    if p in ("RB", "WR"):
        return "skill"
    return None


def _compute_baseline_surprise_factor(last_week_played: int, max_week: int) -> float:
    """
    Recency filter preventing double-counting multi-week absences already baked
    into Weeks 1-10 team efficiency baselines while capturing fresh Week 9-11 news
    (even when status was moved to IR this week).
    """
    if max_week <= 0 or last_week_played <= 0:
        return 0.0
    weeks_since_last_snap = max_week - last_week_played
    if weeks_since_last_snap <= 2:
        return 1.0
    if weeks_since_last_snap <= 4:
        return 0.45
    return 0.0


def evaluate_snap_weighted_injury_impact(
    team_abbr: str,
    raw_injuries_list: Sequence[Mapping[str, Any]],
) -> Dict[str, Any]:
    """
    Replaces flat body counts with snap-weighted & recency-filtered Weeks 1-10
    availability impacts:
      - Uses actual `avg_offense_pct` / `avg_defense_pct` from `snap_counts_2026.parquet`.
      - Applies recency surprise factor based on `last_week_played` vs `max_week`
        so already-missing IR/long-term Out players (`last_week_played <= max_week - 5`)
        are NOT double-counted, while fresh week-9/10 starters placed on IR DO count.
      - Non-playing backups (`0.0` scrimmage snaps) contribute `0.0` mean impact and
        NEVER trigger false OL/CB stacking cliffs.
      - Computes asymmetric positional Bernoulli variance (`q_off_sigma_sq` / `q_def_sigma_sq`)
        from BOTH Questionable (`0.35`) and Doubtful (`0.75`) probabilities.
    """
    tm = normalize_nfl_team(team_abbr)
    snap_cache = load_snap_and_player_week_32team_profiles()
    p_lookup = snap_cache.get("player_lookup") or {}
    snap_max_week = int(snap_cache.get("max_week", 10))

    bucket_sums: Dict[str, float] = {
        "edge": 0.0,
        "cb": 0.0,
        "s": 0.0,
        "ol": 0.0,
        "dt": 0.0,
        "te": 0.0,
        "lb": 0.0,
        "qb": 0.0,
        "skill": 0.0,
    }
    raw_q_weight = 0.0
    snap_weighted_q = 0.0
    q_off_sigma_sq = 0.0
    q_def_sigma_sq = 0.0
    ir_count = 0
    ol_starter_events: List[float] = []
    cb_starter_events: List[float] = []
    player_details: List[Dict[str, Any]] = []

    for item in raw_injuries_list:
        pname = str(item.get("player", "") or "")
        pos = str(item.get("position", "") or "").upper()
        status = str(item.get("status", "") or "")
        st_l = status.lower()
        miss_prob, is_ir_label = _status_to_miss_prob(status)

        snap_rec = p_lookup.get((tm, _normalize_player_key(pname)))
        if snap_rec:
            is_def = pos in _DEF_POSITIONS or (pos == "" and snap_rec["avg_defense_pct"] > snap_rec["avg_offense_pct"])
            snap_share = float(snap_rec["avg_defense_pct"] if is_def else snap_rec["avg_offense_pct"])
            gp = int(snap_rec["player_gp"])
            last_wk = int(snap_rec["last_week_played"])
        else:
            is_def = pos in _DEF_POSITIONS
            snap_share = 0.0
            gp = 0
            last_wk = 0

        surprise = _compute_baseline_surprise_factor(last_wk, snap_max_week) if snap_rec else 0.0
        if is_ir_label:
            if surprise == 0.0:
                ir_count += 1
                player_details.append(
                    {
                        "player": pname,
                        "position": pos,
                        "status": status,
                        "player_gp": gp,
                        "last_week_played": last_wk,
                        "snap_share": round(snap_share, 4),
                        "effective_impact": 0.0,
                        "note": "ir_already_priced_in",
                    }
                )
                continue
            miss_prob = 1.0

        # Require actual scrimmage presence (>=5% avg snap share) to carry scrimmage line/coverage impact;
        # prevents 0-snap reserves (Charlie Heck OT, Jake Hummel ST-only LB) from inflating injury shocks.
        effective = round(miss_prob * snap_share * surprise, 4) if snap_share >= 0.05 else 0.0
        bucket = _bucket_for_position(pos)
        if bucket in bucket_sums and effective > 0.0:
            bucket_sums[bucket] = round(bucket_sums[bucket] + effective, 4)

        if bucket == "ol" and snap_share >= 0.25 and miss_prob * surprise >= 0.35:
            ol_starter_events.append(effective)
        if bucket == "cb" and snap_share >= 0.25 and miss_prob * surprise >= 0.35:
            cb_starter_events.append(effective)

        if ("question" in st_l or "doubt" in st_l) and miss_prob > 0.0:
            raw_q_weight += 0.35 if "question" in st_l else 0.25
            lev = _POS_LEVERAGE_WEIGHT.get(pos, 0.70)
            eff_surprise = surprise if snap_rec else 1.0
            w_q = miss_prob * snap_share * lev * eff_surprise
            snap_weighted_q += w_q
            # Centered Bernoulli std proportional to sqrt(p*(1-p)) * snap_share * leverage * surprise
            var_term = (miss_prob * (1.0 - miss_prob)) * ((0.032 * snap_share * lev * eff_surprise) ** 2)
            if is_def:
                q_def_sigma_sq += var_term
            else:
                q_off_sigma_sq += var_term

        player_details.append(
            {
                "player": pname,
                "position": pos,
                "status": status,
                "player_gp": gp,
                "last_week_played": last_wk,
                "snap_share": round(snap_share, 4),
                "surprise_factor": round(surprise, 2),
                "effective_impact": effective,
            }
        )

    ol_cliff = sum(ol_starter_events) + (0.35 * max(0.0, sum(ol_starter_events) - 0.60) if len(ol_starter_events) >= 2 else 0.0)
    cb_cliff = sum(cb_starter_events) + (0.25 * max(0.0, sum(cb_starter_events) - 0.60) if len(cb_starter_events) >= 2 else 0.0)

    return {
        "team": tm,
        "edge_out": round(bucket_sums["edge"], 4),
        "cb_out": round(bucket_sums["cb"], 4),
        "s_out": round(bucket_sums["s"], 4),
        "ol_out": round(bucket_sums["ol"], 4),
        "dt_out": round(bucket_sums["dt"], 4),
        "te_out": round(bucket_sums["te"], 4),
        "lb_out": round(bucket_sums["lb"], 4),
        "questionable_weight": round(raw_q_weight, 4),
        "snap_weighted_questionable": round(snap_weighted_q, 4),
        "q_off_sigma_sq": q_off_sigma_sq,
        "q_def_sigma_sq": q_def_sigma_sq,
        "ir_already_priced_in": ir_count,
        "active_ol_cliff": len(ol_starter_events) >= 2,
        "ol_cliff_weighted": round(ol_cliff, 4),
        "active_cb_cliff": len(cb_starter_events) >= 2,
        "cb_cliff_weighted": round(cb_cliff, 4),
        "snap_weighted_players": player_details,
    }


def _team_twp_and_creation_epa(ftn_prof: Mapping[str, Any], opp_ftn_prof: Mapping[str, Any], skill_prof: Mapping[str, Any]) -> Dict[str, float]:
    # Positive off_twp_luck_gap means actual INTs exceeded TWP -> QB was unlucky -> POSITIVE forward EPA regression
    # Negative off_twp_luck_gap means QB threw dangerous balls that were dropped -> NEGATIVE forward EPA regression
    off_twp_gap = float(ftn_prof.get("off_twp_luck_gap", 0.0))
    # Opponent defense forced lots of TWP without getting INTs -> opp defense overdue for takeaway -> negative off EPA
    opp_def_twp_gap = float(opp_ftn_prof.get("def_twp_luck_gap", 0.0))
    twp_reg_epa = _soft_cap(0.42 * off_twp_gap + 0.30 * opp_def_twp_gap, 0.018)

    # Secondary-read progression & WR creation differential (league-centered against empirically verified 2026 baselines)
    drop_r = float(ftn_prof.get("wr_drop_rate", 0.045))
    created_r = float(ftn_prof.get("created_reception_rate", 0.035))
    sec_read_r = float(ftn_prof.get("secondary_read_rate", 0.14))
    sec_epa = float(ftn_prof.get("secondary_read_epa", 0.0))
    prog_epa = _soft_cap(
        0.22 * (created_r - 0.035) - 0.20 * (drop_r - 0.045) + 0.10 * sec_read_r * sec_epa,
        0.018,
    )

    top_wopr = float(skill_prof.get("top_receiver_wopr", 0.48))
    wr_epa_tgt = float(skill_prof.get("wr_te_rec_epa_per_target", 0.12))
    rb_epa_car = float(skill_prof.get("rb1_rush_epa_per_carry", 0.0))
    creation_epa = _soft_cap(
        0.03 * (top_wopr - 0.48) + 0.05 * (wr_epa_tgt - 0.12) + 0.05 * rb_epa_car,
        0.018,
    )
    return {
        "twp_regression_epa": round(twp_reg_epa, 6),
        "progression_wr_credit_epa": round(prog_epa, 6),
        "rb_wr_creation_epa": round(creation_epa, 6),
    }


def evaluate_ftn_and_snap_deep_matchup(
    away_team: str,
    home_team: str,
    context: Optional[Mapping[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Computes strictly swap-symmetric Stream 15N pre-simulation intelligence from
    real PBP x FTN (25,480 plays), snap counts (14,004 rows), player-week stats
    (10,446 rows), and live Week 11 ESPN injuries.
    """
    ctx = dict(context or {})
    away_u = normalize_nfl_team(away_team or "IND")
    home_u = normalize_nfl_team(home_team or "HOU")

    ftn_cache = load_ftn_pbp_32team_charting_profiles()
    snap_cache = load_snap_and_player_week_32team_profiles()

    ftn_teams = ftn_cache.get("teams") or {}
    skill_teams = snap_cache.get("team_skill") or {}
    aw_ftn = ftn_teams.get(away_u) or {}
    hm_ftn = ftn_teams.get(home_u) or {}
    aw_sk = skill_teams.get(away_u) or {}
    hm_sk = skill_teams.get(home_u) or {}

    aw_comps = _team_twp_and_creation_epa(aw_ftn, hm_ftn, aw_sk)
    hm_comps = _team_twp_and_creation_epa(hm_ftn, aw_ftn, hm_sk)

    espn_inj_map = dict(ctx.get("espn_injuries") or {})
    if not espn_inj_map and WEEK11_ESPN_LIVE_SYNC_PATH.exists():
        try:
            espn_inj_map = dict(json.loads(WEEK11_ESPN_LIVE_SYNC_PATH.read_text(encoding="utf-8")).get("tnf_injuries") or {})
        except Exception:
            espn_inj_map = {}

    # Normalize injury map keys so LAR/LA, WSH/WAS, JAC/JAX match cleanly
    norm_inj_map = {normalize_nfl_team(k): list(v or []) for k, v in espn_inj_map.items()}
    aw_inj = evaluate_snap_weighted_injury_impact(away_u, norm_inj_map.get(away_u, []))
    hm_inj = evaluate_snap_weighted_injury_impact(home_u, norm_inj_map.get(home_u, []))

    league_ko_yl = float(ftn_cache.get("league_avg_kickoff_start_yl100", 70.0))
    # When AWAY receives kickoff, they start at weighted blend of AWAY return start & HOME coverage allowed
    aw_rec_yl = 0.5 * float(aw_ftn.get("kick_return_avg_start_yl100", league_ko_yl)) + 0.5 * float(hm_ftn.get("kick_coverage_avg_allowed_yl100", league_ko_yl))
    hm_rec_yl = 0.5 * float(hm_ftn.get("kick_return_avg_start_yl100", league_ko_yl)) + 0.5 * float(aw_ftn.get("kick_coverage_avg_allowed_yl100", league_ko_yl))
    # Lower yardline_100 = closer to opp endzone -> positive edge means away starts better than home
    kickoff_yl_diff = round(hm_rec_yl - aw_rec_yl, 3)

    # Clean-room ST Kicking & Punting, Situational 3D/RZ Residuals, and Opponent YAC/TFL Resistance (Subagents 1 & 4)
    aw_fg_sm = round(_soft_cap(0.55 * float(aw_ftn.get("eb_fg_make_oe", 0.0)), 0.045), 6)
    hm_fg_sm = round(_soft_cap(0.55 * float(hm_ftn.get("eb_fg_make_oe", 0.0)), 0.045), 6)
    aw_fg_50 = round(_soft_cap(0.35 * float(aw_ftn.get("eb_fg_50plus_delta", 0.0)), 0.055), 6)
    hm_fg_50 = round(_soft_cap(0.35 * float(hm_ftn.get("eb_fg_50plus_delta", 0.0)), 0.055), 6)

    aw_punt_net_mu = round(_clamp(0.70 * float(aw_ftn.get("eb_punt_net_dist", 42.24)) + 0.30 * (42.24 - float(hm_ftn.get("eb_pr_edge_yds", 0.0))), 38.5, 46.0), 3)
    hm_punt_net_mu = round(_clamp(0.70 * float(hm_ftn.get("eb_punt_net_dist", 42.24)) + 0.30 * (42.24 - float(aw_ftn.get("eb_pr_edge_yds", 0.0))), 38.5, 46.0), 3)

    aw_3d_resid = round(_soft_cap(0.18 * float(aw_ftn.get("eb_off_3d_resid", 0.0)) + 0.14 * float(hm_ftn.get("eb_def_3d_resid", 0.0)), 0.025), 6)
    hm_3d_resid = round(_soft_cap(0.18 * float(hm_ftn.get("eb_off_3d_resid", 0.0)) + 0.14 * float(aw_ftn.get("eb_def_3d_resid", 0.0)), 0.025), 6)

    aw_rz_resid = round(_soft_cap(0.22 * float(aw_ftn.get("eb_off_rz_resid", 0.0)) + 0.16 * float(hm_ftn.get("eb_def_rz_resid", 0.0)), 0.030), 6)
    hm_rz_resid = round(_soft_cap(0.22 * float(hm_ftn.get("eb_off_rz_resid", 0.0)) + 0.16 * float(aw_ftn.get("eb_def_rz_resid", 0.0)), 0.030), 6)

    # Offense-signed resistance against opponent defense YAC/TFL/PD (higher opp xYAC OE = +EPA for offense)
    def _opp_yac_tfl_off_epa(opp_prof: Mapping[str, Any]) -> float:
        xyac_oe = float(opp_prof.get("def_xyac_over_expected", 0.0))
        tfl_r = float(opp_prof.get("def_tfl_rate", 0.055))
        pd_r = float(opp_prof.get("def_pd_rate", 0.155))
        return round(_soft_cap(0.011 * xyac_oe - 0.18 * (tfl_r - 0.055) - 0.08 * (pd_r - 0.155), 0.018), 6)

    aw_vs_opp_yac_tfl = _opp_yac_tfl_off_epa(hm_ftn)
    hm_vs_opp_yac_tfl = _opp_yac_tfl_off_epa(aw_ftn)

    return {
        "schema": "gse_ftn_and_snap_deep_15n_v2_39table_calibrated",
        "available": bool(ftn_cache.get("available") and snap_cache.get("available")),
        "away_team": away_u,
        "home_team": home_u,
        "ftn_joined_rows": int(ftn_cache.get("joined_rows", 0)),
        "snap_rows": int(snap_cache.get("snap_rows", 0)),
        "away_ftn_profile": aw_ftn,
        "home_ftn_profile": hm_ftn,
        "away_snap_injuries": aw_inj,
        "home_snap_injuries": hm_inj,
        "stream_15n_away_ftn_twp_regression_epa": aw_comps["twp_regression_epa"],
        "stream_15n_home_ftn_twp_regression_epa": hm_comps["twp_regression_epa"],
        "stream_15n_away_ftn_progression_wr_credit_epa": aw_comps["progression_wr_credit_epa"],
        "stream_15n_home_ftn_progression_wr_credit_epa": hm_comps["progression_wr_credit_epa"],
        "stream_15n_away_rb_wr_creation_epa": aw_comps["rb_wr_creation_epa"],
        "stream_15n_home_rb_wr_creation_epa": hm_comps["rb_wr_creation_epa"],
        "stream_15n_away_kickoff_start_yl100": round(aw_rec_yl, 3),
        "stream_15n_home_kickoff_start_yl100": round(hm_rec_yl, 3),
        "stream_15n_kickoff_yl_differential": kickoff_yl_diff,
        "stream_15n_away_fg_short_mid_delta": aw_fg_sm,
        "stream_15n_home_fg_short_mid_delta": hm_fg_sm,
        "stream_15n_away_fg_50plus_delta": aw_fg_50,
        "stream_15n_home_fg_50plus_delta": hm_fg_50,
        "stream_15n_away_punt_net_mu": aw_punt_net_mu,
        "stream_15n_home_punt_net_mu": hm_punt_net_mu,
        "stream_15n_away_third_down_epa_resid": aw_3d_resid,
        "stream_15n_home_third_down_epa_resid": hm_3d_resid,
        "stream_15n_away_redzone_epa_resid": aw_rz_resid,
        "stream_15n_home_redzone_epa_resid": hm_rz_resid,
        "stream_15n_away_vs_opp_yac_tfl_epa": aw_vs_opp_yac_tfl,
        "stream_15n_home_vs_opp_yac_tfl_epa": hm_vs_opp_yac_tfl,
    }


__all__ = [
    "CLEARED_PBP_2026_PATH",
    "CLEARED_FTN_2026_PATH",
    "CLEARED_SNAP_COUNTS_2026_PATH",
    "CLEARED_STATS_PLAYER_WEEK_2026_PATH",
    "WEEK11_ESPN_LIVE_SYNC_PATH",
    "normalize_nfl_team",
    "load_ftn_pbp_32team_charting_profiles",
    "load_snap_and_player_week_32team_profiles",
    "evaluate_snap_weighted_injury_impact",
    "evaluate_ftn_and_snap_deep_matchup",
]
