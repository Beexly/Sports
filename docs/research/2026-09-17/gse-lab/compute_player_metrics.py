"""
Galaxy Sports Edge — player-level first-down rates, QB aggressiveness
(aDOT + nflfastR CPOE), and 4-man-rush / pressure rates.

Player metrics use the same filtered sample as the team metrics
(REG only, pass/run, no kneels/spikes, garbage-time excluded).

1. player_first_downs_{2025,2026}.csv — per-player rushing first-down rate
   (first_down_rush on rush attempts, incl. scrambles) and receiving
   first-down rate (first_down_pass on receptions and on targets).
   2025 qualifier: 50+ rushes OR 30+ targets. 2026 Week 1: 8+ / 8+
   (single-game role check).
2. qb_aggressiveness_{2025,2026}.csv — per-QB aDOT (air_yards / attempts
   with non-null air_yards; sacks excluded by construction), comp%,
   expected comp% (mean of nflfastR cp), CPOE in percentage points
   (nflverse ships cpoe on the 0-100 scale; verified mean(cpoe) ==
   100*mean(complete_pass - cp)). 2025 qualifier: 100+ attempts;
   2026 Week 1: 10+.
3. rush_pressure_{2025,2026}.csv — per-team 4-man rush rate from FTN
   charting n_pass_rushers (100% join on dropbacks both seasons; rows with
   n_pass_rushers == 0 excluded as a data quirk) and pressure proxies from
   nflverse qb_hit/sack flags. FTN has NO hurry column, so the pressure
   rate is a hit+sack floor, not true pressure — documented.

Quadrant support: team CSV carries team + both metrics + _pct columns;
player CSVs carry player, team, both rate metrics, and within-sample
percentiles. 100 = best (highest), except adot_pct where higher = deeper
(style, not better).

Outputs live in ~/workspace/gse-research/nfl-2026/.
"""
import numpy as np
import pandas as pd

from compute_team_metrics import load, base_sample
from compute_advanced_metrics import percentile_100

OUT_DIR = "/home/hatch/workspace/gse-research/nfl-2026"
IN_DIR = "/tmp/nflverse"

PLAYER_COLS = ["game_id", "play_id", "season_type", "play_type", "qtr", "wp",
               "epa", "qb_kneel", "qb_spike", "pass_attempt", "rush_attempt",
               "qb_scramble", "posteam", "rusher_player_name",
               "receiver_player_name", "first_down_rush", "first_down_pass",
               "complete_pass"]
QB_COLS = PLAYER_COLS + ["passer_player_name", "air_yards", "cp", "cpoe"]


# ------------------------------------------------- 1. player first downs ---
def compute_player_first_downs(season, rush_min, tgt_min):
    df = pd.read_csv(f"{IN_DIR}/pbp{season}.csv.gz", compression="gzip",
                     low_memory=False, usecols=PLAYER_COLS)
    d = df[(df["season_type"] == "REG")
           & (df["play_type"].isin(["pass", "run"]))
           & (df["qb_kneel"] == 0) & (df["qb_spike"] == 0)
           & (~((df["qtr"] == 4) & ((df["wp"] > 0.95) | (df["wp"] < 0.05))))].copy()

    rush = d[d["rush_attempt"] == 1].copy()      # includes scrambles
    rush = rush[rush["rusher_player_name"].notna()]
    rg = (rush.groupby("rusher_player_name")
              .agg(rushes=("first_down_rush", "size"),
                   rush_first_downs=("first_down_rush", "sum"),
                   team=("posteam",
                         lambda s: s.mode().iloc[0] if len(s) else None))
              .reset_index().rename(columns={"rusher_player_name": "player"}))

    tgt = d[d["pass_attempt"] == 1].copy()
    tgt = tgt[tgt["receiver_player_name"].notna()]
    tg = (tgt.groupby("receiver_player_name")
              .agg(targets=("first_down_pass", "size"),
                   receptions=("complete_pass", "sum"),
                   rec_first_downs=("first_down_pass", "sum"),
                   team=("posteam",
                         lambda s: s.mode().iloc[0] if len(s) else None))
              .reset_index().rename(columns={"receiver_player_name": "player"}))

    m = rg.merge(tg, on="player", how="outer", suffixes=("", "_rec"))
    m["team"] = m["team"].fillna(m["team_rec"])
    m = m.drop(columns=["team_rec"])
    for c in ["rushes", "rush_first_downs", "targets", "receptions",
              "rec_first_downs"]:
        m[c] = m[c].fillna(0)
    m = m[(m["rushes"] >= rush_min) | (m["targets"] >= tgt_min)].copy()
    m["rush_fd_rate"] = np.where(m["rushes"] > 0,
                                 m["rush_first_downs"] / m["rushes"], np.nan)
    m["rec_fd_rate"] = np.where(m["receptions"] > 0,
                                m["rec_first_downs"] / m["receptions"], np.nan)
    m["target_fd_rate"] = np.where(m["targets"] > 0,
                                   m["rec_first_downs"] / m["targets"], np.nan)
    m["season"] = season
    rq = m[m["rushes"] >= rush_min]
    vq = m[m["receptions"] >= 1]
    m["rush_fd_rate_pct"] = np.nan
    m.loc[rq.index, "rush_fd_rate_pct"] = percentile_100(
        rq["rush_fd_rate"], higher_better=True).values
    m["rec_fd_rate_pct"] = np.nan
    m.loc[vq.index, "rec_fd_rate_pct"] = percentile_100(
        vq["rec_fd_rate"], higher_better=True).values
    cols = ["player", "team", "season", "rushes", "rush_first_downs",
            "rush_fd_rate", "rush_fd_rate_pct", "targets", "receptions",
            "rec_first_downs", "rec_fd_rate", "rec_fd_rate_pct",
            "target_fd_rate"]
    return m[cols].sort_values("player").reset_index(drop=True)


