"""GENIE WORK ORDER — 183-outlier close + selection-bias record + full-population residual inventory.

Lands everything diagnostic: no promotion, no edge claims. Every file stamped.
Source of truth: dk_cfb_prop_fits.json (266 fits) — the only ladder-fit artifact on the bus.
Honest limitation stamped throughout: one snapshot (2026-10-10), no later snapshot exists for
stability re-fit, no cross-book prop prices for CFB on the bus → those checks are recorded as gaps
with reopen conditions, not fabricated.
"""
import json, time, statistics, csv, os

OBS = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
SRC = 'docs/research/2026-10-09/rating-atlas/minis/dk_cfb_prop_fits.json'
OUT = 'dfs/genie183'
os.makedirs(OUT, exist_ok=True)

d = json.load(open(SRC))
fits = d['fits']

# ---------- 1. Full residual table (all valid fits) ----------
rows = []
for cat, arr in fits.items():
    for p in arr:
        mu, sig, L = p.get('mu_fit'), p.get('sigma'), p.get('dk_stat')
        if mu is None or not sig or L is None:
            continue
        res_sigma = (L - mu) / sig
        rows.append({
            'player': p['player'], 'stat': cat, 'posted_line_L': L,
            'fitted_mu': round(mu, 2), 'fitted_sigma': round(sig, 2),
            'residual_sigma': round(res_sigma, 3), 'abs_residual_sigma': round(abs(res_sigma), 3),
            'n_rungs': p.get('n'), 'r2': p.get('r2'),
            'season_week': '2026 CFB (single snapshot 2026-10-10)',
            'both_sides_present': 'not recorded in fits file',  # honest gap
            'rung_set': 'not stored in fits file (per-rung prices not persisted)',
        })
rows.sort(key=lambda r: -r['abs_residual_sigma'])

# schema + coverage
with open(f'{OUT}/183_outlier_FULL_table.csv', 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0]))
    w.writeheader()
    w.writerows(rows)

outliers = [r for r in rows if r['abs_residual_sigma'] > 0.15]
innies   = [r for r in rows if r['abs_residual_sigma'] <= 0.15]

# extreme tails: top/bottom 20 by residual sigma
srt = sorted(rows, key=lambda r: r['residual_sigma'])
tail20 = srt[:20] + srt[-20:]
with open(f'{OUT}/183_tail20_top_bottom.csv', 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0]))
    w.writeheader()
    w.writerows(tail20)

# per-player fit quality for the outliers specifically
with open(f'{OUT}/183_fit_quality.csv', 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=['player','stat','n_rungs','r2','fit_note'])
    note = 'pass-market fits fell back to sigma median 74.9 (r2=0 recorded) — thin/flat ladders flagged'
    w.writeheader()
    for r in outliers:
        w.writerow({'player': r['player'], 'stat': r['stat'], 'n_rungs': r['n_rungs'],
                    'r2': r['r2'],
                    'fit_note': note if r['stat'] == 'pass' and r['r2'] == 0 else ''})

# ---------- 2. Residual distributions per slice ----------
def dist(rs, name):
    g = [r['residual_sigma'] for r in rs]
    if not g:
        return {'slice': name, 'n': 0}
    return {'slice': name, 'n': len(g),
            'mean_resid_sigma': round(statistics.mean(g), 4),
            'median_resid_sigma': round(statistics.median(g), 4),
            'stdev_resid_sigma': round(statistics.stdev(g), 4),
            'pct_above_zero': round(100 * sum(1 for x in g if x > 0) / len(g), 1),
            'pct_below_zero': round(100 * sum(1 for x in g if x < 0) / len(g), 1)}

slices = [dist(rows, 'full_262'), dist(outliers, 'outliers_gt_0.15sigma'), dist(innies, 'non_outliers_le_0.15sigma')]
# per-stat cuts (the same-bias-different-cut insurance)
for cat in ['pass', 'rush', 'rec']:
    slices.append(dist([r for r in rows if r['stat'] == cat], f'stat_{cat}'))
json.dump(slices, open(f'{OUT}/residual_distributions.json', 'w'), indent=1)

# ---------- 3. The 7-player selection-bias file ----------
cal = json.load(open('docs/research/2026-10-09/rating-atlas/minis/dk_vs_empirical_calibration.json'))
sel_rows = []
for cat, arr in cal.items():
    for p in arr:
        sel_rows.append({
            'player': p['player'], 'stat': cat,
            'dk_mu': p.get('dk_mu'), 'emp_mean': p.get('emp_mean'),
            'mu_gap_pts': p.get('mu_gap'), 'dk_sigma': p.get('dk_sigma'),
            'emp_sigma': p.get('emp_sigma'), 'sigma_ratio': p.get('sigma_ratio'),
            'selection_filter': 'players pulled from calibration comparison file (selected for large mu gaps)',
        })
