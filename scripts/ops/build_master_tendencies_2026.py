"""Build data/film_room_2026/master_weeks_1_to_7_pbp_tendencies_2026.json from real feeds.

Every field written here is computed from plays that actually happened in the 2026
regular season, weeks 1..7. Nothing is defaulted, imputed from a prior season, or
invented: a field whose source column is absent from the feed is omitted, and the
consumer side is required to notice the absence rather than substitute a constant.

Sources
  nflverse play-by-play 2026 (CC-BY 4.0, credit "nflverse") - EPA, play type, results
  nflverse/FTN charting 2026 (CC-BY-SA 4.0, credit "FTN Data via nflverse") - rush counts

Provenance is stamped into the file so a reader can tell which feeds produced it.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
PBP = REPO_ROOT / "data" / "nflverse" / "pbp" / "play_by_play_2026.parquet"
FTN = REPO_ROOT / "data" / "nflverse" / "ftn_charting_2026.parquet"
TEND = REPO_ROOT / "data" / "film_room_2026" / "master_weeks_1_to_7_pbp_tendencies_2026.json"

WEEKS_WIDE = range(1, 8)
WEEKS_RECENT = range(6, 8)

CODE_FIX = {"LA": "LAR", "WSH": "WAS", "LVR": "LV"}


def _code(t: str) -> str:
    return CODE_FIX.get(t, t)


def _load() -> tuple[pd.DataFrame, dict]:
    if not PBP.is_file():
        raise SystemExit(f"missing PBP feed: {PBP}")
    df = pd.read_parquet(PBP)
    src = {"pbp": str(PBP.relative_to(REPO_ROOT)).replace("\\", "/")}
    before = len(df)
    df = df[df["season_type"] == "REG"].copy()
    for col in ("qb_kneel", "qb_spike", "two_point_attempt"):
        if col in df.columns:
            df = df[df[col].fillna(0).astype(float) == 0]
    df = df[df["play_type"].isin(["pass", "run"])].copy()
    df = df[df["posteam"].notna() & df["defteam"].notna()]
    df = df[df["epa"].notna()].copy()
    df["posteam"] = df["posteam"].map(_code)
    df["defteam"] = df["defteam"].map(_code)

    # Real rush counts from FTN charting, joined on the nflverse play identity.
    if FTN.is_file():
        f = pd.read_parquet(FTN)
        if "n_pass_rushers" in f.columns:
            keep = ["nflverse_game_id", "nflverse_play_id", "n_pass_rushers"]
            if "n_blitzers" in f.columns:
                keep.append("n_blitzers")
            f = f[keep].drop_duplicates(subset=["nflverse_game_id", "nflverse_play_id"])
            df = df.merge(
                f,
                left_on=["game_id", "play_id"],
                right_on=["nflverse_game_id", "nflverse_play_id"],
                how="left",
            )
            src["ftn"] = str(FTN.relative_to(REPO_ROOT)).replace("\\", "/")
    src["pbp_rows_read"] = int(before)
    src["rows_used"] = int(len(df))
    return df, src


def _team_block(wide: pd.DataFrame, recent: pd.DataFrame, team: str) -> dict:
    off_w = wide[wide["posteam"] == team]
    off_r = recent[recent["posteam"] == team]
    def_w = wide[wide["defteam"] == team]

    out: dict = {
        "off_plays": int(len(off_w)),
        "def_plays": int(len(def_w)),
        "weeks_covered": sorted(int(w) for w in off_w["week"].unique()),
    }

    if len(off_w):
        out["off_epa_per_play"] = round(float(off_w["epa"].mean()), 5)
        out["off_rush_epa"] = round(float(off_w.loc[off_w["play_type"] == "run", "epa"].mean()), 5)
        out["off_pass_epa"] = round(float(off_w.loc[off_w["play_type"] == "pass", "epa"].mean()), 5)
        out["off_success_rate"] = round(float((off_w["epa"] > 0).mean()), 5)
        ed = off_w[off_w["down"].isin([1, 2])]
        if len(ed):
            out["early_down_pass_rate"] = round(float((ed["play_type"] == "pass").mean()), 5)
            out["early_down_plays"] = int(len(ed))
        pa = off_w[off_w["play_type"] == "pass"]
        if len(pa):
            out["comp_rate_w1_w7"] = round(float(pa["complete_pass"].fillna(0).mean()), 5)
            out["sack_rate_allowed_pct"] = round(float(pa["sack"].fillna(0).mean()) * 100.0, 3)
        rz = off_w[off_w["yardline_100"] <= 20]
        if len(rz):
            out["redzone_td_pct"] = round(float(rz["touchdown"].fillna(0).astype(float).mean()), 5)
            out["redzone_plays"] = int(len(rz))
    if len(off_r):
        out["off_epa_w6_w7"] = round(float(off_r["epa"].mean()), 5)
        pr = off_r[off_r["play_type"] == "pass"]
        if len(pr):
            out["comp_rate_w6_w7"] = round(float(pr["complete_pass"].fillna(0).mean()), 5)
    if "off_epa_per_play" in out and "off_epa_w6_w7" in out:
        out["off_trend_delta_w67_vs_w15"] = round(out["off_epa_w6_w7"] - out["off_epa_per_play"], 5)

    if len(def_w):
        out["def_epa_per_play"] = round(float(def_w["epa"].mean()), 5)
        out["def_rush_epa"] = round(float(def_w.loc[def_w["play_type"] == "run", "epa"].mean()), 5)
        out["def_pass_epa"] = round(float(def_w.loc[def_w["play_type"] == "pass", "epa"].mean()), 5)
        dp = def_w[def_w["play_type"] == "pass"]
        if len(dp):
            out["def_sack_rate_pct"] = round(float(dp["sack"].fillna(0).mean()) * 100.0, 3)
            # nflverse carries no hurries, so pressure can only be stated as a sack-rate floor.
            out["def_pressure_rate"] = out["def_sack_rate_pct"]
        if "n_pass_rushers" in def_w.columns:
            npr = pd.to_numeric(dp["n_pass_rushers"], errors="coerce").dropna()
            if len(npr):
                out["def_blitz_rate_pct"] = round(float((npr > 4).mean()) * 100.0, 3)
                out["def_four_man_rate_pct"] = round(float((npr == 4).mean()) * 100.0, 3)
                out["def_rush_charted_plays"] = int(len(npr))
        dr = def_w[def_w["week"].isin(list(WEEKS_RECENT))]
        if len(dr):
            out["def_epa_w6_w7"] = round(float(dr["epa"].mean()), 5)
    return out


def _game_rows(wide: pd.DataFrame) -> list[dict]:
    """One row per team-game: the offense, the defense it actually faced, and the EPA
    that offense produced. These are the real opponent assignments the ridge solver
    needs; nothing here is assigned by parity or any other synthetic rule."""
    rows: list[dict] = []
    for gid, g in wide.groupby("game_id", sort=True):
        week = int(g["week"].iloc[0])
        pairs = []
        for team in g["posteam"].unique():
            sub = g[g["posteam"] == team]
            if not len(sub):
                continue
            opps = sub["defteam"].unique()
            if len(opps) != 1:
                raise SystemExit(f"game {gid} team {team} faced {opps} - refusing to guess")
            pairs.append((team, str(opps[0]), float(sub["epa"].mean()), int(len(sub))))
        for team, opp, epa, n in pairs:
            rows.append({"game_id": str(gid), "week": week, "off_team": team,
                         "def_team": opp, "off_epa_per_play": round(epa, 5), "off_plays": n})
    return rows


def main() -> None:
    df, src = _load()
    wide = df[df["week"].isin(list(WEEKS_WIDE))]
    recent = df[df["week"].isin(list(WEEKS_RECENT))]
    teams = sorted(set(wide["posteam"]) | set(wide["defteam"]))
    blocks = {t: _team_block(wide, recent, t) for t in teams}
    if "LAR" in blocks:
        blocks["LA"] = blocks["LAR"]

    watched = ("off_epa_per_play", "def_epa_per_play", "def_blitz_rate_pct",
               "redzone_td_pct", "comp_rate_w1_w7")
    missing = {t: [k for k in watched if k not in blocks[t]] for t in teams}
    missing = {t: v for t, v in missing.items() if v}

    payload = {
        "version": "real-pbp-w1-w7-2026",
        "built_by": "scripts/ops/build_master_tendencies_2026.py",
        "sources": src,
        "attribution": ["nflverse (CC-BY 4.0)", "FTN Data via nflverse (CC-BY-SA 4.0)"],
        "season": 2026,
        "weeks": list(WEEKS_WIDE),
        "recent_weeks": list(WEEKS_RECENT),
        "filters": {
            "season_type": "REG",
            "play_type": "pass|run",
            "excluded": ["two_point_attempt", "qb_kneel", "qb_spike"],
            "epa_required": True,
        },
        "note": (
            "All values computed directly from play-by-play. Fields whose source column was "
            "unavailable are omitted, never defaulted. def_pressure_rate is the sack rate on "
            "pass plays, a floor on pressure (no hurries in the feed). def_blitz_rate_pct counts "
            "charted pass plays with more than four rushers."
        ),
        "games_covered": int(wide["game_id"].nunique()),
        "plays_used": int(len(wide)),
        "team_count": len(teams),
        "fields_missing_by_team": missing,
        "teams": blocks,
        "games": _game_rows(wide),
    }
    TEND.parent.mkdir(parents=True, exist_ok=True)
    TEND.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    print(f"wrote {TEND}")
    print(f"games={payload['games_covered']} plays={payload['plays_used']} teams={len(teams)}")
    print(f"teams with a missing watched field: {len(missing)} -> {json.dumps(missing)[:500]}")
    for t in ("BUF", "DET", "KC", "PHI"):
        if t in blocks:
            print(t, json.dumps(blocks[t], sort_keys=True))


if __name__ == "__main__":
    main()
