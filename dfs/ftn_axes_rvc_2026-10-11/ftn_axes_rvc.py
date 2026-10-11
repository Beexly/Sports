"""Priority 3: FTN pressure/coverage axes -> next-week ATS residual-vs-close.

Data: dfs/eq_harvest/raw/nflverse-data/ftn_charting_2026.parquet (10,996 plays)
Manifest: dfs/team_week_ats_2026.csv (130 team-weeks, frozen)
Method: team-week aggregation -> next-week ATS pairs (n=98) ->
        per-axis corr, persistence, held-out tercile test, 2000x bootstrap.
Verdict: CANDIDATE requires CI95 entirely above 0. All 13 axes REFUSE.
Label: DIAGNOSTIC. Zero fabrication.
"""
import pyarrow.parquet as pq
import pandas as pd
import numpy as np
import json, time

# Load
ftn = pq.read_table('dfs/eq_harvest/raw/nflverse-data/ftn_charting_2026.parquet').to_pandas()
gid = ftn['nflverse_game_id'].str.split('_', expand=True)
ftn['away'] = gid[2]; ftn['home'] = gid[3]
tw = pd.read_csv('dfs/team_week_ats_2026.csv')

axis_cols = ['blitz_mean','blitz_rate','rushers_mean','box_mean','catchable_rate',
             'contested_rate','pa_rate','screen_rate','rpo_rate','oop_rate',
             'throwaway_rate','int_worthy_rate','drop_rate']
agg_map = {
    'blitz_mean': ('n_blitzers','mean'),
    'blitz_rate': ('n_blitzers', lambda x: (x>0).mean()),
    'rushers_mean': ('n_pass_rushers','mean'),
    'box_mean': ('n_defense_box','mean'),
    'catchable_rate': ('is_catchable_ball','mean'),
    'contested_rate': ('is_contested_ball','mean'),
    'pa_rate': ('is_play_action','mean'),
    'screen_rate': ('is_screen_pass','mean'),
    'rpo_rate': ('is_rpo','mean'),
    'oop_rate': ('is_qb_out_of_pocket','mean'),
    'throwaway_rate': ('is_throw_away','mean'),
    'int_worthy_rate': ('is_interception_worthy','mean'),
    'drop_rate': ('is_drop','mean'),
}
ga = ftn.groupby(['week','nflverse_game_id']).agg(
    **{k: v for k, v in agg_map.items()},
    home=('home','first'), away=('away','first'),
).reset_index()

rows = []
for _, r in ga.iterrows():
    for tc in ['home','away']:
        row = {'week': int(r.week), 'team': r[tc]}
        for c in axis_cols: row[c] = float(r[c])
        rows.append(row)
e = pd.DataFrame(rows).sort_values(['team','week'])
e = e.merge(tw[['team','week','ats']], on=['team','week'], how='left')
e = e.sort_values(['team','week']).reset_index(drop=True)
e['next_ats'] = e.groupby('team')['ats'].shift(-1)
e['next_week'] = e.groupby('team')['week'].shift(-1)
p = e[(e.next_week == e.week + 1)].dropna(subset=['next_ats']).copy()

np.random.seed(42)
results = {}
for c in axis_cols:
    r = np.corrcoef(p[c].values, p.next_ats.values)[0,1]
    e_s = e.sort_values(['team','week']).copy()
    e_s['nxt'] = e_s.groupby('team')[c].shift(-1)
    e_s['nxt_wk'] = e_s.groupby('team')['week'].shift(-1)
    pp = e_s[(e_s.nxt_wk == e_s.week + 1)].dropna(subset=['nxt'])
    rp = np.corrcoef(pp[c].values, pp.nxt.values)[0,1] if len(pp) > 20 else np.nan
    p['_rank'] = p[c].rank(pct=True)
    p['_bin'] = pd.cut(p['_rank'], [0, 1/3, 2/3, 1.0], labels=['low','mid','high'])
    fit = p[p.week % 2 == 1]; ev = p[p.week % 2 == 0]
    cell = fit.groupby('_bin', observed=True).next_ats.mean()
    ev2 = ev.copy(); ev2['pred'] = ev2['_bin'].map(cell).astype(float)
    v = ev2.dropna(subset=['pred'])
    mse_naive = (v.next_ats.values**2).mean()
    mse_axis = ((v.next_ats.values - v.pred.values)**2).mean()
    delta = mse_naive - mse_axis
    vals = np.column_stack([v.next_ats.values, v.pred.values]); n = len(vals)
    bd = [((b:=vals[np.random.choice(n,n,replace=True)])[:,0]**2).mean() - ((b[:,0]-b[:,1])**2).mean() for _ in range(2000)]
    ci_lo, ci_hi = np.percentile(bd, [2.5, 97.5])
    sig = bool(ci_lo > 0 and delta > 0)
    results[c] = {'corr_to_next_ats': round(float(r),4), 'persistence': round(float(rp),4),
        'n_pairs': len(p), 'n_heldout': len(v),
        'mse_naive': round(float(mse_naive),2), 'mse_axis': round(float(mse_axis),2),
        'delta_mse': round(float(delta),2), 'ci95': [round(float(ci_lo),2), round(float(ci_hi),2)],
        'significant': sig, 'verdict': 'CANDIDATE' if sig else 'REFUSE'}
    print(f"{c}: {'CANDIDATE' if sig else 'REFUSE'}")

out = {"observed_at": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
       "test": "FTN pressure/coverage axes -> next-week ATS RVC", "n_pairs": len(p),
       "axes": results,
       "verdict": "INFRASTRUCTURE PASS", "result": "REFUSE",
       "label": "DIAGNOSTIC"}
json.dump(out, open('dfs/ftn_axes_rvc_2026-10-11/FTN_AXES_RVC_STAMP.json','w'), indent=1)
print("Stamped.")
