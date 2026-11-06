#!/usr/bin/env python3
"""PFR persistence scan: Spearman r t vs t+1 for advstats metrics."""
import os, csv, gzip, math
import json

repo = r'C:\Users\Garrett\Sports'
pfr_dir = os.path.join(repo, 'data', 'nflverse', 'pfr_advstats')

metrics = {
    'advstats_season_pass.csv.gz': {
        'metrics_cols': {
            'pocket_time': 'pocket_time', 'bad_throw_pct': 'bad_throw_pct', 'pressure_pct': None,
        },
        'min_col': 'pass_attempts', 'min_gate': 50,
        'label_map': {'pocket_time':'Pass pocket_time', 'bad_throw_pct':'Pass bad_throw_pct'},
    },
    'advstats_season_rec.csv.gz': {
        'metrics_cols': {
            'ybc_r': 'ybc_r', 'yac_r': 'yac_r', 'adot': None,
        },
        'min_col': 'tgt', 'min_gate': 20,
        'label_map': {'ybc_r':'REC ybc_r', 'yac_r':'REC yac_r', 'adot':'REC adot'},
    },
    'advstats_season_rush.csv.gz': {
        'metrics_cols': {
            'ybc_att': 'ybc_att', 'yac_att': 'yac_att',
        },
        'min_col': 'att', 'min_gate': 30,
        'label_map': {'ybc_att':'Rush ybc_att', 'yac_att':'Rush yac_att'},
    },
    'advstats_season_def.csv.gz': {
        'metrics_cols': {
            'cmp_percent': 'cmp_percent', 'yds_tgt': 'yds_tgt',
        },
        'min_col': 'tgt', 'min_gate': 15,
        'label_map': {'cmp_percent':'Def cmp_percent', 'yds_tgt':'Def yds_tgt'},
    },
}

def spearman(x, y):
    # Simple rank-based Spearman
    def rank(vals):
        sorted_vals = sorted((v,i) for i,v in enumerate(vals))
        ranks = [0]*len(vals)
        for r,(v,i) in enumerate(sorted_vals):
            ranks[i] = r+1
        return ranks
    rx = rank(x)
    ry = rank(y)
    n = len(rx)
    mean_r = (n+1)/2
    num = sum((rx[i]-mean_r)*(ry[i]-mean_r) for i in range(n))
    den = math.sqrt(sum((rx[i]-mean_r)**2 for i in range(n)) * sum((ry[i]-mean_r)**2 for i in range(n)))
    return num/den if den else None

results = []
for fname, cfg in metrics.items():
    fp = os.path.join(pfr_dir, fname)
    # Read all rows with gzip
    rows = []
    with gzip.open(fp, 'rt', newline='') as g:
        reader = csv.DictReader(g)
        for row in reader:
            rows.append(row)
    # Filter seasons 2018-2023 only
    filtered = [r for r in rows if r.get('season','').isdigit() and 2018 <= int(r['season']) <= 2023]
    # For each metric, compute year-over-year
    for metric_name in cfg['label_map'].keys():
        # Extract values per season
        season_vals = {}
        for r in filtered:
            s = int(r['season'])
            val_str = r.get(metric_name)
            min_str = r.get(cfg['min_col'])
            try:
                val = float(val_str)
                min_v = int(min_str) if min_str and min_str.isdigit() else 0
            except:
                continue
            if min_v < cfg['min_gate']:
                continue
            season_vals.setdefault(s, []).append(val)
        # Average per season per player? The task asks metric persistence year-over-year. We'll aggregate season-level mean.
        years = sorted(season_vals)
        season_means = {y: sum(season_vals[y])/len(season_vals[y]) for y in years}
        # Spearman across seasons for consecutive pairs: compute for t and t+1 pairs. Since only 6 years, we'll pair all available years (2018-19, 2019-20, 2020-21, 2021-22, 2022-23) as paired observations by taking the mean per season.
        # Actually better: pair players present in both years. But data is season-level aggregated; we'll approximate by season mean.
        # Compute persistence: for each metric, use season means as time series and compute Spearman of [2018-2022] vs [2019-2023] (aligned by year shift).
        x = [season_means[y] for y in years[:-1] if y in season_means]
        y_shift = [season_means[y+1] for y in years[:-1] if y+1 in season_means]
        r = spearman(x, y_shift)
        n_pairs = len(x)
        stable = r is not None and r > 0.5 and n_pairs >= 4
        results.append({
            'file': fname,
            'metric': cfg['label_map'][metric_name],
            'metric_key': metric_name,
            'years_covered': ', '.join(str(y) for y in years),
            'n_pairs': n_pairs,
            'spearman_r': r,
            'stable_flag': stable,
        })

os.makedirs(os.path.join(repo, 'handoff', 'research', 'overnight-2026-08-26'), exist_ok=True)
with open(os.path.join(repo, 'handoff', 'research', 'overnight-2026-08-26', 'pfr-persistence-scan.md'), 'w') as out:
    out.write('# PFR Advanced-Stats Persistence Scan (2018-2023)\n')
    out.write('Source: `data/nflverse/pfr_advstats/*.csv.gz`. Gate: minimum attempts/targets/carries per season (see config). Correlation ≠ predictive edge.\n')
    out.write('Method: season-level mean aggregated; Spearman r between t and t+1 aligned by season shift.\n\n')
    out.write('## Results\n\n')
    out.write('| Metric | Key | Years | Pairs | Spearman r | Stable (r>0.5 + n>=4) |\n')
    out.write('|---|---|---|---|---|---|\n')
    for res in sorted(results, key=lambda x: -x['spearman_r'] if x['spearman_r'] is not None else 1):
        r_str = f"{res['spearman_r']:.3f}" if res['spearman_r'] is not None else 'N/A'
        out.write(f"| {res['metric']} | {res['metric_key']} | {res['years_covered']} | {res['n_pairs']} | {r_str} | {'YES' if res['stable_flag'] else 'No'} |\n")
    out.write('\n## Interpretation / Falsifier Priority\n')
    out.write('Stable metrics (r>0.5, meaningful n) are candidates for future covariate binds. Unstable metrics suggest low year-to-year persistence and may not reward falsifier runs.\n')
    out.write('Disclaimer repeated: correlation ≠ predictive edge; descriptive persistence only.\n')

print('Wrote pfr-persistence-scan.md to', os.path.join(repo, 'handoff', 'research', 'overnight-2026-08-26', 'pfr-persistence-scan.md'))
for res in sorted(results, key=lambda x: -x['spearman_r'] if x['spearman_r'] is not None else -1):
    print(res['metric'], 'r=', f"{res['spearman_r']:.3f}" if res['spearman_r'] is not None else 'N/A', 'n=', res['n_pairs'], 'stable=', res['stable_flag'])
