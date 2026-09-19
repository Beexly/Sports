"""Penalty persistence mill (team-game penalty yards, W1-8 -> W9-18).
Pre-registered: Spearman > 0.15 = partially skill, factor candidate; < 0.15 dead.
"""
import numpy as np
import pandas as pd
from scipy.stats import spearmanr

DATA = "data"
sched = pd.read_csv(f"{DATA}/schedules.csv", low_memory=False)
pens = []
for y in range(2019, 2026):
    pb = pd.read_csv(f"{DATA}/pbp_{y}.csv.gz", compression="gzip", low_memory=False,
                     usecols=["game_id", "season_type", "penalty", "penalty_yards",
                              "penalty_team"])
    pens.append(pb[(pb.season_type == "REG") & (pb.penalty == 1)])
p = pd.concat(pens, ignore_index=True)
tp = p.groupby(["game_id", "penalty_team"]).penalty_yards.sum().rename("pen").reset_index()
tp = tp.merge(sched[["game_id", "week"]], on="game_id")
trn = tp[tp.week <= 8].groupby("penalty_team").pen.sum()
tst = tp[tp.week >= 9].groupby("penalty_team").pen.sum()
common = trn.index.intersection(tst.index)
rho = float(spearmanr(trn.loc[common], tst.loc[common]).statistic)
print(f"teams {len(common)}  W1-8 -> W9-18 penalty-yards Spearman {rho:.3f}  "
      f"({'CANDIDATE (> 0.15)' if rho > 0.15 else 'DEAD (< 0.15)'})")
lg_mean = float(tp.pen.mean())
print(f"league mean pen-yds/team-game: {lg_mean:.1f}")
