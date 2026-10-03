"""GSE engine v1 backend test: multi-signal walk-forward, NFL 2019-2026 W1-4.
Signals (all as-of, strictly before gameday): market close (one signal among many), Elo, per-QB EPA16,
team rolling off/def EPA (pass, rush), success rate, pressure (sack+qb_hit) allowed/generated, PROE, explosive rate,
rest diff, div game, dome, wind, temp. L2 logistic; lambda picked on season T-1 only, then refit on all < T.
Reports: independent engine (no market), full engine (market + signals), close alone."""
import io, contextlib, runpy, collections, json
import numpy as np, pandas as pd
with contextlib.redirect_stdout(io.StringIO()):
    P = runpy.run_path('perqb.py')
df_qb = P['df'].set_index('game_id')
recs = P['recs']
cols = ['game_id','season','week','game_date','posteam','defteam','epa','success','pass','rush','sack','qb_hit','pass_oe','yards_gained','play_type','qb_dropback']
pbp = pd.concat([pd.read_parquet(f'pbp/play_by_play_{y}.parquet', columns=cols) for y in range(2018, 2027)])
pbp = pbp[pbp.play_type.isin(['pass','run']) & pbp.epa.notna() & pbp.posteam.notna()]
pbp['press'] = ((pbp.sack == 1) | (pbp.qb_hit == 1)).astype(float) * (pbp.qb_dropback == 1)
pbp['expl'] = (((pbp['pass'] == 1) & (pbp.yards_gained >= 20)) | ((pbp.rush == 1) & (pbp.yards_gained >= 10))).astype(float)
pbp['pepa'] = np.where(pbp['pass'] == 1, pbp.epa, np.nan); pbp['repa'] = np.where(pbp.rush == 1, pbp.epa, np.nan)
off = pbp.groupby(['posteam','game_id','game_date']).agg(o_epa=('epa','mean'), o_pepa=('pepa','mean'), o_repa=('repa','mean'),
      o_sr=('success','mean'), o_press=('press','mean'), o_proe=('pass_oe','mean'), o_expl=('expl','mean')).reset_index().rename(columns={'posteam':'team'})
dfn = pbp.groupby(['defteam','game_id','game_date']).agg(d_epa=('epa','mean'), d_pepa=('pepa','mean'), d_repa=('repa','mean'),
      d_sr=('success','mean'), d_press=('press','mean'), d_expl=('expl','mean')).reset_index().rename(columns={'defteam':'team'})
tg = off.merge(dfn, on=['team','game_id','game_date']).sort_values('game_date')
FEATS = ['o_epa','o_pepa','o_repa','o_sr','o_press','o_proe','o_expl','d_epa','d_pepa','d_repa','d_sr','d_press','d_expl']
hist = {t: g.reset_index(drop=True) for t, g in tg.groupby('team')}
def team_form(team, date, k=10):
    h = hist.get(team)
    if h is None: return None
    h = h[h.game_date < date].tail(k)
    if len(h) < 3: return None
    w = np.linspace(0.5, 1.0, len(h))  # recency weight
    return {f: float(np.nansum(h[f].values * w) / np.sum(w * ~np.isnan(h[f].values))) if np.any(~np.isnan(h[f].values)) else 0.0 for f in FEATS}
g = pd.read_csv('games.csv', low_memory=False); g = g[(g.season >= 2019) & (g.game_type.isin(['REG','WC','DIV','CON','SB']))]
rows = []
for r in g.itertuples():
    rec = recs.get(r.game_id)
    if rec is None: continue
    fh, fa = team_form(r.home_team, r.gameday), team_form(r.away_team, r.gameday)
    if fh is None or fa is None: continue
    x = {}
    for f in FEATS: x['h_'+f] = fh[f]; x['a_'+f] = fa[f]
    # matchup terms: home offense vs away defense and vice versa
    x['m_pass'] = fh['o_pepa'] + fa['d_pepa'] - fa['o_pepa'] - fh['d_pepa']
    x['m_rush'] = fh['o_repa'] + fa['d_repa'] - fa['o_repa'] - fh['d_repa']
    x['m_press'] = (fa['d_press'] - fh['o_press']) - (fh['d_press'] - fa['o_press'])
    x['qb'] = float(df_qb.x.get(r.game_id, 0.0)) if r.game_id in df_qb.index else 0.0
    x['elo'] = np.log(rec['p_elo']/(1-rec['p_elo']))
    x['rest'] = (r.home_rest - r.away_rest) if pd.notna(r.home_rest) else 0.0
    x['div'] = float(r.div_game == 1); x['dome'] = float(r.roof in ('dome','closed'))
    x['wind'] = float(r.wind) if pd.notna(r.wind) else 0.0; x['temp'] = float(r.temp) if pd.notna(r.temp) else 65.0
    x['neutral'] = float(r.location == 'Neutral')
    q = rec['q']; x['mkt'] = np.log(q/(1-q)) if q else np.nan
    rows.append(dict(game_id=r.game_id, season=int(r.season), week=int(r.week), y=rec['y'], q=q, played=rec['played'], **x))
