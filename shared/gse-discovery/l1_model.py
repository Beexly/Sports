#!/usr/bin/env python3
"""L1 model: ColdWindy x PlayAction on completion prob and passing yards.
Frozen spec: /var/minis/shared/gse-discovery/prereg-props-2026-09-14.md
Writes incrementally to /tmp/nfl/res_L1.json and /tmp/nfl/l1_model.log
"""
import json, os, sys, time
import numpy as np, pandas as pd

NFL="/tmp/nfl"; OUT=f"{NFL}/res_L1.json"
LOG=open(f"{NFL}/l1_model.log","a",buffering=1)
def log(*a): print(*a, file=LOG, flush=True)

def save(d):
    with open(OUT,"w") as f:
        json.dump(d,f,indent=2,default=str); f.flush(); os.fsync(f.fileno())

R={}
def fit_logit(X,y,iters=25,tol=1e-8):
    n,k=X.shape; b=np.zeros(k)
    for _ in range(iters):
        eta=X@b
        eta=np.clip(eta,-30,30)
        p=1/(1+np.exp(-eta))
        w=np.maximum(p*(1-p),1e-9)
        z=eta+(y-p)/w
        XtW=X.T*w
        A=XtW@X; rhs=XtW@z
        try: bn=np.linalg.solve(A+1e-8*np.eye(k),rhs)
        except np.linalg.LinAlgError: break
        if np.max(np.abs(bn-b))<tol: b=bn; break
        b=bn
    return b

def logloss(X,y,b):
    eta=np.clip(X@b,-30,30)
    p=1/(1+np.exp(-eta))
    p=np.clip(p,1e-12,1-1e-12)
    return -np.mean(y*np.log(p)+(1-y)*np.log(1-p))

df=pd.read_csv(f"{NFL}/l1_join.csv",low_memory=False)
log("loaded",len(df))
R["n_joined"]=int(len(df))

df["roof"]=df["roof"].astype(str).str.lower()
out=df["roof"].isin(["outdoors","open"]) & df["temp"].notna() & df["wind"].notna()
w=df[out].copy()
w["ColdWindy"]=((w["temp"]<=40)|(w["wind"]>=15)).astype(int)
w["PA"]=w["is_play_action"].astype(int)
w=w.dropna(subset=["trail8","total_line","spread_line","down","ydstogo","complete_pass"])
R["n_analysis"]=int(len(w))
R["n_coldwindy"]=int(w["ColdWindy"].sum())
R["n_pa"]=int(w["PA"].sum())
R["n_interaction_flagged"]=int(((w["ColdWindy"]==1)&(w["PA"]==1)).sum())
log("analysis n",len(w),"CW",w['ColdWindy'].sum(),"inter",R['n_interaction_flagged'])
save(R)

# standardise within season
for c in ["total_line","spread_line"]:
    w[c+"_z"]=w.groupby("season")[c].transform(lambda s:(s-s.mean())/(s.std()+1e-9))
w["abspr_z"]=w.groupby("season")["spread_line_z"].transform(np.abs)

base=["trail8","total_line_z","abspr_z","down","ydstogo"]
core=base+["ColdWindy","PA"]
full=core+["CW_PA"]
w["CW_PA"]=w["ColdWindy"]*w["PA"]

def design(d,cols):
    X=np.column_stack([np.ones(len(d))]+[d[c].to_numpy(float) for c in cols])
    return X

y_complete=w["complete_pass"].to_numpy(float)
y_yards=w["passing_yards"].to_numpy(float)

# ---- full-sample fits
X0=design(w,base); X1=design(w,full)
b0=fit_logit(X0,y_complete); b1=fit_logit(X1,y_complete)
c_hat=float(b1[-1])
R["c_complete_full"]=c_hat
R["coef_full"]=dict(zip(["int"]+full,map(float,b1)))
log("c_complete_full",c_hat); save(R)

# ---- OOS expanding window by season
oos={}
for k in [2023,2024,2025]:
    tr=w[w["season"]<k]; te=w[w["season"]==k]
    if len(tr)<500 or len(te)<100: continue
    bt0=fit_logit(design(tr,base),tr["complete_pass"].to_numpy(float))
    bt1=fit_logit(design(tr,full),tr["complete_pass"].to_numpy(float))
    ll0=logloss(design(te,base),te["complete_pass"].to_numpy(float),bt0)
    ll1=logloss(design(te,full),te["complete_pass"].to_numpy(float),bt1)
    oos[str(k)]={"ll_base":ll0,"ll_full":ll1,"dLL":ll0-ll1,"n_test":int(len(te))}
    log("OOS",k,"dLL",round(ll0-ll1,6))
R["oos"]=oos
R["dLL_mean"]=float(np.mean([v["dLL"] for v in oos.values()])) if oos else None
save(R)
log("saved stage1")
