"""Outside-the-box-score test: injury-report availability weighted by each player's prior snap share.
nflverse injuries (report_status Out/Doubtful) x snap_counts (mean offense/defense pct over the player's prior 4 games).
Walk-forward 2022-2025 test (injuries file stops at 2025). Independent engine and market-offset engine, with/without."""
import numpy as np, pandas as pd, glob, json
inj = pd.concat([pd.read_parquet(f) for f in sorted(glob.glob('lake/nflverse/injuries_*.parquet'))])
snap = pd.concat([pd.read_parquet(f) for f in sorted(glob.glob('lake/nflverse/snap_counts_*.parquet'))])
inj = inj[inj.game_type == 'REG'] if 'game_type' in inj else inj
inj = inj[inj.report_status.isin(['Out', 'Doubtful'])]
snap = snap[snap.game_type == 'REG'].sort_values(['pfr_player_id', 'season', 'week'])
for c in ('offense_pct', 'defense_pct'):
    snap[c + '_prior4'] = snap.groupby('pfr_player_id')[c].transform(lambda s: s.shift(1).rolling(4, min_periods=1).mean())
# injuries carry gsis_id; snap_counts carry pfr_player_id -> map with players table
pl = pd.read_parquet('lake/nflverse/players.parquet')
idc = 'pfr_id' if 'pfr_id' in pl.columns else [c for c in pl.columns if 'pfr' in c][0]
gs = 'gsis_id' if 'gsis_id' in pl.columns else [c for c in pl.columns if 'gsis' in c][0]
m = pl[[gs, idc]].dropna().rename(columns={gs: 'gsis_id', idc: 'pfr_player_id'})
snap = snap.merge(m, on='pfr_player_id', how='left')
# as-of: each injured player's snap share over his last 4 games BEFORE the report week (he does not play the week he is out)
snap['t'] = snap.season * 100 + snap.week; inj['t'] = (inj.season * 100 + inj.week).astype('int64'); snap['t'] = snap.t.astype('int64')
for c in ('offense_pct', 'defense_pct'):
    snap[c + '_prior4'] = snap.groupby('pfr_player_id')[c].transform(lambda s: s.rolling(4, min_periods=1).mean())
sn = snap.dropna(subset=['gsis_id'])[['gsis_id', 't', 'offense_pct_prior4', 'defense_pct_prior4']].sort_values('t')
inj = inj.dropna(subset=['gsis_id']).sort_values('t'); inj['t_lookup'] = (inj.t - 1).astype('int64')
x = pd.merge_asof(inj.sort_values('t_lookup'), sn.rename(columns={'t': 't_lookup'}).sort_values('t_lookup'), on='t_lookup', by='gsis_id', direction='backward')
x = x[(x.t - x.t_lookup) < 200]
x = x[x.position != 'QB']  # QB is its own family
team = x.groupby(['season', 'week', 'team']).agg(off_out=('offense_pct_prior4', lambda s: s.fillna(0).sum()),
                                                  def_out=('defense_pct_prior4', lambda s: s.fillna(0).sum())).reset_index()
print('injury rows Out/Doubtful', len(inj), 'matched to snaps', x.offense_pct_prior4.notna().mean().round(3))
D = pd.read_parquet('engine_v1_features.parquet')
D['week'] = D.week.astype(int); D['away'] = D.game_id.str.split('_').str[2]; D['home'] = D.game_id.str.split('_').str[3]
team['team'] = team.team.replace({'LA': 'LA', 'LAR': 'LA', 'OAK': 'LV', 'SD': 'LAC', 'STL': 'LA'})
for side in ('home', 'away'):
    t = team.rename(columns={'team': side, 'off_out': f'{side}_off_out', 'def_out': f'{side}_def_out'})
    D = D.merge(t, on=['season', 'week', side], how='left')
for c in ('home_off_out', 'home_def_out', 'away_off_out', 'away_def_out'): D[c] = D[c].fillna(0)
D['inj_off'] = D.home_off_out - D.away_off_out; D['inj_def'] = D.home_def_out - D.away_def_out
S = D[D.y.notna() & D.q.notna() & (D.season <= 2025)].copy(); S['y'] = S.y.astype(float); S['elo_res'] = S.elo - S.mkt
def fit(X, y, off, lam):
    mu, sd = X.mean(0), X.std(0) + 1e-9; Z = np.column_stack([np.ones(len(X)), (X - mu) / sd]); w = np.zeros(Z.shape[1]); R = lam * np.eye(Z.shape[1])
    for _ in range(50):
        p = 1 / (1 + np.exp(-(off + Z @ w))); H = Z.T @ (Z * (p * (1 - p))[:, None]) + R; w += np.linalg.solve(H, Z.T @ (y - p) - R @ w)
    return w, mu, sd
def pred(mm, X, off): w, mu, sd = mm; Z = np.column_stack([np.ones(len(X)), (X - mu) / sd]); return 1 / (1 + np.exp(-(off + Z @ w)))
def ll(p, y): p = np.clip(p, 1e-6, 1 - 1e-6); return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
LAMS = [1, 3, 10, 30, 100, 300, 1000, 3000]
def run(F, offset):
    tot, n, coefs = 0, 0, []
    for T in (2022, 2023, 2024, 2025):
        tr, te = S[S.season < T], S[S.season == T]; a, b = tr[tr.season < T - 1], tr[tr.season == T - 1]
        o = (lambda d: d.mkt.values) if offset else (lambda d: np.zeros(len(d)))
        lam = min(LAMS, key=lambda l: ll(pred(fit(a[F].values, a.y.values, o(a), l), b[F].values, o(b)), b.y.values))
        mm = fit(tr[F].values, tr.y.values, o(tr), lam); p = pred(mm, te[F].values, o(te))
        tot += ll(p, te.y.values) * len(te); n += len(te); coefs.append(dict(zip(F, np.round(mm[0][1:], 3))))
    return tot / n, coefs
res = {}
close = sum(ll(S[S.season == T].q.values, S[S.season == T].y.values) * (S.season == T).sum() for T in (2022, 2023, 2024, 2025)) / S.season.between(2022, 2025).sum()
for name, F, off in [('indep elo+qb', ['elo', 'qb'], False), ('indep elo+qb+inj', ['elo', 'qb', 'inj_off', 'inj_def'], False),
                     ('offset qb+elo_res', ['qb', 'elo_res'], True), ('offset qb+elo_res+inj', ['qb', 'elo_res', 'inj_off', 'inj_def'], True)]:
    l, c = run(F, off); res[name] = dict(ll=round(l, 4), coefs_last=c[-1]); print(f'{name:24} pooled 2022-25 ll {l:.4f}  (close {close:.4f})  last-fold coefs {c[-1]}')
json.dump(dict(results=res, close=close), open('injury_signal_results.json', 'w'), indent=1)
