#!/usr/bin/env python3
"""L2: revenge, within-player. Targets/receptions vs same player's trailing-5 mean,
player FE + dt_since_last_meeting. Frozen spec: report section 5, L2.
NOTE: player_stats 2025 = HTTP 404 (logged); window is 2015-2024. DISCLOSED DEVIATION.
"""
import json, os, time, pickle, glob
import numpy as np, pandas as pd

NFL="/tmp/nfl"; OUT=f"{NFL}/res_L2.json"
LOG=open(f"{NFL}/l2.log","a",buffering=1)
def log(*a): print(*a,file=LOG,flush=True)
def save(d):
    with open(OUT,"w") as f: json.dump(d,f,indent=2,default=str); f.flush(); os.fsync(f.fileno())
R={}

rm=pickle.load(open(f"{NFL}/rostermap.pkl","rb")); PT=rm["pteam"]

ps=[]
for f in sorted(glob.glob(f"{NFL}/player_stats_*.csv")):
    y=int(f.split("_")[-1].split(".")[0])
    d=pd.read_csv(f,usecols=["player_id","position","recent_team","season","week",
                             "season_type","opponent_team","targets","receptions","carries"],low_memory=False)
    ps.append(d)
ps=pd.concat(ps,ignore_index=True)
ps=ps[(ps.season_type=="REG") & ps.opponent_team.notna() & ps.recent_team.notna()]
ps=ps.dropna(subset=["targets"])
R["rows_raw"]=int(len(ps)); R["seasons"]=[int(ps.season.min()),int(ps.season.max())]
log("rows",len(ps),"seasons",R["seasons"])

def was_on(pid,team,season):
    if not isinstance(pid,str): return False
    for s in range(2015,int(season)):
        if team in PT.get((pid,s),()): return True
    return False

ps=ps.sort_values(["player_id","season","week"]).reset_index(drop=True)
ps["revenge"]=[1 if was_on(p,o,s) else 0 for p,o,s in zip(ps.player_id,ps.opponent_team,ps.season)]
R["revenge_rows"]=int(ps.revenge.sum()); R["players"]=int(ps.player_id.nunique())
log("revenge rows",R["revenge_rows"],"players",R["players"]); save(R)

# trailing-5 as-of mean of targets, and games played so far
g=ps.groupby("player_id",group_keys=False)
ps["t5"]=g["targets"].apply(lambda s: s.shift(1).rolling(5,min_periods=5).mean())
ps["games_played"]=g.cumcount()
ps["t5mean_all"]=g["targets"].apply(lambda s: s.shift(1).expanding(min_periods=1).mean())
keep=ps[(ps.games_played>=8) & ps.t5.notna()].copy()
R["analysis_rows"]=int(len(keep)); R["analysis_players"]=int(keep.player_id.nunique())
log("analysis",len(keep)); save(R)

# --- delta-t: weeks since this player last faced this opponent (within panel)
keep=keep.sort_values(["player_id","season","week"]).reset_index(drop=True)
dt=np.full(len(keep),np.nan)
last={}
for i,row in keep.iterrows():
    key=(row.player_id,row.opponent_team)
    if key in last:
        ls,lw=last[key]
        dt[i]=(row.season-ls)*18.0+(row.week-lw)
    last[key]=(row.season,row.week)
keep["dt"]=dt
R["dt_nonnull"]=int(keep.dt.notna().sum())

# --- within-player FE (demeaned) OLS
def demean(col,gcol="player_id"):
    v=keep[col].astype(float); return v-v.groupby(keep[gcol]).transform("mean")
y=demean("targets"); r=demean("revenge")
k2=keep.dropna(subset=["dt"]).copy()
def dem2(col,d):
    v=d[col].astype(float); return v-v.groupby(d["player_id"]).transform("mean")
X2=np.column_stack([np.ones(len(k2)),dem2("revenge",k2),dem2("dt",k2)])
y2=dem2("targets",k2).to_numpy(float)
b,_,_,_=np.linalg.lstsq(X2,y2,rcond=None)
R["fe_ols"]={"intercept":float(b[0]),"revenge":float(b[1]),"dt":float(b[2]),"n":int(len(k2))}
log("FE OLS",R["fe_ols"]); save(R)

# player-clustered bootstrap for FE coefs
rng=np.random.default_rng(5); pl=keep.player_id.unique()
idx_by_p={p:np.where(k2.player_id.to_numpy()==p)[0] for p in pl if (k2.player_id==p).any()}
pl=[p for p in pl if p in idx_by_p]
boot=[]
for i in range(2000):
    pick=rng.choice(pl,size=len(pl),replace=True)
    idx=np.concatenate([idx_by_p[p] for p in pick])
    bb,_,_,_=np.linalg.lstsq(X2[idx],y2[idx],rcond=None); boot.append(bb)
boot=np.array(boot)
R["fe_boot"]={"draws":2000,"players":int(len(pl)),
  "revenge_p5":float(np.percentile(boot[:,1],5)),"revenge_p95":float(np.percentile(boot[:,1],95)),
  "dt_p5":float(np.percentile(boot[:,2],5)),"dt_p95":float(np.percentile(boot[:,2],95)),
  "revenge_excl0":bool(np.percentile(boot[:,1],5)>0 or np.percentile(boot[:,1],95)<0),
  "dt_excl0":bool(np.percentile(boot[:,2],5)>0 or np.percentile(boot[:,2],95)<0)}
save(R); log("FE boot",R["fe_boot"])

# --- ratio estimand: revenge vs non-revenge within the same players
both=[]
for p,g in keep.groupby("player_id"):
    a=g[g.revenge==1]["targets"]; b2=g[g.revenge==0]["targets"]
    if len(a)>=1 and len(b2)>=1: both.append(a.mean()/max(b2.mean(),1e-9))
both=np.array(both)
def rat(x): return float(np.exp(np.mean(np.log(np.clip(x,1e-9,None)))))
R["ratio"]={"players_with_both":int(len(both)),"geo_mean_ratio":rat(both),
            "median_ratio":float(np.median(both))}
bs=np.array([rat(rng.choice(both,size=len(both),replace=True)) for _ in range(2000)])
R["ratio"]["ci90_lo"]=float(np.percentile(bs,5)); R["ratio"]["ci90_hi"]=float(np.percentile(bs,95))
R["ratio"]["covers_1"]=bool(np.percentile(bs,5)<=1<=np.percentile(bs,95))
save(R); log("ratio",R["ratio"])
log("L2_COMPLETE")