# ------------------------------------------------- 2. QB aggressiveness ----
def compute_qb_aggressiveness(season, att_min):
    df = pd.read_csv(f"{IN_DIR}/pbp{season}.csv.gz", compression="gzip",
                     low_memory=False, usecols=QB_COLS)
    d = df[(df["season_type"] == "REG")
           & (df["play_type"] == "pass") & (df["pass_attempt"] == 1)
           & (df["qb_spike"] == 0)
           & (~((df["qtr"] == 4) & ((df["wp"] > 0.95) | (df["wp"] < 0.05))))].copy()
    d = d[d["passer_player_name"].notna()]
    # CPOE subset: nflfastR ships cp = NA on throwaways (verified: 100% of
    # null-cp plays are incomplete). CPOE must compare completions to expected
    # on the SAME plays, so both use the cp-available subset.
    dc = d[d["cp"].notna()].copy()
    g = (dc.groupby("passer_player_name")
           .agg(n_cpoe=("complete_pass", "size"),
                completions=("complete_pass", "sum"),
                exp_comp=("cp", "mean"),
                team=("posteam", lambda s: s.mode().iloc[0] if len(s) else None))
           .reset_index().rename(columns={"passer_player_name": "player"}))
    att = (d.groupby("passer_player_name")
             .agg(attempts=("complete_pass", "size"),
                  air_yards=("air_yards", "sum"),
                  n_air=("air_yards", lambda s: s.notna().sum()))
             .reset_index().rename(columns={"passer_player_name": "player"}))
    g = g.merge(att, on="player", how="left")
    g = g[g["attempts"] >= att_min].copy()
    g["comp_pct"] = 100 * g["completions"] / g["n_cpoe"]   # non-throwaway attempts
    g["exp_comp_pct"] = 100 * g["exp_comp"]
    g["cpoe"] = g["comp_pct"] - g["exp_comp_pct"]   # percentage points
    g["adot"] = g["air_yards"] / g["n_air"]
    g["season"] = season
    g["cpoe_pct"] = percentile_100(g["cpoe"], higher_better=True)
    g["comp_pct_pct"] = percentile_100(g["comp_pct"], higher_better=True)
    # adot percentile: higher = deeper (style descriptor, not "better")
    g["adot_pct"] = percentile_100(g["adot"], higher_better=True)
    cols = ["player", "team", "season", "attempts", "n_cpoe", "completions",
            "comp_pct", "comp_pct_pct", "exp_comp_pct", "cpoe", "cpoe_pct",
            "adot", "adot_pct", "air_yards"]
    return g[cols].sort_values("player").reset_index(drop=True)


