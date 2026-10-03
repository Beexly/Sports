"""Point-in-time QB completion residual from nflverse pbp.

Corpus: docs/engine/research/2026-10-02/corpus-deep/deep/c02/work/a04-completion-model.md
Paper arXiv:2109.08051 states P(C)=sum_i P(C|T=i)P(T=i) on tracking frames.
That identity is not buildable here: no target x/y. This file codes the pbp
substitute that note names: complete_pass minus the league completion rate in
the same air_yards bin, pooled over the prior three seasons, prior weeks only.
Not NGS cp/cpoe. Not actual starters. Feature is home PIT passer minus away.
Null if the passer has fewer than 30 prior attempts in the pool.
"""
import os, json, glob
import numpy as np
import pandas as pd

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = os.path.join(R, "eng")

def air_bin(a):
    if not np.isfinite(a):
        return -1
    if a < 0:
        return 0
    if a <= 5:
        return 1
    if a <= 10:
        return 2
    if a <= 15:
        return 3
    if a <= 20:
        return 4
    return 5

parts = []
for f in sorted(glob.glob(os.path.join(R, "lake", "nflverse", "pbp", "play_by_play_*.parquet"))):
    p = pd.read_parquet(f, columns=["season", "week", "passer_player_id", "pass_attempt", "complete_pass", "air_yards"])
    p = p[(p.pass_attempt == 1) & p.passer_player_id.notna() & p.air_yards.notna() & p.complete_pass.notna()]
    p["bin"] = p.air_yards.map(air_bin).astype(int)
    p = p[p["bin"] >= 0]
    p["comp"] = p.complete_pass.astype(int)
    g = p.groupby(["season", "week", "passer_player_id", "bin"], as_index=False).agg(n=("comp", "size"), c=("comp", "sum"))
    parts.append(g)
    print("loaded", os.path.basename(f), len(g), flush=True)
A = pd.concat(parts, ignore_index=True)
A["season"] = A.season.astype(int)
A["week"] = A.week.astype(int)

F = pd.read_parquet(os.path.join(PY, "features_v1.parquet"))
C = pd.read_parquet(os.path.join(PY, "corpus_features.parquet"))
keys = F[["season", "week"]].drop_duplicates()
# index aggregates by season for fast slices
by_season = {int(s): df for s, df in A.groupby("season")}

def pool(season, week):
    frames = []
    for s in (season - 2, season - 1, season):
        df = by_season.get(s)
        if df is None:
            continue
        if s == season:
            df = df[df.week < week]
        frames.append(df)
    if not frames:
        return None
    return pd.concat(frames, ignore_index=True)

rate = {}
for season, week in keys.itertuples(index=False):
    season, week = int(season), int(week)
    P = pool(season, week)
    if P is None or P.n.sum() < 100:
        continue
    league = P.groupby("bin").agg(n=("n", "sum"), c=("c", "sum"))
    league["r"] = league.c / league.n
    qb = P.groupby(["passer_player_id", "bin"], as_index=False).agg(n=("n", "sum"), c=("c", "sum"))
    qb = qb.merge(league[["r"]], left_on="bin", right_index=True, how="left")
    qb["exp"] = qb.n * qb.r
    tot = qb.groupby("passer_player_id").agg(n=("n", "sum"), c=("c", "sum"), exp=("exp", "sum"))
    tot = tot[tot.n >= 30]
    for pid, row in tot.iterrows():
        rate[(season, week, pid)] = float((row.c - row.exp) / row.n)

rows = []
for r in F.itertuples(index=False):
    h = rate.get((int(r.season), int(r.week), r.h_qb), np.nan)
    a = rate.get((int(r.season), int(r.week), r.a_qb), np.nan)
    rows.append(dict(game_id=r.game_id, qb_air_cpoe=(h - a) if pd.notna(h) and pd.notna(a) else np.nan))
Q = pd.DataFrame(rows)
Q.to_parquet(os.path.join(PY, "qb_air_cpoe.parquet"), index=False)
print("coverage", round(float(Q.qb_air_cpoe.notna().mean()), 4), flush=True)

M = F.merge(C, on="game_id").merge(Q, on="game_id")
S = M[M.y.notna()].copy()
S["y"] = S.y.astype(float)
for c in ["stress", "int_rate", "int_hit", "qb_air_cpoe"]:
    S[c] = S[c].fillna(0.0)

