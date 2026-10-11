"""EDGE#3: kicker FG-distance curve from local nflverse pbp parquets. Zero new pulls."""
import pyarrow.parquet as pq
import pandas as pd
import json, time, os

frames = []
for yr in [2022, 2023, 2024, 2025, 2026]:
    p = f'intelligence/coaching/data/play_by_play_{yr}.parquet'
    if not os.path.exists(p):
        print(yr, 'missing'); continue
    t = pq.read_table(p, columns=['field_goal_result', 'kick_distance', 'yardline_100',
                                  'kicker_player_name', 'season', 'week', 'posteam'])
    df = t.to_pandas()
    df = df[df['field_goal_result'].notna() & df['kick_distance'].notna()]
    frames.append(df)
    print(yr, len(df), 'FG attempts')

allfg = pd.concat(frames, ignore_index=True)
print('TOTAL FG attempts:', len(allfg))

bins = [(15, 25), (25, 30), (30, 35), (35, 40), (40, 45), (45, 50), (50, 55), (55, 65)]
curve = []
for lo, hi in bins:
    sub = allfg[(allfg.kick_distance >= lo) & (allfg.kick_distance < hi)]
    if len(sub) >= 20:
        made = (sub.field_goal_result == 'made').mean()
        curve.append({'dist_lo': lo, 'dist_hi': hi, 'n': int(len(sub)), 'fg_pct': round(made * 100, 1)})
        print(f'  {lo}-{hi} yds: {made*100:.1f}% (n={len(sub)})')

out = {'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
       'source': 'nflverse pbp parquets (local 2022-2026, intelligence/coaching/data/)',
       'n_attempts': int(len(allfg)), 'curve': curve,
       'label': 'DIAGNOSTIC — edge candidate only; residual-vs-close not yet run on kicker props',
       'reopen': 'kicker FG-distance props (DK alt ladders) pulled via nash subcat 16569-16571 family -> compare book-implied FG% vs this curve -> residual-vs-close on settled kicker props'}
json.dump(out, open('dfs/edge3_fg_curve.json', 'w'), indent=1)
print('landed dfs/edge3_fg_curve.json')
