"""Turnover occurrence-vs-recovery decomposition + 2026 luck (research artifacts).

PRE-REGISTRATION (before evaluation):
- Turnover events: interception==1 OR fumble_lost==1 (posteam loses ball).
  Occurrence = forced-INT rate per opponent dropback + forced-fumble rate per play.
  Recovery = fumble_lost / fumble (expected ~50%, treated as luck).
- Persistence test on 2025 REG: W1-8 -> W9-18. Compare Spearman of
  (a) actual TO-diff W1-8 vs actual TO-diff W9-18 (naive persistence)
  (b) EXPECTED TO-diff W1-8 (occurrence rates shrunk to league mean, recovery at
      50%) vs actual TO-diff W9-18.
  Claim survives iff (b) Spearman > (a) Spearman. Honest null otherwise.
"""
import numpy as np
import pandas as pd
from scipy.stats import spearmanr

pbp = pd.read_csv(
    "data/pbp_2025.csv.gz",
    usecols=["game_id", "season", "week", "season_type", "posteam",
             "play_type", "interception", "fumble", "fumble_lost", "qb_dropback"],
)
pbp = pbp[(pbp.season_type == "REG") & (pbp.posteam.notna())].copy()
for c in ["interception", "fumble", "fumble_lost", "qb_dropback"]:
    pbp[c] = pbp[c].fillna(0).astype(int)
pbp = pbp[pbp.play_type != "no_play"]
print(f"2025 REG plays: {len(pbp):,}")

# per (game, team) offensive aggregates
side = pbp.groupby(["game_id", "week", "posteam"]).agg(
    plays=("play_type", "size"),
    dropbacks=("qb_dropback", "sum"),
    ints_thrown=("interception", "sum"),
    fumbles=("fumble", "sum"),
    fumbles_lost=("fumble_lost", "sum"),
).reset_index().rename(columns={"posteam": "team"})
side["giveaways"] = side.ints_thrown + side.fumbles_lost

rows = []
for _, g in side.groupby("game_id"):
    if len(g) != 2:
        continue  # OT oddities / safety rows; skip rather than invent
    a, b = g.iloc[0], g.iloc[1]
    for x, y in ((a, b), (b, a)):
        rows.append({
            "game_id": x.game_id, "week": x.week, "team": x.team, "opponent": y.team,
            "plays": x.plays, "dropbacks": x.dropbacks, "giveaways": x.giveaways,
            "fumbles": x.fumbles, "fumbles_lost": x.fumbles_lost,
            "takeaways": y.giveaways, "ff_forced": y.fumbles,
            "def_dropbacks": y.dropbacks,
        })
tg = pd.DataFrame(rows)
print(f"team-game rows: {len(tg)}")

trn, tst = tg[tg.week <= 8], tg[tg.week >= 9]
team_trn = trn.groupby("team").agg(
    takeaways=("takeaways", "sum"), giveaways=("giveaways", "sum"),
    ff_forced=("ff_forced", "sum"), fumbles=("fumbles", "sum"),
    fumbles_lost=("fumbles_lost", "sum"),
    plays=("plays", "sum"), dropbacks=("dropbacks", "sum"),
    def_dropbacks=("def_dropbacks", "sum"),
)
team_tst = tst.groupby("team").agg(actual_to=("takeaways", "sum"), actual_gv=("giveaways", "sum"))
team_tst["actual_to_diff"] = team_tst.actual_to - team_tst.actual_gv

lg_ff_rate = team_trn.ff_forced.sum() / team_trn.plays.sum()
lg_int_rate = (team_trn.takeaways - team_trn.ff_forced).sum() / max(team_trn.def_dropbacks.sum(), 1)
K_FF, K_INT = 200.0, 150.0  # shrinkage pseudo-plays / pseudo-dropbacks (pre-registered)

exp = pd.DataFrame(index=team_trn.index)
exp["ff_rate"] = (team_trn.ff_forced + K_FF * lg_ff_rate) / (team_trn.plays + K_FF)
int_events = team_trn.takeaways - team_trn.ff_forced
exp["int_rate"] = (int_events + K_INT * lg_int_rate) / (team_trn.def_dropbacks + K_INT)

