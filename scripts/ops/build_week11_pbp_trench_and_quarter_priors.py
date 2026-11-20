#!/usr/bin/env python3
"""Build 32-Team 2026 Weeks 1-10 PBP Situational, Trench & Quarter Feature Store.

Reads nflverse 2026 Weeks 1-10 play-by-play, weekly player stats, and Stage 0
roster truth (data/nflverse/week11_live_roster_transactions_and_starters_2026.json)
to materialize a Stage-0-clean pre-simulation feature store across all 32 NFL teams:
  - Offensive & defensive trench rates (sack rate, hit+sack rate, scramble,
    explosive pass/rush, stuff rate, early-down EPA, 3rd-down %, red-zone TD %)
  - Quarter & game-script splits (1Q/2Q/1H/3Q/4Q PPG, neutral/trailing pass rate,
    leading rush rate, neutral seconds per snap pace)
  - Active starter 1Q / 1H / full-game / red-zone share priors adjusted by exact
    per-player active games played (player_gp) and strictly excluding all
    IR / OUT / RES / OFF_ROSTER players from Stage 0.

Does NOT generate or emit Week 11 Sunday picks (held until TNF settles).
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PBP_PATH = ROOT / "data" / "nflverse" / "pbp_2026_w1_w10.parquet"
FALLBACK_PBP_CSV = ROOT / "data" / "nflverse" / "pbp_2026_slim_clean_checkout.csv.gz"
DEFAULT_SPW_PATH = ROOT / "data" / "nflverse" / "stats_player_week_2026_w1_w10.parquet"
DEFAULT_ROSTER_PATH = (
    ROOT / "data" / "nflverse" / "week11_live_roster_transactions_and_starters_2026.json"
)
DEFAULT_OUT_PATH = (
    ROOT / "data" / "engine" / "nfl_2026_weeks1_10_situational_trench_quarter_priors.json"
)

TEAM_ALIAS_TO_CANON: dict[str, str] = {
    "LA": "LAR",
    "WSH": "WAS",
}


def normalize_team(abbr: Any) -> str:
    s = str(abbr or "").strip().upper()
    return TEAM_ALIAS_TO_CANON.get(s, s)


def normalize_name(name: Any) -> str:
    return re.sub(r"[^a-z0-9]", "", str(name or "").lower())


def _safe_rate(num: float, den: float) -> float:
    if den <= 0:
        return 0.0
    val = float(num) / float(den)
    return round(max(0.0, min(1.0, val)), 4)


def _safe_float(val: Any, default: float = 0.0) -> float:
    if val is None or pd.isna(val):
        return default
    return round(float(val), 4)


def _compute_team_quarter_ppg(pbp: pd.DataFrame, team_canon: str) -> dict[str, float]:
    mask = (pbp["home_canon"] == team_canon) | (pbp["away_canon"] == team_canon)
    games = pbp.loc[mask, ["game_id", "home_canon", "away_canon"]].drop_duplicates()
    if games.empty:
        return {"1Q": 0.0, "2Q": 0.0, "1H": 0.0, "3Q": 0.0, "4Q": 0.0, "total_ppg": 0.0}

    q_totals = {1: 0, 2: 0, 3: 0, 4: 0}
    n_games = len(games)
    for _, g in games.iterrows():
        gid = g["game_id"]
        score_col = "total_home_score" if g["home_canon"] == team_canon else "total_away_score"
        gdf = pbp[pbp["game_id"] == gid]
        prev = 0
        for q in (1, 2, 3, 4):
            qdf = gdf[gdf["qtr"] == q]
            if not qdf.empty and score_col in qdf.columns and qdf[score_col].notna().any():
                mx = int(qdf[score_col].max())
            else:
                mx = prev
            pts = max(0, mx - prev)
            q_totals[q] += pts
            prev = max(prev, mx)

    q1 = round(q_totals[1] / n_games, 3)
    q2 = round(q_totals[2] / n_games, 3)
    q3 = round(q_totals[3] / n_games, 3)
    q4 = round(q_totals[4] / n_games, 3)
    return {
        "1Q": q1,
        "2Q": q2,
        "1H": round(q1 + q2, 3),
        "3Q": q3,
        "4Q": q4,
        "total_ppg": round(q1 + q2 + q3 + q4, 3),
    }


def _compute_neutral_pace_sec(pbp_off: pd.DataFrame) -> float:
    if pbp_off.empty or "half_seconds_remaining" not in pbp_off.columns:
        return 27.5
    df = pbp_off[
        (pbp_off["qtr"].isin([1, 2, 3, 4]))
        & ((pbp_off["pass_attempt"] == 1) | (pbp_off["rush_attempt"] == 1))
    ].sort_values(["game_id", "drive", "play_id"])
    if df.empty:
        return 27.5
    df = df.copy()
    df["prev_half_sec"] = df.groupby(["game_id", "drive"])["half_seconds_remaining"].shift(1)
    df["snap_diff"] = df["prev_half_sec"] - df["half_seconds_remaining"]
    neutral = df[
        (df["score_differential"].between(-7, 7))
        & (df["half_seconds_remaining"] > 120)
        & (df["snap_diff"] > 0)
        & (df["snap_diff"] <= 55)
    ]
    if neutral.empty:
        return 27.5
    return round(float(neutral["snap_diff"].mean()), 2)


def _compute_trench_block(df_unit: pd.DataFrame, is_offense: bool) -> dict[str, Any]:
    db = df_unit[df_unit["qb_dropback"] == 1]
    n_db = int(len(db))
    n_sacks = int((db["sack"] == 1).sum())
    n_hit_or_sack = int(((db["qb_hit"] == 1) | (db["sack"] == 1)).sum())
    n_scrambles = int((db["qb_scramble"] == 1).sum())

    non_sack_pa = df_unit[(df_unit["pass_attempt"] == 1) & (df_unit["sack"] == 0)]
    exp_pass = int((non_sack_pa["yards_gained"] >= 20).sum())

    designed_rush = df_unit[(df_unit["rush_attempt"] == 1) & (df_unit["qb_scramble"] == 0)]
    n_rush = int(len(designed_rush))
    exp_rush = int((designed_rush["yards_gained"] >= 10).sum())
    stuffs = int((designed_rush["yards_gained"] <= 0).sum())

    early = df_unit[
        (df_unit["down"].isin([1, 2]))
        & ((df_unit["pass_attempt"] == 1) | (df_unit["rush_attempt"] == 1))
    ]
    third_conv = int((df_unit["third_down_converted"] == 1).sum())
    third_fail = int((df_unit["third_down_failed"] == 1).sum())

    # Red-zone TD conversion rate per offensive drive reaching <= 20
    rz_plays = df_unit[df_unit["yardline_100"] <= 20]
    rz_drives = rz_plays[["game_id", "drive"]].drop_duplicates()
    n_rz_drives = int(len(rz_drives))
    rz_tds = 0
    if n_rz_drives > 0:
        drive_keys = set(zip(rz_drives["game_id"], rz_drives["drive"]))
        td_rows = df_unit[
            (df_unit["touchdown"] == 1)
            & (df_unit["td_team_canon"] == df_unit["posteam_canon"])
        ]
        td_drive_keys = set(zip(td_rows["game_id"], td_rows["drive"]))
        rz_tds = len(drive_keys & td_drive_keys)

    prefix = "allowed" if is_offense else "generated"
    return {
        "dropbacks": n_db,
        "designed_rushes": n_rush,
        f"dropback_sack_rate_{prefix}": _safe_rate(n_sacks, n_db),
        f"qb_hit_plus_sack_rate_{prefix}": _safe_rate(n_hit_or_sack, n_db),
        f"scramble_rate_{prefix}": _safe_rate(n_scrambles, n_db),
        f"explosive_pass_rate_20p_{prefix}": _safe_rate(exp_pass, len(non_sack_pa)),
        f"explosive_rush_rate_10p_{prefix}": _safe_rate(exp_rush, n_rush),
        f"rush_stuff_rate_{prefix}": _safe_rate(stuffs, n_rush),
        f"early_down_epa_per_play_{'off' if is_offense else 'def'}": _safe_float(
            early["epa"].mean() if not early.empty else 0.0
        ),
        f"third_down_conversion_rate_{'off' if is_offense else 'def'}": _safe_rate(
            third_conv, third_conv + third_fail
        ),
        f"red_zone_td_rate_{'off' if is_offense else 'def'}": _safe_rate(rz_tds, n_rz_drives),
    }


def _compute_script_splits(df_off: pd.DataFrame) -> dict[str, Any]:
    active = df_off[
        (df_off["qtr"].isin([1, 2, 3, 4]))
        & ((df_off["pass_attempt"] == 1) | (df_off["rush_attempt"] == 1))
    ]
    neutral = active[active["score_differential"].between(-7, 7)]
    trailing = active[active["score_differential"] <= -8]
    leading = active[active["score_differential"] >= 8]

    return {
        "neutral_plays": int(len(neutral)),
        "neutral_pass_rate": _safe_rate(int((neutral["qb_dropback"] == 1).sum()), len(neutral)),
        "trailing_8p_pass_rate": _safe_rate(
            int((trailing["qb_dropback"] == 1).sum()), len(trailing)
        ),
        "leading_8p_rush_rate": _safe_rate(
            int((leading["rush_attempt"] == 1).sum()), len(leading)
        ),
        "neutral_sec_per_snap": _compute_neutral_pace_sec(df_off),
    }


def _build_active_starter_shares(
    pbp: pd.DataFrame,
    spw: pd.DataFrame,
    roster_truth: dict[str, Any],
) -> dict[str, list[dict[str, Any]]]:
    excluded_names: set[str] = set()
    excluded_pairs: set[tuple[str, str]] = set()
    for item in roster_truth.get("excluded_players") or []:
        n = normalize_name(item.get("name"))
        t = normalize_team(item.get("team"))
        if n:
            excluded_names.add(n)
            if t:
                excluded_pairs.add((n, t))

    traded_to: dict[str, str] = {}
    for tr in roster_truth.get("traded_players") or []:
        n = normalize_name(tr.get("name"))
        to_tm = normalize_team(tr.get("to"))
        if n and to_tm:
            traded_to[n] = to_tm

    spw = spw.copy()
    spw["team_canon"] = spw["team"].map(normalize_team)
    spw["norm_name"] = spw["player_display_name"].map(normalize_name)

    # Compute PBP 1Q, 1H, full-game, and RZ touches/targets per (player_id, game_id)
    pbp_rec = pbp[(pbp["pass_attempt"] == 1) & (pbp["receiver_player_id"].notna())].copy()
    pbp_rush = pbp[
        (pbp["rush_attempt"] == 1) & (pbp["qb_scramble"] == 0) & (pbp["rusher_player_id"].notna())
    ].copy()

    # Team game-level totals by game_id & team
    team_rec_all = pbp_rec.groupby(["game_id", "posteam_canon"]).size().to_dict()
    team_rec_1q = pbp_rec[pbp_rec["qtr"] == 1].groupby(["game_id", "posteam_canon"]).size().to_dict()
    team_rec_1h = pbp_rec[pbp_rec["qtr"].isin([1, 2])].groupby(["game_id", "posteam_canon"]).size().to_dict()
    team_rec_rz = pbp_rec[pbp_rec["yardline_100"] <= 20].groupby(["game_id", "posteam_canon"]).size().to_dict()

    team_rush_all = pbp_rush.groupby(["game_id", "posteam_canon"]).size().to_dict()
    team_rush_1q = pbp_rush[pbp_rush["qtr"] == 1].groupby(["game_id", "posteam_canon"]).size().to_dict()
    team_rush_1h = pbp_rush[pbp_rush["qtr"].isin([1, 2])].groupby(["game_id", "posteam_canon"]).size().to_dict()
    team_rush_rz = pbp_rush[pbp_rush["yardline_100"] <= 20].groupby(["game_id", "posteam_canon"]).size().to_dict()

    pl_rec_all = pbp_rec.groupby(["receiver_player_id", "game_id", "posteam_canon"]).size().to_dict()
    pl_rec_1q = (
        pbp_rec[pbp_rec["qtr"] == 1]
        .groupby(["receiver_player_id", "game_id", "posteam_canon"])
        .size()
        .to_dict()
    )
    pl_rec_1h = (
        pbp_rec[pbp_rec["qtr"].isin([1, 2])]
        .groupby(["receiver_player_id", "game_id", "posteam_canon"])
        .size()
        .to_dict()
    )
    pl_rec_rz = (
        pbp_rec[pbp_rec["yardline_100"] <= 20]
        .groupby(["receiver_player_id", "game_id", "posteam_canon"])
        .size()
        .to_dict()
    )

    pl_rush_all = pbp_rush.groupby(["rusher_player_id", "game_id", "posteam_canon"]).size().to_dict()
    pl_rush_1q = (
        pbp_rush[pbp_rush["qtr"] == 1]
        .groupby(["rusher_player_id", "game_id", "posteam_canon"])
        .size()
        .to_dict()
    )
    pl_rush_1h = (
        pbp_rush[pbp_rush["qtr"].isin([1, 2])]
        .groupby(["rusher_player_id", "game_id", "posteam_canon"])
        .size()
        .to_dict()
    )
    pl_rush_rz = (
        pbp_rush[pbp_rush["yardline_100"] <= 20]
        .groupby(["rusher_player_id", "game_id", "posteam_canon"])
        .size()
        .to_dict()
    )

    shares_by_team: dict[str, list[dict[str, Any]]] = {}

    for pid, grp in spw.groupby("player_id"):
        grp_sorted = grp.sort_values("week")
        last_row = grp_sorted.iloc[-1]
        disp_name = str(last_row["player_display_name"] or last_row["player_name"] or pid)
        pos = str(last_row["position"] or "").upper()
        if pos not in ("QB", "RB", "WR", "TE"):
            continue
        n_name = normalize_name(disp_name)
        current_team = traded_to.get(n_name, str(last_row["team_canon"]))

        if n_name in excluded_names or (n_name, current_team) in excluded_pairs:
            continue

        # Active player games played where player recorded snaps/usage
        active_rows = grp_sorted[
            (grp_sorted["attempts"].fillna(0) > 0)
            | (grp_sorted["carries"].fillna(0) > 0)
            | (grp_sorted["targets"].fillna(0) > 0)
            | (grp_sorted["receptions"].fillna(0) > 0)
        ]
        player_gp = int(active_rows["game_id"].nunique())
        if player_gp <= 0:
            continue

        # Aggregate PBP denominator strictly over games this player appeared in
        gids_teams = list(
            zip(active_rows["game_id"].astype(str), active_rows["team_canon"].astype(str))
        )
        seen_gt = list(dict.fromkeys(gids_teams))

        p_tgts = sum(pl_rec_all.get((pid, gid, tm), 0) for gid, tm in seen_gt)
        t_tgts = sum(team_rec_all.get((gid, tm), 0) for gid, tm in seen_gt)
        p_tgts_1q = sum(pl_rec_1q.get((pid, gid, tm), 0) for gid, tm in seen_gt)
        t_tgts_1q = sum(team_rec_1q.get((gid, tm), 0) for gid, tm in seen_gt)
        p_tgts_1h = sum(pl_rec_1h.get((pid, gid, tm), 0) for gid, tm in seen_gt)
        t_tgts_1h = sum(team_rec_1h.get((gid, tm), 0) for gid, tm in seen_gt)
        p_tgts_rz = sum(pl_rec_rz.get((pid, gid, tm), 0) for gid, tm in seen_gt)
        t_tgts_rz = sum(team_rec_rz.get((gid, tm), 0) for gid, tm in seen_gt)

        p_car = sum(pl_rush_all.get((pid, gid, tm), 0) for gid, tm in seen_gt)
        t_car = sum(team_rush_all.get((gid, tm), 0) for gid, tm in seen_gt)
        p_car_1q = sum(pl_rush_1q.get((pid, gid, tm), 0) for gid, tm in seen_gt)
        t_car_1q = sum(team_rush_1q.get((gid, tm), 0) for gid, tm in seen_gt)
        p_car_1h = sum(pl_rush_1h.get((pid, gid, tm), 0) for gid, tm in seen_gt)
        t_car_1h = sum(team_rush_1h.get((gid, tm), 0) for gid, tm in seen_gt)
        p_car_rz = sum(pl_rush_rz.get((pid, gid, tm), 0) for gid, tm in seen_gt)
        t_car_rz = sum(team_rush_rz.get((gid, tm), 0) for gid, tm in seen_gt)

        entry = {
            "player": disp_name,
            "player_id": str(pid),
            "team": current_team,
            "position": pos,
            "player_gp": player_gp,
            "targets_per_gp": round(float(active_rows["targets"].fillna(0).sum()) / player_gp, 2),
            "carries_per_gp": round(float(active_rows["carries"].fillna(0).sum()) / player_gp, 2),
            "rec_yds_per_gp": round(
                float(active_rows["receiving_yards"].fillna(0).sum()) / player_gp, 2
            ),
            "rush_yds_per_gp": round(
                float(active_rows["rushing_yards"].fillna(0).sum()) / player_gp, 2
            ),
            "pass_yds_per_gp": round(
                float(active_rows["passing_yards"].fillna(0).sum()) / player_gp, 2
            ),
            "target_share_1q": _safe_rate(p_tgts_1q, t_tgts_1q),
            "target_share_1h": _safe_rate(p_tgts_1h, t_tgts_1h),
            "target_share_full": _safe_rate(p_tgts, t_tgts),
            "carry_share_1q": _safe_rate(p_car_1q, t_car_1q),
            "carry_share_1h": _safe_rate(p_car_1h, t_car_1h),
            "carry_share_full": _safe_rate(p_car, t_car),
            "redzone_touch_share": _safe_rate(p_tgts_rz + p_car_rz, t_tgts_rz + t_car_rz),
        }
        shares_by_team.setdefault(current_team, []).append(entry)

    # Sort each team's active skill/QB pool by total involvement and keep top contributors
    for tm, plist in shares_by_team.items():
        plist.sort(
            key=lambda x: (
                x["target_share_full"] + x["carry_share_full"] + (0.5 if x["position"] == "QB" else 0.0),
                x["player_gp"],
            ),
            reverse=True,
        )
        shares_by_team[tm] = plist[:14]

    return shares_by_team


def build_feature_store(
    pbp: pd.DataFrame,
    spw: pd.DataFrame,
    roster_truth: dict[str, Any],
) -> dict[str, Any]:
    pbp = pbp.copy()
    pbp["posteam_canon"] = pbp["posteam"].map(normalize_team)
    pbp["defteam_canon"] = pbp["defteam"].map(normalize_team)
    pbp["home_canon"] = pbp["home_team"].map(normalize_team)
    pbp["away_canon"] = pbp["away_team"].map(normalize_team)
    pbp["td_team_canon"] = pbp["td_team"].map(normalize_team)

    canonical_teams = sorted(
        {
            t
            for t in (roster_truth.get("confirmed_qb1") or {}).keys()
            if str(t).strip()
        }
        | {
            str(t)
            for t in pbp["home_canon"].dropna().unique().tolist()
            if str(t).strip()
        }
    )

    starter_shares = _build_active_starter_shares(pbp, spw, roster_truth)
    teams_out: dict[str, Any] = {}

    for tm in canonical_teams:
        off_df = pbp[pbp["posteam_canon"] == tm]
        def_df = pbp[pbp["defteam_canon"] == tm]
        games_played = int(
            pbp.loc[(pbp["home_canon"] == tm) | (pbp["away_canon"] == tm), "game_id"].nunique()
        )
        teams_out[tm] = {
            "team": tm,
            "games_played_w1_w10": games_played,
            "confirmed_qb1": (roster_truth.get("confirmed_qb1") or {}).get(tm),
            "offense_trench": _compute_trench_block(off_df, is_offense=True),
            "defense_trench": _compute_trench_block(def_df, is_offense=False),
            "quarter_and_script_splits": {
                **_compute_team_quarter_ppg(pbp, tm),
                **_compute_script_splits(off_df),
            },
            "active_starter_shares": starter_shares.get(tm, []),
        }

    return {
        "schema": "gse_32team_pbp_situational_trench_quarter_priors_v1",
        "season": 2026,
        "weeks_covered": "1-10",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "teams_count": len(teams_out),
        "stage0_roster_as_of": roster_truth.get("as_of"),
        "excluded_players_enforced_count": len(roster_truth.get("excluded_players") or []),
        "teams": teams_out,
    }


def _load_pbp(pbp_path: Path, csv_fallback: Path) -> pd.DataFrame:
    if pbp_path.exists():
        return pd.read_parquet(pbp_path)
    if csv_fallback.exists():
        return pd.read_csv(csv_fallback, low_memory=False)
    raise FileNotFoundError(f"Neither {pbp_path} nor {csv_fallback} found.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build 32-team 2026 W1-W10 situational priors.")
    parser.add_argument("--pbp", type=str, default=str(DEFAULT_PBP_PATH))
    parser.add_argument("--spw", type=str, default=str(DEFAULT_SPW_PATH))
    parser.add_argument("--roster", type=str, default=str(DEFAULT_ROSTER_PATH))
    parser.add_argument("--out", type=str, default=str(DEFAULT_OUT_PATH))
    args = parser.parse_args()

    pbp = _load_pbp(Path(args.pbp), FALLBACK_PBP_CSV)
    spw = pd.read_parquet(args.spw)
    roster_truth = json.loads(Path(args.roster).read_text(encoding="utf-8"))

    store = build_feature_store(pbp, spw, roster_truth)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(store, indent=2, ensure_ascii=True) + "\n", encoding="ascii"
    )
    print(
        f"[PRIORS BUILDER] Built {store['teams_count']} teams -> {out_path} "
        f"(Stage 0 excluded enforced: {store['excluded_players_enforced_count']})"
    )


if __name__ == "__main__":
    main()
