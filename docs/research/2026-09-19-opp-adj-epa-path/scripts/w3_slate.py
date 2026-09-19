"""W3 2026 slate: blended opponent-adjusted EPA margin projections vs market.

Blend (pre-stated, DAVE-style): rating = w*obs2026 + (1-w)*obs2025,
w = games26/(games26+8). Scale fit on FULL 2025 (forward model): margin = a*score + b,
score = (net_home - net_away) + 2.0 (HFA 2.0 pts). Research artifact, NOT picks.
"""
import numpy as np
import pandas as pd

tge = pd.read_csv("data/team_game_efficiency_prod.csv")
tge = tge[tge.seasonType == "REG"].copy()
sched = pd.read_csv("data/schedules.csv")

def adjusted_ratings(rows, iters=100):
    lg_off = np.average(rows.offEpaPerPlay, weights=rows.plays)
    lg_def = np.average(rows.defEpaPerPlay, weights=rows.plays)
    teams = sorted(rows.team.unique())
    by = {t: rows[rows.team == t] for t in teams}
    adj_off = {t: by[t].offEpaPerPlay.mean() for t in teams}
    adj_def = {t: by[t].defEpaPerPlay.mean() for t in teams}
    for _ in range(iters):
        no, nd = {}, {}
        for t in teams:
            g = by[t]
            no[t] = np.average(g.offEpaPerPlay - (g.opponent.map(adj_def) - lg_def), weights=g.plays)
            nd[t] = np.average(g.defEpaPerPlay - (g.opponent.map(adj_off) - lg_off), weights=g.plays)
        adj_off, adj_def = no, nd
    return pd.DataFrame({"off": adj_off, "def": adj_def,
                         "n": pd.Series({t: len(by[t]) for t in teams})})

r25 = adjusted_ratings(tge[tge.season == 2025])
r26 = adjusted_ratings(tge[tge.season == 2026])
n26 = r26.n.reindex(r25.index).fillna(0)
w = n26 / (n26 + 8.0)
blend = pd.DataFrame({
    "off": w * r26.off.reindex(r25.index).fillna(r25.off) + (1 - w) * r25.off,
    "def": w * r26["def"].reindex(r25.index).fillna(r25["def"]) + (1 - w) * r25["def"],
    "w26": w,
})
blend["net"] = blend.off - blend["def"]

# scale fit on full 2025 (forward model convention, stated)
s25 = sched[(sched.season == 2025) & (sched.game_type == "REG")].dropna(subset=["spread_line"]).copy()
s25["margin"] = s25.home_score - s25.away_score
def net_diff(r, h, a):
    return ((r.loc[h, "off"] - r.loc[h, "def"]) - (r.loc[a, "off"] - r.loc[a, "def"]))
sc = np.array([net_diff(r25, r.home_team, r.away_team) + 2.0 for r in s25.itertuples()])
A = np.vstack([sc, np.ones(len(sc))]).T
a_fit, b_fit = np.linalg.lstsq(A, s25.margin.values, rcond=None)[0]
resid_sd = float(np.std(s25.margin.values - (a_fit * sc + b_fit), ddof=1))

wk3 = sched[(sched.season == 2026) & (sched.week == 3)].copy()
rows = []
for r in wk3.itertuples():
    if r.home_team not in blend.index or r.away_team not in blend.index:
        continue
    nd = net_diff(blend, r.home_team, r.away_team) + 2.0
    pred = a_fit * nd + b_fit
    sd_line = r.spread_line if pd.notna(r.spread_line) else np.nan
    rows.append({
        "game": f"{r.away_team} @ {r.home_team}", "gameday": r.gameday,
        "model_margin_home": round(pred, 1),
        "market_spread_home(fav+)": sd_line,
        "edge_vs_market": round(pred + sd_line, 1) if pd.notna(sd_line) else np.nan,
        "p_win_model": round(1 / (1 + np.exp(-pred / resid_sd)), 3),
        "net_home": round(blend.loc[r.home_team, "net"], 4),
        "net_away": round(blend.loc[r.away_team, "net"], 4),
    })
slate = pd.DataFrame(rows).sort_values("edge_vs_market", ascending=False,
                                       key=lambda s: s.abs().mul(-1))
slate = slate.reindex(slate.edge_vs_market.abs().sort_values(ascending=False).index)
print(f"scale: a={a_fit:.2f} pts per EPA/play net-diff, b={b_fit:.2f}, resid_sd={resid_sd:.2f}")
print("\n=== 2026 WEEK 3: blended adjusted-EPA margin vs market (research, NOT picks) ===")
print(slate.to_string(index=False))
slate.to_csv("data/w3_2026_slate_model_vs_market.csv", index=False)

print("\n=== blended net ratings (top 8 / bottom 5) ===")
print(blend.sort_values("net", ascending=False).round(4).head(8).to_string())
print(blend.sort_values("net", ascending=False).tail(5).round(4).to_string())
blend.to_csv("data/ratings_blend_2026_w2.csv")
print("saved data/w3_2026_slate_model_vs_market.csv + data/ratings_blend_2026_w2.csv")
