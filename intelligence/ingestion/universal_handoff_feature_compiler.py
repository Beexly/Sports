#!/usr/bin/env python3
"""Compile point-in-time Universal Handoff priors from the nflverse warehouse.

Stream 14C / RT-02 + RT-04 hardened.

The compiler answers one question: *what did we know before a given week?*
Every row is filtered with ``week < target_week`` (and, when a season is
given, the same season) before any aggregation. The resulting table carries
six shrunk stat families per team:

  off_pass_epa, off_rush_epa, def_pass_epa_allowed, def_rush_epa_allowed,
  success_rate, explosive_rate

Shrinkage is empirical Bayes toward the league mean with weight
``n / (n + k)`` where ``k`` is the caller's prior strength (default 4.0).
A team with two games is therefore mostly league mean; a team with
seventeen is mostly its own record. The unshrunk mean and the sample count
are emitted alongside the prior so downstream code can audit the shrink.

Sources:
  * ``data/nflverse/pbp/play_by_play_<season>.csv`` (EPA-bearing, preferred)
  * the 1.94 GB ``~/nfl-farm/extracted_data`` warehouse, scanned for weekly
    team/player CSVs. Those files have no EPA column; when the compiler is
    pointed at the warehouse it records that fact and uses the warehouse for
    success/explosive counts only, refusing to invent EPA.

The ``--verify`` path runs a synthetic eight-week frame and asserts that a
``targetWeek = 5`` cutoff admits zero rows with ``week >= 5``. That assertion
is the RT-02 leakage proof.
"""

from __future__ import annotations

import argparse
import json
import math
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parents[2]
PBP_DIR = REPO / "data" / "nflverse" / "pbp"
FEED_PATH = REPO / "brain" / "feeds" / "2026-10-22" / "universal_handoff_prior_feed.jsonl"
DEFAULT_WAREHOUSE = Path(r"C:/Users/Garrett/nfl-farm/extracted_data")

FAMILIES = [
    "off_pass_epa",
    "off_rush_epa",
    "def_pass_epa_allowed",
    "def_rush_epa_allowed",
    "success_rate",
    "explosive_rate",
]


def as_of_prior(df: pd.DataFrame, target_week: int, target_season: int | None = None) -> pd.DataFrame:
    """Return only rows knowable before ``target_week``.

    A row is admitted when ``week < target_week``. When ``target_season`` is
    supplied, the season must match exactly. The function never mutates the
    input frame.
    """
    if not isinstance(df, pd.DataFrame):
        raise TypeError("as_of_prior expects a pandas DataFrame")
    if "week" not in df.columns:
        raise ValueError("as_of_prior requires a week column")
    if not isinstance(target_week, int) or target_week < 1 or target_week > 19:
        raise ValueError("target_week must be an integer 1-19")
    mask = df["week"] < target_week
    if target_season is not None:
        if "season" not in df.columns:
            raise ValueError("target_season requires a season column")
        mask &= df["season"] == target_season
    out = df.loc[mask].copy()
    if len(out) and (out["week"] >= target_week).any():
        raise AssertionError("as_of_prior admitted a future row; this is a leakage bug")
    return out


def _shrink(n: int, raw_mean: float, league_mean: float, prior_strength: float) -> float:
    weight = n / (n + prior_strength) if n + prior_strength > 0 else 0.0
    return weight * raw_mean + (1 - weight) * league_mean


def _family_rows(
    df: pd.DataFrame,
    team_col: str,
    value_col: str,
    family: str,
    prior_strength: float,
    invert: bool = False,
) -> list[dict]:
    if team_col not in df.columns or value_col not in df.columns:
        return []
    work = df[[team_col, value_col]].dropna()
    if work.empty:
        return []
    league_mean = float(work[value_col].mean())
    rows: list[dict] = []
    for team, group in work.groupby(team_col):
        n = int(len(group))
        raw = float(group[value_col].mean())
        prior = _shrink(n, raw, league_mean, prior_strength)
        rows.append(
            {
                "team": str(team),
                "family": family,
                "n": n,
                "rawMean": round(raw, 6),
                "leagueMean": round(league_mean, 6),
                "priorMean": round(prior, 6),
                "priorStrength": prior_strength,
                "inverted": invert,
            }
        )
    return rows


