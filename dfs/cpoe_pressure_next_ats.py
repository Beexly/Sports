"""P1: CPOE-pressure signature -> next-week ATS residual (2026, weeks 1-5).

Signature: team-week (cpoe, times_pressured, bad_throw) -> next week ATS.
RVC framing: does the signature beat the naive (ATS ~ 0, i.e. market efficient)?
Held-out: fit on odd weeks, evaluate even weeks.
"""
import pandas as pd
import numpy as np
import json
import time

j = pd.read_csv('dfs/cpoe_x_pressure_2026.csv')      # 128 QB-weeks w/ team, week, cpoe, pressure
tw = pd.read_csv('dfs/team_week_ats_2026.csv')        # 130 team-weeks w/ ats

# team-week aggregation of the QB signature (primary QB = max attempts row per team-week)
qb_tw = j.sort_values('attempts', ascending=False).groupby(['team', 'week']).agg(
    cpoe=('cpoe', 'first'),
    pressured=('times_pressured', 'first'),
    bad_throw=('passing_bad_throw_pct', 'mean'),
    name=('player_display_name', 'first')).reset_index()
print(f'QB team-week signatures: {len(qb_tw)}')

sig = qb_tw.merge(tw, on=['team', 'week'], how='inner')
print(f'signature + ATS joined: {len(sig)}')

# next-week linkage: team's signature in week w -> ATS in week w+1
sig = sig.sort_values(['team', 'week'])
sig['next_ats'] = sig.groupby('team')['ats'].shift(-1).astype(float)
sig['next_week'] = sig.groupby('team')['week'].shift(-1)
pairs = sig[(sig.next_week == sig.week + 1)].dropna(subset=['next_ats']).copy()
pairs['next_ats'] = pairs['next_ats'].astype(float)
print(f'next-week pairs: {len(pairs)}')

# test 1: does high-CPOE-under-pressure predict next ATS?
if len(pairs) >= 20:
    r1 = np.corrcoef(pairs.cpoe, pairs.next_ats)[0, 1]
    r2 = np.corrcoef(pairs.pressured.fillna(0), pairs.next_ats)[0, 1]
    # composite: CPOE over expected given pressure (cpoe + pressure premium)
    pairs['cpoe_p'] = pairs.cpoe + 0.15 * pairs.pressured.fillna(0)
    r3 = np.corrcoef(pairs.cpoe_p, pairs.next_ats)[0, 1]
    print(f'\ncorr(CPOE_w, ATS_w+1): {r1:+.4f}')
    print(f'corr(pressure_w, ATS_w+1): {r2:+.4f}')
    print(f'corr(CPOE+0.15*P_w, ATS_w+1): {r3:+.4f}')

    # held-out: cell-conditional prediction
    pairs = pairs.copy()
    pairs['cpoe_f'] = pairs.cpoe.astype(float)
    pairs['cpoe_bin'] = pd.cut(pairs.cpoe_f, [-15, -2, 2, 15], labels=['low', 'mid', 'high'])
    fit = pairs[pairs.week % 2 == 1]
    ev = pairs[pairs.week % 2 == 0]
    cell = fit.groupby('cpoe_bin', observed=True).next_ats.mean()
    ev2 = ev.copy()
    ev2['pred'] = ev2.cpoe_bin.map(cell).astype(float)
    v = ev2.dropna(subset=['pred'])
    v = v.assign(next_ats=v.next_ats.astype(float), pred=v.pred.astype(float))
    mse_naive = (v.next_ats ** 2).mean()
    mse_sig = ((v.next_ats - v.pred) ** 2).mean()
    print(f'\nHeld-out (n={len(v)}): MSE naive {mse_naive:.2f} vs signature {mse_sig:.2f} '
          f'→ {"SIGNATURE ADDS" if mse_sig < mse_naive else "SIGNATURE ADDS NOTHING"}')

    stamp = {
        'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'test': 'CPOE-pressure signature -> next-week ATS (2026 wk1-5, frozen 2026 outcomes)',
        'n_pairs': int(len(pairs)),
        'correlations': {'cpoe_to_next_ats': round(float(r1), 4),
                          'pressure_to_next_ats': round(float(r2), 4),
                          'cpoe_pressure_to_next_ats': round(float(r3), 4)},
        'held_out': {'mse_naive': round(float(mse_naive), 2), 'mse_signature': round(float(mse_sig), 2),
                      'verdict': 'SIGNATURE ADDS' if mse_sig < mse_naive else 'SIGNATURE ADDS NOTHING'},
        'label': 'DIAGNOSTIC',
    }
else:
    stamp = {'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
             'test': 'CPOE-pressure -> next-week ATS', 'n_pairs': int(len(pairs)),
             'verdict': 'INSUFFICIENT PAIRS (<20) — 2026 only 5 weeks; reopen: 3 more weeks',
             'label': 'DIAGNOSTIC'}
json.dump(stamp, open('dfs/CPOE_PRESSURE_NEXT_ATS.json', 'w'), indent=1)
print('\nlanded CPOE_PRESSURE_NEXT_ATS.json')
