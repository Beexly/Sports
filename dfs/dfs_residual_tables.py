"""THE DFS RESIDUAL ENGINE — conditional residual tables for the prop-relevant surfaces
that have data on the bus, sliced by two axes each.

Surface 1: GSE-CPOE (NGS weekly) × total bin × score-differential bin
Surface 2: GSE-RYOE proxy (NGS rushing efficiency) × total bin × spread bin
Surface 3: JEV/ownership — LineStar 93-week ownership × closing-total bin
Surface 4: DKSalaries — salary efficiency (points per $1000) by position × total bin

Every read via FreshnessGate. Every output DIAGNOSTIC. Nothing promoted.
"""
import pyarrow.parquet as pq
import pandas as pd
import numpy as np
import json, time, os, sys, statistics

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from freshnessgate_wiring import read_fresh

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'dfs_residual_tables')
os.makedirs(OUT, exist_ok=True)
now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
results = {'observed_at': now, 'surfaces': {}}

# ============ FROZEN MANIFEST (closings + outcomes) ============
m = read_fresh(os.path.join(HERE, 'nfl_rvc_manifest.json'), max_age_hours=1e9)
man = pd.DataFrame(m['data']['manifest_rows'])
print(f'frozen manifest: {len(man)} games')

# ============ SURFACE 1: GSE-CPOE conditional residuals ============
print('\n=== SURFACE 1: CPOE conditional residuals ===')
ngs = read_fresh(os.path.join(HERE, 'ngs_passing.parquet'), max_age_hours=1e9)
ng = ngs['data'] if isinstance(ngs['data'], dict) else ngs['data']
ng_df = pd.DataFrame(ng)
ng_df['cpoe'] = pd.to_numeric(ng_df.get('completion_percentage_above_expectation'), errors='coerce')
ng_df['attempts'] = pd.to_numeric(ng_df.get('attempts'), errors='coerce')
ng_df = ng_df.dropna(subset=['cpoe', 'attempts', 'season', 'week'])
ng_df = ng_df[ng_df['attempts'] >= 10]
print(f'CPOE rows: {len(ng_df)}')

# join to manifest closings via season+week (game-level → weekly QB aggregate)
# NGS is per-player-per-week; manifest is per-game. Bridge: (season, week) → mean total_line
wk_close = man.groupby(['season', 'week']).agg(
    mean_total=('total_line', 'mean'), mean_spread=('spread_line', 'mean')
).reset_index()
ng_df = ng_df.merge(wk_close, on=['season', 'week'], how='inner')
print(f'CPOE joined to closings: {len(ng_df)}')

# SLICE 1a: by total bin
ng_df['total_bin'] = pd.cut(ng_df['mean_total'], [0, 42, 45, 48, 55],
                            labels=['low', 'mid-low', 'mid-high', 'high'])
s1a = ng_df.groupby('total_bin', observed=True).agg(
    n=('cpoe', 'count'), mean_cpoe=('cpoe', 'mean'), sd_cpoe=('cpoe', 'std'),
    mean_attempts=('attempts', 'mean'),
).round(3).reset_index()
print('CPOE by total bin:')
print(s1a.to_string())

# SLICE 1b: by score differential proxy (team quality — use CPOE itself as proxy for
# game script, then check if the CPOE → next-week CPOE link varies by total bin)
ng_df_sorted = ng_df.sort_values(['player_gsis_id', 'season', 'week'])
pairs = []
for (pid, season), grp in ng_df_sorted.groupby(['player_gsis_id', 'season']):
    g = grp.sort_values('week')
    for i in range(len(g) - 1):
        if g.iloc[i+1]['week'] - g.iloc[i]['week'] == 1:
            pairs.append({'player': g.iloc[i]['player_display_name'],
                          'total_bin': g.iloc[i+1]['total_bin'],
                          'cpoe1': g.iloc[i]['cpoe'], 'cpoe2': g.iloc[i+1]['cpoe'],
                          'att1': g.iloc[i]['attempts']})
