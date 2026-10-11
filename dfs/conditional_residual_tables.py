"""CONDITIONAL RESIDUAL TABLES — prop-relevant axes, from what is actually on the bus.

Surface 1: CPOE (NGS passing) × total bin × spread bin → persistence by cell
Surface 2: Rushing efficiency proxy (pbp EPA/rush by team-week) × total bin × spread bin
Surface 3: xYAC proxy (pbp completed air yards vs actual YAC) × pressure proxy (sack rate faced)
Slices chosen because props are priced on: game environment (total), game script (spread/score
differential), and pressure (QB props). All reads are local parquet (frozen bus, FreshnessGate
applies to the manifest + stamps).

RVC definition per surface: the conditioning cell's mean residual vs the global mean,
tested with held-out split (odd weeks fit, even weeks evaluate).
"""
import pyarrow.parquet as pq
import pandas as pd
import numpy as np
import json, time, os, glob, math

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'dfs_residual_tables')
os.makedirs(OUT, exist_ok=True)
now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
R = {'observed_at': now, 'label': 'DIAGNOSTIC', 'surfaces': {}}

# ---------- frozen manifest closings ----------
man = pd.DataFrame(json.load(open(os.path.join(HERE, 'nfl_rvc_manifest.json')))['manifest_rows'])
wk = man.groupby(['season', 'week']).agg(mean_total=('total_line', 'mean'),
                                         mean_spread=('spread_line', 'mean')).reset_index()
print(f'manifest weeks: {len(wk)}')

# ============ SURFACE 1: CPOE by total bin + spread bin, with persistence held-out ============
ng = pq.read_table(os.path.join(HERE, 'ngs_passing.parquet')).to_pandas()
ng['cpoe'] = pd.to_numeric(ng['completion_percentage_above_expectation'], errors='coerce')
ng['att'] = pd.to_numeric(ng['attempts'], errors='coerce')
ng = ng.dropna(subset=['cpoe', 'att'])
ng = ng[(ng['att'] >= 10) & (ng['week'].between(1, 18))]
ng = ng.merge(wk, on=['season', 'week'], how='inner')
print(f'\nS1 CPOE rows joined: {len(ng)}')
ng['total_bin'] = pd.cut(ng['mean_total'], [0, 42, 45, 48, 99], labels=['low', 'midlo', 'midhi', 'high'])
ng['spread_bin'] = pd.cut(ng['mean_spread'], [-99, -7, -3, 3, 7, 99],
                          labels=['bigfav', 'fav', 'pick', 'dog', 'bigdog'])
s1_tot = ng.groupby('total_bin', observed=True)['cpoe'].agg(['count', 'mean', 'std']).round(3).reset_index()
s1_spr = ng.groupby('spread_bin', observed=True)['cpoe'].agg(['count', 'mean', 'std']).round(3).reset_index()
print('CPOE by total bin:\n', s1_tot.to_string())
print('CPOE by spread bin:\n', s1_spr.to_string())

# persistence (b2b CPOE r) per total bin — held-out: fit r on odd weeks, eval on even
ng = ng.sort_values(['player_gsis_id', 'season', 'week'])
pr = []
for (pid, season), g in ng.groupby(['player_gsis_id', 'season']):
    g = g.sort_values('week')
    for i in range(len(g) - 1):
        if g.iloc[i+1]['week'] - g.iloc[i]['week'] == 1:
            pr.append({'tb': g.iloc[i+1]['total_bin'], 'w1': g.iloc[i]['week'],
                       'c1': g.iloc[i]['cpoe'], 'c2': g.iloc[i+1]['cpoe']})
pr = pd.DataFrame(pr)
pr['half'] = np.where(pr['w1'] % 2 == 1, 'fit', 'eval')
pers = pr.groupby(['tb', 'half'], observed=True).apply(
    lambda x: pd.Series({'n': len(x), 'r': x['c1'].corr(x['c2'])}), include_groups=False).round(3).reset_index()
pers_piv = pers.pivot(index='tb', columns='half', values='r').reset_index()
pers_piv['stability'] = (pers_piv['fit'] - pers_piv['eval']).abs().round(3)
print('CPOE b2b persistence by total bin (fit/eval split):\n', pers_piv.to_string())

