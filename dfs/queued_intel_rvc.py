"""QUEUED INTEL BUILD — Q8/Q11/Q21/Q23/Q27/Q32 residual tests.

Each item: build the metric from pbp 2023-25 (frozen manifest window), aggregate
team-week, then residual-vs-close = does the metric predict NEXT-week ATS after the close?
Held-out split (odd fit / even eval). Stamp INFRASTRUCTURE PASS or REFUSE per item.
"""
import pyarrow.parquet as pq
import pandas as pd
import numpy as np
import json
import time
import os

HERE = os.path.dirname(os.path.abspath(__file__))

# ---- frozen window pbp ----
frames = []
for y in [2023, 2024, 2025]:
    d = pq.read_table(f'intelligence/coaching/data/play_by_play_{y}.parquet',
        columns=['game_id', 'week', 'home_team', 'away_team', 'posteam', 'epa', 'success',
                 'play_type', 'yards_gained', 'air_yards', 'yards_after_catch', 'run_gap',
                 'field_goal_result', 'field_goal_attempt', 'kick_distance',
                 'drive_play_count', 'fixed_drive_result', 'down', 'pass', 'rush',
                 'interception', 'sack', 'fumble', 'pass_touchdown', 'passing_yards',
                 'complete_pass', 'spread_line', 'total_line']).to_pandas()
    d['season'] = y
    frames.append(d)
pb = pd.concat(frames)
print(f'pbp rows: {len(pb)}')

# ---- team-week ATS outcomes (frozen manifest window) ----
games = pb.groupby('game_id').agg(
    season=('season', 'first'), week=('week', 'first'), home=('home_team', 'first'),
    away=('away_team', 'first'), close=('spread_line', 'first'),
    hs=('home_team', 'size')).reset_index().drop(columns=['hs'])
# final margins via score diff at game end:
last = pb.sort_values(['game_id']).groupby('game_id').tail(1)[['game_id']]
# simpler: derive margin from epa-sum? No — use manifest:
man = pd.DataFrame(json.load(open(os.path.join(HERE, 'nfl_rvc_manifest.json')))['manifest_rows'])
# manifest game_id encodes teams: 2023_01_ARI_WAS
mg = man.game_id.str.split('_', expand=True)
man['home_team'] = mg[3]
man['away_team'] = mg[2]
g = man[['game_id', 'season', 'week', 'home_team', 'away_team', 'spread_line', 'final_diff']].copy()
g['ats_home'] = g.final_diff - g.spread_line
tw_rows = []
for _, r in g.iterrows():
    tw_rows.append({'game_id': r.game_id, 'season': r.season, 'week': r.week, 'team': r.home_team, 'ats': r.ats_home})
    tw_rows.append({'game_id': r.game_id, 'season': r.season, 'week': r.week, 'team': r.away_team, 'ats': -r.ats_home})
tw = pd.DataFrame(tw_rows)
print(f'team-week ATS rows (frozen): {len(tw)}')

def next_week_test(metric_df, metric_col, label):
    """Join metric team-week -> next-week ATS, held-out test."""
    m = metric_df.merge(tw, on=['game_id', 'team'], how='inner')
    if len(m) < 100:
        return {'item': label, 'verdict': 'REFUSED', 'reason': f'join too thin ({len(m)})'}
    m = m.sort_values(['team', 'season', 'week'])
    m['next_ats'] = m.groupby('team')['ats'].shift(-1).astype(float)
    m['next_week'] = m.groupby('team')['week'].shift(-1)
    m['next_season'] = m.groupby('team')['season'].shift(-1)
    p = m[(m.next_week == m.week + 1) & (m.next_season == m.season)].dropna(subset=['next_ats']).copy()
    p[metric_col] = p[metric_col].astype(float)
    p['next_ats'] = p.next_ats.astype(float)
    if len(p) < 60:
        return {'item': label, 'verdict': 'REFUSED', 'reason': f'pairs too thin ({len(p)})'}
    r = np.corrcoef(p[metric_col], p.next_ats)[0, 1]
    p['bin'] = pd.qcut(p[metric_col], 3, labels=['lo', 'mid', 'hi'], duplicates='drop')
    fit, ev = p[p.week % 2 == 1], p[p.week % 2 == 0]
    cell = fit.groupby('bin', observed=True).next_ats.mean()
    ev2 = ev.copy()
    ev2['pred'] = ev2.bin.map(cell).astype(float)
    v = ev2.dropna(subset=['pred'])
    mse_n = (v.next_ats ** 2).mean()
    mse_s = ((v.next_ats - v.pred) ** 2).mean()
    return {'item': label, 'verdict': 'INFRASTRUCTURE PASS',
            'n_pairs': int(len(p)), 'corr': round(float(r), 4),
            'held_out': {'mse_naive': round(float(mse_n), 2), 'mse_metric': round(float(mse_s), 2),
                          'adds': bool(mse_s < mse_n)},
            'survives': bool(mse_s < mse_n - 0.02 * mse_n)}

