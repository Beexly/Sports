"""COACHING DECISION RESIDUAL — 4th-down behavior vs the yardline/distance utility surface.

Build the empirical "go" utility from outcomes: for each (yardline_100, ydstogo) cell,
compare realized EPA-equivalent (marginal points) of go vs punt/FG. Then flag teams
whose decision pattern deviates most from the cell-optimal — the coaching bias map.
"""
import pyarrow.parquet as pq
import pandas as pd
import numpy as np
import json
import time

frames = []
for y in [2024, 2025]:
    d = pq.read_table(f'intelligence/coaching/data/play_by_play_{y}.parquet',
        columns=['game_id', 'week', 'down', 'ydstogo', 'yardline_100', 'play_type',
                 'epa', 'score_differential', 'spread_line', 'fourth_down_failed']).to_pandas()
    frames.append(d)
fb = pd.concat(frames)
f4 = fb[fb.down == 4].copy()
f4 = f4[f4.play_type.isin(['punt', 'field_goal', 'pass', 'run'])]
f4['decision'] = np.where(f4.play_type.isin(['pass', 'run']), 'go', f4.play_type)
print(f'4th down decisions: {len(f4)}')
print(f4.decision.value_counts().to_dict())

# marginal value of each decision: for 'go', the EPA of the play; for punt/FG use
# the league-average next-drive EPA swing (proxy: -3.5 for punt at own goal line, +3 FG)
# Simpler honest cut: realized EPA of go plays by cell vs the decision-frequency map
go = f4[f4.decision == 'go']
cell = go.groupby([pd.cut(go.yardline_100, [0, 10, 20, 30, 40, 50, 60, 75, 100]),
                   pd.cut(go.ydstogo, [0, 2, 5, 9, 20])], observed=True).agg(
    n=('epa', 'count'), mean_epa=('epa', 'mean'), fail_rate=('fourth_down_failed', 'mean')).round(3)
print('\n=== GO DECISION UTILITY SURFACE (EPA by field position x distance) ===')
print(cell.to_string())

# team decision bias: go rate in "clear punt" cells (own 1-25, 4th & 3+)
clear_punt = f4[(f4.yardline_100 <= 75) & (f4.ydstogo >= 3) & (f4.score_differential > -8) & (f4.score_differential < 8)]
team_bias = clear_punt.groupby('posteam' if 'posteam' in clear_punt.columns else 'game_id').agg(
    n_decisions=('decision', 'count'),
    go_rate=('decision', lambda x: (x == 'go').mean()),
    mean_epa_go=('epa', 'mean')).round(3)
if 'posteam' in clear_punt.columns:
    team_bias = team_bias.sort_values('go_rate', ascending=False)
    print(f'\n=== AGGRESSIVE-INDEX: go rate in clear-punt cells (score within 8) ===')
    print(f'decisions: {len(clear_punt)}')
    print(team_bias.head(8).to_string())
    print('...')
    print(team_bias.tail(6).to_string())
    team_bias.to_csv('dfs/coach_aggression_index_2024_25.csv')

stamp = {
    'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'test': 'coaching 4th-down decision residual — go-utility surface + team aggression index',
    'n_decisions': int(len(f4)),
    'go_surface': {str(k): {'n': int(v['n']), 'epa': float(v['mean_epa']), 'fail': float(v['fail_rate'])}
                    for k, v in cell.iterrows()},
    'aggression_index_file': 'dfs/coach_aggression_index_2024_25.csv',
    'label': 'DIAGNOSTIC — behavior map, no promotion',
}
json.dump(stamp, open('dfs/COACH_DECISION_STAMP.json', 'w'), indent=1)
print('\nlanded COACH_DECISION_STAMP.json')
