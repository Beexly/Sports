"""2-POINT CONVERSION TABLE — the EQ010 branch, priced from real data (2023-25)."""
import pyarrow.parquet as pq
import pandas as pd
import numpy as np
import json
import time

frames = []
for y in [2024, 2025]:
    cols = pq.read_schema(f'intelligence/coaching/data/play_by_play_{y}.parquet').names
    keep = [c for c in ['game_id', 'week', 'two_point_conv_result', 'two_point_conversion_prob',
                        'two_point_attempt', 'posteam',
                        'spread_line', 'total_line', 'score_differential', 'game_seconds_remaining'] if c in cols]
    d = pq.read_table(f'intelligence/coaching/data/play_by_play_{y}.parquet', columns=keep).to_pandas()
    frames.append(d)
tp = pd.concat(frames)
mask = tp['two_point_conv_result'].notna() if 'two_point_conv_result' in tp.columns else tp['two_point_attempt'].notna()
tp2 = tp[mask].copy()
print(f'2pt attempt rows: {len(tp2)}')
print('result values:', tp2['two_point_conv_result'].value_counts().to_dict() if 'two_point_conv_result' in tp2.columns else 'n/a')

if 'two_point_conv_result' in tp2.columns:
    tp2['success'] = (tp2['two_point_conv_result'] == 'success').astype(int)
    rate = tp2.success.mean()
    print(f'\noverall 2pt conversion: {tp2.success.sum()}/{len(tp2)} = {rate:.4f}')
    # by game state: score differential at attempt (trailing by 2 = the go-for-2 tie context)
    tp2['diff_bin'] = pd.cut(tp2.score_differential, [-30, -10, -4, -1, 0, 3, 10, 30])
    t = tp2.groupby('diff_bin', observed=True).agg(
        n=('success', 'count'), rate=('success', 'mean')).round(3)
    print('\n=== 2PT RATE BY SCORE STATE ===')
    print(t.to_string())
    # by team quality (close proxy)
    tp2['fav'] = (tp2.spread_line < 0).astype(int)  # home favored (posteam side varies; rough)
    t2 = tp2.groupby('fav', observed=True).agg(n=('success', 'count'), rate=('success', 'mean')).round(3)
    print('\nby (home) favorite flag:')
    print(t2.to_string())
    # THE EQUILIBRIUM: at 45-48% conversion, expected value of 2pt = 0.9-0.96 points vs XP (~0.94)
    print(f'\nEQUILIBRIUM: 2pt EV = {2*rate:.3f} points vs XP ~0.94 points → '
          f'{"GO FOR 2" if 2*rate > 0.94 else "KICK XP"} at league-average conversion')

stamp = {
    'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'test': '2-point conversion rate table (EQ010 go-for-2 branch priced from data)',
    'n_attempts': int(len(tp2)),
    'overall_rate': round(float(tp2.success.mean()), 4) if 'success' in tp2.columns else None,
    'by_score_state': t.round(3).to_dict('records') if 'success' in tp2.columns else None,
    'equilibrium': f'2pt EV = {2*tp2.success.mean():.3f} vs XP 0.94' if 'success' in tp2.columns else None,
    'label': 'DIAGNOSTIC',
}
json.dump(stamp, open('dfs/TWOPOINT_TABLE_STAMP.json', 'w'), indent=1)
if 'success' in tp2.columns:
    t.to_csv('dfs/twopoint_by_score_state.csv')
print('\nlanded TWOPOINT_TABLE_STAMP.json')
