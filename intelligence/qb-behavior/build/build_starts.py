#!/usr/bin/env python3
# PROVENANCE — gse-intelligence-build / qb-behavior / build / build_starts.py
# Build-time data generator for QB familiarity (corpus-intelligence/deep/c01/
# buildable-systems.md #28): qb_familiarity = share of last 16 starts by the
# listed starter; backup-QB flag (Keenum control-case template).
#
# Output: qb-behavior/data/qb_starts.csv — season,week,team,starter_qb_id,
# starter_name,starter_db,team_db,starter_share.
#
# "Starter" is INFERRED as the passer with the most dropbacks in the team-week
# (nflverse has no official starts column in pbp). Marked as inference in the
# serve module; ties broken by EPA (higher EPA starts).
#
# BUILD-TIME deps: pyarrow. RUNTIME: stdlib csv.
#
# Run: cd ~/workspace/gse-intelligence-build && .venv/bin/python qb-behavior/build/build_starts.py
"""Build qb_starts.csv from pbp parquet (2022-2026)."""
import csv
import math
import os
import sys

import pyarrow.parquet as pq

BUILD_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_IN = os.path.expanduser("~/workspace/coaching-tendencies/data")
DATA_OUT = os.path.join(BUILD_ROOT, "qb-behavior", "data")
SEASONS = [2022, 2023, 2024, 2025, 2026]

COLS = ["week", "posteam", "passer_player_id", "passer_player_name",
        "qb_dropback", "qb_kneel", "qb_spike", "epa"]


def f(v, default=0.0):
    if v is None:
        return default
    try:
        x = float(v)
    except (TypeError, ValueError):
        return default
    return default if math.isnan(x) else x


def main() -> None:
    out_rows: list[tuple] = []
    for season in SEASONS:
        path = os.path.join(DATA_IN, f"pbp_{season}.parquet")
        if not os.path.exists(path):
            print(f"skip {season}")
            continue
        df = pq.read_table(path, columns=COLS).to_pandas()
        plays = df[(df["qb_dropback"] == 1) & (df["qb_kneel"] != 1)
                   & (df["qb_spike"] != 1) & df["passer_player_id"].notna()]
        # (week, team, qb) -> [db, epa_total, name]
        agg: dict[tuple, list] = {}
        for (wk, team, qb), grp in plays.groupby(
                ["week", "posteam", "passer_player_id"]):
            if not team or not qb:
                continue
            key = (int(wk), team, qb)
            a = agg.setdefault(key, [0, 0.0, ""])
            a[0] += len(grp)
            a[1] += float(grp["epa"].fillna(0).sum())
            name = grp["passer_player_name"].dropna()
            if len(name):
                a[2] = str(name.iloc[0])
        # starter = max db (tiebreak: higher EPA)
        by_tw: dict[tuple, list[tuple]] = {}
        for (wk, team, qb), (db, epa, name) in agg.items():
            by_tw.setdefault((wk, team), []).append((qb, db, epa, name))
        for (wk, team), qbs in by_tw.items():
            qbs.sort(key=lambda q: (q[1], q[2]), reverse=True)
            qb, db, epa, name = qbs[0]
            team_db = sum(q[1] for q in qbs)
            share = db / team_db if team_db else 0.0
            out_rows.append((season, wk, team, qb, name, db, team_db,
                             round(share, 4)))
    out_rows.sort()
    with open(os.path.join(DATA_OUT, "qb_starts.csv"), "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["season", "week", "team", "starter_qb_id", "starter_name",
                    "starter_db", "team_db", "starter_share"])
        w.writerows(out_rows)
    print(f"qb_starts.csv: {len(out_rows)} team-weeks")


if __name__ == "__main__":
    main()
