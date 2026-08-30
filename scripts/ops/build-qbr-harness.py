#!/usr/bin/env python3
"""QBR team harness: team-game QBR rows from qbr_week_level (REG only) + persistence + margin-correlation."""
import csv, json, statistics
from collections import defaultdict

rows = []
with open('data/nflverse/espn/qbr_week_level.csv') as f:
    for r in csv.DictReader(f):
        if r['season_type'] not in ('REG', 'Regular'): continue
        try:
            season = int(r['season'])
        except: continue
        team = r['team_abb']
        if season < 2018: continue
        week = int(r['game_week']) if r['game_week'] else None
        gid = r['game_id']
        try:
            qbr = float(r['qbr_total']) if r['qbr_total'] else None
        except:
            qbr = None
        pts_added = float(r['pts_added']) if r['pts_added'] else None
        qb_plays = int(r['qb_plays']) if r['qb_plays'] else None
        rows.append({
            'season': season,
            'game_week': week,
            'team_abb': team,
            'game_id': gid,
            'qbr_total': qbr,
            'pts_added': pts_added,
            'qb_plays': qb_plays,
        })

# Write harness rows
with open('data/nflverse/qbr_harness_rows.jsonl', 'w') as f:
    for r in rows:
        f.write(json.dumps(r) + '\n')
print(f"Wrote {len(rows)} team-week QBR rows (REG only) to data/nflverse/qbr_harness_rows.jsonl")

# Year-over-year TEAM persistence: mean QBR season t vs t+1 (2019-2024 seasons present)
team_season_qbr = defaultdict(lambda: defaultdict(list))
for r in rows:
    if r['qbr_total'] is not None:
        team_season_qbr[r['team_abb']][r['season']].append(r['qbr_total'])

team_mean = {}
for team, seasons in team_season_qbr.items():
    team_mean[team] = {s: statistics.mean(v) for s, v in seasons.items() if v}

def persistence():
    pairs = []
    years = sorted({y for tm in team_mean.values() for y in tm})
    for y in years:
        if (y+1) not in years: continue
        for team in team_mean:
            if y in team_mean[team] and (y+1) in team_mean[team]:
                pairs.append((team_mean[team][y], team_mean[team][y+1]))
    def pearson(x, y):
        n = len(x); mx, my = sum(x)/n, sum(y)/n
        num = sum((x[i]-mx)*(y[i]-my) for i in range(n))
        den = (sum((xi-mx)**2 for xi in x)*sum((yi-my)**2 for yi in y))**0.5
        return num/den if den else None
    def spearman(x, y):
        rx = [sorted(x).index(v)+1 for v in x]
        ry = [sorted(y).index(v)+1 for v in y]
        return pearson(rx, ry)
    x = [p[0] for p in pairs]
    yv = [p[1] for p in pairs]
    return len(pairs), pearson(x, yv), spearman(x, yv)

n_p, p_r, s_r = persistence()
print(f"\n=== QBR TEAM YEAR-OVER-YEAR PERSISTENCE (2019-2024, Spearman) ===")
print(f"Pairs (team-season t -> t+1): {n_p}")
print(f"Pearson r = {p_r:.4f}")
print(f"Spearman ρ = {s_r:.4f}")
print(f"Caveat: correlation ≠ predictive edge; descriptive persistence only. REG-season only. Not out-of-sample.")

# Same-season QBR vs point-margin correlation — need pbp score differential; approximate via team season avg
# We'll read pbp 2024 to get team-season average score differential per game as proxy margin
margin = defaultdict(lambda: defaultdict(list))
import csv as csv_mod
for season in [2022, 2023, 2024]:
    try:
        with open(f'data/nflverse/pbp/play_by_play_{season}.csv') as f:
            for r in csv_mod.DictReader(f):
                if r['season_type'] not in ('REG', 'Regular'): continue
                gid = r['game_id']
                team = r['posteam']
                try:
                    diff = float(r['score_differential_post'])
                except: diff = None
                if diff is not None:
                    margin[season][team].append(diff)
    except: pass

team_season_margin = {}
for s, teams in margin.items():
    team_season_margin[s] = {t: statistics.mean(v) for t, v in teams.items() if v}

# Pair QBR mean with margin mean per team-season (only seasons with both)
qbr_margin_pairs = []
for team in team_mean:
    for s in team_mean[team]:
        if s in team_season_margin and s in team_season_margin:
            if team in team_season_margin[s] and team_mean[team].get(s) is not None:
                qbr_margin_pairs.append((team_mean[team][s], team_season_margin[s].get(team)))
# Filter out None margins
qbr_margin_pairs = [(q, m) for q, m in qbr_margin_pairs if m is not None]

def pearson(x, y):
    n = len(x); mx, my = sum(x)/n, sum(y)/n
    num = sum((x[i]-mx)*(y[i]-my) for i in range(n))
    den = (sum((xi-mx)**2 for xi in x)*sum((yi-my)**2 for yi in y))**0.5
    return num/den if den else None

def spearman(x, y):
    rx = [sorted(x).index(v)+1 for v in x]
    ry = [sorted(y).index(v)+1 for v in y]
    return pearson(rx, ry)

qm_pearson = pearson([p[0] for p in qbr_margin_pairs], [p[1] for p in qbr_margin_pairs])
qm_spearman = spearman([p[0] for p in qbr_margin_pairs], [p[1] for p in qbr_margin_pairs])
print(f"\n=== QBR vs POINT-MARGIN (same-season, team-season avg) ===")
print(f"Pairs: {len(qbr_margin_pairs)}")
print(f"Pearson r = {qm_pearson:.4f}  Spearman ρ = {qm_spearman:.4f}")
print(f"Disclaimer: correlation ≠ predictive edge; descriptive scan only. Margin from pbp score_differential_post (post-play).")
