"""Split asymmetry + repo-constant probability calibration checks (2023-2025).

1. SPLIT ASYMMETRY (descriptive, full-season team-games): Pearson + Spearman of
   dropback-EPA-net-diff vs margin and rush-EPA-net-diff vs margin. Literature anchor:
   passing predicts wins far more than rushing (~0.5 vs ~0.15). Confirms/denies our
   pipeline reproduces the asymmetry that justifies weighting dropbacks over rushes
   in any v5.3.0 factor design.

2. REPO CONSTANTS vs FITTED (2025 holdout): p_repo = sigmoid((net_diff + 0.025)/0.12)
   from W1-8 adjusted ratings (repo scale/HFA constants), vs a 1-parameter logistic
   fit on train. Brier + log-loss on weeks 9-18. Quantifies whether the constants
   are miscalibrated (founder-gated scoring check).
"""
import numpy as np
import pandas as pd
from scipy.stats import spearmanr, pearsonr
from scipy.optimize import minimize_scalar

DATA = "data"
from extend_validation_v2 import load_pbp, team_game_epa, ratings_iterative, net_diff  # reuse

print("=== 1. split asymmetry (full-season team-game margins) ===")
sched = pd.read_csv(f"{DATA}/schedules.csv", low_memory=False)

# cleaner: build per-game team rows with split EPA + margin from schedule
def split_rows(year):
    pbp = pd.read_csv(f"{DATA}/pbp_{year}.csv.gz", compression="gzip", low_memory=False,
                      usecols=["game_id", "season_type", "posteam", "play_type", "epa"])
    pbp = pbp[(pbp.season_type == "REG") & pbp.posteam.notna()]
    pbp = pbp[pbp.play_type.isin(["pass", "run"])]
    g = pbp.groupby(["game_id", "posteam", "play_type"]).agg(
        n=("epa", "size"), s=("epa", "sum")).reset_index()
    piv = g.pivot_table(index=["game_id", "posteam"], columns="play_type",
                        values=["n", "s"], fill_value=0)
    piv.columns = [f"{a}_{b}" for a, b in piv.columns]
    piv = piv.reset_index()
    for c in ["n_pass", "s_pass", "n_run", "s_run"]:
        if c not in piv.columns:
            piv[c] = 0
    piv["pass_epa"] = np.where(piv.n_pass > 0, piv.s_pass / piv.n_pass.replace(0, np.nan), 0)
    piv["run_epa"] = np.where(piv.n_run > 0, piv.s_run / piv.n_run.replace(0, np.nan), 0)
    s = sched[(sched.season == year) & (sched.game_type == "REG")].copy()
    s["margin"] = s.home_score - s.away_score
    m = s[["game_id", "home_team", "away_team", "margin"]]
    h = piv.merge(m, left_on=["game_id", "posteam"], right_on=["game_id", "home_team"])
    a_ = piv.merge(m, left_on=["game_id", "posteam"], right_on=["game_id", "away_team"])
    j = pd.concat([h.assign(side="home"), a_.assign(side="away")])
    j["margin_signed"] = np.where(j.side == "home", j.margin, -j.margin)
    j["pass_diff"] = j.pass_epa - j.groupby("game_id").pass_epa.transform("mean") * 0  # placeholder
    # proper diff: opponent value per game
    opp = j.set_index(["game_id", "side"])[["pass_epa", "run_epa"]]
    def opp_val(gid, side, col):
        other = "away" if side == "home" else "home"
        return opp.loc[(gid, other), col]
    j["pass_diff"] = [r.pass_epa - opp_val(r.game_id, r.side, "pass_epa") for r in j.itertuples()]
    j["run_diff"] = [r.run_epa - opp_val(r.game_id, r.side, "run_epa") for r in j.itertuples()]
    return j

print("season   pass_SP pass_PE  run_SP  run_PE   n")
for year in [2023, 2024, 2025]:
    j = split_rows(year)
    print(f"{year}   {spearmanr(j.pass_diff, j.margin_signed).statistic:.3f}   "
          f"{pearsonr(j.pass_diff, j.margin_signed).statistic:.3f}   "
          f"{spearmanr(j.run_diff, j.margin_signed).statistic:.3f}   "
          f"{pearsonr(j.run_diff, j.margin_signed).statistic:.3f}   {len(j)}")

print()
print("=== 2. repo constants vs fitted logistic (2025 W1-8 fit -> W9-18 test) ===")
tg = team_game_epa(2025)
r_adj = ratings_iterative(tg[tg.week <= 8])
s25 = sched[(sched.season == 2025) & (sched.game_type == "REG")].copy()
s25["margin"] = s25.home_score - s25.away_score
trn = s25[s25.week <= 8].dropna(subset=["margin"])
tst = s25[((s25.week >= 9) & (s25.week <= 18))].dropna(subset=["margin"])
nd = np.array([net_diff(r_adj, x.home_team, x.away_team) for x in tst.itertuples()])
y = (tst.margin.values > 0).astype(float)

p_repo = 1 / (1 + np.exp(-(nd + 0.025) / 0.12))

# fitted scale by minimizing train log-loss via grid (1-param, HFA fixed 0.025)
trn_nd = np.array([net_diff(r_adj, x.home_team, x.away_team) for x in trn.itertuples()])
trn_y = (trn.margin.values > 0).astype(float)
def nll(scale):
    p = 1 / (1 + np.exp(-(trn_nd + 0.025) / scale))
    p = np.clip(p, 1e-9, 1 - 1e-9)
    return -np.mean(trn_y * np.log(p) + (1 - trn_y) * np.log(1 - p))
res = minimize_scalar(nll, bounds=(0.05, 0.40), method="bounded")
scale_fit = res.x
p_fit = 1 / (1 + np.exp(-(nd + 0.025) / scale_fit))

for name, p in [("repo(0.12)", p_repo), (f"fitted({scale_fit:.3f})", p_fit)]:
    pc = np.clip(p, 1e-9, 1 - 1e-9)
    print(f"{name:16s} brier={np.mean((pc - y) ** 2):.4f}  logloss={-np.mean(y * np.log(pc) + (1 - y) * np.log(1 - pc)):.4f}  n={len(y)}")
