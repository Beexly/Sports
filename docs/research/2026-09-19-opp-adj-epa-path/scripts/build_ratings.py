"""Opponent-adjusted EPA ratings + pre-registered train/test validation.

PRE-REGISTRATION (written before running the evaluation):
- Train: 2025 REG weeks 1-8. Test: 2025 REG weeks 9-18. No test-row information
  enters the fit (adjustment + margin scale both fit on train only).
- Methods: RAW (unadjusted team means), ADJ (iterative offense<->defense
  adjustment, repo algorithm), ADJW (same but play-weighted), MKT (market
  spread_line, context baseline, not fit).
- Margin model: pred = a * net_diff + b, (a, b) least squares on train
  predictions vs actual margins. HFA enters through net_diff construction
  (home team net + HFA_H, fit on train). MKT evaluated as -spread_line (i.e.
  home favored positive) with the same scale fit.
- Kill line: ADJ fails unless it beats RAW on test RMSE by >= 0.2 points AND
  ties-or-beats RAW on Spearman. Honest null reported otherwise.
"""
import itertools
import json

import numpy as np
import pandas as pd

RNG_SEED = 20260919
HFA_GUESS = 2.0

tge = pd.read_csv("data/team_game_efficiency_prod.csv")
tge = tge[tge.seasonType == "REG"].copy()

sched = pd.read_csv("data/schedules.csv")
sched = sched[(sched.season == 2025) & (sched.game_type == "REG")].copy()
sched["margin"] = sched.home_score - sched.away_score

# ---- ratings helpers -------------------------------------------------------

def raw_ratings(rows):
    g = rows.groupby("team")
    return (pd.DataFrame({
        "off": g.offEpaPerPlay.mean(), "def": g.defEpaPerPlay.mean(),
        "n": g.size()}))

def adjusted_ratings(rows, iters=100, weighted=False):
    """Repo algorithm (GSE2/opponent-adjusted.ts), optionally play-weighted."""
    lg_off = np.average(rows.offEpaPerPlay, weights=rows.plays if weighted else None)
    lg_def = np.average(rows.defEpaPerPlay, weights=rows.plays if weighted else None)
    teams = sorted(rows.team.unique())
    by = {t: rows[rows.team == t] for t in teams}
    adj_off = {t: by[t].offEpaPerPlay.mean() for t in teams}
    adj_def = {t: by[t].defEpaPerPlay.mean() for t in teams}
    for _ in range(iters):
        no, nd = {}, {}
        for t in teams:
            g = by[t]
            w = g.plays.values if weighted else None
            no[t] = np.average(g.offEpaPerPlay - (g.opponent.map(adj_def) - lg_def), weights=w)
            nd[t] = np.average(g.defEpaPerPlay - (g.opponent.map(adj_off) - lg_off), weights=w)
        adj_off, adj_def = no, nd
    return pd.DataFrame({"off": adj_off, "def": adj_def,
                         "n": pd.Series({t: len(by[t]) for t in teams})})

def net_diff(ratings, home, away):
    return ((ratings.loc[home, "off"] - ratings.loc[home, "def"])
            - (ratings.loc[away, "off"] - ratings.loc[away, "def"]))

# ---- train/test ------------------------------------------------------------

train = tge[tge.week <= 8]
test = sched[(sched.week >= 9)]

ratings_raw = raw_ratings(train)
ratings_adj = adjusted_ratings(train, weighted=False)
ratings_adjw = adjusted_ratings(train, weighted=True)

def fit_scale(scores, margins):
    A = np.vstack([scores, np.ones(len(scores))]).T
    a, b = np.linalg.lstsq(A, margins, rcond=None)[0]
    return a, b

def evaluate(name, score_fn, ratings=None, market=False):
    if market:
        tr = sched[sched.week <= 8]
        tr_scores = -tr.spread_line  # home-favored positive
        te_scores = -test.spread_line
    else:
        tr = sched[sched.week <= 8]
        tr_scores = [score_fn(ratings, r.home_team, r.away_team) + HFA_GUESS
                     for r in tr.itertuples()]
        te_scores = [score_fn(ratings, r.home_team, r.away_team) + HFA_GUESS
                     for r in test.itertuples()]
    tr_margins = tr.margin.values
    a, b = fit_scale(np.array(tr_scores), tr_margins)
    te_pred = a * np.array(te_scores) + b
    rmse = float(np.sqrt(np.mean((te_pred - test.margin.values) ** 2)))
    mae = float(np.mean(np.abs(te_pred - test.margin.values)))
    from scipy.stats import spearmanr
    rho = float(spearmanr(te_pred, test.margin.values).statistic)
    # win prob via normal cdf on fitted residual sd (train), log-loss on test
    resid = tr_margins - (a * np.array(tr_scores) + b)
    sd = float(np.std(resid, ddof=1))
    p_home = 1 / (1 + np.exp(-(te_pred - test.margin.values) / sd))  # placeholder
    p_win = np.array([1 / (1 + np.exp(-(m - 0) / sd)) for m in te_pred])
    y = (test.margin.values > 0).astype(float)
    ties = test.margin.values == 0
    keep = ~ties
    ll = float(-np.mean(y[keep] * np.log(p_win[keep]) + (1 - y[keep]) * np.log(1 - p_win[keep])))
    brier = float(np.mean((p_win[keep] - y[keep]) ** 2))
    acc = float(np.mean((te_pred[keep] > 0) == (y[keep] > 0)))
    return {"method": name, "test_n": int(keep.sum()), "rmse": round(rmse, 3),
            "mae": round(mae, 3), "spearman": round(rho, 3),
            "logloss": round(ll, 4), "brier": round(brier, 4), "acc": round(acc, 3),
            "scale_a": round(a, 2), "resid_sd": round(sd, 2)}

results = [
    evaluate("RAW", net_diff, ratings_raw),
    evaluate("ADJ", net_diff, ratings_adj),
    evaluate("ADJW", net_diff, ratings_adjw),
    evaluate("MKT", None, market=True),
]
print("=== 2025 W1-8 train -> W9-18 test ===")
res_df = pd.DataFrame(results)
print(res_df.to_string(index=False))

res_df.to_csv("data/validation_opponent_adjustment.csv", index=False)

# ---- full-season current ratings (deliverable) -----------------------------
for tag, rt in [("adj_2025_full", adjusted_ratings(tge[tge.season == 2025], weighted=True)),
                ("adj_2026_w1_2", adjusted_ratings(tge[tge.season == 2026], weighted=True))]:
    rt = rt.copy()
    rt["overall"] = rt.off - rt["def"]
    rt.sort_values("overall", ascending=False).to_csv(f"data/ratings_{tag}.csv")

print("\n=== opponent-adjusted 2025 full-season (top/bottom 5 by net) ===")
rt = adjusted_ratings(tge[tge.season == 2025], weighted=True)
rt["overall"] = rt.off - rt["def"]
print(rt.sort_values("overall", ascending=False).head(5).round(4).to_string())
print(rt.sort_values("overall", ascending=False).tail(5).round(4).to_string())
print("\nsaved data/validation_opponent_adjustment.csv + ratings_*.csv")
