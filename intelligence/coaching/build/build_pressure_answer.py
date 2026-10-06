#!/usr/bin/env python3
# PROVENANCE — gse-intelligence-build / coaching / build / build_pressure_answer.py
# Build-time data generator for the pressure-answer adaptation feature
# (corpus-intelligence/deep/c01/buildable-systems.md #24: answer_delta_w =
# quick_game_rate_w − mean(quick_game_rate_season) for team-weeks following
# top-5 pass-rush opponents; the Monken template 2016–2025 CLE→TB→BAL).
#
# Outputs (coaching/data/):
#   schedule.csv            season,week,team,opponent  (from game_id)
#   def_pressure_weekly.csv season,week,team,db,pressures,proxy_rate,trail4_proxy
# where pressures = sacks + qb_hits faced (the honest outcome-not-frequency
# proxy — charted per-play pressure is NULL in nflverse, verified-claims PRESS-7).
#
# BUILD-TIME deps: pyarrow + numpy. RUNTIME stays stdlib csv (load.py).
# Gaps are written, never filled: 2025 weeks 5-12 and 2026 are partial in the
# source parquets (fewer than 32 teams charted); affected rows carry
# n_teams<32 in the meta below and the serve module treats missing
# opponent/weeks as gaps.
#
# Run: cd ~/workspace/gse-intelligence-build && .venv/bin/python coaching/build/build_pressure_answer.py
"""Build schedule.csv + def_pressure_weekly.csv from pbp parquet (2022-2026)."""
import csv
import math
import os
import sys

import numpy as np
import pyarrow.parquet as pq

BUILD_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BUILD_ROOT)

DATA_IN = os.path.expanduser("~/workspace/coaching-tendencies/data")
DATA_OUT = os.path.join(BUILD_ROOT, "coaching", "data")
SEASONS = [2022, 2023, 2024, 2025, 2026]

COLS = ["game_id", "week", "home_team", "away_team", "posteam", "defteam",
        "qb_dropback", "qb_kneel", "qb_spike", "sack", "qb_hit"]


def f(v, default=0.0):
    if v is None:
        return default
    try:
        x = float(v)
    except (TypeError, ValueError):
        return default
    return default if math.isnan(x) else x


def main() -> None:
    sched_rows: list[tuple] = []
    # (season, week, defteam) -> [dropbacks, pressures]
    defw: dict[tuple, list[float]] = {}
    coverage: dict[tuple, set] = {}

    for season in SEASONS:
        path = os.path.join(DATA_IN, f"pbp_{season}.parquet")
        if not os.path.exists(path):
            print(f"skip {season}: no parquet")
            continue
        t = pq.read_table(path, columns=COLS)
        df = t.to_pandas()
        # --- schedule from game_id ---
        g = df.groupby("game_id").first()[["week", "home_team", "away_team"]]
        for _, r in g.iterrows():
            wk, home, away = int(r["week"]), r["home_team"], r["away_team"]
            if not home or not away:
                continue
            sched_rows.append((season, wk, home, away))
            sched_rows.append((season, wk, away, home))
        # --- defensive pressure proxy: (sack + qb_hit) per dropback faced ---
        plays = df[(df["qb_dropback"] == 1) & (df["qb_kneel"] != 1)
                   & (df["qb_spike"] != 1)]
        for (wk, dt), grp in plays.groupby(["week", "defteam"]):
            if not dt:
                continue
            db = len(grp)
            pr = float((grp["sack"] == 1).sum() + (grp["qb_hit"] == 1).sum())
            k = (season, int(wk), dt)
            a = defw.setdefault(k, [0.0, 0.0])
            a[0] += db
            a[1] += pr
            coverage.setdefault((season, int(wk)), set()).add(dt)

    # schedule.csv
    sched_rows.sort()
    with open(os.path.join(DATA_OUT, "schedule.csv"), "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["season", "week", "team", "opponent"])
        w.writerows(sched_rows)

    # def_pressure_weekly.csv with trailing-4-week proxy
    prow: list[tuple] = []
    by_team: dict[tuple, list[tuple]] = {}
    for (season, wk, team), (db, pr) in defw.items():
        by_team.setdefault((season, team), []).append((wk, db, pr))
    for (season, team), weeks in by_team.items():
        weeks.sort()
        for i, (wk, db, pr) in enumerate(weeks):
            tail = weeks[max(0, i - 3):i + 1]
            tdb = sum(x[1] for x in tail)
            tpr = sum(x[2] for x in tail)
            trail4 = (tpr / tdb) if tdb > 0 else None
            rate = (pr / db) if db > 0 else None
            n_cov = len(coverage.get((season, wk), set()))
            prow.append((season, wk, team, int(db), round(pr, 1),
                         round(rate, 4) if rate is not None else "",
                         round(trail4, 4) if trail4 is not None else "",
                         n_cov))
    prow.sort()
    with open(os.path.join(DATA_OUT, "def_pressure_weekly.csv"), "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["season", "week", "team", "db", "pressures",
                    "proxy_rate", "trail4_proxy", "n_teams_charted"])
        w.writerows(prow)

    partial = sorted(f"{s}w{k}" for (s, k), v in coverage.items() if len(v) < 32)
    print(f"schedule.csv: {len(sched_rows)} rows")
    print(f"def_pressure_weekly.csv: {len(prow)} rows")
    print(f"partial-coverage weeks (<32 teams): {len(partial)} "
          f"{partial[:12]}{'...' if len(partial) > 12 else ''}")


if __name__ == "__main__":
    main()
