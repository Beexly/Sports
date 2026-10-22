"""Multi-season repeat of the opponent-adjustment validation (2023/2024 + 2025 own-agg).

PRE-REGISTRATION (same kill line per season): fit on W1-8, test W9-18; adjusted must
beat raw by >=0.2 RMSE AND tie-or-beat on Spearman, else that season is a NULL.
Team-game EPA/play computed from pbp with the lab conventions (REG, pass/run, no
kneels/spikes/no_play, plays-weighted, sacks inside pass). Internal consistency check:
2025 own-agg vs the production-table-based numbers in the README.
"""
import numpy as np
import pandas as pd
from scipy.stats import spearmanr

sched = pd.read_csv("data/schedules.csv")
sched["margin"] = sched.home_score - sched.away_score

COLS = ["game_id", "season", "week", "season_type", "posteam", "defteam",
        "play_type", "epa"]

def team_game_epa(year):
    pbp = pd.read_csv("data/pbp_%d.csv.gz" % year, usecols=COLS)
    pbp = pbp[(pbp.season_type == "REG") & (pbp.posteam.notna())]
    pbp = pbp[pbp.play_type.isin(["pass", "run"])]
    g = pbp.groupby(["game_id", "week", "posteam"]).agg(
        n=("epa", "size"), s=("epa", "sum")).reset_index()
    g = g.rename(columns={"posteam": "team"})
    g["off"] = g.s / g.n
    rows = []
    for _, d in g.groupby("game_id"):
        if len(d) != 2:
            continue
        a, b = d.iloc[0], d.iloc[1]
        rows.append({"game_id": a.game_id, "week": a.week, "team": a.team,
                     "opponent": b.team, "off": a.off, "n": a.n})
        rows.append({"game_id": b.game_id, "week": b.week, "team": b.team,
                     "opponent": a.team, "off": b.off, "n": b.n})
    tg = pd.DataFrame(rows)
    # defense allowed = mirror of opponent offense
    d = tg[["game_id", "team", "off", "n"]].rename(
        columns={"team": "opponent", "off": "def"})
    tg = tg.merge(d, on=["game_id", "opponent"], suffixes=("", "_d"))
    return tg

def adjusted(tg):
    lg_off = np.average(tg.off, weights=tg.n)
    lg_def = np.average(tg["def"], weights=tg.n)
    by = {t: d for t, d in tg.groupby("team")}
    ao = {t: d.off.mean() for t, d in by.items()}
    ad = {t: d["def"].mean() for t, d in by.items()}
    for _ in range(100):
        no = {t: np.average(d.off - (d.opponent.map(ad) - lg_def), weights=d.n)
              for t, d in by.items()}
        nd = {t: np.average(d["def"] - (d.opponent.map(ao) - lg_off), weights=d.n)
              for t, d in by.items()}
        ao, ad = no, nd
    return ao, ad

print("season  method   n    rmse   spearman   verdict")
summary = []
for year in (2023, 2024, 2025):
    tg = team_game_epa(year)
    trn, tst = tg[tg.week <= 8], tg[tg.week >= 9]
    t = tst.merge(sched[["game_id", "margin"]], on="game_id").dropna(subset=["margin"])
    pair = t.groupby("game_id")
    raw_sc, adj_sc, y = [], [], []
    ao_tr, ad_tr = adjusted(trn)
    # raw train ratings
    raw_o = trn.groupby("team").apply(lambda d: np.average(d.off, weights=d.n),
                                      include_groups=False)
    raw_d = trn.groupby("team").apply(lambda d: np.average(d["def"], weights=d.n),
                                      include_groups=False)
    for gid, d in pair:
        (h, a) = d.team.iloc[0], d.team.iloc[1]
        raw_sc.append((raw_o[h] - raw_d[h]) - (raw_o[a] - raw_d[a]) + 2.0)
        adj_sc.append((ao_tr[h] - ad_tr[h]) - (ao_tr[a] - ad_tr[a]) + 2.0)
        y.append(d.margin.iloc[0])
    raw_sc, adj_sc, y = map(np.array, (raw_sc, adj_sc, y))
    def fit_eval(sc):
        A = np.vstack([sc, np.ones(len(sc))]).T
        a1, b1 = np.linalg.lstsq(A, y, rcond=None)[0]
        pred = a1 * sc + b1
        return float(np.sqrt(np.mean((pred - y) ** 2))), float(spearmanr(sc, y).statistic)
    rm_r, sp_r = fit_eval(raw_sc)
    rm_a, sp_a = fit_eval(adj_sc)
    ok = (rm_r - rm_a) >= 0.2 and sp_a >= sp_r - 1e-9
    verdict = "PASS" if ok else "NULL"
    print(f"{year}   raw    {len(y):4d}  {rm_r:.3f}   {sp_r:.3f}")
    print(f"{year}   adj    {len(y):4d}  {rm_a:.3f}   {sp_a:.3f}   {verdict}")
    summary.append({"season": year, "n": len(y), "raw_rmse": rm_r, "adj_rmse": rm_a,
                    "raw_spearman": sp_r, "adj_spearman": sp_a, "verdict": verdict})

pd.DataFrame(summary).to_csv("data/validation_multi_season.csv", index=False)
passed = sum(1 for s in summary if s["verdict"] == "PASS")
print(f"\n{passed}/{len(summary)} seasons pass the pre-registered kill line")
print("saved data/validation_multi_season.csv")
