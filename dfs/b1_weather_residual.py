"""B1 weather residual test — close-adjusted wind effect on margins and totals (outdoor games)."""
import pyarrow.parquet as pq
import pandas as pd
import json, time, math

frames = []
for yr in [2023, 2024, 2025]:
    t = pq.read_table(f'intelligence/coaching/data/play_by_play_{yr}.parquet',
        columns=['game_id', 'home_team', 'posteam', 'score_differential', 'spread_line',
                 'total_line', 'total', 'roof', 'temp', 'wind'])
    frames.append(t.to_pandas())
g = pd.concat(frames).groupby('game_id').tail(1).copy()
g['home_diff'] = [x if p == h else -x for x, p, h in
                  zip(g.score_differential, g.posteam, g.home_team)]
g['margin_resid'] = g.home_diff - g.spread_line
g['total_resid'] = g.total - g.total_line
out = g[(g.roof == 'outdoors') & g.wind.notna()].copy()
out['wind'] = pd.to_numeric(out.wind, errors='coerce')
out = out.dropna(subset=['wind'])
windy = out[out.wind >= 15]
calm = out[out.wind < 15]
print(f'WEATHER RESIDUAL TEST (outdoor, close-adjusted): calm n={len(calm)} windy n={len(windy)}')
print(f'  calm: margin_resid {calm.margin_resid.mean():+.3f} total_resid {calm.total_resid.mean():+.3f}')
print(f'  windy: margin_resid {windy.margin_resid.mean():+.3f} total_resid {windy.total_resid.mean():+.3f}')
dm = windy.margin_resid.mean() - calm.margin_resid.mean()
dt = windy.total_resid.mean() - calm.total_resid.mean()
sem = math.sqrt(windy.margin_resid.var()/len(windy) + calm.margin_resid.var()/len(calm))
set_ = math.sqrt(windy.total_resid.var()/len(windy) + calm.total_resid.var()/len(calm))
print(f'  DIFF windy-calm: margin {dm:+.3f} (t={dm/sem:+.2f}) | total {dt:+.3f} (t={dt/set_:+.2f})')

res = {'n_calm': int(len(calm)), 'n_windy': int(len(windy)),
       'calm_margin_resid': round(float(calm.margin_resid.mean()), 3),
       'windy_margin_resid': round(float(windy.margin_resid.mean()), 3),
       'margin_diff': round(float(dm), 3), 'margin_t': round(float(dm/sem), 2),
       'calm_total_resid': round(float(calm.total_resid.mean()), 3),
       'windy_total_resid': round(float(windy.total_resid.mean()), 3),
       'total_diff': round(float(dt), 3), 'total_t': round(float(dt/set_), 2),
       'close_adjusted': True,
       'prior_raw_measurement': 'wind15+ raw was -5.41 total; close-adjusted shrinks it',
       'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
       'label': 'DIAGNOSTIC'}
json.dump(res, open('dfs/b1_weather_residual.json', 'w'), indent=1)
print('landed dfs/b1_weather_residual.json')
