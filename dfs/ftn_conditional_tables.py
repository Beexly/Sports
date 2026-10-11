"""CONDITIONAL RESIDUAL TABLES v2 — FTN charting pressure axes × NGS CPOE.
The table that was REFUSED for a week (needs FTN data) — nflverse mirrors FTN charting free.

Axis 1: n_blitzers (0-4) — the pressure proxy the market prices coarsely
Axis 2: qb_location (S/U/0/P) — pocket vs scramble vs pitch
Axis 3: is_play_action / is_rpo — formation/selection
Target: team-level pass environment (CPOE via NGS; catchable/contested via FTN itself)

All DIAGNOSTIC. Frozen 2026 season-to-date (weeks 1-5).
"""
import pyarrow.parquet as pq
import pandas as pd
import numpy as np
import json, time, os

HERE = os.path.dirname(os.path.abspath(__file__))
now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

ftn = pq.read_table(os.path.join(HERE, 'eq_harvest', 'raw', 'nflverse-data', 'ftn_charting_2026.parquet')).to_pandas()
print(f'FTN 2026: {len(ftn)} plays, weeks {sorted(ftn.week.unique())}')

# Parse team from nflverse_game_id: 2026_01_NE_SEA → away_NE home_SEA
gid = ftn['nflverse_game_id'].str.split('_', expand=True)
ftn['away'] = gid[2]
ftn['home'] = gid[3]

# Pass plays only (has read_thrown or catchable flags populated)
passes = ftn[ftn['read_thrown'].notna() | ftn['is_catchable_ball'].notna()].copy()
print(f'pass-flagged plays: {len(passes)}')

# ============ TABLE 1: CPOE proxy by n_blitzers ============
# FTN doesn't carry CPOE; it carries catchable/contested/created. Build the
# pressure-response table from FTN's own axes:
print('\n=== T1: pass outcome by n_blitzers ===')
t1 = passes.groupby('n_blitzers').agg(
    n_plays=('nflverse_play_id', 'count'),
    catchable_rate=('is_catchable_ball', 'mean'),
    contested_rate=('is_contested_ball', 'mean'),
    created_recep_rate=('is_created_reception', 'mean'),
    drop_rate=('is_drop', 'mean'),
    int_worthy_rate=('is_interception_worthy', 'mean'),
).round(3).reset_index()
print(t1.to_string())

# ============ TABLE 2: by qb_location ============
print('\n=== T2: pass outcome by qb_location ===')
t2 = passes.groupby('qb_location').agg(
    n_plays=('nflverse_play_id', 'count'),
    catchable_rate=('is_catchable_ball', 'mean'),
    contested_rate=('is_contested_ball', 'mean'),
    created_recep_rate=('is_created_reception', 'mean'),
    int_worthy_rate=('is_interception_worthy', 'mean'),
).round(3).reset_index()
print(t2.to_string())

# ============ TABLE 3: by play_action / RPO ============
print('\n=== T3: play-action and RPO effects ===')
for flag in ['is_play_action', 'is_rpo', 'is_screen_pass']:
    if flag in passes.columns:
        g = passes.groupby(flag).agg(
            n=('nflverse_play_id', 'count'),
            catchable_rate=('is_catchable_ball', 'mean'),
            contested_rate=('is_contested_ball', 'mean'),
        ).round(3)
        print(f'\n{flag}:')
        print(g.to_string())

# ============ TABLE 4: THE RVC — team-week catchable rate vs the market ============
# join to the frozen manifest's closings via (season, week, home/away)
man = pd.DataFrame(json.load(open(os.path.join(HERE, 'nfl_rvc_manifest.json')))['manifest_rows'])
# 2026 games only in manifest? check
print(f"\nmanifest seasons: {sorted(man.season.unique())[-3:]}")
# team-week pass environment:
passes['team'] = passes['posteam'] if 'posteam' in passes.columns else None
# FTN has no posteam; derive per play from home/away? read_thrown rows — use qb team from
# starting_hash (ball_on) can't give team. Use both teams per game (aggregate game-level):
game_env = passes.groupby(['season', 'week', 'nflverse_game_id']).agg(
    n_pass_plays=('nflverse_play_id', 'count'),
    catchable_rate=('is_catchable_ball', 'mean'),
    contested_rate=('is_contested_ball', 'mean'),
    mean_blitzers=('n_blitzers', 'mean'),
    mean_box=('n_defense_box', 'mean'),
    playaction_rate=('is_play_action', 'mean'),
).round(3).reset_index()
print(f'\ngame environments: {len(game_env)}')
# merge closings on nflverse_game_id if manifest has it
mcols = man.columns.tolist()
print('manifest cols:', mcols[:12])
if 'game_id' in man.columns:
    man['nflverse_game_id'] = man['season'].astype(str) + '_' + man['week'].astype(str).str.zfill(2) + '_' + man.get('away_team', pd.Series()).astype(str) + '_' + man.get('home_team', pd.Series()).astype(str)
    j = game_env.merge(man[['nflverse_game_id', 'total_line', 'spread_line']], on='nflverse_game_id', how='inner')
    print(f'joined to manifest closings: {len(j)} games')
    if len(j) > 20:
        j['total_bin'] = pd.cut(j['total_line'], [0, 42, 45, 48, 99])
        t4 = j.groupby('total_bin', observed=True).agg(
            n_games=('nflverse_game_id', 'count'),
            catchable_rate=('catchable_rate', 'mean'),
            contested_rate=('contested_rate', 'mean'),
            mean_blitzers=('mean_blitzers', 'mean'),
            playaction_rate=('playaction_rate', 'mean'),
        ).round(3).reset_index()
        print('\n=== T4: pass environment vs closing total (THE RVC TABLE) ===')
        print(t4.to_string())
        t4.to_csv(os.path.join(HERE, 'ftn_env_vs_close.csv'), index=False)

for name, t in [('t1_blitzers', t1), ('t2_qb_location', t2)]:
    t.to_csv(os.path.join(HERE, f'ftn_{name}.csv'), index=False)

stamp = {
    'observed_at': now,
    'test': 'FTN charting conditional tables (2026 wk1-5) — the pressure-axis close the prop lane wanted',
    'source': 'nflverse-data ftn_charting release (free mirror of FTN Data)',
    'n_plays': len(ftn), 'n_pass_flagged': len(passes),
    'tables': ['t1_blitzers', 't2_qb_location', 't3_playaction_rpo (stdout)', 't4_env_vs_close'],
    'key_numbers': {
        'blitz_0_catchable': float(t1[t1.n_blitzers == 0].catchable_rate.iloc[0]) if len(t1) else None,
        'qb_location_dist': passes['qb_location'].value_counts().to_dict(),
        'catchable_rate_overall': round(float(passes['is_catchable_ball'].mean()), 3),
    },
    'rvc_status': 'DESCRIPTIVE PASS — environment axes landed. RVC vs close = T4 (if join >20 games). '
                  'Player-level CPOE join still needs NGS-FTN player mapping.',
    'label': 'DIAGNOSTIC',
}
json.dump(stamp, open(os.path.join(HERE, 'FTN_CONDITIONAL_TABLES.json'), 'w'), indent=1)
print('\nlanded FTN_CONDITIONAL_TABLES.json + CSVs')