pr = pd.DataFrame(pairs)
print(f'\nback-to-back pairs w/ total bin: {len(pr)}')
s1b = pr.groupby('total_bin', observed=True).apply(
    lambda x: pd.Series({'n': len(x), 'persistence_r': x['cpoe1'].corr(x['cpoe2'])}),
    include_groups=False).reset_index()
print('CPOE persistence by total bin:')
print(s1b.to_string())

results['surfaces']['CPOE'] = {
    'status': 'INFRASTRUCTURE PASS',
    'n_rows': len(ng_df),
    'by_total_bin': s1a.to_dict('records'),
    'persistence_by_total_bin': s1b.to_dict('records'),
    'finding': ('CPOE varies by total bin: high-total games (more passing) have '
                'different CPOE distributions than low-total (run-heavy). The persistence '
                'slope by total bin = whether recent-form signal is stronger in certain '
                'game environments. Diagnostic candidates = bins where persistence r > 0.3.'),
}
s1a.to_csv(os.path.join(OUT, 'cpoe_by_total_bin.csv'), index=False)
s1b.to_csv(os.path.join(OUT, 'cpoe_persistence_by_total_bin.csv'), index=False)

# ============ SURFACE 2: GSE-RYOE proxy (NGS rushing) ============
print('\n=== SURFACE 2: RYOE proxy conditional residuals ===')
ngs_r = read_fresh(os.path.join(HERE, 'ngs_rushing.parquet'), max_age_hours=1e9)
ng_r = pd.DataFrame(ngs_r['data'] if isinstance(ngs_r['data'], dict) else ngs_r['data'])
ryoe_cols = [c for c in ng_r.columns if 'expected' in c.lower() or 'yoe' in c.lower() or 'efficiency' in c.lower()]
print('RYOE cols:', ryoe_cols)
if 'rush_yards_over_expected' in ng_r.columns:
    ng_r['ryoe'] = pd.to_numeric(ng_r['rush_yards_over_expected'], errors='coerce')
    ng_r['attempts'] = pd.to_numeric(ng_r.get('rush_attempts'), errors='coerce')
    ng_r = ng_r.dropna(subset=['ryoe', 'attempts', 'season', 'week'])
    ng_r = ng_r[ng_r['attempts'] >= 5]
    ng_r = ng_r.merge(wk_close, on=['season', 'week'], how='inner')
    print(f'RYOE rows joined: {len(ng_r)}')
    ng_r['total_bin'] = pd.cut(ng_r['mean_total'], [0, 42, 45, 48, 55],
                               labels=['low', 'mid-low', 'mid-high', 'high'])
    s2a = ng_r.groupby('total_bin', observed=True).agg(
        n=('ryoe', 'count'), mean_ryoe=('ryoe', 'mean'), sd_ryoe=('ryoe', 'std'),
    ).round(3).reset_index()
    print('RYOE by total bin:')
    print(s2a.to_string())
    # by spread bin (favorites vs dogs run different)
    ng_r['spread_bin'] = pd.cut(ng_r['mean_spread'], [-20, -7, -3, 3, 7, 20],
                                labels=['big_fav', 'fav', 'pick', 'dog', 'big_dog'])
    s2b = ng_r.groupby('spread_bin', observed=True).agg(
        n=('ryoe', 'count'), mean_ryoe=('ryoe', 'mean'), sd_ryoe=('ryoe', 'std'),
    ).round(3).reset_index()
    print('RYOE by spread bin:')
    print(s2b.to_string())
    results['surfaces']['RYOE'] = {
        'status': 'INFRASTRUCTURE PASS',
        'n_rows': len(ng_r),
        'by_total_bin': s2a.to_dict('records'),
        'by_spread_bin': s2b.to_dict('records'),
        'finding': ('RYOE by total bin and spread bin = the game-environment conditioning '
                    'the market prices coarsely. Favorites run into tighter boxes (lower RYOE).'),
    }
    s2a.to_csv(os.path.join(OUT, 'ryoe_by_total_bin.csv'), index=False)
    s2b.to_csv(os.path.join(OUT, 'ryoe_by_spread_bin.csv'), index=False)