# RVC test: does cell-level CPOE beat the global mean out-of-sample?
global_mean = ng[ng['week'] % 2 == 1]['cpoe'].mean()
cell_means = ng[ng['week'] % 2 == 1].groupby('total_bin', observed=True)['cpoe'].mean()
ev = ng[ng['week'] % 2 == 0].copy()
ev['pred_global'] = global_mean
ev['pred_cell'] = ev['total_bin'].map(cell_means)
sse_g = ((ev['cpoe'] - ev['pred_global']) ** 2).mean()
sse_c = ((ev['cpoe'] - ev['pred_cell']) ** 2).mean()
print(f'\nS1 RVC held-out: MSE global {sse_g:.3f} vs cell-conditional {sse_c:.3f} '
      f'→ {"CELL WINS" if sse_c < sse_g else "GLOBAL WINS"} ({sse_g - sse_c:+.4f})')

R['surfaces']['CPOE'] = {
    'status': 'INFRASTRUCTURE PASS', 'n': len(ng),
    'by_total_bin': s1_tot.to_dict('records'),
    'by_spread_bin': s1_spr.to_dict('records'),
    'persistence_fit_eval': pers_piv.to_dict('records'),
    'held_out_mse': {'global': round(float(sse_g), 4), 'cell_conditional': round(float(sse_c), 4),
                     'delta': round(float(sse_g - sse_c), 4),
                     'winner': 'CELL' if sse_c < sse_g else 'GLOBAL'},
}
s1_tot.to_csv(f'{OUT}/cpoe_by_total_bin.csv', index=False)
s1_spr.to_csv(f'{OUT}/cpoe_by_spread_bin.csv', index=False)
pers_piv.to_csv(f'{OUT}/cpoe_persistence_fit_eval.csv', index=False)

# ============ SURFACE 2: rushing efficiency (EPA/rush) × total bin × spread bin ============
print('\nS2 rushing EPA by environment:')
frames = []
for f in ['intelligence/coaching/data/play_by_play_2024.parquet',
          'intelligence/coaching/data/play_by_play_2025.parquet']:
    d = pq.read_table(f, columns=['season', 'week', 'posteam', 'rush', 'epa',
                                  'total_line', 'spread_line']).to_pandas()
    frames.append(d)
pb = pd.concat(frames)
pb = pb[(pb['rush'] == 1) & pb['epa'].notna() & pb['total_line'].notna()]
tw = pb.groupby(['season', 'week', 'posteam']).agg(
    epa_rush=('epa', 'mean'), carries=('epa', 'count'),
    total=('total_line', 'first'), spread=('spread_line', 'first')).reset_index()
tw = tw[tw['carries'] >= 15]
print(f'team-weeks w/ >=15 carries: {len(tw)}')
tw['total_bin'] = pd.cut(tw['total'], [0, 42, 45, 48, 99], labels=['low', 'midlo', 'midhi', 'high'])
tw['spread_bin'] = pd.cut(tw['spread'], [-99, -7, -3, 3, 7, 99],
                          labels=['bigfav', 'fav', 'pick', 'dog', 'bigdog'])
s2_tot = tw.groupby('total_bin', observed=True)['epa_rush'].agg(['count', 'mean', 'std']).round(4).reset_index()
s2_spr = tw.groupby('spread_bin', observed=True)['epa_rush'].agg(['count', 'mean', 'std']).round(4).reset_index()
print('EPA/rush by total bin:\n', s2_tot.to_string())
print('EPA/rush by spread bin:\n', s2_spr.to_string())

# held-out RVC: cell-conditional EPA/rush vs global
g2 = tw[tw['week'] % 2 == 1]['epa_rush'].mean()
cm2 = tw[tw['week'] % 2 == 1].groupby(['total_bin', 'spread_bin'], observed=True)['epa_rush'].mean()
ev2 = tw[tw['week'] % 2 == 0].copy()
ev2['pred_cell'] = ev2.set_index(['total_bin', 'spread_bin']).index.map(cm2)
v2 = ev2.dropna(subset=['pred_cell'])
mse_g2 = ((v2['epa_rush'] - g2) ** 2).mean()
mse_c2 = ((v2['epa_rush'] - v2['pred_cell']) ** 2).mean()
print(f'S2 RVC held-out: MSE global {mse_g2:.4f} vs cell {mse_c2:.4f} '
      f'→ {"CELL WINS" if mse_c2 < mse_g2 else "GLOBAL WINS"} ({mse_g2 - mse_c2:+.5f})')

