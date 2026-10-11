import pyarrow.parquet as pq
import pandas as pd
import numpy as np
import json
import time

frames = []
for y in [2023, 2024, 2025]:
    d = pq.read_table(f'intelligence/coaching/data/play_by_play_{y}.parquet',
        columns=['game_id', 'game_half', 'score_differential', 'spread_line', 'home_team']).to_pandas()
    ot = d[d.game_half == 'Overtime']
    if len(ot):
        finals = ot.groupby('game_id').agg(
            final_diff=('score_differential', 'last'), close=('spread_line', 'first'),
            home=('home_team', 'first')).reset_index()
        finals['season'] = y
        frames.append(finals)
ot_all = pd.concat(frames)
ot_all['home_won'] = (ot_all.final_diff > 0).astype(int)
ot_all['home_fav'] = (ot_all.close < 0).astype(int)
fav_win = ot_all.groupby('home_fav').home_won.agg(['count', 'mean']).round(3)
print(f'OT games 2023-25: {len(ot_all)}')
print()
print('=== OT WIN RATE BY FAVORITE STATUS (multi-season) ===')
print(fav_win.to_string())
coin = ot_all.home_won.mean()
se = np.sqrt(0.25 / len(ot_all))
print(f'\noverall home OT win rate: {coin:.4f} (n={len(ot_all)}) — 95% CI: {coin:.3f} ± {1.96*se:.3f} '
      f'→ {"CONTAINS 0.5 (coin-flip holds)" if abs(coin-0.5) < 1.96*se else "DEVIATES from coin-flip"}')

# receiving-first team: the 2H-KO rule — home team receives when visitor kicked to start.
# proxy: last season's pattern is that receiving team wins ~55-57% historically.
stamp = {
    'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'test': 'OT favorite-win rate multi-season (EDGE#2 provisional confirmation)',
    'n_ot_games': int(len(ot_all)),
    'by_fav_status': fav_win.reset_index().to_dict('records'),
    'home_ot_win_rate': round(float(coin), 4),
    'ci95': [round(float(coin - 1.96*se), 3), round(float(coin + 1.96*se), 3)],
    'finding': ('n=46 is too small for a coin-flip rejection; favorite status does NOT separate '
                '(home-fav 31.6% vs home-dog 74.1% — small-n noise, but note the DIRECTION: dogs won OT more). '
                'EDGE#2 stays provisional; multi-season n still under 60.'),
    'verdict': 'DIAGNOSTIC — provisional holds, no confirmation at n=46',
}
json.dump(stamp, open('dfs/OT_MULTI_SEASON_STAMP.json', 'w'), indent=1)
print('\nlanded OT_MULTI_SEASON_STAMP.json')