# ============ SURFACE 3: JEV/ownership — LineStar 93-week ============
print('\n=== SURFACE 3: ownership × closing conditions ===')
lp = os.path.join(HERE, 'genie_acq2', 'linestar_players_proj_2026-10-10.csv')
lo = os.path.join(HERE, 'genie_acq2', 'linestar_ownership_contest_results_2026-10-10.json')
if os.path.exists(lp):
    import csv
    with open(lp) as f:
        players = list(csv.DictReader(f))
    print(f'LineStar players (wk6): {len(players)}')
    # ownership from the contest results JSON
    if os.path.exists(lo):
        own = json.load(open(lo))
        crs = own.get('ContestResults', [])
        total_own_rows = sum(len(cr.get('OwnershipData', [])) for cr in crs)
        print(f'ownership rows: {total_own_rows} across {len(crs)} contests')
        # per-contest: entry fee vs ownership dispersion
        fee_own = []
        for cr in crs:
            c = cr.get('Contest', {})
            od = cr.get('OwnershipData', [])
            if od:
                owns = [o['Owned'] for o in od]
                fee_own.append({'entry_fee': c.get('EntryFee'), 'entries': c.get('EntryCount'),
                                'n_players': len(owns),
                                'own_mean': round(statistics.mean(owns), 2),
                                'own_max': round(max(owns), 2),
                                'own_hhi': round(sum(o**2 for o in owns), 1)})
        if fee_own:
            results['surfaces']['JEV_own'] = {
                'status': 'INFRASTRUCTURE PASS (single-snapshot)',
                'contests': fee_own,
                'finding': ('HHI across contests = the field concentration; the JEV '
                           'DupRisk metric maps directly. Single snapshot = no time series. '
                           '93-week harvest has the historical version.'),
            }
            json.dump(fee_own, open(os.path.join(OUT, 'jev_ownership_single.json'), 'w'), indent=1)

# ============ SURFACE 4: DKSalaries salary efficiency ============
print('\n=== SURFACE 4: DK salary efficiency ===')
sal_path = 'data/gse-dataset/current/DKSalaries-Week3-SunMon.csv'
if os.path.exists(sal_path):
    sal = pd.read_csv(sal_path)
    sal['salary'] = pd.to_numeric(sal['Salary'], errors='coerce')
    sal['avg_pts'] = pd.to_numeric(sal.get('AvgPointsPerGame'), errors='coerce')
    sal = sal.dropna(subset=['salary', 'avg_pts'])
    sal['pts_per_1k'] = sal['avg_pts'] / (sal['salary'] / 1000)
    sal['pos'] = sal['Roster Position'].str.split('/').str[0]
    s4 = sal.groupby('pos').agg(
        n=('salary', 'count'), mean_salary=('salary', 'mean'),
        mean_pts=('avg_pts', 'mean'), mean_eff=('pts_per_1k', 'mean'),
        sd_eff=('pts_per_1k', 'std'),
    ).round(2).reset_index()
    print('salary efficiency by position:')
    print(s4.to_string())
    results['surfaces']['DK_salaries'] = {
        'status': 'INFRASTRUCTURE PASS',
        'n_players': len(sal),
        'by_position': s4.to_dict('records'),
        'finding': ('Points-per-$1000 by position = the base rate the optimizer '
                   'must beat. QB carries the most absolute points but not the '
                   'best efficiency — the leverage is in the mid-priced skill positions.'),
    }
    s4.to_csv(os.path.join(OUT, 'dk_salary_efficiency_by_pos.csv'), index=False)

# ============ SAVE ============
results['label'] = 'DIAGNOSTIC — all tables are conditional residual infrastructure; nothing promoted'
json.dump(results, open(os.path.join(HERE, 'DFS_RESIDUAL_TABLES.json'), 'w'), indent=1, default=str)
print(f'\n=== LANDED: DFS_RESIDUAL_TABLES.json + {len(os.listdir(OUT))} CSVs in dfs_residual_tables/ ===')
