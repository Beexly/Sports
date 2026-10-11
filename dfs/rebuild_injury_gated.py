"""INJURY-GATED REBUILD — the fix for the Monangai miss.

The pool's status field is empty, but our own injuries_2026.parquet (FreshnessGate
artifact, 84h max age) has the wk5 report. Join by name, apply the gate, rebuild.
"""
import pandas as pd
import numpy as np
import itertools
import json
import time

df = pd.read_csv('dfs/main_slate_pool_154468.csv')
df = df[df.status.isna() | (df.status != 'O')].copy()

inj = pd.read_parquet('dfs/eq_harvest/raw/nflverse-data/injuries_2026.parquet')
w5 = inj[inj.week == 5]
out_dp = w5[w5.report_status.astype(str).str.contains('Out|Doubtful|IR', case=False, na=False)]
blocked = set(out_dp.full_name.str.strip())
questionable = set(w5[w5.report_status.astype(str).str.contains('Questionable', case=False, na=False)].full_name.str.strip())

# team code mapping: pool tsid is numeric, injuries use abbrev. Name-join is the honest path.
df['clean'] = df.name.str.strip()
df['injury_gate'] = df.clean.isin(blocked).map({True: 'OUT', False: 'ok'})
df.loc[df.clean.isin(questionable), 'injury_gate'] = 'Q'
n_out = (df.injury_gate == 'OUT').sum()
print(f'injury gate applied: {n_out} players OUT/Doubtful removed, '
      f'{(df.injury_gate=="Q").sum()} flagged Questionable')

# what did we lose from the old builds?
for nm in ['Kyle Monangai', 'Breece Hall', 'Zach Charbonnet', 'Stefon Diggs', 'Saquon Barkley']:
    r = df[df.name == nm]
    if len(r) and r.injury_gate.iloc[0] != 'ok':
        print(f'  REMOVED: {nm} ({r.injury_gate.iloc[0]})')

gated = df[df.injury_gate != 'OUT'].copy()
gated['proj'] = gated.ppg
gated.loc[gated.injury_gate == 'Q', 'proj'] *= 0.85  # Q discount, honest haircut

def build(pool, max_sal=50000):
    qbs = pool[pool.pos == 'QB'].sort_values('proj', ascending=False).head(8)
    rbs = pool[pool.pos == 'RB'].sort_values('proj', ascending=False).head(22)
    wrs = pool[pool.pos == 'WR'].sort_values('proj', ascending=False).head(30)
    tes = pool[pool.pos == 'TE'].sort_values('proj', ascending=False).head(10)
    dsts = pool[pool.pos == 'DST'].sort_values('proj', ascending=False).head(8)
    best = []
    for _, qb in qbs.iterrows():
        for _, rb1 in rbs.iterrows():
            for _, rb2 in rbs.iterrows():
                if rb1.pid <= rb2.pid:
                    continue
                base = qb.salary + rb1.salary + rb2.salary
                pts = qb.proj + rb1.proj + rb2.proj
                if base > max_sal - 3000:
                    continue
                for _, te in tes.iterrows():
                    b2 = base + te.salary
                    p2 = pts + te.proj
                    if b2 > max_sal - 2500:
                        continue
                    for _, dst in dsts.iterrows():
                        b3 = b2 + dst.salary
                        p3 = p2 + dst.proj
                        if b3 > max_sal:
                            continue
                        rem = max_sal - b3
                        wpool = wrs[wrs.salary <= rem]
                        if len(wpool) < 3:
                            continue
                        ws = wpool.sort_values('proj', ascending=False).head(6)
                        for combo in itertools.combinations(ws.itertuples(), 3):
                            tot = b3 + sum(w.salary for w in combo)
                            pt = p3 + sum(w.proj for w in combo)
                            if tot <= max_sal:
                                best.append({'pts': pt, 'sal': tot,
                                             'qb': qb['pid'], 'rbs': [rb1['pid'], rb2['pid']],
                                             'wrs': [w.pid for w in combo],
                                             'te': te['pid'], 'dst': dst['pid']})
    best.sort(key=lambda x: -x['pts'])
    return best

b = build(gated)
seen, out = set(), []
for l in b:
    key = tuple(sorted(l['wrs']) + l['rbs'] + [l['qb'], l['te'], l['dst']])
    if key in seen:
        continue
    seen.add(key)
    out.append(l)
    if len(out) >= 6:
        break

pid2row = {str(r.pid): i for i, r in gated.iterrows()}
def n(idx):
    r = gated.loc[pid2row[str(idx)]]
    tag = ' (Q)' if r.injury_gate == 'Q' else ''
    return f"{r['name']} ({r['pos']}, ${int(r.salary)}){tag}"

print('\n=== INJURY-GATED BUILDS — Red Zone $200K ===')
for i, l in enumerate(out):
    l['qb_n'] = n(l['qb']); l['rbs_n'] = [n(x) for x in l['rbs']]
    l['wrs_n'] = [n(x) for x in l['wrs']]; l['te_n'] = n(l['te']); l['dst_n'] = n(l['dst'])
    print(f"\n#{i+1}  proj {l['pts']:.1f}  ${l['sal']}")
    print(f"  QB  {l['qb_n']}")
    print(f"  RB  {l['rbs_n'][0]}  +  {l['rbs_n'][1]}")
    print(f"  WR  {l['wrs_n'][0]}  +  {l['wrs_n'][1]}  +  {l['wrs_n'][2]}")
    print(f"  TE  {l['te_n']}   DST  {l['dst_n']}")

json.dump({'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
           'builds': out,
           'injury_gate': {'removed': n_out, 'q_discount': 0.85,
                            'source': 'injuries_2026.parquet wk5 (nflverse, gate artifact #12)'},
           'target_contest': '196420201 NFL $200K Red Zone (Single Entry, locks 12:00 CT)',
           'label': 'DIAGNOSTIC — season PPG baseline with injury gate'},
          open('dfs/RED_ZONE_BUILDS_INJURY_GATED.json', 'w'), indent=1)
print('\nlanded RED_ZONE_BUILDS_INJURY_GATED.json')
