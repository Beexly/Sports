#!/usr/bin/env python3
"""Step 3: fix revenge definition (opponent's earlier rosters), add injury burden."""
import pandas as pd, numpy as np, pickle, glob, os
def log(*a): print(*a, flush=True)

rm = pickle.load(open('/tmp/nfl/rostermap.pkl','rb'))
pteam, years = rm['pteam'], rm['years']

t = pd.read_csv('/tmp/nfl/compound_table.csv', low_memory=False)

def rev(pid, opp, season):
    """player appears on OPPONENT's roster in a strictly earlier season"""
    if not isinstance(pid, str) or pid in ('nan',''): return 0
    for s in range(2015, int(season)):
        if opp in pteam.get((pid, s), ()): return 1
    return 0

t['home_qb_rev'] = [rev(q, o, s) for q,o,s in zip(t.home_qb_id, t.away_team, t.season)]
t['away_qb_rev'] = [rev(q, o, s) for q,o,s in zip(t.away_qb_id, t.home_team, t.season)]
log('REVENGE QB h/a games:', int(t.home_qb_rev.sum()), int(t.away_qb_rev.sum()),
    '| any-revenge games:', int(((t.home_qb_rev+t.away_qb_rev)>0).sum()))

# ---- injuries: final report status per player-week ----
inj = []
for f in sorted(glob.glob('/tmp/nfl/injuries_*.csv')):
    d = pd.read_csv(f, low_memory=False)
    cols = ['season','game_type','team','week','gsis_id','position','report_status','practice_status','date_modified']
    for c in cols:
        if c not in d.columns:
            d[c] = ''
    inj.append(d[cols])
inj = pd.concat(inj, ignore_index=True)
inj = inj[(inj.game_type=='REG') & (inj.season>=2015)]
inj = inj.sort_values('date_modified').drop_duplicates(['season','week','team','gsis_id'], keep='last')
inj['report_status'] = inj.report_status.fillna('')
inj['practice_status'] = inj.practice_status.fillna('')
inj['is_out'] = inj.report_status.str.contains('Out', case=False, na=False).astype(int)
inj['is_doubt'] = inj.report_status.str.contains('Doubtful', case=False, na=False).astype(int)
inj['is_q'] = inj.report_status.str.contains('Questionable', case=False, na=False).astype(int)
inj['no_practice'] = inj.practice_status.str.contains('Did Not Participate', case=False, na=False).astype(int)
tot = inj.groupby(['season','week','team']).agg(inj_out=('is_out','sum'), inj_doubt=('is_doubt','sum'),
        inj_q=('is_q','sum'), inj_np=('no_practice','sum')).reset_index()
log('injury team-weeks', len(tot), 'of games rows', len(t))
t = t.merge(tot, left_on=['season','week','home_team'], right_on=['season','week','team'], how='left').drop(columns=['team'])
t = t.rename(columns={'inj_out':'h_out','inj_doubt':'h_doubt','inj_q':'h_q','inj_np':'h_np'})
t = t.merge(tot, left_on=['season','week','away_team'], right_on=['season','week','team'], how='left').drop(columns=['team'])
t = t.rename(columns={'inj_out':'a_out','inj_doubt':'a_doubt','inj_q':'a_q','inj_np':'a_np'})
for c in ['h_out','h_doubt','h_q','h_np','a_out','a_doubt','a_q','a_np']:
    t[c] = t[c].fillna(0)
t['h_burden'] = t.h_out + t.h_doubt
t['a_burden'] = t.a_out + t.a_doubt
log('burden>=3 games h/a', int((t.h_burden>=3).sum()), int((t.a_burden>=3).sum()))

t.to_csv('/tmp/nfl/compound_table2.csv', index=False)
log('wrote compound_table2', t.shape)
