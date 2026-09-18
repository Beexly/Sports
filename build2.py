#!/usr/bin/env python3
"""Step 2: build compound feature table using cached roster map."""
import pandas as pd, numpy as np, pickle, sys
def log(*a): print(*a, flush=True)

rm = pickle.load(open('/tmp/nfl/rostermap.pkl','rb'))
pteam, years = rm['pteam'], rm['years']

G = pd.read_csv('/tmp/sched.csv', low_memory=False)
g = G[(G.game_type == 'REG') & (G.season >= 2015) & (G.season <= 2025)].copy()
g = g[g.home_score.notna() & g.away_score.notna()]

def devig(a, h):
    def dec(m):
        m = float(m); return 1 + (m / 100.0 if m > 0 else 100.0 / abs(m))
    da, dh = dec(a), dec(h); pa, ph = 1/da, 1/dh
    return ph/(pa+ph)

g['qClose'] = [devig(a,h) if (pd.notna(a) and pd.notna(h)) else np.nan
               for a,h in zip(g.away_moneyline, g.home_moneyline)]
g['home_win'] = (g.home_score > g.away_score).astype(int)
log('games', len(g), 'qClose nonnull', int(g.qClose.notna().sum()))
from math import erf, sqrt
m = g.qClose.isna()
g.loc[m,'qClose'] = [0.5*(1+erf((s/13.5)/sqrt(2))) for s in g.loc[m,'spread_line'].astype(float)]

g = g.sort_values(['season','week','gameday']).reset_index(drop=True)
g['rest_diff'] = g.home_rest - g.away_rest

# HC mode table
hc = {}
for r in G.itertuples():
    if r.season < 2014: continue
    for t,c in ((r.home_team,r.home_coach),(r.away_team,r.away_coach)):
        if pd.notna(c): hc.setdefault((int(r.season),t),[]).append(c)
HC = {k: pd.Series(v).mode().iat[0] for k,v in hc.items()}
g['home_hc_new'] = [1 if HC.get((int(s),t))!=HC.get((int(s)-1,t)) else 0 for s,t in zip(g.season,g.home_team)]
g['away_hc_new'] = [1 if HC.get((int(s),t))!=HC.get((int(s)-1,t)) else 0 for s,t in zip(g.season,g.away_team)]
log('new HC home/away', int(g.home_hc_new.sum()), int(g.away_hc_new.sum()))

def is_alt(s):
    s=str(s).lower(); return ('empower field' in s) or ('sports authority' in s) or ('estadio azteca' in s)
g['home_alt']=g.stadium.map(is_alt).astype(int)
log('alt games', int(g.home_alt.sum()))

g=g.sort_values(['gameday','week']).reset_index(drop=True)
streak={}; away_streak=[]
for r in g.itertuples():
    away_streak.append(streak.get(r.away_team,0))
    streak[r.home_team]=0
    streak[r.away_team]=streak.get(r.away_team,0)+1
g['away_road_streak']=away_streak
g['away_road2']=(g.away_road_streak>=2).astype(int)
outdoor=g.roof.isin(['outdoors','open'])
g['cold_windy']=((outdoor)&((g.temp<=40)|(g.wind>=15))).astype(int)
log('road2', int(g.away_road2.sum()), 'cold_windy', int(g.cold_windy.sum()))

def rev(pid, team, season):
    if not isinstance(pid,str) or pid in ('nan',''): return 0
    for s in range(2015,int(season)):
        if team in pteam.get((pid,s),()): return 1
    return 0
def rook(pid, season):
    ye=years.get((pid,int(season))); return 1 if ye==0 else 0
g['home_qb_rev']=[rev(q,t,s) for q,t,s in zip(g.home_qb_id,g.home_team,g.season)]
g['away_qb_rev']=[rev(q,t,s) for q,t,s in zip(g.away_qb_id,g.away_team,g.season)]
g['home_qb_rook']=[rook(q,s) for q,s in zip(g.home_qb_id,g.season)]
g['away_qb_rook']=[rook(q,s) for q,s in zip(g.away_qb_id,g.season)]
log('reverseQB h/a', int(g.home_qb_rev.sum()), int(g.away_qb_rev.sum()),
    'rookieQB h/a', int(g.home_qb_rook.sum()), int(g.away_qb_rook.sum()))

# ---- backup QB: previous-game starter + season-leading starter as of week ----
g=g.sort_values(['season','week','gameday']).reset_index(drop=True)
prev_start={}; starts={}
hb=[]; ab=[]
for r in g.itertuples():
    for side,qb,team,out in (('h',r.home_qb_id,r.home_team,hb),('a',r.away_qb_id,r.away_team,ab)):
        key=(int(r.season),team)
        lead = starts.get(key,{})
        top = max(lead.items(), key=lambda kv: kv[1])[0] if lead else None
        prev = prev_start.get((int(r.season),team))
        is_backup = 1 if (prev is not None and qb!=prev and qb!=top) else 0
        if prev is None:  # first game of season: backup if never started for team in prior season
            is_backup = 0
        out.append(is_backup)
        prev_start[(int(r.season),team)] = qb
        lead[qb]=lead.get(qb,0)+1
        starts[key]=lead
g['home_qb_backup']=hb; g['away_qb_backup']=ab
log('backup QB h/a', int(g.home_qb_backup.sum()), int(g.away_qb_backup.sum()))

g.to_csv('/tmp/nfl/compound_table.csv',index=False)
log('wrote', g.shape)