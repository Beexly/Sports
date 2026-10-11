import pandas as pd
import pyarrow.parquet as pq
import numpy as np

sc = pd.read_csv('dfs/eq_harvest/raw/nflverse-data/snap_counts_2026.csv')
print('offense_pct sample:', sc['offense_pct'].dropna().head(3).tolist())
sk = sc[sc.position.isin(['WR', 'TE', 'RB'])]
vol = sk.groupby(['player', 'team', 'position']).agg(
    games=('week', 'nunique'), off_snaps=('offense_snaps', 'sum'),
    snap_pct=('offense_pct', 'mean')).reset_index()
v4 = vol[vol.games >= 4]
print('skill players w/ 4+ games:', len(v4))
print('snap_pct range:', v4.snap_pct.min(), '-', v4.snap_pct.max())

rec = pq.read_table('dfs/eq_harvest/raw/nflverse-data/advstats_week_rec_2026.parquet').to_pandas()
prod = rec.groupby('pfr_player_name').agg(
    broken_tackles=('receiving_broken_tackles', 'sum'),
    drops=('receiving_drop', 'sum')).reset_index()
vol['name_key'] = vol['player'].str.lower().str.replace(r"[.' ]", "", regex=True)
prod['name_key'] = prod['pfr_player_name'].str.lower().str.replace(r"[.' ]", "", regex=True)
both = set(vol.name_key) & set(prod.name_key)
print(f'name overlap: {len(both)} (vol {len(set(vol.name_key))} vs prod {len(set(prod.name_key))})')
print('sample overlap:', sorted(list(both))[:8])

w = vol.merge(prod, on='name_key', how='inner')
print(f'joined: {len(w)}')
if len(w):
    w['bt_per_game'] = w.broken_tackles / w.games
    w['drops_per_game'] = w.drops / w.games
    elite = w[(w.snap_pct >= 0.7) & (w.bt_per_game >= 0.75) & (w.drops_per_game <= 0.3)].sort_values(
        'bt_per_game', ascending=False)
    hands = w[(w.snap_pct >= 0.6) & (w.drops >= 4)].sort_values('drops', ascending=False)
    print(f'\nelite (snap>=70%, BT/g>=0.75, drops/g<=0.3): {len(elite)}')
    print(elite[['player', 'team', 'position', 'games', 'snap_pct', 'broken_tackles', 'drops']].head(12).to_string(index=False))
    print(f'\nhands watch (snap>=60%, drops>=4): {len(hands)}')
    print(hands[['player', 'team', 'games', 'snap_pct', 'drops']].head(8).to_string(index=False))
    elite.to_csv('dfs/receiver_watchlist_2026.csv', index=False)
    hands.to_csv('dfs/receiver_hands_watch_2026.csv', index=False)
    print('\nlanded watchlist CSVs')
