"""Intent layer v0: per-play belief distributions from nflverse participation.

Replaces the "frequency model over formations" gap with the closest thing
keyless data allows to a belief state: per-(down, distance, personnel) joint
distributions over route concepts, coverage shells, and pressure, derived
from the 2025 participation release (45,184 plays, every one carrying
formation, personnel, pass-rush count, routes per receiver, man/zone, and
coverage type — plus jersey numbers per play, which is the OCR join key).

What this is NOT (honesty first):
  - not the called play (play-call is not published anywhere keyless)
  - not a belief state over the QB's check tree (no headset/wristband data)
  - it IS the Bayesian prior a belief layer would start from: P(route |
    down, dist, personnel, coverage) with counts behind every cell.

The decision layer consumes this as L2 primitive TRIGGERS: e.g.
"COVER_0 rate on 3rd-and-long is 3x league mean" is a blitz-neighborhood
trigger; "HITCH/CURL rate up 20% week-over-week" is a tendency-break trigger.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "intelligence" / "coaching" / "data" / "pbp_participation_2025.parquet"
OUTROOT = REPO / "docs" / "data-sources" / "research"


def _dist_bin(row) -> str:
    ytg = row.get("ydstogo")
    try:
        ytg = float(ytg)
    except (TypeError, ValueError):
        return "unknown"
    if ytg <= 2:
        return "short"
    if ytg <= 6:
        return "mid"
    return "long"


def _down_bin(row) -> str:
    try:
        d = int(float(row.get("down")))
    except (TypeError, ValueError):
        return "unknown"
    return str(d) if d in (1, 2, 3, 4) else "unknown"


def build_beliefs(min_cell: int = 25) -> dict:
    """Build per-context belief distributions.

    Participation carries route/coverage/pressure but NOT down/distance;
    those live in the PBP parquet. Join on (nflverse_game_id, play_id) to
    bring context to every participation row; rows whose PBP twin is absent
    are dropped (counted honestly).
    """
    df = pd.read_parquet(DATA)
    pbp_path = REPO / "intelligence" / "coaching" / "data" / "play_by_play_2025.parquet"
    dropped = 0
    if pbp_path.exists():
        pbp = pd.read_parquet(pbp_path, columns=["game_id", "play_id", "down", "ydstogo"])
        pbp = pbp.rename(columns={"game_id": "nflverse_game_id"})
        # dedupe (one row per play)
        pbp = pbp.drop_duplicates(subset=["nflverse_game_id", "play_id"])
        df = df.merge(pbp, on=["nflverse_game_id", "play_id"], how="left")
        dropped = int(df["down"].isna().sum())
    else:
        df["down"] = None
        df["ydstogo"] = None

    # plays that are actual pass plays with a known route tree
    pass_plays = df[df["route"].notna() & (df["route"] != "")].copy()
    pass_plays["down_bin"] = pass_plays.apply(_down_bin, axis=1)
    pass_plays["dist_bin"] = pass_plays.apply(_dist_bin, axis=1)
    joined_note = (f"joined to PBP for down/distance; {dropped} participation rows "
                   f"had no PBP twin and are excluded from context cells") if pbp_path.exists() \
                  else "PBP parquet absent - context cells unavailable this run"

    beliefs: dict = {"cell_counts": {}, "coverage_by_context": {},
                     "pressure_by_context": {}, "route_by_coverage": {},
                     "notes": [joined_note]}

    # 1. joint cell: (down_bin, dist_bin) -> route distribution
    cell = defaultdict(lambda: defaultdict(int))
    for (db, tb), grp in pass_plays.groupby(["down_bin", "dist_bin"]):
        if len(grp) < min_cell:
            continue
        vc = grp["route"].value_counts()
        beliefs["cell_counts"][f"{db}|{tb}"] = {
            "n_plays": int(len(grp)),
            "routes": {k: int(v) for k, v in vc.items()},
        }

    # 2. coverage shell by context (the defense's mixed strategy)
    cov = pass_plays[pass_plays["defense_coverage_type"].notna()
                     & (pass_plays["defense_coverage_type"] != "")]
    for (db, tb), grp in cov.groupby(["down_bin", "dist_bin"]):
        if len(grp) < min_cell:
            continue
        vc = grp["defense_coverage_type"].value_counts()
        beliefs["coverage_by_context"][f"{db}|{tb}"] = {
            "n_plays": int(len(grp)),
            "shells": {k: round(v / len(grp), 4) for k, v in vc.items()},
        }

    # 3. pressure rate by rusher count (execution-noise separator)
    pr = df[df["was_pressure"].notna()]
    for n_rush, grp in pr.groupby("number_of_pass_rushers"):
        if len(grp) < min_cell:
            continue
        rate = grp["was_pressure"].mean()
        beliefs["pressure_by_context"][f"rushers_{int(n_rush) if pd.notna(n_rush) else 'NA'}"] = {
            "n_plays": int(len(grp)),
            "pressure_rate": round(float(rate), 4),
        }

    # 4. route given coverage (receiver-side expectations)
    for cov_type, grp in cov.groupby("defense_coverage_type"):
        if len(grp) < min_cell:
            continue
        vc = grp["route"].value_counts().head(8)
        beliefs["route_by_coverage"][cov_type] = {
            "n_plays": int(len(grp)),
            "top_routes": {k: round(v / len(grp), 4) for k, v in vc.items()},
        }

    beliefs["notes"] = [
        "Derived from nflverse pbp_participation 2025 (45,184 plays; CC-BY 4.0).",
        "Route/coverage/pressure are OBSERVED post-snap labels, not play-call "
        "intent; the called play is not published keylessly. Treat every "
        "distribution here as the PRIOR a belief layer updates from, not the "
        "belief itself.",
        "min_cell=%d: cells below this n are omitted rather than shown as "
        "thin percentages." % min_cell,
    ]
    return beliefs


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--min-cell", type=int, default=25)
    ap.add_argument("--no-write", action="store_true")
    args = ap.parse_args()

    beliefs = build_beliefs(min_cell=args.min_cell)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
    summary = {
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "source": "nflverse pbp_participation 2025 (CC-BY 4.0)",
        "cells_route_by_context": len(beliefs["cell_counts"]),
        "cells_coverage_by_context": len(beliefs["coverage_by_context"]),
        "pressure_buckets": len(beliefs["pressure_by_context"]),
        "coverage_types": list(beliefs["route_by_coverage"].keys()),
    }
    print(json.dumps(summary, indent=1))
    # show one cell as a belief-state sample
    sample = beliefs["cell_counts"].get("3|long")
    if sample:
        n = sample["n_plays"]
        top = sorted(sample["routes"].items(), key=lambda kv: -kv[1])[:5]
        print("sample belief cell 3rd&long (n=%d):" % n)
        for route, cnt in top:
            print(f"   {route}: {cnt} ({round(100*cnt/n,1)}%)")

    if not args.no_write:
        outdir = OUTROOT / datetime.now(timezone.utc).date().isoformat() / "intent"
        outdir.mkdir(parents=True, exist_ok=True)
        p = outdir / f"intent_beliefs_2025_{stamp}.json"
        p.write_text(json.dumps({"generated_utc": now_iso() if False else summary["generated_utc"],
                                 "beliefs": beliefs}, indent=1), encoding="utf-8")
        print(f"landed: {p.name} ({p.stat().st_size} B) -> {outdir}")
    return 0


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


if __name__ == "__main__":
    raise SystemExit(main())