results = {'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'items': []}

# ---- Q8: FG-miss EPA swing (special-teams luck) ----
fg = pb[(pb.field_goal_attempt == 1) & pb.field_goal_result.notna()].copy()
miss = fg[fg.field_goal_result == 'missed'].groupby(['game_id', 'posteam']).agg(
    fg_misses=('field_goal_result', 'count'), miss_dist=('kick_distance', 'mean')).reset_index()
made = fg[fg.field_goal_result == 'made'].groupby(['game_id', 'posteam']).size().rename('fg_made').reset_index()
q8 = miss.merge(made, on=['game_id', 'posteam'], how='outer').fillna(0)
q8['fg_luck'] = q8.fg_misses - (q8.fg_made + q8.fg_misses) * 0.15  # league miss rate ~15%
q8['team'] = q8.posteam
res = next_week_test(q8, 'fg_luck', 'Q8 FG-miss luck')
results['items'].append(res)
print('Q8:', res)

# ---- Q11: drive-outcome distribution (punt-heavy = conservative) ----
dr = pb[pb.drive_play_count.notna() & pb.fixed_drive_result.notna()].drop_duplicates(subset=['game_id', 'fixed_drive_result', 'drive_play_count', 'posteam'])
drv = dr.groupby(['game_id', 'posteam']).agg(
    drives=('fixed_drive_result', 'count'),
    td_rate=('fixed_drive_result', lambda x: (x.str.startswith('Touchdown')).mean() if len(x) else 0),
    turnover_rate=('fixed_drive_result', lambda x: (x.str.contains('Turnover|Fumble|Interception', na=False)).mean() if len(x) else 0),
).reset_index()
drv['team'] = drv.posteam
res = next_week_test(drv, 'td_rate', 'Q11 drive TD-rate')
results['items'].append(res)
print('Q11:', res)

# ---- Q21: EPA efficiency persistence ----
eff = pb[pb.epa.notna() & pb.posteam.notna()].groupby(['game_id', 'posteam']).agg(
    epa_play=('epa', 'mean'), success_rate=('success', 'mean')).reset_index()
eff['team'] = eff.posteam
res = next_week_test(eff, 'epa_play', 'Q21 EPA/play persistence')
results['items'].append(res)
print('Q21:', res)

# ---- Q23: yards by play size (explosiveness share) ----
pb['big_play'] = (pb.yards_gained >= 20).astype(int)
bp = pb[pb.posteam.notna() & pb.yards_gained.notna()].groupby(['game_id', 'posteam']).agg(
    big_rate=('big_play', 'mean'), mean_yards=('yards_gained', 'mean')).reset_index()
bp['team'] = bp.posteam
res = next_week_test(bp, 'big_rate', 'Q23 big-play rate')
results['items'].append(res)
print('Q23:', res)

# ---- Q27: ANY/A proxy ----
team_pass = pb[(pb["pass"] == 1) & pb.posteam.notna()].groupby(['game_id', 'posteam']).agg(
    dropbacks=('pass', 'sum'), int_wk=('interception', 'sum'), sacks=('sack', 'sum'),
    pass_td=('pass_touchdown', 'sum'), pass_yds=('passing_yards', 'sum')).reset_index()
team_pass['any_a'] = (team_pass.pass_yds - team_pass.sacks * 9 - team_pass.int_wk * 45 + team_pass.pass_td * 20) / (team_pass.dropbacks + team_pass.sacks).replace(0, np.nan)
team_pass['team'] = team_pass.posteam
res = next_week_test(team_pass.dropna(subset=['any_a']), 'any_a', 'Q27 ANY/A')
results['items'].append(res)
print('Q27:', res)

# ---- Q32: negative play % ----
pb['neg'] = ((pb.epa < -0.5) | (pb.yards_gained < 0)).astype(int)
neg = pb[pb.posteam.notna()].groupby(['game_id', 'posteam']).agg(
    neg_rate=('neg', 'mean')).reset_index()
neg['team'] = neg.posteam
res = next_week_test(neg, 'neg_rate', 'Q32 negative-play rate')
results['items'].append(res)
print('Q32:', res)

results['label'] = 'DIAGNOSTIC'
json.dump(results, open(os.path.join(HERE, 'QUEUED_INTEL_RVC.json'), 'w'), indent=1)
print('\nlanded QUEUED_INTEL_RVC.json')
