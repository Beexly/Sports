"""Turnover occurrence-model persistence test, multi-season robustness (2023/2024/2025).

Mirrors the original 2025 single-season method exactly:
- Events: interception (per dropback), fumbles forced (per play).
- Shrinkage: K_FF=200 pseudo-plays, K_INT=150 pseudo-dropbacks toward league rates.
- exp_to_diff = (own int_rate x lg opp dropback volume + own ff_rate x 0.5 x lg opp play
  volume) minus the league-rate version; recovery at 50% (luck-neutral).
- Naive baseline: W1-8 actual TO differential persistence. Fit W1-8, test W9-18, n=32.
- Kill line: expected must BEAT naive on Spearman AND RMSE, else NULL.
"""
import numpy as np
import pandas as pd
from scipy.stats import spearmanr

DATA = "data"
K_FF, K_INT = 200.0, 150.0  # same pre-registered constants as the single-season run

def team_game_to(year):
    pbp = pd.read_csv(f"{DATA}/pbp_{year}.csv.gz", compression="gzip", low_memory=False,
                      usecols=["game_id", "week", "season_type", "posteam", "play_type",
                               "qb_dropback", "interception", "fumble", "fumble_lost"])
    pbp = pbp[(pbp.season_type == "REG") & pbp.posteam.notna()]
    pbp = pbp[pbp.play_type != "no_play"]
    for c in ["interception", "fumble", "fumble_lost", "qb_dropback"]:
        pbp[c] = pbp[c].fillna(0).astype(int)
    g = pbp.groupby(["game_id", "week", "posteam"]).agg(
        plays=("play_type", "size"), dropbacks=("qb_dropback", "sum"),
        ints=("interception", "sum"), fumbles=("fumble", "sum"),
        flost=("fumble_lost", "sum")).reset_index()
    rows = []
    for _, d in g.groupby("game_id"):
        if len(d) != 2:
            continue
        a, b = d.iloc[0], d.iloc[1]
        rows.append({"game_id": a.game_id, "week": a.week, "team": a.posteam,
                     "plays": a.plays, "dropbacks": a.dropbacks,
                     "giveaways": a.ints + a.flost,
                     "ints_forced": b.ints, "ff_forced": b.fumbles,
                     "opp_plays": b.plays, "opp_dropbacks": b.dropbacks})
        rows.append({"game_id": b.game_id, "week": b.week, "team": b.posteam,
                     "plays": b.plays, "dropbacks": b.dropbacks,
                     "giveaways": b.ints + b.flost,
                     "ints_forced": a.ints, "ff_forced": a.fumbles,
                     "opp_plays": a.plays, "opp_dropbacks": a.dropbacks})
    return pd.DataFrame(rows)

def run(year):
    tg = team_game_to(year)
    trn, tst = tg[tg.week <= 8], tg[((tg.week >= 9) & (tg.week <= 18))]

    lg_int_rate = trn.ints_forced.sum() / trn.opp_dropbacks.sum()
    lg_ff_rate = trn.ff_forced.sum() / trn.opp_plays.sum()
    vol_db = trn.opp_dropbacks.mean()  # league-average opponent volume (train estimate)
    vol_pl = trn.opp_plays.mean()

    r = trn.groupby("team").agg(ints_forced=("ints_forced", "sum"),
                                ff_forced=("ff_forced", "sum"),
                                opp_plays=("opp_plays", "sum"),
                                opp_dropbacks=("opp_dropbacks", "sum"))
    r["int_rate"] = (r.ints_forced + K_INT * lg_int_rate) / (r.opp_dropbacks + K_INT)
    r["ff_rate"] = (r.ff_forced + K_FF * lg_ff_rate) / (r.opp_plays + K_FF)

    r["exp_to"] = r.int_rate * vol_db + r.ff_rate * 0.5 * vol_pl
    lg_exp_to = lg_int_rate * vol_db + lg_ff_rate * 0.5 * vol_pl
    r["exp_to_diff"] = r.exp_to - lg_exp_to

    act = tst.groupby("team").apply(lambda d: d.ints_forced.sum() + 0.5 * d.ff_forced.sum()
                                    - d.giveaways.sum(), include_groups=False)
    naive = trn.groupby("team").apply(lambda d: d.ints_forced.sum() + 0.5 * d.ff_forced.sum()
                                      - d.giveaways.sum(), include_groups=False)
    common = sorted(set(r.index) & set(act.index) & set(naive.index))
    e, a, nv = r.loc[common, "exp_to_diff"], act[common], naive[common]
    return {"season": year,
            "naive_sp": round(float(spearmanr(nv, a).statistic), 3),
            "exp_sp": round(float(spearmanr(e, a).statistic), 3),
            "naive_rmse": round(float(np.sqrt(np.mean((nv - a) ** 2))), 2),
            "exp_rmse": round(float(np.sqrt(np.mean((e - a) ** 2))), 2),
            "verdict": "PASS" if (spearmanr(e, a).statistic > spearmanr(nv, a).statistic
                                  and np.sqrt(np.mean((e - a) ** 2))
                                  < np.sqrt(np.mean((nv - a) ** 2))) else "NULL"}

rows = [run(y) for y in [2023, 2024, 2025]]
df = pd.DataFrame(rows)
print(df.to_string(index=False))
df.to_csv(f"{DATA}/turnover_persistence_multi_season.csv", index=False)
