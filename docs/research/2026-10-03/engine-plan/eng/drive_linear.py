"""Prior-week team mean of the verified drive-state line.

Source: docs/engine/research/2026-10-02/corpus-deep/deep/c08/laneE-features.md
finding 7, citing docs/engine/research/2026-09-13/symbolic-regression/REPORT_BOTTLENECK.md.
Formula stated there: 0.2007*ydstogo - 0.0446*yardline_100.
That report scored drive outcomes, not game winners. This file does not reuse its AUC.
Feature is home minus away, mean of the line on prior offensive plays, three-season pool,
weeks before the game only. Null if either side has fewer than 30 such plays.
"""
import os, json, glob
import numpy as np
import pandas as pd

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = os.path.join(R, "eng")
A_COEF, B_COEF = 0.2007, 0.0446

parts = []
for f in sorted(glob.glob(os.path.join(R, "lake", "nflverse", "pbp", "play_by_play_*.parquet"))):
    p = pd.read_parquet(f, columns=["season", "week", "posteam", "down", "ydstogo", "yardline_100"])
    p = p[p.posteam.notna() & p.down.between(1, 4) & p.ydstogo.notna() & p.yardline_100.notna()]
    p["z"] = A_COEF * p.ydstogo - B_COEF * p.yardline_100
    g = p.groupby(["season", "week", "posteam"], as_index=False).agg(n=("z", "size"), s=("z", "sum"))
    parts.append(g)
    print("loaded", os.path.basename(f), len(g), flush=True)
A = pd.concat(parts, ignore_index=True)
A["season"] = A.season.astype(int)
A["week"] = A.week.astype(int)
by = {t: df.sort_values(["season", "week"]) for t, df in A.groupby("posteam")}

F = pd.read_parquet(os.path.join(PY, "features_v1.parquet"))
need = F[["season", "week"]].drop_duplicates()
rate = {}
for season, week in need.itertuples(index=False):
    season, week = int(season), int(week)
    for team, df in by.items():
        prior = df[((df.season == season) & (df.week < week)) | ((df.season < season) & (df.season >= season - 2))]
        n = prior.n.sum()
        rate[(season, week, team)] = float(prior.s.sum() / n) if n >= 30 else np.nan

rows = []
for r in F.itertuples(index=False):
    h = rate.get((int(r.season), int(r.week), r.home), np.nan)
    a = rate.get((int(r.season), int(r.week), r.away), np.nan)
    rows.append(dict(game_id=r.game_id, drive_linear=(h - a) if pd.notna(h) and pd.notna(a) else np.nan))
Q = pd.DataFrame(rows)
Q.to_parquet(os.path.join(PY, "drive_linear.parquet"), index=False)
print("coverage", round(float(Q.drive_linear.notna().mean()), 4), flush=True)

C = pd.read_parquet(os.path.join(PY, "corpus_features.parquet"))
Air = pd.read_parquet(os.path.join(PY, "qb_air_cpoe.parquet"))
M = F.merge(C, on="game_id").merge(Air, on="game_id").merge(Q, on="game_id")
S = M[M.y.notna()].copy()
S["y"] = S.y.astype(float)
for c in ["stress", "int_rate", "int_hit", "qb_air_cpoe", "drive_linear"]:
    S[c] = S[c].fillna(0.0)

def fit(X, y, off, lam):
    mu, sd = X.mean(0), X.std(0) + 1e-9
    Z = (X - mu) / sd
    w = np.zeros(Z.shape[1])
    Rm = lam * np.eye(Z.shape[1])
    for _ in range(40):
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

LAMS = [1, 3, 10, 30, 100, 300, 1000, 3000]
base = ["home_flag", "qb_pit", "elo_res", "stress", "int_rate", "int_hit", "qb_air_cpoe"]
families = {"current": base, "current_plus_drive": base + ["drive_linear"]}
stored = {}
res = {}
for name, feats in families.items():
    parts_out = []
    for T in range(2019, 2027):
        tr, te = S[S.season < T], S[S.season == T]
        if len(te) < 20 or len(tr) < 200:
            continue
        a, b = tr[tr.season < T - 1], tr[tr.season == T - 1]
        if len(b) < 20:
            b, a = tr.tail(200), tr.iloc[:-200]
        def X(d, f=feats):
            return d[f].values.astype(float)
        lam = min(LAMS, key=lambda l: ll(pred(fit(X(a), a.y.values, a.mkt.values, l), X(b), b.mkt.values), b.y.values).mean())
        m = fit(X(tr), tr.y.values, tr.mkt.values, lam)
        p = pred(m, X(te), te.mkt.values)
        parts_out.append(pd.DataFrame(dict(game_id=te.game_id.values, l=ll(p, te.y.values), b=(p - te.y.values) ** 2)))
        print(name, T, lam, flush=True)
    D = pd.concat(parts_out, ignore_index=True)
    stored[name] = D
    res[name] = dict(n=int(len(D)), ll=round(float(D.l.mean()), 6), brier=round(float(D.b.mean()), 6))
    print(name, res[name], flush=True)

rng = np.random.default_rng(7)
cur, nw = stored["current"].sort_values("game_id"), stored["current_plus_drive"].sort_values("game_id")
assert list(cur.game_id) == list(nw.game_id)
dd = nw.l.values - cur.l.values
idx = rng.integers(0, len(dd), (2000, len(dd)))
m = dd[idx].mean(1)
res["delta_ll"] = round(float(dd.mean()), 6)
res["ci95"] = [round(float(np.percentile(m, 2.5)), 6), round(float(np.percentile(m, 97.5)), 6)]
res["formula"] = "0.2007*ydstogo - 0.0446*yardline_100, home mean minus away mean, prior weeks"
json.dump(res, open(os.path.join(PY, "drive_linear_results.json"), "w"), indent=1)
print(json.dumps(res, indent=1))
