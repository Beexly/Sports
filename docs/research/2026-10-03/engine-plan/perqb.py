"""Per-QB EPA/dropback (16-game rolling, keyed by passer_player_id) re-measured against the de-vigged close.
Walk-forward: fit on seasons < T, test on T in {2022..2025, 2026 W1-4}. Also vs Elo (the original claim's baseline).
Caveat: starter = games.csv home_qb_id/away_qb_id (the actual starter); pre-kick that is the announced starter, so leak is small but nonzero."""
import io, contextlib, runpy, collections, random, json
import numpy as np, pandas as pd
with contextlib.redirect_stdout(io.StringIO()):
    B = runpy.run_path('baseline.py')
recs = {r['game_id']: r for r in B['recs']}
games = pd.read_csv('games.csv', low_memory=False); games = games[games.season >= 2018]
cols = ['game_id','season','week','game_date','passer_player_id','qb_dropback','qb_epa','posteam']
pbp = pd.concat([pd.read_parquet(f'pbp/play_by_play_{y}.parquet', columns=cols) for y in range(2018, 2027)])
pbp = pbp[(pbp.qb_dropback == 1) & pbp.passer_player_id.notna() & pbp.qb_epa.notna()]
pg = pbp.groupby(['passer_player_id','game_id','game_date']).agg(db=('qb_epa','size'), epa=('qb_epa','sum')).reset_index()
pg = pg.sort_values('game_date')
hist = collections.defaultdict(list)  # qb -> list of (date, db, epa)
for r in pg.itertuples(): hist[r.passer_player_id].append((r.game_date, r.db, r.epa))
PRIOR_MEAN, PRIOR_N = -0.05, 150.0
def qb_rating(qb, date):
    h = [x for x in hist.get(qb, []) if x[0] < date][-16:]
    db = sum(x[1] for x in h); epa = sum(x[2] for x in h)
    return (epa + PRIOR_MEAN*PRIOR_N) / (db + PRIOR_N)
rows = []
for g in games.itertuples():
    r = recs.get(g.game_id)
    if r is None or r['y'] is None or r['q'] is None or pd.isna(g.home_qb_id) or pd.isna(g.away_qb_id): continue
    x = qb_rating(g.home_qb_id, g.gameday) - qb_rating(g.away_qb_id, g.gameday)
    rows.append(dict(game_id=g.game_id, season=int(g.season), week=int(g.week), y=r['y'], q=r['q'], elo=r['p_elo'], x=x))
df = pd.DataFrame(rows); print('rows', len(df), df.groupby('season').size().to_dict())
def lg(p): p = np.clip(p, 1e-6, 1-1e-6); return np.log(p/(1-p))
def fit(X, y):
    X = np.column_stack([np.ones(len(X)), X]); w = np.zeros(X.shape[1])
    for _ in range(60):
        p = 1/(1+np.exp(-X@w)); H = X.T@(X*(p*(1-p))[:,None]); w += np.linalg.solve(H + 1e-9*np.eye(len(w)), X.T@(y-p))
    p = 1/(1+np.exp(-X@w)); H = X.T@(X*(p*(1-p))[:,None]); return w, np.sqrt(np.diag(np.linalg.inv(H)))
def pred(w, X): X = np.column_stack([np.ones(len(X)), X]); return 1/(1+np.exp(-X@w))
def ll(p, y): p = np.clip(p,1e-6,1-1e-6); return float(-np.mean(y*np.log(p)+(1-y)*np.log(1-p)))
def br(p, y): return float(np.mean((p-y)**2))
out = []
print(f"{'T':5} {'n':>4} | elo ll  elo+qb ll | close ll  close+qb ll  c_qb(95%CI)       | placebo frac<=real")
random.seed(11)
for T in (2022, 2023, 2024, 2025, 2026):
    tr, te = df[(df.season >= 2019) & (df.season < T)], df[df.season == T]
    ytr, yte = tr.y.values.astype(float), te.y.values.astype(float)
    we, _ = fit(lg(tr.elo.values)[:,None], ytr); wex, _ = fit(np.column_stack([lg(tr.elo.values), tr.x.values]), ytr)
    wc, _ = fit(lg(tr.q.values)[:,None], ytr); wcx, se = fit(np.column_stack([lg(tr.q.values), tr.x.values]), ytr)
    l_e = ll(pred(we, lg(te.elo.values)[:,None]), yte); l_ex = ll(pred(wex, np.column_stack([lg(te.elo.values), te.x.values])), yte)
    l_c = ll(te.q.values, yte); l_cr = ll(pred(wc, lg(te.q.values)[:,None]), yte)
    p_cx = pred(wcx, np.column_stack([lg(te.q.values), te.x.values])); l_cx = ll(p_cx, yte)
    # placebo: shuffle x within (season, week) in train+test, refit, compare test ll
    pls = []
    for _ in range(200):
        d2 = df[(df.season >= 2019) & (df.season <= T)].copy()
        d2['x'] = d2.groupby(['season','week']).x.transform(lambda s: np.random.permutation(s.values))
        t2, e2 = d2[d2.season < T], d2[d2.season == T]
        w2, _ = fit(np.column_stack([lg(t2.q.values), t2.x.values]), t2.y.values.astype(float))
        pls.append(ll(pred(w2, np.column_stack([lg(e2.q.values), e2.x.values])), e2.y.values.astype(float)))
    frac = float(np.mean(np.array(pls) <= l_cx))
    out.append(dict(T=T, n=len(te), elo=l_e, elo_qb=l_ex, close_raw=l_c, close_recal=l_cr, close_qb=l_cx,
                    c_qb=float(wcx[2]), ci=[float(wcx[2]-1.96*se[2]), float(wcx[2]+1.96*se[2])], placebo_frac=frac,
                    brier_close=br(te.q.values, yte), brier_close_qb=br(p_cx, yte)))
    print(f"{T:5} {len(te):4} | {l_e:.4f} {l_ex:.4f}   | {l_c:.4f}   {l_cx:.4f}     {wcx[2]:+.3f} [{wcx[2]-1.96*se[2]:+.3f},{wcx[2]+1.96*se[2]:+.3f}] | {frac:.3f}")
tot = pd.DataFrame(out); w = tot.n
print(f"pooled n={w.sum()}: elo {np.average(tot.elo,weights=w):.4f} -> elo+qb {np.average(tot.elo_qb,weights=w):.4f} | close {np.average(tot.close_raw,weights=w):.4f} -> close+qb {np.average(tot.close_qb,weights=w):.4f}")
json.dump(out, open('perqb_vs_close.json','w'), indent=1)
