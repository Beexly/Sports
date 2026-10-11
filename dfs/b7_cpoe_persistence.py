"""B7 CPOE persistence — NGS weekly passing, back-to-back + half-to-half stability."""
import pyarrow.parquet as pq
import pandas as pd
import numpy as np
import json

t = pq.read_table('dfs/ngs_passing.parquet').to_pandas()
t = t[t.season >= 2022]
cpoe_col = 'completion_percentage_above_expectation'
t['cpoe'] = pd.to_numeric(t[cpoe_col], errors='coerce')
t['attempts'] = pd.to_numeric(t.get('attempts'), errors='coerce')
t = t.dropna(subset=['cpoe', 'player_display_name', 'season', 'week'])
t = t[t['attempts'].notna() & (t['attempts'] >= 10)]
print('valid CPOE rows (>=10 att):', len(t), '| players:', t.player_display_name.nunique())

pairs = []
for (pid, season), grp in t.groupby(['player_gsis_id', 'season']):
    g = grp.sort_values('week')
    for i in range(len(g) - 1):
        w1, cp1 = g.iloc[i]['week'], g.iloc[i]['cpoe']
        w2, cp2 = g.iloc[i + 1]['week'], g.iloc[i + 1]['cpoe']
        if w2 - w1 == 1:
            pairs.append({'player': g.iloc[i]['player_display_name'], 'season': season,
                          'w1': w1, 'cpoe1': cp1, 'cpoe2': cp2})
pairs = pd.DataFrame(pairs)
print(f'back-to-back CPOE pairs: {len(pairs)}')
r = pairs['cpoe1'].corr(pairs['cpoe2'])
slope = np.polyfit(pairs.cpoe1, pairs.cpoe2, 1)[0]
print(f'persistence r (wk N -> N+1): {r:+.4f}')
print(f'regression slope: {slope:.4f} (<1 = mean-reverting)')
print(f'league mean CPOE: {t.cpoe.mean():+.3f}')

t['half'] = (t.week > 9).astype(int)
half = t.groupby(['player_gsis_id', 'season', 'half'])['cpoe'].mean().unstack().dropna()
half.columns = ['H1', 'H2']
r_half = half['H1'].corr(half['H2'])
print(f'H1 -> H2 halves: r = {r_half:+.4f} (n={len(half)})')

out = {'pairs_b2b': int(len(pairs)), 'r_b2b': round(float(r), 4),
       'slope_b2b': round(float(slope), 4),
       'r_half_to_half': round(float(r_half), 4), 'n_players_halves': int(len(half)),
       'league_mean_cpoe': round(float(t.cpoe.mean()), 3),
       'label': 'DIAGNOSTIC',
       'reading': ('CPOE persistence = the QB-accuracy skill signal; slope < 1 = regression '
                   'to mean; the RVC use: next-week CPOE prediction vs book completion props')}
json.dump(out, open('dfs/b7_cpoe_persistence.json', 'w'), indent=1)
print('landed dfs/b7_cpoe_persistence.json')
