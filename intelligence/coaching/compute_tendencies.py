"""
Coaching tendency pipeline — nflverse play-by-play 2022-2026.
Computes offensive team-season and defensive team-season tendency fingerprints.
Outputs: ../data/off_tendencies.csv, ../data/def_tendencies.csv

Gaps documented (not in nflverse pbp):
  - personnel groupings (11/12/21), formations, motion
  - blitz rate, man/zone coverage, shell usage (DC metrics use pressure proxies)
  - time-to-throw (quick-game proxied via air_yards)
Run: /tmp/ctvenv/bin/python code/compute_tendencies.py
"""
import os
import numpy as np
import pandas as pd

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, "data")
YEARS = [2022, 2023, 2024, 2025, 2026]

OFF_COLS = ["season", "week", "game_id", "drive", "posteam", "defteam", "down",
            "ydstogo", "yardline_100", "play_type", "pass_attempt", "rush_attempt",
            "qb_dropback", "qb_kneel", "qb_spike", "aborted_play", "shotgun",
            "no_huddle", "air_yards", "touchdown", "two_point_attempt",
            "fourth_down_converted", "fourth_down_failed", "game_seconds_remaining",
            "wp", "sack", "qb_hit", "tackled_for_loss"]

def load():
    frames = []
    for y in YEARS:
        p = os.path.join(DATA, f"pbp_{y}.parquet")
        df = pd.read_parquet(p, columns=OFF_COLS)
        frames.append(df)
    df = pd.concat(frames, ignore_index=True)
    return df

def safe_div(a, b):
    return float(a) / float(b) if b else np.nan

def offensive_tendencies(df):
    # base: scrimmage plays, exclude kneels/spikes/aborted
    base = df[(df["play_type"].isin(["pass", "run"]))
              & (df["qb_kneel"] != 1) & (df["qb_spike"] != 1)
              & (df["aborted_play"] != 1) & df["posteam"].notna()].copy()
    rows = []
    for (season, team), g in base.groupby(["season", "posteam"]):
        pa = g["pass_attempt"].fillna(0).sum()
        ra = g["rush_attempt"].fillna(0).sum()
        n = len(g)

        def prate(sub):
            p = sub["pass_attempt"].fillna(0).sum()
            r = sub["rush_attempt"].fillna(0).sum()
            return safe_div(p, p + r)

        early = g[g["down"].isin([1, 2])]
        d1 = g[g["down"] == 1]; d2 = g[g["down"] == 2]; d3 = g[g["down"] == 3]
        short = g[g["ydstogo"] <= 3]; mid = g[(g["ydstogo"] >= 4) & (g["ydstogo"] <= 7)]
        lng = g[g["ydstogo"] >= 8]
        own = g[g["yardline_100"] > 50]
        midf = g[(g["yardline_100"] <= 50) & (g["yardline_100"] > 20)]
        rz = g[g["yardline_100"] <= 20]
        trail = g[g["wp"] < 0.4]; lead = g[g["wp"] > 0.6]

        # 4th down go rate
        d4 = df[(df["season"] == season) & (df["posteam"] == team) & (df["down"] == 4)
                & (df["play_type"].isin(["pass", "run", "punt", "field_goal"]))
                & (df["qb_kneel"] != 1)]
        go4 = d4[d4["play_type"].isin(["pass", "run"])]

        # 2pt rate
        tds = g[g["touchdown"] == 1]
        two_pt = df[(df["season"] == season) & (df["posteam"] == team)
                    & (df["two_point_attempt"] == 1)]

        # quick game via air yards
        passes = g[g["pass_attempt"] == 1]
        ay = passes["air_yards"].dropna()
        quick = (ay <= 5).mean() if len(ay) else np.nan
        deep = (ay >= 20).mean() if len(ay) else np.nan

        # pace: median seconds between consecutive offensive plays, same drive
        gg = g.sort_values(["game_id", "drive", "game_seconds_remaining"],
                           ascending=[True, True, False])
        diffs = []
        for (_, _), dd in gg.groupby(["game_id", "drive"]):
            s = dd["game_seconds_remaining"].values
            d = s[:-1] - s[1:]
            diffs.extend([x for x in d if 4 < x < 120])
        pace = float(np.median(diffs)) if diffs else np.nan

        rows.append({
            "season": season, "team": team, "plays": n,
            "pass_rate_all": prate(g),
            "pass_rate_early": prate(early),
            "pass_rate_1st": prate(d1), "pass_rate_2nd": prate(d2),
            "pass_rate_3rd": prate(d3),
            "pass_rate_short": prate(short), "pass_rate_mid": prate(mid),
            "pass_rate_long": prate(lng),
            "pass_rate_own_terr": prate(own), "pass_rate_midfield": prate(midf),
            "pass_rate_rz": prate(rz),
            "pass_rate_trailing": prate(trail), "pass_rate_leading": prate(lead),
            "shotgun_rate": safe_div(g["shotgun"].fillna(0).sum(), n),
            "no_huddle_rate": safe_div(g["no_huddle"].fillna(0).sum(), n),
            "go4th_rate": safe_div(len(go4), len(d4)),
            "n_4th": len(d4),
            "two_pt_rate": safe_div(len(two_pt), len(tds)),
            "n_td": len(tds),
            "avg_air_yards": float(ay.mean()) if len(ay) else np.nan,
            "quick_game_rate": float(quick) if not pd.isna(quick) else np.nan,
            "deep_rate": float(deep) if not pd.isna(deep) else np.nan,
            "pace_sec_median": pace,
        })
    return pd.DataFrame(rows)

def defensive_tendencies(df):
    # pressure proxies only — blitz/coverage/shell NOT in nflverse (documented gap)
    base = df[(df["play_type"].isin(["pass", "run"]))
              & (df["qb_kneel"] != 1) & (df["qb_spike"] != 1)
              & (df["aborted_play"] != 1) & df["defteam"].notna()].copy()
    rows = []
    for (season, team), g in base.groupby(["season", "defteam"]):
        db = g[g["qb_dropback"] == 1]
        ru = g[g["rush_attempt"] == 1]
        sacks = db["sack"].fillna(0).sum()
        hits = db["qb_hit"].fillna(0).sum()
        tfl = ru["tackled_for_loss"].fillna(0).sum()
        rows.append({
            "season": season, "team": team,
            "dropbacks_vs": len(db), "rushes_vs": len(ru),
            "sack_rate_vs": safe_div(sacks, len(db)),
            "qbhit_rate_vs": safe_div(hits, len(db)),
            "pressure_proxy": safe_div(sacks + hits, len(db)),
            "tfl_rate_vs_rush": safe_div(tfl, len(ru)),
            # NOTE: true blitz rate, man/zone, shells unavailable in nflverse
            "blitz_rate": np.nan, "man_rate": np.nan, "two_high_rate": np.nan,
        })
    return pd.DataFrame(rows)

def main():
    df = load()
    print("total plays:", len(df))
    off = offensive_tendencies(df)
    deff = defensive_tendencies(df)
    off.to_csv(os.path.join(DATA, "off_tendencies.csv"), index=False)
    deff.to_csv(os.path.join(DATA, "def_tendencies.csv"), index=False)
    print("off rows:", len(off), "| def rows:", len(deff))
    print("saved.")

if __name__ == "__main__":
    main()
