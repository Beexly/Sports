#!/usr/bin/env python3
# PROVENANCE — qb-behavior / build / build_protection_stress.py
# Implements: corpus-intelligence/deep/c02/buildable-systems.md (System 1b);
# verified-claims.md PRESS-3/4/10 (Protection Stress formula + guards).
# Source: nflverse pfr_advstats weekly pass (times_pressured, times_blitzed)
#   + nflverse pbp team-week dropbacks as the rate denominator.
# Formula (verbatim, proposal :41): stress = pressure_rate_allowed - (a + b*blitz_rate_faced),
#   OLS refit weekly on the season-to-date team-week pool.
# Guards (proposal :49-50): < 3 team games -> NULL; pool < 32 team-weeks -> NULL (all teams).
# Documented implementer choices (spec ambiguities, a01 CH-PRESS-9): unweighted OLS
#   WITH intercept; sub-3-game teams EXCLUDED from the fit pool; denominator =
#   pbp dropbacks (pass_attempt + sack, REG, metric-bible filtered); REG only.
# Caveats served with the number (a01 CH-PRESS-6/7/8): blitz rate is endogenous;
#   QB-fault sacks inflate the line's number; quick-game scheme confounds.
#   Proposal usage bar: display + analyst use only in v1 (PRESS-5).
#
# Run: ~/workspace/gse-intelligence-build/.venv/bin/python \
#        qb-behavior/build/build_protection_stress.py
"""Build team-week Protection Stress from pfr_advstats + pbp dropbacks."""
from __future__ import annotations

import csv
import os
import sys
import urllib.request

import numpy as np
import polars as pl

BUILD_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC_DIR = os.path.join(BUILD_ROOT, "qb-behavior", "src")
DATA_DIR = os.path.join(BUILD_ROOT, "qb-behavior", "data")
TMP_DIR = os.path.join(BUILD_ROOT, "qb-behavior", "build", "tmp")
sys.path.insert(0, SRC_DIR)
sys.path.insert(0, BUILD_ROOT)

from qb_behavior import ProfileEngine  # noqa: E402
from qb_behavior.situational.protection import ols_fit  # noqa: E402

PFR_URL = ("https://github.com/nflverse/nflverse-data/releases/download/"
           "pfr_advstats/advstats_week_pass_{season}.csv")
SEASONS = list(range(2018, 2027))


def download_pfr() -> dict[int, str]:
    os.makedirs(TMP_DIR, exist_ok=True)
    paths = {}
    for s in SEASONS:
        p = os.path.join(TMP_DIR, f"advstats_week_pass_{s}.csv")
        if not os.path.exists(p) or os.path.getsize(p) < 1000:
            print(f"downloading {s}...", flush=True)
            urllib.request.urlretrieve(PFR_URL.format(season=s), p)
        paths[s] = p
    return paths




def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    paths = download_pfr()

    frames = []
    for s, p in paths.items():
        df = pl.read_csv(p)
        df = df.filter(pl.col("game_type") == "REG")
        frames.append(df.with_columns(pl.lit(s).alias("season")))
    pfr = pl.concat(frames, how="diagonal")

    # team-week PFR aggregates (QB rows summed)
    tw = (pfr.group_by("season", "week", "team")
          .agg(pl.col("times_pressured").sum().alias("pressured"),
               pl.col("times_blitzed").sum().alias("blitzed"),
               pl.col("game_id").n_unique().alias("games")))

    # team-week dropbacks from pbp (pass_attempt + sack, REG, filtered)
    eng = ProfileEngine()
    db = eng.dropbacks()
    pbp_tw = (db.filter((pl.col("pass_attempt") == 1) | (pl.col("sack") == 1))
              .group_by("season", "week", "posteam")
              .agg(pl.len().alias("dropbacks"))
              .rename({"posteam": "team"}))

    tw = tw.join(pbp_tw, on=["season", "week", "team"], how="left")
    tw = tw.with_columns(
        (pl.col("pressured") / pl.col("dropbacks")).alias("press_rate"),
        (pl.col("blitzed") / pl.col("dropbacks")).alias("blitz_rate"),
    )
    # cumulative games per team-season: the :49 "< 3 team games -> NULL" guard
    # counts games PLAYED TO DATE, not games in the single team-week (always 1)
    tw = tw.sort("season", "team", "week").with_columns(
        pl.col("games").cum_sum().over(["season", "team"]).alias("cum_games")
    )

    rows = []
    for season in SEASONS:
        sdb = tw.filter(pl.col("season") == season).sort("week")
        weeks = sorted(sdb["week"].drop_nulls().unique().to_list())
        for w in weeks:
            pool = sdb.filter((pl.col("week") <= w) & (pl.col("cum_games") >= 3))
            # guards
            cur = sdb.filter(pl.col("week") == w)
            if len(pool) < 32:
                for r in cur.iter_rows(named=True):
                    rows.append([r["team"], season, w, r["cum_games"], r["dropbacks"],
                                 _r(r["press_rate"]), _r(r["blitz_rate"]),
                                 "", "", "", "", "", len(pool), "pool<32"])
                continue
            x = pool["blitz_rate"].fill_null(0).to_numpy()
            y = pool["press_rate"].fill_null(0).to_numpy()
            mask = np.isfinite(x) & np.isfinite(y)
            a, b, t_b = ols_fit(x[mask], y[mask])
            for r in cur.iter_rows(named=True):
                if (r["cum_games"] or 0) < 3 or not r["dropbacks"]:
                    rows.append([r["team"], season, w, r["cum_games"], r["dropbacks"],
                                 _r(r["press_rate"]), _r(r["blitz_rate"]),
                                 "", "", round(a, 4), round(b, 4), round(t_b, 3),
                                 len(pool), "games<3"])
                    continue
                exp = a + b * (r["blitz_rate"] or 0)
                stress = (r["press_rate"] or 0) - exp
                rows.append([r["team"], season, w, r["cum_games"], r["dropbacks"],
                             round(r["press_rate"], 4), round(r["blitz_rate"], 4),
                             round(exp, 4), round(stress, 4),
                             round(a, 4), round(b, 4), round(t_b, 3),
                             len(pool), ""])

    with open(os.path.join(DATA_DIR, "protection_stress.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["team", "season", "week", "games", "dropbacks",
                    "press_rate_allowed", "blitz_rate_faced", "expected_rate",
                    "stress", "alpha", "beta", "t_beta", "fit_n", "null_reason"])
        w.writerows(rows)
    print(f"protection_stress.csv: {len(rows)} rows")


def _r(v):
    return round(float(v), 4) if v is not None else ""


if __name__ == "__main__":
    main()
