"""P2/P3: FTN environment axes -> next-week ATS, held-out + persistence.

Axes: play-action rate, blitzers faced, defensive box count (per team-week, from the
opponent's choices). Correlations were positive (+0.14/+0.20/+0.23) — now the honest
held-out test: do cell-conditionals beat naive next-week ATS?
"""
import pyarrow.parquet as pq
import pandas as pd
import numpy as np
import json
import time

tw = pd.read_csv('dfs/team_week_ats_2026.csv')
ftn = pq.read_table('dfs/eq_harvest/raw/nflverse-data/ftn_charting_2026.parquet').to_pandas()
gid = ftn['nflverse_game_id'].str.split('_', expand=True)
ftn['away'] = gid[2]
ftn['home'] = gid[3]

env = ftn.groupby(['week', 'nflverse_game_id']).agg(
    pa_rate=('is_play_action', 'mean'), blitz=('n_blitzers', 'mean'),
    box=('n_defense_box', 'mean'), rpo=('is_rpo', 'mean'),
    catchable=('is_catchable_ball', 'mean'),
    home=('home', 'first'), away=('away', 'first')).reset_index()
rows = []
for _, r in env.iterrows():
    rows.append({'week': r.week, 'team': r.home, 'pa_rate': r.pa_rate, 'blitz_faced': r.blitz,
                 'box': r.box, 'rpo': r.rpo, 'catchable': r.catchable})
    rows.append({'week': r.week, 'team': r.away, 'pa_rate': r.pa_rate, 'blitz_faced': r.blitz,
                 'box': r.box, 'rpo': r.rpo, 'catchable': r.catchable})
e = pd.DataFrame(rows)
e = e.sort_values(['team', 'week'])
e = e.merge(tw[['team', 'week', 'ats']], on=['team', 'week'], how='left')
e = e.sort_values(['team', 'week'])
e['next_ats'] = e.groupby('team')['ats'].shift(-1).astype(float)
e['next_week'] = e.groupby('team')['week'].shift(-1)
p = e[(e.next_week == e.week + 1)].dropna(subset=['next_ats']).copy()
p['next_ats'] = p.next_ats.astype(float)
print(f'pairs: {len(p)}')

results = {}
for c in ['pa_rate', 'blitz_faced', 'box', 'catchable', 'rpo']:
    p[c + '_f'] = p[c].astype(float)
    r = np.corrcoef(p[c + '_f'], p.next_ats)[0, 1]
    # persistence: does the axis itself persist week to week?
    e_s = e.sort_values(['team', 'week'])
    e_s[c + '_f'] = e_s[c].astype(float)
    e_s['nxt'] = e_s.groupby('team')[c + '_f'].shift(-1)
    e_s['nxt_wk'] = e_s.groupby('team')['week'].shift(-1)
    pp = e_s[(e_s.nxt_wk == e_s.week + 1)].dropna(subset=['nxt'])
    rp = np.corrcoef(pp[c + '_f'], pp.nxt)[0, 1] if len(pp) > 20 else np.nan
    results[c] = {'corr_to_next_ats': round(float(r), 4), 'persistence': round(float(rp), 4),
                  'n_pairs': int(len(p))}
    print(f'{c}: corr->next ATS {r:+.4f} | persistence {rp:+.4f}')

# held-out composite: box + blitz + pa -> next ATS
p['sig'] = 0.2321 * (p.box_f - p.box_f.mean()) / p.box_f.std() + \
           0.1976 * (p.blitz_faced_f - p.blitz_faced_f.mean()) / p.blitz_faced_f.std()
p['sig_bin'] = pd.qcut(p.sig, 3, labels=['low', 'mid', 'high'])
fit = p[p.week % 2 == 1]
ev = p[p.week % 2 == 0]
cell = fit.groupby('sig_bin', observed=True).next_ats.mean()
ev2 = ev.copy()
ev2['pred'] = ev2.sig_bin.map(cell).astype(float)
v = ev2.dropna(subset=['pred'])
mse_naive = (v.next_ats ** 2).mean()
mse_sig = ((v.next_ats - v.pred) ** 2).mean()
print(f'\nHeld-out composite (n={len(v)}): MSE naive {mse_naive:.2f} vs env-sig {mse_sig:.2f} '
      f'→ {"ENV ADDS" if mse_sig < mse_naive else "ENV ADDS NOTHING"}')

stamp = {
    'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'test': 'FTN environment axes -> next-week ATS (2026 wk1-5) + persistence',
    'n_pairs': int(len(p)),
    'axes': results,
    'held_out_composite': {'mse_naive': round(float(mse_naive), 2),
                            'mse_env': round(float(mse_sig), 2),
                            'verdict': 'ENV ADDS' if mse_sig < mse_naive else 'ENV ADDS NOTHING'},
    'label': 'DIAGNOSTIC',
}
json.dump(stamp, open('dfs/FTN_ENV_NEXT_ATS.json', 'w'), indent=1)
print('\nlanded FTN_ENV_NEXT_ATS.json')