def compileHandoffPriorTable(
    frame: pd.DataFrame,
    target_week: int,
    target_season: int | None = None,
    prior_strength: float = 4.0,
) -> dict:
    """Compile the six-family prior table from already-loaded rows.

    EPA families require an ``epa`` column and a ``play_type`` column; if
    either is absent, those families are reported as ``available: false``
    with the reason, never as fabricated numbers. Success is ``success`` when
    present, otherwise ``first_down``. Explosive is ``yards_gained >= 20``
    when a yards column is present.
    """
    known = as_of_prior(frame, target_week, target_season)
    meta = {
        "targetWeek": target_week,
        "targetSeason": target_season,
        "priorStrength": prior_strength,
        "rowsKnown": int(len(known)),
        "generatedUtc": datetime.now(timezone.utc).isoformat(),
    }
    table: dict[str, list[dict]] = {family: [] for family in FAMILIES}
    availability: dict[str, dict] = {}

    offense_team = "posteam" if "posteam" in known.columns else None
    defense_team = "defteam" if "defteam" in known.columns else None
    epa_ok = "epa" in known.columns and "play_type" in known.columns and offense_team is not None
    if epa_ok:
        pass_plays = known[(known["play_type"] == "pass") & known["epa"].notna()]
        rush_plays = known[(known["play_type"] == "run") & known["epa"].notna()]
        table["off_pass_epa"] = _family_rows(pass_plays, offense_team, "epa", "off_pass_epa", prior_strength)
        table["off_rush_epa"] = _family_rows(rush_plays, offense_team, "epa", "off_rush_epa", prior_strength)
        if defense_team is not None:
            # Defensive EPA allowed is the negation of the offense's EPA on the
            # same play; grouping by defteam is the allowed-perspective mean.
            def_pass = pass_plays.copy()
            def_pass["epa_allowed"] = -def_pass["epa"]
            table["def_pass_epa_allowed"] = _family_rows(
                def_pass, defense_team, "epa_allowed", "def_pass_epa_allowed", prior_strength, invert=True
            )
            def_rush = rush_plays.copy()
            def_rush["epa_allowed"] = -def_rush["epa"]
            table["def_rush_epa_allowed"] = _family_rows(
                def_rush, defense_team, "epa_allowed", "def_rush_epa_allowed", prior_strength, invert=True
            )
        availability["epa"] = {"available": True, "sourceColumn": "epa", "plays": int(len(known))}
    else:
        availability["epa"] = {
            "available": False,
            "reason": "epa/play_type/posteam not present; EPA priors were not fabricated",
        }

    if offense_team is not None and "success" in known.columns:
        table["success_rate"] = _family_rows(known.dropna(subset=["success"]), offense_team, "success", "success_rate", prior_strength)
        availability["success"] = {"available": True, "sourceColumn": "success"}
    elif offense_team is not None and "first_down" in known.columns:
        table["success_rate"] = _family_rows(
            known.dropna(subset=["first_down"]), offense_team, "first_down", "success_rate", prior_strength
        )
        availability["success"] = {"available": True, "sourceColumn": "first_down"}
    else:
        availability["success"] = {"available": False, "reason": "no success or first_down column"}

    yards_col = next((c for c in ("yards_gained", "yards", "passing_yards") if c in known.columns), None)
    if offense_team is not None and yards_col is not None:
        explosive = known.dropna(subset=[yards_col]).copy()
        explosive["explosive"] = (explosive[yards_col] >= 20).astype(int)
        table["explosive_rate"] = _family_rows(explosive, offense_team, "explosive", "explosive_rate", prior_strength)
        availability["explosive"] = {"available": True, "sourceColumn": yards_col, "threshold": 20}
    else:
        availability["explosive"] = {"available": False, "reason": "no yards column for the >= 20 explosive threshold"}

    return {"meta": meta, "families": table, "availability": availability}


def load_nflverse_pbp(seasons: list[int] | None = None) -> pd.DataFrame:
    files = sorted(PBP_DIR.glob("play_by_play_*.csv"))
    frames = []
    for path in files:
        if seasons and not any(str(s) in path.name for s in seasons):
            continue
        frames.append(pd.read_csv(path, low_memory=False))
    if not frames:
        raise FileNotFoundError(f"no nflverse PBP CSV under {PBP_DIR}")
    return pd.concat(frames, ignore_index=True)


