"""Bootstrap the two strongest queued-intel items (Q21 EPA, Q27 ANY/A)."""
import json
import numpy as np
import pandas as pd
import pyarrow.parquet as pq

frames = []
for y in [2023, 2024, 2025]:
    d = pq.read_table(f'intelligence/coaching/data/play_by_play_{y}.parquet',
        columns=['game_id', 'week', 'posteam', 'epa', 'pass', 'interception', 'sack',
                 'pass_touchdown', 'passing_yards']).to_pandas()
    d['season'] = y
    frames.append(d)
pb = pd.concat(frames)

man = pd.DataFrame(json.load(open('dfs/nfl_rvc_manifest.json'))['manifest_rows'])
mg = man.game_id.str.split('_', expand=True)
man = man.assign(home_team=mg[3], away_team=mg[2])
tw = []
for _, r in man.iterrows():
    a = r.final_diff - r.spread_line
    tw.append({'game_id': r.game_id, 'team': r.home_team, 'ats': a})
    tw.append({'game_id': r.game_id, 'team': r.away_team, 'ats': -a})
tw = pd.DataFrame(tw)

def pairs_for(metric_df):
    m = metric_df.merge(tw, on=['game_id', 'team'], how='inner')
    m = m.sort_values(['team', 'season', 'week'])
    m['next_ats'] = m.groupby('team')['ats'].shift(-1).astype(float)
    m['next_week'] = m.groupby('team')['week'].shift(-1)
    m['next_season'] = m.groupby('team')['season'].shift(-1)
    p = m[(m.next_week == m.week + 1) & (m.next_season == m.season)].dropna(subset=['next_ats']).copy()
    return p

# Q21 EPA
eff = pb[pb.epa.notna() & pb.posteam.notna()].groupby(['game_id', 'posteam']).agg(
    epa_play=('epa', 'mean'), week=('week', 'first'), season=('season', 'first')).reset_index().assign(team=lambda x: x.posteam)

p21 = pairs_for(eff)
p21['epa_play'] = p21.epa_play.astype(float)
p21['next_ats'] = p21.next_ats.astype(float)
p21['bin'] = pd.qcut(p21.epa_play, 3, labels=['lo', 'mid', 'hi'], duplicates='drop')
fit, ev = p21[p21.week % 2 == 1], p21[p21.week % 2 == 0]
cell = fit.groupby('bin', observed=True).next_ats.mean()
ev2 = ev.copy()
ev2['pred'] = ev2.bin.map(cell).astype(float)
v = ev2.dropna(subset=['pred'])
y = v.next_ats.values.astype(float)
pr = v.pred.values.astype(float)
rng = np.random.default_rng(11)
ds = []
for _ in range(2000):
    i = rng.integers(0, len(v), len(v))
    ds.append((y[i] ** 2).mean() - ((y[i] - pr[i]) ** 2).mean())
lo, hi = np.percentile(ds, [2.5, 97.5])
delta = (y ** 2).mean() - ((y - pr) ** 2).mean()
print(f'Q21 EPA: delta {delta:+.2f} CI [{lo:+.2f}, {hi:+.2f}] significant={lo > 0}')

st = json.load(open('dfs/QUEUED_INTEL_RVC.json'))
for it in st['items']:
    if it['item'].startswith('Q21'):
        it['bootstrap'] = {'delta': round(float(delta), 2), 'ci95': [round(float(lo), 2), round(float(hi), 2)],
                            'significant': bool(lo > 0)}
json.dump(st, open('dfs/QUEUED_INTEL_RVC.json', 'w'), indent=1)
print('bootstrap appended for Q21')
