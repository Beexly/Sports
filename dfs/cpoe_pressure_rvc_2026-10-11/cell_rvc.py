"""P1-cell: CPOE x pressure-BIN residual-vs-close tables (2026, weeks 1-5).

Extends cpoe_pressure_next_ats.py (pooled, REFUSED) to conditional cells.
RVC framing: within each pressure bin, does CPOE predict next-week ATS
residual beyond what the close already says (naive: ATS residual ~ 0)?

Method (mirrors the pooled script for comparability):
- team-week aggregation: primary QB = max attempts row per team-week
- signature(week w) -> ATS residual(week w+1), consecutive weeks only
- per pressure bin: OLS next_ats ~ cpoe; report slope, t, p, n, R2
- held-out: fit odd weeks, evaluate even weeks -> MSE vs naive within bin
- multiple testing: 4 bins -> Bonferroni alpha = 0.05/4 = 0.0125
"""
import pandas as pd, numpy as np, json
from scipy import stats

j = pd.read_csv('/tmp/cpoe_rvc/cpoe_x_pressure_2026.csv')
tw = pd.read_csv('/tmp/cpoe_rvc/team_week_ats_2026.csv')

qb_tw = j.sort_values('attempts', ascending=False).groupby(['team','week']).agg(
    cpoe=('cpoe','first'), pressured=('times_pressured','first'),
    bad_throw=('passing_bad_throw_pct','mean'),
    name=('player_display_name','first'),
    press_bin=('press_bin','first')).reset_index()
print('QB team-weeks:', len(qb_tw))
print('press_bin values:', sorted(qb_tw.press_bin.unique()))

sig = qb_tw.merge(tw, on=['team','week'], how='inner')
sig = sig.sort_values(['team','week'])
sig['next_ats'] = sig.groupby('team')['ats'].shift(-1).astype(float)
sig['next_week'] = sig.groupby('team')['week'].shift(-1)
pairs = sig[(sig.next_week == sig.week+1)].dropna(subset=['next_ats']).copy()
pairs['next_ats'] = pairs['next_ats'].astype(float)
print('next-week pairs:', len(pairs))

BONF = 0.05/4
cells = {}
for b in sorted(pairs.press_bin.unique()):
    d = pairs[pairs.press_bin == b].copy()
    n = len(d)
    cell = {'bin': b, 'n': n}
    if n >= 10:
        x = d['cpoe'].values; y = d['next_ats'].values
        slope, icept, r, p, se = stats.linregress(x, y)
        t = slope/se if se > 0 else 0.0
        # held-out: fit odd weeks, test even
        tr = d[d.week % 2 == 1]; te = d[d.week % 2 == 0]
        ho = {}
        if len(tr) >= 5 and len(te) >= 5:
            s2, i2, *_ = stats.linregress(tr['cpoe'], tr['next_ats'])
            pred = i2 + s2*te['cpoe'].values
            mse_sig = float(np.mean((te['next_ats'].values - pred)**2))
            mse_naive = float(np.mean(te['next_ats'].values**2))
            ho = {'n_train': len(tr), 'n_test': len(te),
                  'mse_naive': round(mse_naive,2), 'mse_sig': round(mse_sig,2),
                  'beats_naive': bool(mse_sig < mse_naive)}
        cell.update({'slope': round(float(slope),4), 't': round(float(t),3),
                     'p': round(float(p),4), 'r': round(float(r),4),
                     'mean_cpoe': round(float(x.mean()),3),
                     'mean_next_ats': round(float(y.mean()),3),
                     'bonf_sig': bool(p < BONF), 'held_out': ho})
    else:
        cell['note'] = 'n<10, refused'
    cells[b] = cell

# heavy-pressure hypothesis: press_bin (9,100] mean CPOE
hp = pairs[pairs.press_bin == '(9, 100]']
hyp = {'n': len(hp), 'mean_cpoe': round(float(hp.cpoe.mean()),3) if len(hp) else None}

out = {
  'observed_at': '2026-10-11T12:45:00Z',
  'test': 'CPOE x pressure-BIN -> next-week ATS residual vs close (2026 wk1-5)',
  'n_pairs_total': len(pairs),
  'method': 'OLS next_ats ~ cpoe within pressure bin; held-out fit-odd/test-even; Bonferroni 0.0125 over 4 bins',
  'heavy_pressure_hypothesis': hyp,
  'cells': cells,
  'verdict': None,
  'label': 'DIAGNOSTIC'
}
surv = [b for b,c in cells.items() if c.get('bonf_sig')]
out['verdict'] = ('PASS: cell(s) '+str(surv)+' survive Bonferroni -> DIAGNOSTIC CANDIDATES'
                  if surv else 'REFUSE: no pressure bin survives Bonferroni correction')
json.dump(out, open('/tmp/cpoe_rvc/CPOE_PRESSURE_CELL_RVC.json','w'), indent=1)
print(json.dumps(out, indent=1)[:3000])
