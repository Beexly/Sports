"""
Galaxy Sports Edge — team-level advanced metrics from nflverse play-by-play.

Data: nflverse play_by_play CSV releases (CC-BY 4.0, credit: nflverse).
EP/EPA model: nflfastR EP model (EPA/E P/WP columns shipped in the nflverse
play-by-play). Success rate = nflfastR convention (success flag == 1 iff EPA > 0).
FTN charting (CC-BY-SA 4.0, credit: FTN Data via nflverse) supplies the
turnover-worthy-play proxy is_interception_worthy for 2025 only.

Filters (documented in COMPUTATION_NOTES.md):
  - season_type == 'REG' only (2025 includes POST weeks 19-22)
  - play_type in ('pass','run'); qb_kneel == 0; qb_spike == 0
  - garbage time: qtr == 4 AND (wp > 0.95 OR wp < 0.05), where wp is the
    nflfastR possession-team win probability. ~11% of plays excluded in 2025.
  - dropback = pass_attempt == 1 OR qb_scramble == 1   (4for4 convention:
    sacks count as pass attempts; scrambles count as dropbacks)
  - designed rush = rush_attempt == 1 AND qb_scramble == 0 AND qb_kneel == 0
  - explosive = pass/dropback play with yards_gained >= 15, or designed rush
    with yards_gained >= 10 (4for4 convention from the metrics catalog)

Defensive metrics are computed on opponent plays (defteam == team) with the
sign flipped so positive EPA = good defense.

Outputs: team_metrics_2025.csv, team_metrics_2026.csv
"""
import numpy as np
import pandas as pd

IN_DIR = "/tmp/nflverse"
OUT_DIR = "/home/hatch/workspace/gse-research/nfl-2026"

USECOLS = [
    "game_id", "season", "week", "season_type", "qtr", "wp", "epa", "success",
    "qb_kneel", "qb_spike", "play_type", "pass_attempt", "rush_attempt",
    "sack", "qb_scramble", "qb_hit", "interception", "fumble", "fumble_lost",
    "yards_gained", "posteam", "defteam", "home_team", "away_team",
    "total_home_score", "total_away_score", "drive", "fixed_drive",
    "play_id",
]


def load(season):
    df = pd.read_csv(f"{IN_DIR}/pbp{season}.csv.gz", compression="gzip",
                     low_memory=False, usecols=USECOLS)
    return df


def base_sample(df):
    """Apply the documented filters, return offense-side play dataframe."""
    d = df[
        (df["season_type"] == "REG")
        & (df["play_type"].isin(["pass", "run"]))
        & (df["qb_kneel"] == 0)
        & (df["qb_spike"] == 0)
        & (df["epa"].notna())
        & (~((df["qtr"] == 4) & ((df["wp"] > 0.95) | (df["wp"] < 0.05))))
    ].copy()
    d["is_dropback"] = ((d["pass_attempt"] == 1) | (d["qb_scramble"] == 1)).astype(int)
    d["is_rush"] = ((d["rush_attempt"] == 1) & (d["qb_scramble"] == 0)
                    & (d["qb_kneel"] == 0)).astype(int)
    d["is_explosive"] = (
        ((d["is_dropback"] == 1) & (d["yards_gained"] >= 15))
        | ((d["is_rush"] == 1) & (d["yards_gained"] >= 10))
    ).astype(int)
    return d


