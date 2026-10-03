"""W4 2026 live champion: market offset + per-QB EPA16 + Elo residual + snap-weighted injury availability.
Training: 2019-2026 W1-3 (walk-forward lambda chosen on 2025). Injuries: nflverse 2018-2025 + nfl.com (Alexandria) 2026 W1-4.
Writes w4_champion.json with p, q, deviation, per-family contributions and a readable trace per game. No Neon writes."""
import json, glob, numpy as np, pandas as pd
inj_hist = pd.concat([pd.read_parquet(f) for f in sorted(glob.glob('lake/nflverse/injuries_*.parquet'))])
inj_hist = inj_hist[inj_hist.report_status.isin(['Out', 'Doubtful'])][['season', 'week', 'team', 'gsis_id', 'full_name', 'position']]
rows = []
for w in (1, 2, 3, 4):
    d = json.load(open(f'lake/alexandria/nfl_injury_2026_w{w}.json' if w < 4 else '.firecrawl/nfl_injury_2026_w4.json'))['data']['alexandria'][0]['data']
    for r in d['reports']:
        if (r.get('injury_status') or '').upper() in ('OUT', 'DOUBTFUL'):
            rows.append(dict(season=2026, week=w, team=r['team']['abbreviation'], gsis_id=r['player']['gsis_id'], full_name=r['player']['display_name'], position=r['player']['position']))
inj26 = pd.DataFrame(rows); inj26['team'] = inj26.team.replace({'AZ': 'ARI', 'LAR': 'LA', 'JAC': 'JAX', 'WSH': 'WAS'})
inj = pd.concat([inj_hist, inj26]); inj = inj[inj.position != 'QB']
snap = pd.concat([pd.read_parquet(f) for f in sorted(glob.glob('lake/nflverse/snap_counts_*.parquet'))])
snap = snap[snap.game_type == 'REG'].sort_values(['pfr_player_id', 'season', 'week'])
pl = pd.read_parquet('lake/nflverse/players.parquet')
idc = 'pfr_id' if 'pfr_id' in pl.columns else [c for c in pl.columns if 'pfr' in c][0]
gs = 'gsis_id' if 'gsis_id' in pl.columns else [c for c in pl.columns if 'gsis' in c][0]
snap = snap.merge(pl[[gs, idc]].dropna().rename(columns={gs: 'gsis_id', idc: 'pfr_player_id'}), on='pfr_player_id', how='left')
snap['t'] = (snap.season * 100 + snap.week).astype('int64')
for c in ('offense_pct', 'defense_pct'): snap[c + '_p4'] = snap.groupby('pfr_player_id')[c].transform(lambda s: s.rolling(4, min_periods=1).mean())
sn = snap.dropna(subset=['gsis_id'])[['gsis_id', 't', 'offense_pct_p4', 'defense_pct_p4']].sort_values('t')
inj = inj.dropna(subset=['gsis_id']).copy(); inj['t'] = (inj.season * 100 + inj.week).astype('int64'); inj['tl'] = (inj.t - 1).astype('int64')
x = pd.merge_asof(inj.sort_values('tl'), sn.rename(columns={'t': 'tl'}).sort_values('tl'), on='tl', by='gsis_id', direction='backward')
x = x[(x.t - x.tl) < 200]
team = x.groupby(['season', 'week', 'team']).agg(off_out=('offense_pct_p4', lambda s: s.fillna(0).sum()), def_out=('defense_pct_p4', lambda s: s.fillna(0).sum())).reset_index()
names = x.assign(share=x[['offense_pct_p4', 'defense_pct_p4']].max(axis=1)).sort_values('share', ascending=False)
D = pd.read_parquet('engine_v1_features.parquet'); D['week'] = D.week.astype(int)
D['away'] = D.game_id.str.split('_').str[2]; D['home'] = D.game_id.str.split('_').str[3]
for side in ('home', 'away'):
    D = D.merge(team.rename(columns={'team': side, 'off_out': f'{side}_off_out', 'def_out': f'{side}_def_out'}), on=['season', 'week', side], how='left')