def fit(X, y, off, lam):
    mu, sd = X.mean(0), X.std(0) + 1e-9
    Z = (X - mu) / sd
    w = np.zeros(Z.shape[1])
    Rm = lam * np.eye(Z.shape[1])
    for _ in range(60):
        p = 1 / (1 + np.exp(-(off + Z @ w)))
        g = Z.T @ (p - y) + Rm @ w
        H = (Z * (p * (1 - p))[:, None]).T @ Z + Rm
        w -= np.linalg.solve(H, g)
    return w, mu, sd

def pred(m, X, off):
    w, mu, sd = m
    return 1 / (1 + np.exp(-(off + ((X - mu) / sd) @ w)))

def ll(p, y):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return -(y * np.log(p) + (1 - y) * np.log(1 - p))

def brier(p, y):
    return (p - y) ** 2

LAMS = [1, 3, 10, 30, 100, 300, 1000, 3000]
TESTS = list(range(2019, 2027))
base = ["home_flag", "qb_pit", "elo_res"]
champ = base + ["stress", "int_rate", "int_hit"]
families = {
    "v1a": base,
    "champion_stress_int": champ,
    "champion_plus_air_cpoe": champ + ["qb_air_cpoe"],
}
stored = {}
res = {}
for name, feats in families.items():
    parts_out = []
    for T in TESTS:
        tr, te = S[S.season < T], S[S.season == T]
        if len(te) < 20 or len(tr) < 200:
            continue
        a, b = tr[tr.season < T - 1], tr[tr.season == T - 1]
        if len(b) < 20:
            b = tr.tail(200)
            a = tr.iloc[:-200]
        def X(d, f=feats):
            return d[f].values.astype(float)
        lam = min(LAMS, key=lambda l: ll(pred(fit(X(a), a.y.values, a.mkt.values, l), X(b), b.mkt.values), b.y.values).mean())
        m = fit(X(tr), tr.y.values, tr.mkt.values, lam)
        p = pred(m, X(te), te.mkt.values)
        parts_out.append(pd.DataFrame(dict(game_id=te.game_id.values, season=T, y=te.y.values, p=p, l=ll(p, te.y.values), b=brier(p, te.y.values))))
        print(name, T, "lam", lam, flush=True)
    D = pd.concat(parts_out, ignore_index=True)
    stored[name] = D
    res[name] = dict(n=int(len(D)), ll=round(float(D.l.mean()), 6), brier=round(float(D.b.mean()), 6))
    print(name, res[name], flush=True)

rng = np.random.default_rng(7)
def boot(a, b, n=2000):
    dd = a - b
    idx = rng.integers(0, len(dd), (n, len(dd)))
    m = dd[idx].mean(1)
    return float(np.percentile(m, 2.5)), float(np.percentile(m, 97.5))

ch = stored["champion_stress_int"].sort_values("game_id")
nw = stored["champion_plus_air_cpoe"].sort_values("game_id")
assert list(ch.game_id) == list(nw.game_id)
lo, hi = boot(nw.l.values, ch.l.values)
res["delta_ll_vs_champion"] = round(float(nw.l.mean() - ch.l.mean()), 6)
res["ci95_ll_vs_champion"] = [round(lo, 6), round(hi, 6)]
blo, bhi = boot(nw.b.values, ch.b.values)
res["delta_brier_vs_champion"] = round(float(nw.b.mean() - ch.b.mean()), 6)
res["ci95_brier_vs_champion"] = [round(blo, 6), round(bhi, 6)]
res["definition"] = {
    "formula": "(completions - sum(n_bin * league_rate_bin)) / n_attempts",
    "bins": "air_yards <0, 0-5, 6-10, 11-15, 16-20, 21+",
    "pool": "seasons T-2, T-1, and weeks < W of T",
    "min_n": 30,
    "starters": "features_v1 h_qb/a_qb point-in-time, not actual",
    "paper": "arXiv:2109.08051 tracking identity not coded; pbp air-yard substitute from c02/work/a04",
    "champion": "home_flag + qb_pit + elo_res + stress + int_rate + int_hit",
}
json.dump(res, open(os.path.join(PY, "qb_air_cpoe_results.json"), "w"), indent=1)
print(json.dumps(res, indent=1))
