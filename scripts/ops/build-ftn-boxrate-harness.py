#!/usr/bin/env python3
"""Build real box-count harness: FTN charting 2024 joined to pbp 2024."""
import csv, json, statistics
from collections import defaultdict

# Load FTN per (game_id, play_id) -> n_defense_box etc.
ftn_by_play = {}
with open('data/nflverse/ftn/ftn_charting_2024.csv') as f:
    for row in csv.DictReader(f):
        gid = row['nflverse_game_id']
        pid = row['nflverse_play_id']
        try:
            box = float(row['n_defense_box'])
        except:
            box = None
        ftn_by_play[(gid, pid)] = {
            'box': box,
            'is_play_action': row['is_play_action'] == 'TRUE',
            'is_screen_pass': row['is_screen_pass'] == 'TRUE',
            'n_blitzers': int(row['n_blitzers']) if row['n_blitzers'] else 0,
        }

# Load PBP rush plays; aggregate per team-game
# We also collect rush EPA per team-game for correlation.
team_game = defaultdict(lambda: {
    'plays': 0,
    'rushPlays': 0,
    'box_counts': [],
    'heavy_boxes': 0,  # box >= 8
    'rush_epas': [],
    'rush_successes': [],
    'season': None,
    'week': None,
})

pbp_rush_total = 0
pbp_rush_with_ftn = 0
with open('data/nflverse/pbp/play_by_play_2024.csv') as f:
    for row in csv.DictReader(f):
        if row['play_type'] != 'run':
            continue
        pbp_rush_total += 1
        gid = row['game_id']
        pid = row['play_id']
        team = row['posteam']
        season = int(row['season'])
        week = int(row['week'])
        key = (gid, team)

        # Find matching FTN box count
        ftn_info = ftn_by_play.get((gid, pid))
        if ftn_info is None or ftn_info['box'] is None:
            # Skip plays with missing FTN charting
            continue
        pbp_rush_with_ftn += 1
        team_game[key]['plays'] += 1
        team_game[key]['rushPlays'] += 1
        box = ftn_info['box']
        team_game[key]['box_counts'].append(box)
        if box >= 8:
            team_game[key]['heavy_boxes'] += 1
        # Rush EPA / success from PBP
        try:
            epa = float(row['epa'])
        except:
            epa = None
        try:
            success = row['success'] == '1'
        except:
            success = False
        if epa is not None:
            team_game[key]['rush_epas'].append(epa)
        team_game[key]['rush_successes'].append(1 if success else 0)
        team_game[key]['season'] = season
        team_game[key]['week'] = week

# Also compute opponent info per team-game (oppTeam) — for simplicity, derive from pbp defteam
# But team-game aggregation above only has offense team; we'll output per offense team-game.
# Add oppTeam by looking up game->teams mapping.
game_teams = {}
with open('data/nflverse/pbp/play_by_play_2024.csv') as f:
    for row in csv.DictReader(f):
        gid = row['game_id']
        if gid not in game_teams:
            game_teams[gid] = {'home': row['home_team'], 'away': row['away_team'], 'posteam': row['posteam'], 'defteam': row['defteam']}

# Build output rows per offense team-game
output = []
for (gid, team), stats in team_game.items():
    opp = None
    # Derive opponent: from PBP defteam for any play in game; simple mapping
    # We'll just open PBP briefly for mapping team->opp per game using posteam/defteam from rush plays.
    # For simplicity, we'll set opp later by scanning pbp for this gid.
    pass

# Actually compute opp via quick pbp scan
opp_map = defaultdict(lambda: defaultdict(set))
with open('data/nflverse/pbp/play_by_play_2024.csv') as f:
    for row in csv.DictReader(f):
        gid = row['game_id']
        opp_map[gid][row['posteam']].add(row['defteam'])

for (gid, team), stats in team_game.items():
    opp_teams = opp_map[gid].get(team, set())
    opp = list(opp_teams)[0] if opp_teams else None
    n_plays = stats['rushPlays']
    avg_box = statistics.mean(stats['box_counts']) if stats['box_counts'] else None
    pct_heavy = (stats['heavy_boxes'] / stats['rushPlays']) if stats['rushPlays'] > 0 else None
    avg_epa = statistics.mean(stats['rush_epas']) if stats['rush_epas'] else None
    avg_success = statistics.mean(stats['rush_successes']) if stats['rush_successes'] else None
    output.append({
        'season': stats['season'],
        'week': stats['week'],
        'team': team,
        'oppTeam': opp,
        'game_id': gid,
        'plays': stats['plays'],
        'rushPlays': stats['rushPlays'],
        'avgBoxCount': round(avg_box, 3) if avg_box is not None else None,
        'pctRushVsHeavyBox': round(pct_heavy, 3) if pct_heavy is not None else None,
        'heavyBoxRate': round(pct_heavy, 3) if pct_heavy is not None else None,
        'avgRushEPA': round(avg_epa, 3) if avg_epa is not None else None,
        'avgRushSuccess': round(avg_success, 3) if avg_success is not None else None,
    })

# Sort
output.sort(key=lambda r: (r['season'], r['week'], r['team'], r['game_id']))

# Write JSONL
with open('data/nflverse/ftn_boxrate_2024.jsonl', 'w') as f:
    for row in output:
        f.write(json.dumps(row) + '\n')

print(f"Wrote {len(output)} team-game rows to data/nflverse/ftn_boxrate_2024.jsonl")
print(f"PBP rush plays: {pbp_rush_total}")
print(f"PBP rush plays with FTN match: {pbp_rush_with_ftn}")
print(f"Sample row: {output[0]}")
