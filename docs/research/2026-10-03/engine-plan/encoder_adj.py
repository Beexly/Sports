"""Encoder test (Lane 12 seed): opponent-adjusted team ratings learned from every play, vs the raw rolling features that failed.
Each week, ridge-fit EPA/play ~ offense team + defense team + home (separately for dropbacks and runs) on all plays before that week
(current + previous season, exponential recency decay, half-life 8 weeks). Game features: net adjusted pass and rush edge.
Walk-forward test 2022-2026 W1-3 in the independent engine and in the market-offset engine."""
import numpy as np, pandas as pd, glob, json
cols = ['season', 'week', 'game_id', 'posteam', 'defteam', 'home_team', 'epa', 'pass', 'rush', 'season_type']
P = pd.concat([pd.read_parquet(f, columns=cols) for f in sorted(glob.glob('pbp/play_by_play_*.parquet')) if int(f[-12:-8]) >= 2017])
P = P[(P.season_type == 'REG') & P.epa.notna() & P.posteam.notna() & ((P['pass'] == 1) | (P['rush'] == 1))].copy()
fix = {'OAK': 'LV', 'SD': 'LAC', 'STL': 'LA', 'LAR': 'LA'}
for c in ('posteam', 'defteam', 'home_team'): P[c] = P[c].replace(fix)
teams = sorted(set(P.posteam)); ix = {t: i for i, t in enumerate(teams)}; T = len(teams)
P['o'] = P.posteam.map(ix); P['d'] = P.defteam.map(ix); P['h'] = (P.posteam == P.home_team).astype(float)
P['t'] = P.season * 100 + P.week; P['kind'] = np.where(P['pass'] == 1, 'p', 'r')
def fit(sub, cutoff_season, cutoff_week, lam=60.0):
    age = (cutoff_season - sub.season) * 18 + (cutoff_week - sub.week)            # weeks before cutoff
    w = 0.5 ** (age.values / 8.0)
    n = len(sub); A = np.zeros((n, 2 * T + 2)); r = np.arange(n)
    A[r, sub.o.values] = 1; A[r, T + sub.d.values] = 1; A[:, 2 * T] = sub.h.values; A[:, 2 * T + 1] = 1
    R = lam * np.eye(2 * T + 2); R[-1, -1] = R[-2, -2] = 1e-6
    Aw = A * w[:, None]; beta = np.linalg.solve(A.T @ Aw + R, Aw.T @ sub.epa.values)
    return beta[:T], beta[T:2 * T]                                                   # offense (+ good), defense allowed (+ bad)
rat = {}
for s in range(2019, 2027):
    for wk in range(1, 19):
        cut = s * 100 + wk
        prev = P[(P.t < cut) & (P.season >= s - 1)]
        if len(prev) < 5000: continue
        for kind in ('p', 'r'):
            sub = prev[prev.kind == kind]; o, d = fit(sub, s, wk)
            rat[(s, wk, kind)] = (o, d)
        if s == 2026 and wk > 4: break
D = pd.read_parquet('engine_v1_features.parquet'); D['week'] = D.week.astype(int)
D['away'] = D.game_id.str.split('_').str[2].replace(fix); D['home'] = D.game_id.str.split('_').str[3].replace(fix)
def feat(r, kind):
    k = (int(r.season), int(r.week), kind)
    if k not in rat or r.home not in ix or r.away not in ix: return np.nan
    o, d = rat[k]; h, a = ix[r.home], ix[r.away]
    return (o[h] + d[a]) - (o[a] + d[h])                                              # home expected EPA/play edge
D['adj_pass'] = D.apply(lambda r: feat(r, 'p'), axis=1); D['adj_rush'] = D.apply(lambda r: feat(r, 'r'), axis=1)
D['elo_res'] = D.elo - D.mkt
inj = json.load(open('injury_signal_results.json'))   # for reference only
def fitlog(X, y, off, lam):
    mu, sd = X.mean(0), X.std(0) + 1e-9; Z = np.column_stack([np.ones(len(X)), (X - mu) / sd]); w = np.zeros(Z.shape[1]); R = lam * np.eye(Z.shape[1]); R[0, 0] = 1e-6
    for _ in range(50):
        p = 1 / (1 + np.exp(-(off + Z @ w))); g = Z.T @ (p - y) + R @ w; H = Z.T @ (Z * (p * (1 - p))[:, None]) + R; w -= np.linalg.solve(H, g)
    return w, mu, sd
def pred(m, X, off): w, mu, sd = m; return 1 / (1 + np.exp(-(off + np.column_stack([np.ones(len(X)), (X - mu) / sd]) @ w)))
def ll(p, y): p = np.clip(p, 1e-6, 1 - 1e-6); return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
S = D[D.y.notna() & D.q.notna() & D.played.astype(bool) & D.adj_pass.notna()].copy(); S['y'] = S.y.astype(float)
LAMS = [1, 3, 10, 30, 100, 300, 1000, 3000]
def run(F, offset):
    out = []
    for T_ in (2022, 2023, 2024, 2025, 2026):
        tr, te = S[(S.season < T_) & (S.season >= 2019)], S[S.season == T_]
        a, b = tr[tr.season < T_ - 1], tr[tr.season == T_ - 1]
        o = (lambda d: d.mkt.values) if offset else (lambda d: np.zeros(len(d)))
        lam = min(LAMS, key=lambda l: ll(pred(fitlog(a[F].values, a.y.values, o(a), l), b[F].values, o(b)), b.y.values))
        m = fitlog(tr[F].values, tr.y.values, o(tr), lam); out.append((T_, len(te), ll(pred(m, te[F].values, o(te)), te.y.values)))
    n = sum(x[1] for x in out); return round(sum(x[1] * x[2] for x in out) / n, 4), out
res = {}
close = round(float(np.average([ll(S[S.season == T_].q.values, S[S.season == T_].y.values) for T_ in (2022, 2023, 2024, 2025, 2026)], weights=[(S.season == T_).sum() for T_ in (2022, 2023, 2024, 2025, 2026)])), 4)
for name, F, off in [('indep elo+qb', ['elo', 'qb'], False), ('indep elo+qb+adj', ['elo', 'qb', 'adj_pass', 'adj_rush'], False),
                     ('indep qb+adj (no elo)', ['qb', 'adj_pass', 'adj_rush'], False), ('indep adj only', ['adj_pass', 'adj_rush'], False),
                     ('offset qb+elo_res', ['qb', 'elo_res'], True), ('offset qb+elo_res+adj', ['qb', 'elo_res', 'adj_pass', 'adj_rush'], True)]:
    res[name] = run(F, off); print(f'{name:26} pooled ll {res[name][0]}  (close {close})  ' + ' '.join(f'{t}:{l:.4f}' for t, n, l in res[name][1]))
json.dump(dict(results=res, close=close, n=len(S)), open('encoder_adj_results.json', 'w'), indent=1)
