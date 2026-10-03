"""Go-live engine form test: market as a fixed offset, signals learn only deviations (heavily shrunk).
logit p = logit(q) + a + sum w_i z_i ; L2 on w; lambda chosen on T-1 only. Compares feature sets."""
import numpy as np, pandas as pd, json
D = pd.read_parquet('engine_v1_features.parquet'); S = D[D.y.notna() & D.q.notna()].copy(); S['y'] = S.y.astype(float)
S['elo_res'] = S.elo - S.mkt
def fit(X, y, off, lam):
    mu, sd = X.mean(0), X.std(0)+1e-9; Z = np.column_stack([np.ones(len(X)), (X-mu)/sd]); w = np.zeros(Z.shape[1])
    R = lam*np.eye(Z.shape[1]); R[0,0] = lam  # shrink intercept too
    for _ in range(50):
        p = 1/(1+np.exp(-(off+Z@w))); H = Z.T@(Z*(p*(1-p))[:,None])+R; w += np.linalg.solve(H, Z.T@(y-p)-R@w)
    return w, mu, sd
def pred(m, X, off): w, mu, sd = m; Z = np.column_stack([np.ones(len(X)), (X-mu)/sd]); return 1/(1+np.exp(-(off+Z@w)))
def ll(p, y): p = np.clip(p,1e-6,1-1e-6); return float(-np.mean(y*np.log(p)+(1-y)*np.log(1-p)))
IND = [c for c in json.load(open('engine_v1_results.json'))['features']]
SETS = {'qb': ['qb'], 'qb+elo_res': ['qb','elo_res'], 'qb+elo_res+rest': ['qb','elo_res','rest'], 'all33': [c for c in IND if c != 'elo'] + ['elo_res']}
LAMS = [10, 30, 100, 300, 1000, 3000]
out = {}
for name, F in SETS.items():
    tot, totc, n = 0, 0, 0; per = []
    for T in (2022, 2023, 2024, 2025, 2026):
        tr, te = S[S.season < T], S[S.season == T]
        a, b = tr[tr.season < T-1], tr[tr.season == T-1]
        lam = min(LAMS, key=lambda l: ll(pred(fit(a[F].values, a.y.values, a.mkt.values, l), b[F].values, b.mkt.values), b.y.values))
        m = fit(tr[F].values, tr.y.values, tr.mkt.values, lam)
        p = pred(m, te[F].values, te.mkt.values); l1, lc = ll(p, te.y.values), ll(te.q.values, te.y.values)
        per.append((T, len(te), round(l1,4), round(lc,4), lam)); tot += l1*len(te); totc += lc*len(te); n += len(te)
    out[name] = dict(per=per, pooled=tot/n, close=totc/n)
    print(f"{name:18} pooled ll {tot/n:.4f} vs close {totc/n:.4f}  Δ {tot/n-totc/n:+.4f} | {per}")
json.dump(out, open('offset_engine_results.json','w'), indent=1)
