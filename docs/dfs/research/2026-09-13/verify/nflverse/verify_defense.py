"""Reproduce the 2025 NFL defensive matchup verification numbers.
Inputs (in this dir): pbp2025.csv (nflverse play_by_play_2025, tag pbp),
roster2025.csv (nflverse roster_2025, tag rosters). Regular season only.
"""
import pandas as pd

pbp = pd.read_csv('pbp2025.csv',
    usecols=lambda c: c in {'season_type','defteam','pass_attempt','sack','epa',
                            'complete_pass','receiver_player_id','yards_gained',
                            'pass_touchdown'}, low_memory=False)
reg = pbp[pbp['season_type'] == 'REG']
p = reg[reg['defteam'].notna()].copy()

# 1) Sack rate = sacks / dropbacks (pass_attempt includes sacks in nflverse)
dropbacks = p.groupby('defteam')['pass_attempt'].sum()
sacks = p.groupby('defteam')['sack'].sum()
sr = (sacks / dropbacks * 100).sort_values(ascending=False)
print('SACK RATE'); print(sr.round(2).to_string()); print()

# 6) EPA per dropback allowed
d = p[(p['pass_attempt'] == 1) | (p['sack'] == 1)]
epa_db = (d.groupby('defteam')['epa'].sum() / d.groupby('defteam').size()).sort_values(ascending=False)
print('EPA/DROPBACK ALLOWED (worst first)'); print(epa_db.round(4).to_string()); print()

# 4) TE production allowed (roster position join)
ros = pd.read_csv('roster2025.csv', usecols=['gsis_id', 'position']).drop_duplicates('gsis_id')
te_ids = set(ros.loc[ros['position'] == 'TE', 'gsis_id'])
rec = reg[(reg['complete_pass'] == 1) & reg['receiver_player_id'].isin(te_ids)].copy()
g = rec.groupby('defteam')
te = pd.DataFrame({'yds': g['yards_gained'].sum(), 'rec': g.size(), 'td': g['pass_touchdown'].sum()})
te['half_ppr'] = te['rec'] * 0.5 + te['yds'] / 10 + te['td'] * 6
te['ppr'] = te['rec'] + te['yds'] / 10 + te['td'] * 6
print('TE HALF-PPR PTS ALLOWED (most first)'); print(te['half_ppr'].sort_values(ascending=False).round(1).to_string()); print()

# 7) Passing TDs allowed
print('PASSING TDS ALLOWED (most first)')
print(p.groupby('defteam')['pass_touchdown'].sum().sort_values(ascending=False).astype(int).to_string())
