"""REST-DIFFERENTIAL EQUATION TEST — close-anchored, 2023-2025 (frozen window).

The situational-graph axis: home_rest - away_rest differential vs closing spread residual.
RVC: does rest differential predict the ATS residual after the close is accounted for?
"""
import pandas as pd
import numpy as np
import json
import time

g = pd.read_csv('dfs/eq_harvest/raw/nflverse-data/games.csv', low_memory=False)
g = g[(g.season.between(2023, 2025)) & (g.game_type == 'REG')].copy()
g = g.dropna(subset=['result', 'total', 'spread_line', 'home_rest', 'away_rest'])
print(f'games w/ rest + closings: {len(g)}')

# rest differential (home minus away)
g['rest_diff'] = g['home_rest'] - g['away_rest']
# ATS residual: home margin vs close (positive = home covered)
g['ats_residual'] = g['result'] - g['spread_line']

print(f'\nrest_diff distribution: {g.rest_diff.describe().round(2).to_dict()}')

# THE TEST: mean ATS residual by rest-diff bucket
g['rest_bin'] = pd.cut(g['rest_diff'], [-14, -8, -4, -1, 1, 4, 8, 14],
                       labels=['-12d', '-6d', '-2d', 'even', '+2d', '+6d', '+12d'])
t = g.groupby('rest_bin', observed=True).agg(
    n=('ats_residual', 'count'),
    mean_ats_resid=('ats_residual', 'mean'),
    sd=('ats_residual', 'std'),
    home_cover_rate=('ats_residual', lambda x: (x > 0).mean()),
).round(3).reset_index()
print('\n=== ATS RESIDUAL BY REST DIFFERENTIAL (2023-25) ===')
print(t.to_string())

# short-week specific: away on 3 days rest vs home on 7
short = g[(g.away_rest <= 4) & (g.home_rest >= 7)]
print(f'\naway-short-week games: {len(short)}; mean ATS resid {short.ats_residual.mean():+.2f} '
      f'(home cover {(short.ats_residual > 0).mean():.1%})')

# correlation
r = np.corrcoef(g.rest_diff, g.ats_residual)[0, 1]
print(f'corr(rest_diff, ATS residual): {r:+.4f}')

# held-out: does rest beat the close? predict ATS residual from rest_diff alone on even weeks
fit, ev = g[g.week % 2 == 1], g[g.week % 2 == 0]
mean_resid = fit.ats_residual.mean()
mse_naive = ((ev.ats_residual - mean_resid) ** 2).mean()
# rest-conditional: fit bin means on odd weeks, apply to even
fit2 = fit.copy(); fit2['rest_bin'] = pd.cut(fit2.rest_diff, [-14, -8, -4, -1, 1, 4, 8, 14])
ev2 = ev.copy(); ev2['rest_bin'] = pd.cut(ev2.rest_diff, [-14, -8, -4, -1, 1, 4, 8, 14])
cell = fit2.groupby('rest_bin', observed=True).ats_residual.mean()
ev2['pred'] = ev2.rest_bin.map(cell)
v = ev2.dropna(subset=['pred'])
mse_rest = ((v.ats_residual - v.pred) ** 2).mean()
print(f'\nHeld-out: MSE close-only {mse_naive:.3f} vs close+rest {mse_rest:.3f} '
      f'→ {"REST ADDS" if mse_rest < mse_naive else "REST ADDS NOTHING"} ({mse_naive - mse_rest:+.4f})')

stamp = {
    'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'test': 'rest-differential vs ATS residual (situational axis, 2023-25 frozen)',
    'n_games': len(g),
    'by_bucket': t.to_dict('records'),
    'corr_rest_ats': round(float(r), 4),
    'short_week_away': {'n': len(short), 'mean_ats_resid': round(float(short.ats_residual.mean()), 2)},
    'held_out': {'close_only_mse': round(float(mse_naive), 3), 'close_plus_rest_mse': round(float(mse_rest), 3),
                 'verdict': 'REST ADDS' if mse_rest < mse_naive else 'REST ADDS NOTHING'},
    'label': 'DIAGNOSTIC',
}
json.dump(stamp, open('dfs/REST_DIFFERENTIAL_STAMP.json', 'w'), indent=1)
t.to_csv('dfs/ats_residual_by_rest.csv', index=False)
print('\nlanded REST_DIFFERENTIAL_STAMP.json + ats_residual_by_rest.csv')