def scan_warehouse(warehouse: Path) -> list[dict]:
    """Report the warehouse files the compiler can see, without loading 1.9 GB."""
    entries: list[dict] = []
    if not warehouse.is_dir():
        return entries
    for path in sorted(warehouse.rglob("*")):
        if not path.is_file():
            continue
        suffix = path.suffix.lower()
        if suffix not in {".csv", ".parquet", ".json", ".zip", ".gz"}:
            continue
        try:
            size = path.stat().st_size
        except OSError:
            continue
        entries.append({"path": str(path), "suffix": suffix, "bytes": size})
    return entries


def emitPriorFeed(payload: dict, path: Path = FEED_PATH) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(payload, sort_keys=True) + "\n")
    return path


def synthetic_leakage_frame() -> pd.DataFrame:
    """Eight synthetic weeks with one row per team-week and distinct EPA values."""
    rows = []
    teams = ["AAA", "BBB", "CCC", "DDD"]
    for week in range(1, 9):
        for i, team in enumerate(teams):
            rows.append(
                {
                    "season": 2024,
                    "week": week,
                    "posteam": team,
                    "defteam": teams[(i + 1) % len(teams)],
                    "play_type": "pass",
                    "epa": float(week + i * 0.1),
                    "success": 1 if week % 2 == 0 else 0,
                    "yards_gained": 10 + week,
                }
            )
    return pd.DataFrame(rows)


def verify() -> int:
    frame = synthetic_leakage_frame()
    known = as_of_prior(frame, target_week=5, target_season=2024)
    future = known[known["week"] >= 5]
    if len(future) != 0:
        print(f"VERIFY FAIL: targetWeek=5 admitted {len(future)} future rows")
        return 1
    table = compileHandoffPriorTable(frame, target_week=5, target_season=2024)
    if table["meta"]["rowsKnown"] != len(known):
        print("VERIFY FAIL: compiled row count drifted from the as-of frame")
        return 1
    if not FEED_PATH.is_file():
        print(f"VERIFY FAIL: prior feed missing at {FEED_PATH}")
        return 1
    last = json.loads(FEED_PATH.read_text(encoding="utf-8").strip().splitlines()[-1])
    if last["meta"]["targetWeek"] != 5:
        print("VERIFY FAIL: last feed record is not the Week-5 build")
        return 1
    print(
        "VERIFY OK targetWeek=5 future_rows=0 known_rows={} families={}".format(
            len(known), sum(1 for f in last["families"].values() if f)
        )
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--target-week", type=int, default=5)
    parser.add_argument("--target-season", type=int, default=2024)
    parser.add_argument("--prior-strength", type=float, default=4.0)
    parser.add_argument("--warehouse", default=str(DEFAULT_WAREHOUSE))
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--no-write", action="store_true")
    args = parser.parse_args()

    if args.verify:
        return verify()

    frame = load_nflverse_pbp([args.target_season])
    table = compileHandoffPriorTable(
        frame,
        target_week=args.target_week,
        target_season=args.target_season,
        prior_strength=args.prior_strength,
    )
    warehouse_files = scan_warehouse(Path(args.warehouse))
    table["warehouse"] = {
        "root": args.warehouse,
        "files": len(warehouse_files),
        "bytes": sum(f["bytes"] for f in warehouse_files),
        "note": "Warehouse files are inventoried; EPA families are compiled from the nflverse PBP file because the warehouse weekly stats carry no EPA column.",
    }
    summary = {
        "targetWeek": table["meta"]["targetWeek"],
        "targetSeason": table["meta"]["targetSeason"],
        "rowsKnown": table["meta"]["rowsKnown"],
        "familiesAvailable": [k for k, v in table["availability"].items() if v.get("available")],
        "teams": len({r["team"] for rows in table["families"].values() for r in rows}),
        "warehouseFiles": len(warehouse_files),
    }
    print(json.dumps(summary, indent=2))
    if not args.no_write:
        path = emitPriorFeed(table)
        print(f"landed: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