# expected takeaways in test window: own shrunk occurrence rates x league-average
# opponent volume; recovery at 50% (luck-neutral). Opponent volume uses test-window
# actuals (volumes are not the skill being scored).
vol = (team_tst.actual_to + team_tst.actual_gv).div(2)
exp_to = exp.int_rate * vol + exp.ff_rate * 0.5 * vol
lg_exp_to = lg_int_rate * vol + lg_ff_rate * 0.5 * vol
exp["exp_to_diff"] = exp_to - lg_exp_to

naive = team_trn.takeaways - team_trn.giveaways
common = team_tst.index
rho_naive = float(spearmanr(naive.loc[common], team_tst.actual_to_diff.loc[common]).statistic)
rho_exp = float(spearmanr(exp.exp_to_diff.loc[common], team_tst.actual_to_diff.loc[common]).statistic)
rmse_naive = float(np.sqrt(np.mean((naive.loc[common] - team_tst.actual_to_diff.loc[common]) ** 2)))
rmse_exp = float(np.sqrt(np.mean((exp.exp_to_diff.loc[common] - team_tst.actual_to_diff.loc[common]) ** 2)))

print("\n=== PRE-REGISTERED persistence test (2025 W1-8 -> W9-18, n=32 teams) ===")
print(f"naive actual persistence : Spearman {rho_naive:.3f}  RMSE {rmse_naive:.2f}")
print(f"expected (occurrence+50%) : Spearman {rho_exp:.3f}  RMSE {rmse_exp:.2f}")
print("VERDICT:", "EXPECTED BEATS ACTUAL — occurrence model survives" if rho_exp > rho_naive
      else "NULL — occurrence model does NOT beat naive persistence")

fumbles_trn = team_trn.fumbles.where(team_trn.fumbles > 0)
rec_trn = (team_trn.fumbles_lost / team_trn.fumbles).where(team_trn.fumbles >= 3)
rec_tst = tst.groupby("team").apply(
    lambda d: d.fumbles_lost.sum() / d.fumbles.sum() if d.fumbles.sum() >= 3 else np.nan,
    include_groups=False)
both = pd.concat([rec_trn, rec_tst], axis=1, keys=["t1", "t2"]).dropna()
rho_rec = float(spearmanr(both.t1, both.t2).statistic) if len(both) >= 5 else float("nan")
print(f"recovery-share persistence W1-8 vs W9-18: Spearman {rho_rec:.3f} (n={len(both)}) — expect ~0")

out = team_trn.join(team_tst).assign(
    naive_to_diff=naive, exp_to_diff=exp.exp_to_diff,
    ff_rate=exp.ff_rate, int_rate=exp.int_rate)
out.to_csv("data/turnover_expected_vs_actual_2025.csv")

# ---- 2026 luck table -------------------------------------------------------
pbp26 = pd.read_csv(
    "data/pbp_2026.csv.gz",
    usecols=["game_id", "season", "week", "season_type", "posteam",
             "interception", "fumble", "fumble_lost"],
)
pbp26 = pbp26[(pbp26.season_type == "REG") & (pbp26.posteam.notna())]
for c in ["interception", "fumble", "fumble_lost"]:
    pbp26[c] = pbp26[c].fillna(0).astype(int)
g26 = pbp26.groupby("posteam").agg(fumbles=("fumble", "sum"), fumbles_lost=("fumble_lost", "sum"),
                                   ints=("interception", "sum"))
g26["rec_share"] = (g26.fumbles - g26.fumbles_lost) / g26.fumbles.replace(0, np.nan)
g26["luck_flag"] = np.select(
    [g26.rec_share >= 0.75, g26.rec_share <= 0.25], ["LUCKY", "UNLUCKY"], default="NEUTRAL")
print("\n=== 2026 W1-2 fumble-recovery luck (share of own fumbles kept, 2+ fumbles) ===")
print(g26[g26.fumbles >= 2].sort_values("rec_share", ascending=False).head(8).to_string())
g26.to_csv("data/turnover_luck_2026.csv")
print("saved data/turnover_*.csv")
