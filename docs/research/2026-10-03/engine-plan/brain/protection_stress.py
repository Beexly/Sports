"""Index 2, Protection Stress, from the corpus, verbatim.

stress = pressure_rate_allowed - league_expected_rate(blitz_rate_faced)
expectation = season-to-date league OLS of pressure rate on blitz rate, refit weekly.
Guards: < 3 team games -> NULL; league fit pool < 32 team-weeks -> NULL.
Source: docs/engine/research/2026-10-02/corpus-deep/deep/c02/verified-claims.md PRESS-3, PRESS-4, PRESS-5, PRESS-10.
Display and research until a walk-forward says otherwise (PRESS-5). Not a pick input.
Denominator is reconstructed as times_pressured / times_pressured_pct. PRESS-10 says that definition is UNVERIFIED.
"""
import glob, json, os
import numpy as np
import pandas as pd

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
files = sorted(glob.glob(os.path.join(R, 'lake', 'nflverse', 'pfr', 'advstats_week_pass_*.parquet')))
df = pd.concat([pd.read_parquet(f) for f in files], ignore_index=True)
df = df[df.game_type == 'REG'].copy()
pct = df.times_pressured_pct.replace(0, np.nan)
df['dropbacks'] = df.times_pressured / pct
# zero-pressure rows: recover dropbacks from bad-throw rate when the pressure rate is 0
bad = df.passing_bad_throw_pct.replace(0, np.nan)
df.loc[df.dropbacks.isna(), 'dropbacks'] = df.passing_bad_throws / bad
g = df.dropna(subset=['dropbacks']).groupby(['season', 'week', 'team'], as_index=False).agg(
    pressures=('times_pressured', 'sum'), blitzes=('times_blitzed', 'sum'), dropbacks=('dropbacks', 'sum'), games=('game_id', 'nunique'))
g = g[g.dropbacks > 0]
g['pressure_rate'] = g.pressures / g.dropbacks
g['blitz_rate'] = g.blitzes / g.dropbacks

rows = []
for season, sg in g.groupby('season'):
    weeks = sorted(int(w) for w in sg.week.unique())
    for week in weeks + [weeks[-1] + 1]:
        prior = g[(g.season == season) & (g.week < week)]
        if len(prior) < 32:
            continue
        X = np.column_stack([np.ones(len(prior)), prior.blitz_rate.values])
        y = prior.pressure_rate.values
        try:
            coef, *_ = np.linalg.lstsq(X, y, rcond=None)
        except np.linalg.LinAlgError:
            continue
        teams = prior.groupby('team').agg(pressures=('pressures', 'sum'), blitzes=('blitzes', 'sum'), dropbacks=('dropbacks', 'sum'), n_games=('week', 'nunique'))
        teams = teams[teams.n_games >= 3]
        if teams.empty:
            continue
        teams['pressure_rate'] = teams.pressures / teams.dropbacks
        teams['blitz_rate'] = teams.blitzes / teams.dropbacks
        teams['expected'] = coef[0] + coef[1] * teams.blitz_rate
        teams['stress'] = teams.pressure_rate - teams.expected
        for team, r in teams.iterrows():
            rows.append(dict(season=int(season), week=int(week), team=team, n_games=int(r.n_games),
                             pressure_rate=round(float(r.pressure_rate), 4), blitz_rate=round(float(r.blitz_rate), 4),
                             expected=round(float(r.expected), 4), stress=round(float(r.stress), 4),
                             ols_intercept=round(float(coef[0]), 4), ols_blitz=round(float(coef[1]), 4),
                             league_team_weeks=int(len(prior))))
out = pd.DataFrame(rows)
path = os.path.join(R, 'brain', 'protection_stress.json')
# 2026 week 4 as-of (prior weeks only) is the live slate
live = out[(out.season == 2026) & (out.week == 4)].sort_values('stress', ascending=False)
doc = dict(
    formula='stress = pressure_rate_allowed - (a + b * blitz_rate_faced)',
    cite='corpus-deep/deep/c02/verified-claims.md PRESS-3 PRESS-4 PRESS-5 PRESS-10',
    use='display and research only until walk-forward calibration. Not a pick input.',
    denominator='UNVERIFIED: times_pressured / times_pressured_pct, bad-throw rate when pressure rate is 0',
    n_rows=int(len(out)),
    seasons=sorted(map(int, out.season.unique())),
    live_2026_w4_asof=live.to_dict('records'),
)
json.dump(doc, open(path, 'w'), indent=1)
print('rows', len(out), 'live', len(live))
print(live[['team', 'n_games', 'pressure_rate', 'blitz_rate', 'expected', 'stress']].to_string(index=False))
print('wrote', path)
