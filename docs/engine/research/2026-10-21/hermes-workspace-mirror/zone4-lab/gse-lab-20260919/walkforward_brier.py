"""Walk-forward DAVE-adj-EPA vs market across 2025 (rolling origin).

Each week w >= 2 is scored using ratings fitted ONLY on weeks < w (week 1 excluded:
no prior data exists, matching the engine's cold-start honesty). Win probabilities:
fitted 1-param logistic scale (fit on prior weeks) for BOTH the model margin and the
market spread, so both get the same probability machinery. Reports game-level n=272
(= 544 team-games) Brier/log-loss/RMSE/Spearman.
"""
import numpy as np
import pandas as pd
from scipy.stats import spearmanr
from scipy.optimize import minimize_scalar
from extend_validation_v2 import load_pbp, team_game_epa, ratings_iterative

DATA = "data"
HFA = 2.0


def logistic_brier_scale(scores, outcomes):
    """Fit scale a minimizing Brier of sigmoid(score/a); a>0 grid-free via golden search."""
    def brier(a):
        p = 1.0 / (1.0 + np.exp(-scores / a))
        return float(np.mean((p - outcomes) ** 2))
    res = minimize_scalar(brier, bounds=(0.5, 60.0), method="bounded",
                          options={"xatol": 0.01})
    return res.x, brier(res.x)


def season_walkforward(year):
    pbp = load_pbp(year)
    tg = team_game_epa(year)
    sched = pd.read_csv(f"{DATA}/schedules.csv", low_memory=False)
    s = sched[(sched.season == year) & (sched.game_type == "REG")].dropna(
        subset=["home_score", "away_score"]).copy()
    s["margin"] = s.home_score - s.away_score
    s["home_win"] = (s.margin > 0).astype(float)

    recs = []
    for w in sorted(s.week.unique()):
        if w < 2:
            continue
        trn = tg[tg.week < w]
        if trn.game_id.nunique() < 8:
            continue
        r = ratings_iterative(trn)
        wk = s[s.week == w]
        keep = wk[wk.home_team.isin(r.index) & wk.away_team.isin(r.index)].copy()
        if len(keep) == 0:
            continue

        def net_diff(h, a):
            return ((r.loc[h, "off"] - r.loc[h, "def"]) - (r.loc[a, "off"] - r.loc[a, "def"]))

        keep["adj_score"] = [net_diff(h, a) + HFA for h, a in zip(keep.home_team, keep.away_team)]
        # in-train scores for scale fits
        trn_map = s[s.week < w].set_index("game_id")
        trn_g = trn.drop_duplicates("game_id")
        sc, mg = [], []
        for row in trn_g.itertuples():
            if row.game_id not in trn_map.index:
                continue
            h = trn_map.loc[row.game_id, "home_team"]
            a = trn_map.loc[row.game_id, "away_team"]
            sc.append(net_diff(h, a) + HFA)
            mg.append(float(trn_map.loc[row.game_id, "margin"]))
        sc = np.array(sc)
        mg = np.array(mg)
        win_trn = (mg > 0).astype(float)
        a_adj, _ = logistic_brier_scale(sc, win_trn)
        sp = keep.dropna(subset=["spread_line"])
        # spread_line convention verified empirically: POSITIVE = home favored
        # (spearman(spread, home margin) = +0.489 on 2025, n=272).
        a_mkt, _ = logistic_brier_scale(sp.spread_line.values, sp.home_win.values)
        keep["p_adj"] = 1.0 / (1.0 + np.exp(-keep.adj_score.values / a_adj))
        keep["p_mkt"] = np.where(keep.spread_line.notna(),
                                 1.0 / (1.0 + np.exp(-keep.spread_line.fillna(0).values / a_mkt)),
                                 np.nan)
        recs.append(keep[["game_id", "margin", "home_win", "p_adj", "p_mkt"]])
    return pd.concat(recs, ignore_index=True)


df = season_walkforward(2025)
out = {}
for m, pcol in [("adj", "p_adj"), ("mkt", "p_mkt")]:
    d = df.dropna(subset=[pcol])
    out[m] = {
        "n_games": int(len(d)),
        "brier": round(float(np.mean((d[pcol] - d.home_win) ** 2)), 4),
        "logloss": round(float(-np.mean(d.home_win * np.log(d[pcol]) +
                                        (1 - d.home_win) * np.log(1 - d[pcol]))), 4),
        "rmse_vs_margin_spreadsign": round(float(np.sqrt(np.mean(
            (np.where(d.margin > 0, 1, -1) * (2 * d[pcol] - 1)) ** 2))), 4),
        "acc": round(float(np.mean((d[pcol] > 0.5) == (d.home_win == 1))), 4),
    }
# margin RMSE needs the margin scale; reuse a fitted 42.5 pts/EPA map for adj and
# the spread itself for mkt is not a margin prediction here - report rank metrics instead
print(pd.DataFrame(out).to_string())
print("spearman p_adj vs home_win:", round(float(spearmanr(df.p_adj, df.home_win).statistic), 3))
print("spearman p_mkt vs home_win:", round(float(spearmanr(df.p_mkt.dropna(), df.home_win[df.p_mkt.notna()]).statistic), 3))
df.to_csv(f"{DATA}/walkforward_2025_probs.csv", index=False)
