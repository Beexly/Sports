import pyarrow.parquet as pq
import pandas as pd
import numpy as np
import json, time, os

HERE = os.path.dirname(os.path.abspath(__file__))
ngs = pq.read_table(os.path.join(HERE, 'ngs_passing.parquet')).to_pandas()
ngs26 = ngs[(ngs.season == 2026) & (ngs.week.between(1, 5))].copy()
pfr = pq.read_table(os.path.join(HERE, 'eq_harvest', 'raw', 'nflverse-data',
                                 'advstats_week_pass_2026.parquet')).to_pandas()
ngs26['name_key'] = ngs26['player_display_name'].str.lower().str.replace(r"[.' ]", "", regex=True)
# CPOE column name in raw parquet:
ngs26['cpoe'] = pd.to_numeric(ngs26['completion_percentage_above_expectation'], errors='coerce')
pfr['name_key'] = pfr['pfr_player_name'].str.lower().str.replace(r"[.' ]", "", regex=True)
j = ngs26[['name_key', 'week', 'cpoe', 'attempts', 'player_display_name']].merge(
    pfr[['name_key', 'week', 'times_pressured', 'times_blitzed', 'passing_bad_throw_pct', 'team']],
    on=['name_key', 'week'], how='inner')
print(f'CPOE x pressure joined: {len(j)} player-weeks')
if len(j) > 30:
    j['press_bin'] = pd.cut(j.times_pressured.fillna(0), [0, 3, 6, 9, 100])
    t = j.groupby('press_bin', observed=True).agg(
        n=('cpoe', 'count'), cpoe=('cpoe', 'mean'),
        bad_throw=('passing_bad_throw_pct', 'mean')).round(3)
    print()
    print('=== THE TABLE: CPOE by pressure (NGS x PFR, 2026 wk1-5) ===')
    print(t.to_string())
    r = np.corrcoef(j.times_pressured.fillna(0), j.cpoe)[0, 1]
    print(f'corr(pressured, CPOE): {r:+.3f}')
    j.to_csv(os.path.join(HERE, 'cpoe_x_pressure_2026.csv'), index=False)
    print('landed dfs/cpoe_x_pressure_2026.csv')
else:
    # diagnose the join miss
    print('NGS names sample:', ngs26['player_display_name'].head(5).tolist())
    print('PFR names sample:', pfr['pfr_player_name'].dropna().head(5).tolist())
    both = set(ngs26['name_key']) & set(pfr['name_key'])
    print(f'name overlap: {len(both)} of {len(set(ngs26.name_key))} NGS / {len(set(pfr.name_key))} PFR')
