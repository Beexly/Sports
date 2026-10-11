"""SITUATIONAL GRAPH — pooled multi-week residual-versus-close on the frozen NFL manifest.

Graph v1 nodes (from the compaction record): situational transitions + aggression payoffs.
The measurable axes on the frozen manifest (855 games, 2023-25): division status, rest
differential, home/away, roof, surface, week-window (early/mid/late), primetime.

RVC: close-anchored CRPS of the graph-implied margin distribution vs the closing spread's
Gaussian(13.3), evaluated on the frozen manifest. The graph predicts the ATS residual from
situational nodes; if pooled CRPS(close+graph) < CRPS(close-only), the graph carries signal.

Held-out: odd weeks fit, even weeks evaluate.
"""
import json
import time
import os
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))

man = pd.DataFrame(json.load(open(os.path.join(HERE, 'nfl_rvc_manifest.json')))['manifest_rows'])
print(f'frozen manifest: {len(man)} games, cols: {list(man.columns)}')
man = man.dropna(subset=['spread_line', 'total_line', 'final_diff', 'roof', 'surface']).copy()
print(f'complete rows: {len(man)}')

# ---- graph v1 node features (all situational, no team strength) ----
# division game: same division — not in manifest; proxy via repeat-matchup unknown. Skip.
# Rest: not in manifest (games.csv has it, but only 2023+; manifest has 2023-25 — merge):
g = pd.read_csv(os.path.join(HERE, 'eq_harvest', 'raw', 'nflverse-data', 'games.csv'), low_memory=False)
g = g[g.season.between(2023, 2025)]
rest = g.set_index('game_id')[['home_rest', 'away_rest', 'weekday']]
man = man.merge(rest, left_on='game_id', right_index=True, how='left')
man['rest_diff'] = man['home_rest'] - man['away_rest']
print(f'rows w/ rest: {man.rest_diff.notna().sum()}')

# node features
man['roof_outdoors'] = (man['roof'] == 'outdoors').astype(int)
man['turf'] = (man['surface'].isin(['grass', 'natural'])).astype(int)
man['week_phase'] = pd.cut(man['week'], [0, 6, 12, 18], labels=['early', 'mid', 'late'])
man['primetime'] = man['weekday'].isin(['Sunday']).astype(int)  # placeholder — real PT needs gametime
# ATS residual target
man['ats_resid'] = man['final_diff'] - man['spread_line']

# ---- graph as conditional adjustment: cell means by (roof_outdoors, week_phase, rest sign) ----
man['rest_node'] = np.select(
    [man.rest_diff >= 3, man.rest_diff <= -3], ['rest_up', 'rest_down'], default='rest_even')
man['node_key'] = man['roof_outdoors'].astype(str) + '|' + man['week_phase'].astype(str) + '|' + man['rest_node']

fit = man[man.week % 2 == 1]
ev = man[man.week % 2 == 0]
print(f'\nfit rows: {len(fit)}, eval rows: {len(ev)}')

# ---- CRPS machinery: margin ~ Normal(mu, 13.3); mu = close (close-only) or close + graph adjustment ----
def crps_gaussian(mu, sigma, y):
    """Closed-form CRPS for N(mu, sigma)."""
    z = (y - mu) / sigma
    return sigma * (z * (2 * _norm_cdf(z) - 1) + 2 * _norm_pdf(z) - 1 / np.sqrt(np.pi))

def _norm_cdf(z):
    from math import erf
    return 0.5 * (1 + np.vectorize(erf)(z / np.sqrt(2)))

def _norm_pdf(z):
    return np.exp(-0.5 * z ** 2) / np.sqrt(2 * np.pi)

SIGMA = 13.3
ev = ev.copy()
ev['mu_close'] = ev['spread_line']
# graph adjustment: cell-mean ATS residual from fit weeks (shrunk toward 0 by n)
cell_adj = fit.groupby('node_key').ats_resid.agg(['mean', 'count'])
k0 = 20  # shrinkage
cell_adj['adj'] = cell_adj['mean'] * cell_adj['count'] / (cell_adj['count'] + k0)
ev['mu_graph'] = ev['spread_line'] + ev['node_key'].map(cell_adj['adj']).fillna(0)

crps_close = crps_gaussian(ev.mu_close, SIGMA, ev.final_diff).mean()
crps_graph = crps_gaussian(ev.mu_graph, SIGMA, ev.final_diff).mean()
print(f'\n=== POOLED MULTI-WEEK CRPS (held-out, n={len(ev)}) ===')
print(f'CRPS close-only:      {crps_close:.4f}')
print(f'CRPS close + graph:   {crps_graph:.4f}')
print(f'delta:                {crps_close - crps_graph:+.4f} '
      f'({"GRAPH ADDS" if crps_graph < crps_close else "GRAPH ADDS NOTHING"})')

# node contribution breakdown
adj_sorted = cell_adj[cell_adj['count'] >= 15].sort_values('adj', ascending=False)
print('\nlargest graph adjustments (n>=15):')
print(adj_sorted.head(6).round(3).to_string())
print('...')
print(adj_sorted.tail(4).round(3).to_string())

stamp = {
    'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'test': 'situational graph v1 — pooled multi-week close-anchored CRPS on frozen NFL manifest',
    'nodes': ['roof_outdoors', 'week_phase(early/mid/late)', 'rest_diff(up/down/even)'],
    'n_fit': int(len(fit)), 'n_eval': int(len(ev)),
    'crps': {'close_only': round(float(crps_close), 4),
             'close_plus_graph': round(float(crps_graph), 4),
             'delta': round(float(crps_close - crps_graph), 4),
             'verdict': 'GRAPH ADDS' if crps_graph < crps_close else 'GRAPH ADDS NOTHING'},
    'cell_adjustments': adj_sorted.round(3).reset_index().to_dict('records'),
    'label': 'DIAGNOSTIC',
}
json.dump(stamp, open(os.path.join(HERE, 'SITUATIONAL_GRAPH_RVC.json'), 'w'), indent=1)
print('\nlanded SITUATIONAL_GRAPH_RVC.json')