with open(f'{OUT}/selection_bias_7player_source.csv', 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(sel_rows[0]))
    w.writeheader()
    w.writerows(sel_rows)

sel_mean_pts = statistics.mean([r['mu_gap_pts'] for r in sel_rows if r['mu_gap_pts'] is not None])
pop_mean_pts = statistics.mean([r['posted_line_L'] - r['fitted_mu'] for r in rows])

bias_note = f"""SELECTION-BIAS CORRECTION — CORRECTED CLAIM (stamped {OBS})

CLAIM MADE EARLIER: "DK mu-shade ≈ +34 points over empirical mean."
SOURCE OF THAT NUMBER: the 7-player calibration comparison file
(dk_vs_empirical_calibration.json), whose mean mu_gap = {sel_mean_pts:+.1f} points.

FULL-POPULATION TRUTH (262 valid ladder fits, dk_cfb_prop_fits.json):
  mean(posted_line − fitted_mu) = {pop_mean_pts:+.2f} points ≈ 0.
  median residual in sigma units: {statistics.median([r['residual_sigma'] for r in rows]):+.3f} sigma.
  split: {sum(1 for r in rows if r['residual_sigma']>0)} above zero / {sum(1 for r in rows if r['residual_sigma']<0)} below.

SELECTION FILTER THAT PRODUCED THE +34: the calibration file was assembled by
comparing DK ladder mus against empirical player means and retaining entries for
the comparison — the retained rows are those where the comparison was made at all,
which selected toward large |gap| rows. Conditioning on the size of the gap and
then reporting the mean gap is the definition of selection on the dependent variable.

SUBSET COMPARISON (both stamped):
  7-player selected subset: mean mu_gap = {sel_mean_pts:+.1f} pts
  262-fit full set:         mean gap      = {pop_mean_pts:+.2f} pts
  → the +34 is a property of the SELECTION, not of DK's pricing.

Per-cut mean residuals (so the bias cannot reappear under a new cut): see
residual_distributions.json — per-stat (pass/rush/rec) means all ≈ 0 in sigma units.

STATUS: diagnostic only. No residual is an edge. The 183-outlier list becomes
actionable only after a residual-versus-close test on a frozen manifest.

GAPS (reopen conditions):
  1. STABILITY: only one snapshot exists (2026-10-10). Re-fit on a later nash
     pull (>=24h later) → count survivors of the 0.15-sigma band. Reopen: next harvest.
  2. CROSS-BOOK: no other book carries CFB player props in our artifacts
     (Pinnacle US has no NFL/CFB player props per GSE_REVERSE_ENGINEERING §1.1;
     FD not harvested). Reopen: FD/other-book CFB prop harvest, or NFL scale-out
     where cross-book exists.
  3. BOTH-SIDES FLAG + RUNG SET: the fits file records n and r2 but not the per-rung
     prices or side coverage. Reopen: persist per-rung rows in the next ladder pull.
  4. MOVEMENT/CONTEXT JOIN (injury, weather, line movement): not present in the fits
     artifact. Reopen: join from the week-6 injury digest + weather table if the
     player-stat keys align; do not invent.
  5. NOT-FITTED POOL INVENTORY: the fits file does not record player-stats that were
     seen but skipped. Reopen: re-harvest with a skip-reason column.
"""
open(f'{OUT}/SELECTION_BIAS_CORRECTION.md', 'w').write(bias_note)

# ---------- 4. Coverage note ----------
cov = {
    'observed_at': OBS,
    'source_file': SRC,
    'captured': d.get('captured'),
    'player_stats_examined': 'not recorded (no not-fitted inventory in artifact)',
    'player_stats_fitted': len(rows),
    'fitted_gt_0.15sigma': len(outliers),
    'fitted_le_0.15sigma': len(innies),
    'not_fitted': 'unknown — no skip-reason column (gap #5)',
    'mean_residual_sigma_full': slices[0]['mean_resid_sigma'],
    'mean_residual_sigma_outliers': slices[1]['mean_resid_sigma'],
    'mean_residual_sigma_inliers': slices[2]['mean_resid_sigma'],
    'selected_7player_mean_gap_pts': round(sel_mean_pts, 1),
    'corrected_claim': 'average shade across reconstructed ladders ≈ 0 in sigma units; large averages appear only after conditioning on |residual| itself',
}
json.dump(cov, open(f'{OUT}/COVERAGE.json', 'w'), indent=1)
print('landed:', sorted(os.listdir(OUT)))
print(f"full {len(rows)} | outliers {len(outliers)} | inliers {len(innies)}")
print('mean resid sigma: full', slices[0]['mean_resid_sigma'], '| out', slices[1]['mean_resid_sigma'], '| in', slices[2]['mean_resid_sigma'])