R['surfaces']['RYOE_PROXY_EPA_RUSH'] = {
    'status': 'INFRASTRUCTURE PASS', 'n_team_weeks': len(tw),
    'by_total_bin': s2_tot.to_dict('records'),
    'by_spread_bin': s2_spr.to_dict('records'),
    'held_out_mse': {'global': round(float(mse_g2), 5), 'cell_conditional': round(float(mse_c2), 5),
                     'delta': round(float(mse_g2 - mse_c2), 5),
                     'winner': 'CELL' if mse_c2 < mse_g2 else 'GLOBAL'},
}
s2_tot.to_csv(f'{OUT}/epa_rush_by_total_bin.csv', index=False)
s2_spr.to_csv(f'{OUT}/epa_rush_by_spread_bin.csv', index=False)

# ============ SURFACE 3: xYAC proxy — YAC over expected by pressure ============
print('\nS3 xYAC proxy by pressure:')
frames = []
for f in ['intelligence/coaching/data/play_by_play_2024.parquet',
          'intelligence/coaching/data/play_by_play_2025.parquet']:
    cols = pq.read_schema(f).names
    keep = [c for c in ['season', 'week', 'pass', 'complete_pass', 'air_yards',
                        'yards_after_catch', 'qb_hit', 'epa', 'total_line'] if c in cols]
    d = pq.read_table(f, columns=keep).to_pandas()
    frames.append(d)
pa = pd.concat(frames)
pa = pa[(pa['complete_pass'] == 1) & pa['air_yards'].notna() & pa['yards_after_catch'].notna()]
# xYAC proxy: expected YAC given air yards (global curve), residual = actual - expected
# fit on odd weeks, evaluate on even
fit = pa[pa['week'] % 2 == 1]
ev = pa[pa['week'] % 2 == 0].copy()
# bin by air yards (the xYAC curve)
fit['air_bin'] = pd.cut(fit['air_yards'], [-5, 2, 6, 10, 15, 25, 60])
ev['air_bin'] = pd.cut(ev['air_yards'], [-5, 2, 6, 10, 15, 25, 60])
xyac_curve = fit.groupby('air_bin', observed=True)['yards_after_catch'].mean()
ev = ev.copy()
ev['xyac_pred'] = ev['air_bin'].map(xyac_curve).astype(float)
ev['yac_resid'] = ev['yards_after_catch'] - ev['xyac_pred']
# pressure proxy: qb_hit on the play
s3 = ev.groupby(ev['qb_hit'].fillna(0), observed=True).agg(
    n=('yac_resid', 'count'), mean_resid=('yac_resid', 'mean'), sd=('yac_resid', 'std')).round(3)
print('YAC residual (actual - xYAC curve) by qb_hit:\n', s3.to_string())
# also by air bin (where does the curve fail?)
s3b = ev.groupby('air_bin', observed=True)['yac_resid'].agg(['count', 'mean', 'std']).round(3)
print('YAC residual by air bin:\n', s3b.to_string())
rmse_with = math.sqrt((ev['yac_resid'] ** 2).mean())
naive = ev['yards_after_catch'] - ev['yards_after_catch'].mean()
rmse_naive = math.sqrt((naive ** 2).mean())
print(f'xYAC curve RMSE {rmse_with:.2f} vs naive mean {rmse_naive:.2f} → '
      f'{"CURVE WINS" if rmse_with < rmse_naive else "NAIVE WINS"}')

R['surfaces']['XYAC_PROXY'] = {
    'status': 'INFRASTRUCTURE PASS', 'n_plays': len(ev),
    'by_qb_hit': s3.reset_index().astype({'qb_hit': str}).to_dict('records'),
    'by_air_bin': s3b.reset_index().astype({'air_bin': str}).to_dict('records'),
    'rmse': {'xyac_curve': round(float(rmse_with), 3), 'naive_mean': round(float(rmse_naive), 3),
             'winner': 'CURVE' if rmse_with < rmse_naive else 'NAIVE'},
}
s3.reset_index().astype({'qb_hit': str}).to_csv(f'{OUT}/yac_resid_by_qbhit.csv', index=False)
s3b.reset_index().astype({'air_bin': str}).to_csv(f'{OUT}/yac_resid_by_air_bin.csv', index=False)

# ============ SAVE ============
R['diagnostic_candidates'] = []
R['note'] = ('Cells flagged as diagnostic candidates only when held-out cell-conditional '
             'prediction beats the global mean AND persistence is stable across fit/eval. '
             'No promotion without residual-versus-close on posted prop prices.')
json.dump(R, open(os.path.join(HERE, 'CONDITIONAL_RESIDUAL_TABLES.json'), 'w'), indent=1, default=str)
print(f'\n=== LANDED CONDITIONAL_RESIDUAL_TABLES.json + {len(os.listdir(OUT))} CSVs ===')