def compute(df, season):
    d = base_sample(df)

    # League baselines for expected-turnover math (computed on same filtered sample)
    lg_int_rate = d["interception"].sum() / d["is_dropback"].sum()
    lg_fum_lost_rate = d["fumble_lost"].sum() / len(d)

    rows = []
    teams = sorted(d["posteam"].dropna().unique())
    for t in teams:
        o = d[d["posteam"] == t]          # offense plays
        x = d[d["defteam"] == t]          # defensive plays (opponent offense)

        n = len(o)
        ndb = int(o["is_dropback"].sum())
        nr = int(o["is_rush"].sum())

        ints = int(o["interception"].sum())
        ints_exp = lg_int_rate * ndb
        fuml = int(o["fumble_lost"].sum())
        fuml_exp = lg_fum_lost_rate * n
        fum = int(o["fumble"].sum())

        # defense-side
        xn = len(x)
        xndb = int(x["is_dropback"].sum())
        xnr = int(x["is_rush"].sum())
        xints = int(x["interception"].sum())
        xints_exp = lg_int_rate * xndb
        xfuml = int(x["fumble_lost"].sum())
        xfuml_exp = lg_fum_lost_rate * xn
        xfum = int(x["fumble"].sum())

        row = {
            "team": t,
            "season": season,
            "n_games": int(o["game_id"].nunique()),
            "n_plays": n,
            "n_dropbacks": ndb,
            "n_rushes": nr,
            # efficiency
            "epa_per_play": o["epa"].mean(),
            "epa_per_dropback": o.loc[o["is_dropback"] == 1, "epa"].mean(),
            "epa_per_rush": o.loc[o["is_rush"] == 1, "epa"].mean(),
            "success_rate": o["success"].mean(),
            # defense (sign flipped: positive EPA = good defense)
            "def_epa_per_play": -x["epa"].mean(),
            "def_epa_per_dropback": -x.loc[x["is_dropback"] == 1, "epa"].mean(),
            "def_epa_per_rush": -x.loc[x["is_rush"] == 1, "epa"].mean(),
            "def_success_rate_allowed": x["success"].mean(),
            # explosives (4for4 thresholds)
            "explosive_rate": o["is_explosive"].mean(),
            "explosive_rate_allowed": x["is_explosive"].mean(),
            # turnovers: actual vs expected (league-rate baselines)
            "int_thrown": ints,
            "int_rate_per_dropback": ints / ndb if ndb else np.nan,
            "int_expected": ints_exp,
            "int_diff_actual_minus_expected": ints - ints_exp,
            "fumbles": fum,
            "fumbles_lost": fuml,
            "fumble_lost_rate_per_play": fuml / n if n else np.nan,
            "fumble_lost_expected": fuml_exp,
            "fumble_lost_diff_actual_minus_expected": fuml - fuml_exp,
            # defense takeaways
            "takeaways_int": xints,
            "takeaways_int_expected": xints_exp,
            "takeaways_int_diff": xints - xints_exp,
            "opp_fumbles": xfum,
            "opp_fumbles_lost": xfuml,
            "opp_fumbles_lost_expected": xfuml_exp,
            "opp_fumble_recovery_rate": xfuml / xfum if xfum else np.nan,
            # pressure proxies (pbp has qb_hit only; no hurry/pressure charting)
            "qb_hit_rate_allowed": o.loc[o["is_dropback"] == 1, "qb_hit"].mean(),
            "sack_rate_allowed": o.loc[o["is_dropback"] == 1, "sack"].mean(),
            "qb_hit_rate_forced": x.loc[x["is_dropback"] == 1, "qb_hit"].mean(),
            "sack_rate_forced": x.loc[x["is_dropback"] == 1, "sack"].mean(),
        }
        rows.append(row)

    m = pd.DataFrame(rows)

    # ---- points per game / points per drive (unfiltered scoring, REG games) ----
    g = df[df["season_type"] == "REG"]
    final = (
        g.groupby("game_id")
        .agg(home_team=("home_team", "first"), away_team=("away_team", "first"),
             hs=("total_home_score", "max"), aws=("total_away_score", "max"))
        .reset_index()
    )
    home = final[["home_team", "hs"]].rename(columns={"home_team": "team", "hs": "points"})
    away = final[["away_team", "aws"]].rename(columns={"away_team": "team", "aws": "points"})
    pts = pd.concat([home, away])
    ppg = pts.groupby("team")["points"].agg(["mean", "count"]).reset_index()
    ppg.columns = ["team", "points_per_game", "n_games_scored"]

    # drives: distinct (game_id, fixed_drive, posteam) with drive != 0
    dr = d[d["drive"] != 0].groupby(["game_id", "fixed_drive", "posteam"]).size().reset_index()
    drives = dr.groupby("posteam").size().reset_index(name="n_drives")
    drives = drives.rename(columns={"posteam": "team"})
    total_pts = pts.groupby("team")["points"].sum().reset_index(name="total_points")
    dpp = drives.merge(total_pts, on="team", how="left")
    dpp["points_per_drive"] = dpp["total_points"] / dpp["n_drives"]

    m = m.merge(ppg[["team", "points_per_game"]], on="team", how="left")
    m = m.merge(dpp[["team", "n_drives", "points_per_drive"]], on="team", how="left")
    return m


def add_int_worthy(m25, df25):
    """2025 only: join FTN is_interception_worthy charting (100% join coverage)."""
    ftn = pd.read_csv(f"{IN_DIR}/ftn2025.csv", low_memory=False,
                      usecols=["nflverse_game_id", "nflverse_play_id", "is_interception_worthy"])
    d = base_sample(df25)[["game_id", "play_id", "posteam", "is_dropback"]]
    j = d.merge(ftn, left_on=["game_id", "play_id"],
                right_on=["nflverse_game_id", "nflverse_play_id"], how="left")
    j["is_interception_worthy"] = j["is_interception_worthy"].fillna(False).astype(int)
    iw = (
        j[j["is_dropback"] == 1]
        .groupby("posteam")
        .agg(n_dropbacks_iw=("is_dropback", "sum"),
             int_worthy_throws=("is_interception_worthy", "sum"))
        .reset_index()
        .rename(columns={"posteam": "team"})
    )
    iw["int_worthy_throw_rate"] = iw["int_worthy_throws"] / iw["n_dropbacks_iw"]
    return m25.merge(iw[["team", "int_worthy_throws", "int_worthy_throw_rate"]],
                     on="team", how="left")


if __name__ == "__main__":
    import os
    os.makedirs(OUT_DIR, exist_ok=True)

    df25 = load(2025)
    df26 = load(2026)

    print("2025 raw plays:", len(df25), "| 2026 raw plays:", len(df26))
    print("2026 weeks:", sorted(df26["week"].dropna().unique()))
    print("2026 games:", df26["game_id"].nunique())

    m25 = compute(df25, 2025)
    m26 = compute(df26, 2026)
    m25 = add_int_worthy(m25, df25)
    # mark unavailability honestly in 2026
    m26["int_worthy_throws"] = np.nan
    m26["int_worthy_throw_rate"] = np.nan

    m25.to_csv(f"{OUT_DIR}/team_metrics_2025.csv", index=False, float_format="%.5f")
    m26.to_csv(f"{OUT_DIR}/team_metrics_2026.csv", index=False, float_format="%.5f")
    print("2025 rows:", len(m25), "| 2026 rows:", len(m26))
    print("2026 sample:", m26[["team", "n_games", "n_plays", "n_dropbacks"]].head(5).to_string(index=False))
