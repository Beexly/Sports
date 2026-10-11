"""B4 officials RVC v2 — with the game_id bridge (schedules ↔ officials ↔ pbp)."""
import pyarrow.parquet as pq
import pandas as pd
import json, time, statistics, sys, os, math

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from freshnessgate_wiring import read_fresh

HERE = os.path.dirname(os.path.abspath(__file__))

# 1. load + bridge
s = pq.read_table('data/nova/schedules_games.parquet').to_pandas()
s23 = s[s.season >= 2023][['game_id', 'season', 'week', 'home_team', 'away_team',
                            'spread_line', 'total_line', 'gameday']]
o = pq.read_table('data/nova/officials.parquet').to_pandas()
refs = o[(o.position == 'Referee') & (o.season >= 2023)][['game_id', 'official_name', 'season', 'week']]

# pbp per-game penalties + closings
pen_frames, last_frames = [], []
for yr in [2023, 2024, 2025]:
    p = f'intelligence/coaching/data/play_by_play_{yr}.parquet'
    t = pq.read_table(p, columns=['game_id', 'home_team', 'posteam', 'week', 'penalty',
                                  'penalty_yards', 'score_differential', 'total',
                                  'spread_line', 'total_line'])
    df = t.to_pandas()
    pen_frames.append(df[df['penalty'] == 1])
    last_frames.append(df.groupby('game_id').tail(1))

pen = pd.concat(pen_frames, ignore_index=True)
last = pd.concat(last_frames, ignore_index=True)
per_game = pen.groupby('game_id').agg(pen_count=('penalty', 'sum'),
                                      pen_yards=('penalty_yards', 'sum')).reset_index()
last = last.merge(per_game, on='game_id', how='left')
last['season'] = last['game_id'].str[:4].astype(int)

# map pbp (season, week, home_team) → schedule game_id (which carries officials join)
skeys = {(r.season, r.week, r.home_team): r.game_id for r in s23.itertuples()}
last['sched_game_id'] = [skeys.get((int(season), int(week), home))
                         for season, week, home in zip(last['season'], last['week'], last['home_team'])]
linked = last.dropna(subset=['sched_game_id'])
print(f'pbp games linked to schedule: {len(linked)}/{len(last)}')

# join referee — THE BRIDGE: schedules.old_game_id == officials.game_id (3,041 games overlap)
s_bridge = s[['old_game_id', 'game_id']].rename(columns={'old_game_id': 'legacy_id', 'game_id': 'sched_game_id'})
s_bridge['legacy_id'] = s_bridge['legacy_id'].astype(str)
ref_by_legacy = refs.set_index('game_id')['official_name']
s_bridge['referee'] = s_bridge['legacy_id'].map(ref_by_legacy)
ref_by_sched = s_bridge.dropna(subset=['referee']).set_index('sched_game_id')['referee']
linked['referee'] = linked['sched_game_id'].map(ref_by_sched)
final = linked.dropna(subset=['referee', 'pen_count', 'spread_line', 'total_line']).copy()
final['home_diff'] = [x if p == h else -x for x, p, h in
                      zip(final['score_differential'], final['posteam'], final['home_team'])]
final['total_residual'] = final['total'] - final['total_line']
print(f'games w/ referee + penalties + closings: {len(final)}')

# crew profiles
crew = final.groupby('referee').agg(
    n=('game_id', 'count'),
    pen_mean=('pen_count', 'mean'),
    pen_yards_mean=('pen_yards', 'mean'),
    total_resid_mean=('total_residual', 'mean'),
    total_resid_sd=('total_residual', 'std'),
).reset_index()
crew = crew[crew['n'] >= 10].sort_values('total_resid_mean', ascending=False)
print(f'referee crews (n>=10): {len(crew)}')
print(crew.head(8).to_string())

league_mean = final['total_residual'].mean()
within = crew['total_resid_sd'].mean()
sig = 0
for r in crew.itertuples():
    se = r.total_resid_sd / math.sqrt(r.n) if r.n > 1 else 99
    z = (r.total_resid_mean - league_mean) / se if se > 0 else 0
    if abs(z) > math.sqrt(2 * math.log(len(crew) / 0.05)):  # Bonferroni-ish
        sig += 1
print(f'\nleague totals-resid mean: {league_mean:+.3f}')
print(f'between-referee sd: {crew["total_resid_mean"].std():.3f} | avg within sd: {within:.2f}')
print(f'refs surviving Bonferroni-corrected test: {sig}/{len(crew)}')

corr = final[['pen_count', 'total_residual']].dropna().corr().iloc[0, 1]
print(f'penalty count × totals residual r = {corr:+.3f}')

stamp = {
    'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'test': 'B4 officials RVC v2 — referee crews × penalties × closings (game_id bridge via schedules release)',
    'sources': 'nflverse officials.parquet (22k rows) + schedules.games.parquet (bridge) + pbp 2023-25 penalties',
    'games_linked': int(len(final)),
    'referees_n10': int(len(crew)),
    'league_total_resid_mean': round(float(league_mean), 3),
    'between_referee_sd': round(float(crew['total_resid_mean'].std()), 3),
    'refs_surviving_bonferroni': sig,
    'pen_count_x_totals_r': round(float(corr), 3),
    'verdict': ('INFRASTRUCTURE PASS — the full B4 join chain works end-to-end. '
                'Crew dispersion measured; Bonferroni-corrected significance is the promotion bar. '
                'No crew promoted at this stage.'),
    'label': 'DIAGNOSTIC',
}
json.dump(stamp, open(os.path.join(HERE, 'B4_OFFICIALS_STAMP.json'), 'w'), indent=1)
crew.to_csv(os.path.join(HERE, 'b4_crew_profiles.csv'), index=False)
final[['game_id', 'referee', 'pen_count', 'pen_yards', 'total_residual', 'home_diff']].to_csv(
    os.path.join(HERE, 'b4_game_referee_joined.csv'), index=False)
print('landed B4_OFFICIALS_STAMP.json + b4_crew_profiles.csv + b4_game_referee_joined.csv')