D = pd.DataFrame(rows)
IND = [c for c in D.columns if c not in ('game_id','season','week','y','q','played','mkt')]
FULL = IND + ['mkt']
def ridge_fit(X, y, lam):
    mu, sd = X.mean(0), X.std(0) + 1e-9; Z = (X - mu) / sd; Z = np.column_stack([np.ones(len(Z)), Z]); w = np.zeros(Z.shape[1])
    R = lam * np.eye(Z.shape[1]); R[0, 0] = 0
    for _ in range(60):
        p = 1/(1+np.exp(-Z@w)); H = Z.T@(Z*(p*(1-p))[:,None]) + R; w += np.linalg.solve(H, Z.T@(y-p) - R@w)
    return w, mu, sd
def ridge_pred(m, X):
    w, mu, sd = m; Z = np.column_stack([np.ones(len(X)), (X-mu)/sd]); return 1/(1+np.exp(-Z@w))
def ll(p, y): p = np.clip(p,1e-6,1-1e-6); return float(-np.mean(y*np.log(p)+(1-y)*np.log(1-p)))
def br(p, y): return float(np.mean((p-y)**2))
def ece(p, y):
    b = np.minimum((p*10).astype(int), 9); return float(sum(abs(p[b==i].mean()-y[b==i].mean())*(b==i).sum() for i in range(10) if (b==i).any())/len(p))
S = D[D.y.notna() & D.q.notna()].copy(); S['y'] = S.y.astype(float)
LAMS = [1, 3, 10, 30, 100, 300]
res = []
print(f"{'T':5} {'n':>4} | indep ll  brier  ece   | full ll  brier  ece   | close ll  brier  ece  | lam_i lam_f")
for T in (2022, 2023, 2024, 2025, 2026):
    tr, te = S[S.season < T], S[S.season == T]
    pick = {}
    for name, F in (('ind', IND), ('full', FULL)):
        best = None
        for lam in LAMS:  # select on T-1 using fit on < T-1
            a, b = tr[tr.season < T-1], tr[tr.season == T-1]
            m = ridge_fit(a[F].values, a.y.values, lam); s = ll(ridge_pred(m, b[F].values), b.y.values)
            if best is None or s < best[0]: best = (s, lam)
        pick[name] = best[1]
    mi = ridge_fit(tr[IND].values, tr.y.values, pick['ind']); mf = ridge_fit(tr[FULL].values, tr.y.values, pick['full'])
    pi, pf, pc, y = ridge_pred(mi, te[IND].values), ridge_pred(mf, te[FULL].values), te.q.values, te.y.values
    r = dict(T=T, n=len(te), ind=(ll(pi,y), br(pi,y), ece(pi,y)), full=(ll(pf,y), br(pf,y), ece(pf,y)), close=(ll(pc,y), br(pc,y), ece(pc,y)), lam=pick)
    res.append(r)
    print(f"{T:5} {len(te):4} | {r['ind'][0]:.4f} {r['ind'][1]:.4f} {r['ind'][2]:.3f} | {r['full'][0]:.4f} {r['full'][1]:.4f} {r['full'][2]:.3f} | {r['close'][0]:.4f} {r['close'][1]:.4f} {r['close'][2]:.3f} | {pick['ind']} {pick['full']}")
n = np.array([r['n'] for r in res])
for k in ('ind', 'full', 'close'):
    print(f"pooled {k:5}: ll {np.average([r[k][0] for r in res], weights=n):.4f}  brier {np.average([r[k][1] for r in res], weights=n):.4f}")
# ablation on 2022-2026 pooled (independent engine): drop each signal family
FAM = {'qb': ['qb'], 'elo': ['elo'], 'team_form': [c for c in IND if c.startswith(('h_','a_'))], 'matchup': ['m_pass','m_rush','m_press'],
       'situational': ['rest','div','dome','wind','temp','neutral']}
print('\nablation, independent engine, pooled 2022-2026 test ll (higher = family mattered):')
base = np.average([r['ind'][0] for r in res], weights=n); abl = {}
for fam, cs in FAM.items():
    F = [c for c in IND if c not in cs]; lls = []
    for T in (2022, 2023, 2024, 2025, 2026):
        tr, te = S[S.season < T], S[S.season == T]
        m = ridge_fit(tr[F].values, tr.y.values, res[[2022,2023,2024,2025,2026].index(T)]['lam']['ind'])
        lls.append(ll(ridge_pred(m, te[F].values), te.y.values))
    abl[fam] = float(np.average(lls, weights=n)) - base
    print(f"  drop {fam:12}: Δll {abl[fam]:+.4f}")
json.dump(dict(results=res, ablation=abl, features=IND), open('engine_v1_results.json', 'w'), indent=1, default=float)
D.to_parquet('engine_v1_features.parquet')
