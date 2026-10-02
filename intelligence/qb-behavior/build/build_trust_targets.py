#!/usr/bin/env python3
# PROVENANCE — gse-intelligence-build / qb-behavior / build / build_trust_targets.py
# Build-time data generator for the QB trust-target profile table
# (corpus-intelligence/deep/c01/buildable-systems.md #3): per-QB →
# per-receiver P(target) from nflverse pbp; absence conditionals are computed
# at serve time (qb_behavior/trust_target.py).
#
# Output: qb-behavior/data/trust_targets.csv — season,week,team,qb_id,qb_name,
# receiver_id,receiver_name,targets.
#
# Notes: targets = pass_attempt plays with a charted receiver (throwaways /
# spikes / batted balls have no receiver — they are excluded, not zeroed).
# First-read share / TPRR / air-yard share need FTN charting (not in nflverse)
# and are NOT in this table — the serve module says so explicitly.
#
# BUILD-TIME deps: pyarrow. RUNTIME: stdlib csv.
#
# Run: cd ~/workspace/gse-intelligence-build && .venv/bin/python qb-behavior/build/build_trust_targets.py
"""Build trust_targets.csv from pbp parquet (2022-2026)."""
import csv
import os
import sys

import pyarrow.parquet as pq

BUILD_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_IN = os.path.expanduser("~/workspace/coaching-tendencies/data")
DATA_OUT = os.path.join(BUILD_ROOT, "qb-behavior", "data")
SEASONS = [2022, 2023, 2024, 2025, 2026]

COLS = ["week", "posteam", "passer_player_id", "passer_player_name",
        "receiver_player_id", "receiver_player_name", "pass_attempt"]


def main() -> None:
    agg: dict[tuple, list] = {}
    for season in SEASONS:
        path = os.path.join(DATA_IN, f"pbp_{season}.parquet")
        if not os.path.exists(path):
            print(f"skip {season}")
            continue
        df = pq.read_table(path, columns=COLS).to_pandas()
        p = df[(df["pass_attempt"] == 1)
               & df["passer_player_id"].notna()
               & df["receiver_player_id"].notna()]
        for (wk, team, qb, qn, rc, rn), grp in p.groupby(
                ["week", "posteam", "passer_player_id", "passer_player_name",
                 "receiver_player_id", "receiver_player_name"]):
            if not team or not qb or not rc:
                continue
            key = (season, int(wk), team, qb, qn, rc, rn)
            a = agg.setdefault(key, 0)
            agg[key] = a + len(grp)
    rows = sorted((s, w, t, qb, qn, rc, rn, n)
                  for (s, w, t, qb, qn, rc, rn), n in agg.items())
    with open(os.path.join(DATA_OUT, "trust_targets.csv"), "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["season", "week", "team", "qb_id", "qb_name",
                    "receiver_id", "receiver_name", "targets"])
        w.writerows(rows)
    print(f"trust_targets.csv: {len(rows)} qb-receiver-weeks")


if __name__ == "__main__":
    main()
