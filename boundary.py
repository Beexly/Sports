#!/usr/bin/env python3
"""Boundary (Gate 5c) + stability cells for the powered compounds D1, E1, F2, B2."""
import pandas as pd, numpy as np
rng = np.random.default_rng(7)
t = pd.read_csv('/tmp/nfl/compound_table2.csv', low_memory=False); t=t[t.qClose.notna()].copy()
def dec(ml):
    ml=float(ml); return 1+(ml/100.0 if ml>0 else 100.0/abs(ml))
H = pd.DataFrame(dict(season=t.season, team=t.home_team, y=t.home_win, q=t.qClose,
    own_rest=t.home_rest, rest_diff=t.home_rest-t.away_rest, burden=t.h_burden,
    rook_qb=t.home_qb_rook, hc_new=t.home_hc_new, opp_hc_new=t.away_hc_new, is_home=1))
A = pd.DataFrame(dict(season=t.season, team=t.away_team, y=1-t.home_win, q=1-t.qClose,
    own_rest=t.away_rest, rest_diff=t.away_rest-t.home_rest, burden=t.a_burden,
    rook_qb=t.away_qb_rook, hc_new=t.away_hc_new, opp_hc_new=t.home_hc_new, is_home=0))
d = pd.concat([H,A], ignore_index=True)

def cell(sub, label):
    n=len(sub)
    if n<10:
        print(f'  {label}: n={n} TOO_FEW'); return
    r = float(sub.y.mean()-sub.q.mean())
    bs=[]
    idx=np.arange(n)
    for _ in range(2000):
        s=rng.choice(idx,size=n,replace=True)
        bs.append(sub.y.values[s].mean()-sub.q.values[s].mean())
    lo,hi=np.percentile(bs,[5,95])
    print(f'  {label}: n={n} resid={r:+.3f} ci90=[{lo:+.3f},{hi:+.3f}]')

print('D1 boundary: burden x rest')
sub = d[(d.burden>=3)&(d.own_rest<=6)]
for lo_b,hi_b in [(3,3),(4,4),(5,99)]:
    for r in [5,6]:
        cell(sub[(sub.burden>=lo_b)&(sub.burden<=hi_b)&(sub.own_rest==r)], f'burden {lo_b}-{hi_b} rest={r}')
print('D1 by half')
cell(sub[sub.season<=2019],'2015-2019'); cell(sub[sub.season>=2020],'2020-2025')
print('D1 vs unflagged-control (burden>=3, rest>=7)')
cell(d[(d.burden>=3)&(d.own_rest>=7)],'burden>=3 long rest')
cell(d[(d.burden<3)&(d.own_rest<=6)],'low burden short rest')
cell(d[(d.burden<3)&(d.own_rest>=7)],'low burden long rest')

print('E1 boundary: new HC x opp continuity')
e = d[(d.hc_new==1)&(d.opp_hc_new==0)]
cell(e[e.season<=2019],'2015-2019'); cell(e[e.season>=2020],'2020-2025')
cell(e[e.is_home==1],'home'); cell(e[e.is_home==0],'away')
cell(d[(d.hc_new==1)&(d.opp_hc_new==1)],'both new HC (control)')

print('F2 rookie x burden')
cell(d[(d.rook_qb==1)&(d.burden>=3)],'compound'); cell(d[(d.rook_qb==1)&(d.burden<3)],'rookie only')
cell(d[(d.rook_qb==0)&(d.burden>=3)],'burden only')
