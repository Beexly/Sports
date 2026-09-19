"""Regenerate the W3 slate artifact with CORRECT edge arithmetic.

The first-pass CSV computed edge_vs_market with a sign error (model - market on a
column pair whose conventions differ). Correct, pre-stated conventions:
- model_margin_home: signed home margin projection (positive = home wins by N).
- market_spread_home: schedule spread_line (POSITIVE = home favored; verified
  empirically, Spearman +0.489 vs home margin on 2025, n=272).
- edge_home_view = model_margin_home - market_spread_home (positive = model likes
  the HOME side more than the market does).
- p_win_model: Normal CDF of model margin at sd 13.5 (stated approximation).
Reruns the blend + projection exactly as w3_slate.py and rewrites the CSV in the
research dir of the Sports worktree.
"""
import numpy as np
import pandas as pd
from scipy.stats import norm

DATA = "data"
OUT = "/c/Users/Garrett/Sports-oppadj/docs/research/2026-09-19-opp-adj-epa-path/data"

tge = pd.read_csv(f"{DATA}/team_game_efficiency_prod.csv")
tge = tge[tge.seasonType == "REG"]


def iterative_adj(train):
    teams = sorted(set(train.team) | set(train.opponent))
    off = {t: train.loc[train.team == t, "offEpaPerPlay"].mean() for t in teams}
    d = {t: train.loc[train.team == t, "defEpaPerPlay"].mean() for t in teams}
    lg_off = train.offEpaPerPlay.mean()
    lg_def = train.defEpaPerPlay.mean()
    for _ in range(100):
        no, nd = {}, {}
        for t in teams:
            rows = train[train.team == t]
            no[t] = (rows.offEpaPerPlay - (rows.opponent.map(d) - lg_def)).mean()
            nd[t] = (rows.defEpaPerPlay - (rows.opponent.map(off) - lg_off)).mean()
        off, d = no, nd
    return off, d


sched = pd.read_csv(f"{DATA}/schedules.csv", low_memory=False)

# 2025 full-season ratings (forward prior) + 2026 partial (blend w = games/(games+8))
off25, def25 = iterative_adj(tge[tge.season == 2025])
t26 = tge[tge.season == 2026]
off26, def26 = iterative_adj(t26)
g26 = t26.groupby("team").size()

rows = []
for t in sorted(set(off25) | set(off26)):
    w = g26.get(t, 0) / (g26.get(t, 0) + 8)
    o = w * off26.get(t, off25[t]) + (1 - w) * off25[t]
    dv = w * def26.get(t, def25[t]) + (1 - w) * def25[t]
    rows.append({"team": t, "off": o, "def": dv, "w26": round(w, 4), "net": o - dv})
blend = pd.DataFrame(rows).set_index("team")

# scale on full 2025 (forward convention, stated)
s25 = sched[(sched.season == 2025) & (sched.game_type == "REG")].dropna(
    subset=["spread_line"]).copy()
s25["margin"] = s25.home_score - s25.away_score


def net_diff(h, a):
    return ((blend.loc[h, "off"] - blend.loc[h, "def"])
            - (blend.loc[a, "off"] - blend.loc[a, "def"]))


sc = np.array([net_diff(r.home_team, r.away_team) + 2.0 for r in s25.itertuples()])
A = np.vstack([sc, np.ones(len(sc))]).T
a_fit, b_fit = np.linalg.lstsq(A, s25.margin.values, rcond=None)[0]
print(f"scale a={a_fit:.2f} pts/EPA, effective HFA={a_fit * 2.0 + b_fit:.2f} pts")

w3 = sched[(sched.season == 2026) & (sched.week == 3)].copy()
out = []
for r in w3.itertuples():
    if r.home_team not in blend.index or r.away_team not in blend.index:
        continue
    score = net_diff(r.home_team, r.away_team) + 2.0
    m = a_fit * score + b_fit
    sp = r.spread_line if pd.notna(r.spread_line) else np.nan
    out.append({
        "game": f"{r.away_team} @ {r.home_team}",
        "gameday": r.gameday,
        "model_margin_home": round(m, 1),
        "market_spread_home_fav_pos": None if pd.isna(sp) else round(sp, 1),
        # POSITIVE edge = model likes the HOME side more than the market
        "edge_home_view": None if pd.isna(sp) else round(m - sp, 1),
        "p_win_model": round(float(norm.cdf(m / 13.5)), 3),
        "net_home": round(net_diff(r.home_team, r.away_team), 4),
        "net_away": round(net_diff(r.away_team, r.home_team), 4),
    })
df = pd.DataFrame(out)
df.to_csv(f"{DATA}/w3_2026_slate_fixed.csv", index=False)
df.to_csv(f"{OUT}/w3_2026_slate_model_vs_market.csv", index=False)
print(df.to_string(index=False))
print("rewrote", f"{OUT}/w3_2026_slate_model_vs_market.csv")
