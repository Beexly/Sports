#!/usr/bin/env python3
"""Scan: correlation + split-half stability; honest caveats."""
import json, statistics

data = []
with open('data/nflverse/ftn_boxrate_2024.jsonl') as f:
    for line in f:
        data.append(json.loads(line))

# Correlation functions
def pearson(x, y):
    n = len(x)
    mx, my = sum(x)/n, sum(y)/n
    num = sum((x[i]-mx)*(y[i]-my) for i in range(n))
    den = (sum((xi-mx)**2 for xi in x) * sum((yi-my)**2 for yi in y)) ** 0.5
    return num/den if den else None

def spearman(x, y):
    rx = [sorted(x).index(v) + 1 for v in x]
    ry = [sorted(y).index(v) + 1 for v in y]
    return pearson(rx, ry)

boxes = [r['avgBoxCount'] for r in data if r['avgBoxCount'] is not None]
epas = [r['avgRushEPA'] for r in data if r['avgBoxCount'] is not None and r['avgRushEPA'] is not None]
successes = [r['avgRushSuccess'] for r in data if r['avgBoxCount'] is not None and r['avgRushSuccess'] is not None]

# Filter to same-length for correlation
min_len = min(len(boxes), len(epas))
boxes_e = boxes[:min_len]
epas_e = epas[:min_len]
min_len_s = min(len(boxes), len(successes))
boxes_s = boxes[:min_len_s]
successes_s = successes[:min_len_s]

r_epa_pearson = pearson(boxes_e, epas_e)
r_epa_spearman = spearman(boxes_e, epas_e)
r_succ_pearson = pearson(boxes_s, successes_s)
r_succ_spearman = spearman(boxes_s, successes_s)

# Split-half stability: team avgBoxCount weeks 1-8 vs 9-17
from collections import defaultdict
team_weeks = defaultdict(lambda: {'early': [], 'late': []})
for r in data:
    team = r['team']
    week = r['week']
    if r['avgBoxCount'] is not None:
        if week <= 8:
            team_weeks[team]['early'].append(r['avgBoxCount'])
        else:
            team_weeks[team]['late'].append(r['avgBoxCount'])

team_early = {}
team_late = {}
for team, vals in team_weeks.items():
    if vals['early'] and vals['late']:
        team_early[team] = statistics.mean(vals['early'])
        team_late[team] = statistics.mean(vals['late'])

early_vals = list(team_early.values())
late_vals = [team_late[t] for t in team_early]
stab_pearson = pearson(early_vals, late_vals)
stab_spearman = spearman(early_vals, late_vals)

report = f"""FTN Box-Count Scan — 2024 Only
================================
Dataset: data/nflverse/ftn_boxrate_2024.jsonl ({len(data)} team-game rows)
Source: FTN charting 2024 (1 vendor) joined to pbp 2024 via nflverse_game_id==game_id + nflverse_play_id==play_id.
Caveats: single season (2024), single charting vendor (FTN), no falsifier-run edge claim.

CORRELATIONS (team-game level)
-------------------------------
Avg defensive box count (mean n_defense_box over rush plays) vs:
  - Offensive rush EPA/game: Pearson r={r_epa_pearson:.4f}  Spearman ρ={r_epa_spearman:.4f}  (n={len(boxes_e)})
  - Offensive rush success rate/game: Pearson r={r_succ_pearson:.4f}  Spearman ρ={r_succ_spearman:.4f}  (n={len(boxes_s)})

Interpretation: correlation alone does NOT establish predictive edge. No falsifier-run claim made.

SPLIT-HALF STABILITY (team avgBoxCount, weeks 1-8 vs 9-17)
------------------------------------------------------------
Teams with data in both halves: {len(team_early)}
Pearson r (early vs late team avg): {stab_pearson:.4f}
Spearman ρ (early vs late team avg): {stab_spearman:.4f}

HONEST CAVEATS
--------------
- 2024 single-season; season-level variance unmeasured.
- FTN is ONE charting vendor; no cross-vendor validation.
- Correlation ≠ causation; no out-of-sample predictive test performed.
- Box count aggregated per-game; situational down/distance/context not fully controlled.
- No falsifier-run edge claim; this is a SCAN only.

OUTPUT FILES
-------------
- Script: scripts/ops/build-ftn-boxrate-harness.py
- Data: data/nflverse/ftn_boxrate_2024.jsonl
- Report: handoff/research/overnight-2026-08-26/ftn-boxrate-scan.md
"""

with open('handoff/research/overnight-2026-08-26/ftn-boxrate-scan.md', 'w') as f:
    f.write(report)

print(report)
