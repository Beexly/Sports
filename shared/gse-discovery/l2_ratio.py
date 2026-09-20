#!/usr/bin/env python3
"""Robust re-estimation of the L2 ratio (the geo-mean was unstable on near-zero
baselines). Reports median ratio + percentile bootstrap, and raw group means."""
import json, pickle, glob
import numpy as np, pandas as pd
NFL="/tmp/nfl"; OUT=f"{NFL}/res_L2.json"
def save(d):
    with open(OUT,"w") as f: json.dump(d,f,indent=2,default=str); f.flush()
R=json.load(open(OUT))
rm=pickle.load(open(f"{NFL}/rostermap.pkl","rb")); PT=rm["pteam"]
ps=[]
for f in sorted(glob.glob(f"{NFL}/player_stats_*.csv")):
    d=pd.read_csv(f,usecols=["player_id","recent_team","season","week","season_type",
                             "opponent_team","targets","receptions","carries"],low_memory=False)
    ps.append(d)
ps=pd.concat(ps,ignore_index=True)
ps=ps[(ps.season_type=="REG") & ps.opponent_team.notna() & ps.recent_team.notna()].dropna(subset=["targets"])
def was_on(pid,team,season):
    if not isinstance(pid,str): return False
    for s in range(2015,int(season)):
        if team in PT.get((pid,s),()): return True
    return False
ps=ps.sort_values(["player_id","season","week"]).reset_index(drop=True)
ps["revenge"]=[1 if was_on(p,o,s) else 0 for p,o,s in zip(ps.player_id,ps.opponent_team,ps.season)]
g=ps.groupby("player_id",group_keys=False)
ps["games_played"]=g.cumcount()
keep=ps[ps.games_played>=8].copy()

rows=[]
for p,gg in keep.groupby("player_id"):
    a=gg[gg.revenge==1]["targets"]; b=gg[gg.revenge==0]["targets"]
    if len(a)>=1 and len(b)>=1 and b.mean()>0:
        rows.append({"pid":p,"rev_mean":a.mean(),"non_mean":b.mean(),
                     "ratio":a.mean()/b.mean(),"n_rev":len(a),"n_non":len(b)})
d=pd.DataFrame(rows)
rng=np.random.default_rng(9)
def boot_stat(x,fn,n=4000):
    v=[fn(rng.choice(x,size=len(x),replace=True)) for _ in range(n)]
    return float(np.percentile(v,5)),float(np.percentile(v,95))
med_lo,med_hi=boot_stat(d["ratio"].to_numpy(),np.median)
R["ratio_robust"]={"players_with_both":int(len(d)),
  "median_ratio":float(d["ratio"].median()),
  "median_ci90":[med_lo,med_hi],"median_covers_1":bool(med_lo<=1<=med_hi),
  "pooled_rev_mean_targets":float(d["rev_mean"].mean()),
  "pooled_non_mean_targets":float(d["non_mean"].mean()),
  "pooled_ratio_of_means":float(d["rev_mean"].mean()/d["non_mean"].mean()),
  "mean_targets_revenge_all":float(keep[keep.revenge==1]["targets"].mean()),
  "mean_targets_nonrevenge_all":float(keep[keep.revenge==0]["targets"].mean()),
  "n_revenge_rows":int((keep.revenge==1).sum()),
  "note":"geo-mean in res_L2.ratio is UNSTABLE (near-zero baselines); median governs"}
save(R)
print(json.dumps(R["ratio_robust"],indent=2))