for c in ('home_off_out', 'home_def_out', 'away_off_out', 'away_def_out'): D[c] = D[c].fillna(0)
D['inj_off'] = D.home_off_out - D.away_off_out; D['inj_def'] = D.home_def_out - D.away_def_out; D['elo_res'] = D.elo - D.mkt
F = ['qb', 'elo_res', 'inj_off', 'inj_def']
def fit(X, y, off, lam):
    mu, sd = X.mean(0), X.std(0) + 1e-9; Z = np.column_stack([np.ones(len(X)), (X - mu) / sd]); w = np.zeros(Z.shape[1]); R = lam * np.eye(Z.shape[1]); R[0, 0] = 1e-6
    for _ in range(50):
        p = 1 / (1 + np.exp(-(off + Z @ w))); g = Z.T @ (p - y) + R @ w; Hh = Z.T @ (Z * (p * (1 - p))[:, None]) + R; w -= np.linalg.solve(Hh, g)
    return w, mu, sd
def pred(m, X, off): w, mu, sd = m; return 1 / (1 + np.exp(-(off + np.column_stack([np.ones(len(X)), (X - mu) / sd]) @ w)))
def ll(p, y): p = np.clip(p, 1e-6, 1 - 1e-6); return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
S = D[D.y.notna() & D.q.notna() & D.played.astype(bool)].copy(); S['y'] = S.y.astype(float)
S = S[(S.season >= 2019) & ~((S.season == 2026) & (S.week >= 4))]
a, b = S[S.season <= 2024], S[S.season == 2025]
lam = min([10, 30, 100, 300, 1000, 3000], key=lambda l: ll(pred(fit(a[F].values, a.y.values, a.mkt.values, l), b[F].values, b.mkt.values), b.y.values))
m = fit(S[F].values, S.y.values, S.mkt.values, lam); w, mu, sd = m
U = D[(D.season == 2026) & (D.week == 4) & ~D.played.astype(bool) & D.q.notna()].copy()
U['p'] = pred(m, U[F].values, U.mkt.values)
out = []
for _, g in U.iterrows():
    contrib = {f: round(float(w[i + 1] * (g[f] - mu[i]) / sd[i]), 4) for i, f in enumerate(F)}
    def outs(t): return [f"{r.full_name} ({r.position}, {r.share:.0%} snaps)" for r in names[(names.season == 2026) & (names.week == 4) & (names.team == t)].head(5).itertuples() if r.share == r.share]
    out.append(dict(game_id=g.game_id, home=g.home, away=g.away, p_home=round(float(g.p), 4), q_home_market=round(float(g.q), 4),
                    deviation=round(float(g.p - g.q), 4), logit_contrib=contrib, home_out=outs(g.home), away_out=outs(g.away),
                    trace=f"Market {g.q:.3f}. Engine {g.p:.3f}. Drivers (logit): " + ', '.join(f'{k} {v:+.3f}' for k, v in sorted(contrib.items(), key=lambda kv: -abs(kv[1])))))
json.dump(dict(model='offset(mkt)+qb+elo_res+inj_off+inj_def', lam=lam, n_train=len(S), coefs=dict(zip(['intercept'] + F, [round(float(v), 4) for v in w])),
               note='Lane 0 champion. Refresh injuries/lines Sunday morning and re-mint before kickoff.', games=out), open('w4_champion.json', 'w'), indent=1)
print('lam', lam, 'n_train', len(S), 'coefs', dict(zip(['b0'] + F, np.round(w, 4))))
for o in sorted(out, key=lambda o: -abs(o['deviation'])): print(f"{o['game_id']:18} p {o['p_home']:.3f} q {o['q_home_market']:.3f} dev {o['deviation']:+.3f} | {', '.join(o['home_out'][:2])} || {', '.join(o['away_out'][:2])}")
