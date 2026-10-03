"""Walk-forward test of v0 vs v1 families (market offset and independent). Paired game-block bootstrap CI."""
import os, json, numpy as np, pandas as pd
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = pd.read_parquet(os.path.join(R, 'eng', 'features_v1.parquet'))
S = F[F.y.notna()].copy(); S['y'] = S.y.astype(float); S['qb_act'] = S.qb_act.fillna(S.qb_pit)
S['av_tot'] = S[['av_OL', 'av_SKILL', 'av_FRONT', 'av_DB']].sum(axis=1)
def fit(X, y, off, lam, icpt):
    mu, sd = X.mean(0), X.std(0) + 1e-9; Z = (X - mu) / sd
    if icpt: Z = np.column_stack([np.ones(len(X)), Z])
    w = np.zeros(Z.shape[1]); Rm = lam * np.eye(Z.shape[1])
    if icpt: Rm[0, 0] = 1e-6
    for _ in range(60):
        p = 1 / (1 + np.exp(-(off + Z @ w))); g = Z.T @ (p - y) + Rm @ w; H = (Z * (p * (1 - p))[:, None]).T @ Z + Rm
        w -= np.linalg.solve(H, g)
    return w, mu, sd, icpt
def pred(m, X, off):
    w, mu, sd, icpt = m; Z = (X - mu) / sd
    if icpt: Z = np.column_stack([np.ones(len(X)), Z])
    return 1 / (1 + np.exp(-(off + Z @ w)))
def ll(p, y): p = np.clip(p, 1e-6, 1 - 1e-6); return -(y * np.log(p) + (1 - y) * np.log(1 - p))
LAMS = [1, 3, 10, 30, 100, 300, 1000, 3000]
TESTS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]
def run(feats, offset, icpt):
    out = []
    for T in TESTS:
        tr, te = S[S.season < T], S[S.season == T]
        a, b = tr[tr.season < T - 1], tr[tr.season == T - 1]
        o = (lambda d: d.mkt.values) if offset else (lambda d: np.zeros(len(d)))
        X = lambda d: d[feats].values.astype(float)
        lam = min(LAMS, key=lambda l: ll(pred(fit(X(a), a.y.values, o(a), l, icpt), X(b), o(b)), b.y.values).mean())
        m = fit(X(tr), tr.y.values, o(tr), lam, icpt)
        out.append(pd.DataFrame(dict(game_id=te.game_id.values, season=T, y=te.y.values, p=pred(m, X(te), o(te)), q=te.q.values)))
    return pd.concat(out)
V = {
 'v0  offset  icpt+qb_act+elo_res+av_tot': (['qb_act', 'elo_res', 'av_tot'], True, True),
 'v0p offset  icpt+qb_PIT+elo_res+av_tot': (['qb_pit', 'elo_res', 'av_tot'], True, True),
 'v1a offset  home_flag+qb_PIT+elo_res': (['home_flag', 'qb_pit', 'elo_res'], True, False),
 'v1b offset  v1a+avail groups+Q': (['home_flag', 'qb_pit', 'elo_res', 'av_OL', 'av_SKILL', 'av_FRONT', 'av_DB', 'av_Q'], True, False),
 'v1c offset  v1a+av_tot': (['home_flag', 'qb_pit', 'elo_res', 'av_tot'], True, False),
 'ind elo+qb_act': (['elo', 'qb_act'], False, True),
 'ind elo+qb_PIT': (['elo', 'qb_pit'], False, True),
 'ind elo+qb_PIT+avail groups+Q': (['elo', 'qb_pit', 'av_OL', 'av_SKILL', 'av_FRONT', 'av_DB', 'av_Q'], False, True),
}
res, P = {}, {}
for k, (f, off, ic) in V.items():
    d = run(f, off, ic); P[k] = d
    d['l'] = ll(d.p.values, d.y.values); d['lc'] = ll(d.q.values, d.y.values)
    res[k] = dict(n=len(d), ll=round(d.l.mean(), 4), close=round(d.lc.mean(), 4), by=d.groupby('season').l.mean().round(4).to_dict())
    print(f'{k:42s} n={len(d)} ll {d.l.mean():.4f}  close {d.lc.mean():.4f}  Δ {d.l.mean()-d.lc.mean():+.4f}', flush=True)
rng = np.random.default_rng(7)
def boot(a, b, n=2000):
    dd = (a - b); idx = rng.integers(0, len(dd), (n, len(dd))); m = dd[idx].mean(1); return float(np.percentile(m, 2.5)), float(np.percentile(m, 97.5))
base = P['v1a offset  home_flag+qb_PIT+elo_res']
for k in ('v1b offset  v1a+avail groups+Q', 'v1c offset  v1a+av_tot'):
    lo, hi = boot(P[k].l.values, base.l.values); res[k]['ci_vs_v1a'] = [round(lo, 5), round(hi, 5)]; print(k, 'Δ vs v1a 95% CI', round(lo, 5), round(hi, 5))
for k in ('v1a offset  home_flag+qb_PIT+elo_res', 'v1b offset  v1a+avail groups+Q'):
    lo, hi = boot(P[k].l.values, P[k].lc.values); res[k]['ci_vs_close'] = [round(lo, 5), round(hi, 5)]; print(k, 'Δ vs close 95% CI', round(lo, 5), round(hi, 5))
lo, hi = boot(P['ind elo+qb_PIT'].l.values, P['ind elo+qb_act'].l.values); print('PIT vs actual-starter QB (indep) Δ CI', round(lo, 5), round(hi, 5))
json.dump(res, open(os.path.join(R, 'eng', 'test_v1_results.json'), 'w'), indent=1)