# ------------------------------------------- 3. 4-man rush vs pressure ----
def compute_rush_pressure(season):
    d = base_sample(load(season))
    d["is_dropback"] = ((d["pass_attempt"] == 1) | (d["qb_scramble"] == 1)).astype(int)
    db = d[d["is_dropback"] == 1][["game_id", "play_id", "posteam", "defteam",
                                   "qb_hit", "sack"]].copy()
    ftn = pd.read_csv(f"{IN_DIR}/ftn{season}.csv", low_memory=False,
                      usecols=["nflverse_game_id", "nflverse_play_id",
                               "n_pass_rushers"])
    j = db.merge(ftn, left_on=["game_id", "play_id"],
                 right_on=["nflverse_game_id", "nflverse_play_id"], how="left")
    cov = j["n_pass_rushers"].notna().mean()
    # n_pass_rushers == 0 is a data quirk (4 cases in 2026 wk1); exclude
    n_zero = int((j["n_pass_rushers"] == 0).sum())
    j = j[(j["n_pass_rushers"].notna()) & (j["n_pass_rushers"] > 0)].copy()
    j["is_four_man"] = (j["n_pass_rushers"] == 4).astype(int)
    j["is_pressure"] = ((j["qb_hit"] == 1) | (j["sack"] == 1)).astype(int)

    rows = []
    for t in sorted(d["posteam"].dropna().unique()):
        jd = j[j["defteam"] == t]   # defense generating rush
        jo = j[j["posteam"] == t]   # offense facing rush
        dd = db[db["defteam"] == t]
        do = db[db["posteam"] == t]
        rows.append({
            "team": t, "season": season,
            "n_dropbacks_def": len(dd), "n_dropbacks_off": len(do),
            "n_ftn_def": len(jd), "n_ftn_off": len(jo),
            "four_man_rush_rate": jd["is_four_man"].mean() if len(jd) else np.nan,
            "four_man_rush_rate_faced": jo["is_four_man"].mean() if len(jo) else np.nan,
            "pressure_proxy_rate_forced":
                ((dd["qb_hit"] == 1) | (dd["sack"] == 1)).mean() if len(dd) else np.nan,
            "pressure_proxy_rate_allowed":
                ((do["qb_hit"] == 1) | (do["sack"] == 1)).mean() if len(do) else np.nan,
        })
    out = pd.DataFrame(rows)
    out["four_man_rush_rate_pct"] = percentile_100(
        out["four_man_rush_rate"], higher_better=True)  # style: higher = more 4-man
    out["pressure_proxy_rate_forced_pct"] = percentile_100(
        out["pressure_proxy_rate_forced"], higher_better=True)
    out["pressure_proxy_rate_allowed_pct"] = percentile_100(
        out["pressure_proxy_rate_allowed"], higher_better=False)
    out.attrs["ftn_join_coverage"] = cov
    out.attrs["n_pass_rushers_zero_excluded"] = n_zero
    print(f"{season}: FTN join coverage on dropbacks = {cov:.4f}; "
          f"n_pass_rushers==0 excluded = {n_zero}")
    return out


if __name__ == "__main__":
    import os
    os.makedirs(OUT_DIR, exist_ok=True)

    p25 = compute_player_first_downs(2025, 50, 30)
    p25.to_csv(f"{OUT_DIR}/player_first_downs_2025.csv", index=False,
               float_format="%.5f")
    p26 = compute_player_first_downs(2026, 8, 8)
    p26.to_csv(f"{OUT_DIR}/player_first_downs_2026.csv", index=False,
               float_format="%.5f")
    print("player_first_downs 2025:", len(p25), "| 2026:", len(p26))

    q25 = compute_qb_aggressiveness(2025, 100)
    q25.to_csv(f"{OUT_DIR}/qb_aggressiveness_2025.csv", index=False,
               float_format="%.5f")
    q26 = compute_qb_aggressiveness(2026, 10)
    q26.to_csv(f"{OUT_DIR}/qb_aggressiveness_2026.csv", index=False,
               float_format="%.5f")
    print("qb_aggressiveness 2025:", len(q25), "| 2026:", len(q26))

    for season in (2025, 2026):
        rp = compute_rush_pressure(season)
        rp.to_csv(f"{OUT_DIR}/rush_pressure_{season}.csv", index=False,
                  float_format="%.5f")
        sub = rp[rp["team"].isin(["BUF", "DET"])]
        print(sub[["team", "four_man_rush_rate", "pressure_proxy_rate_forced",
                   "pressure_proxy_rate_allowed"]].to_string(index=False))
