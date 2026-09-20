#!/usr/bin/env python3
"""L1 finish: cluster-robust SE + 2,000-draw clustered bootstrap (fixed buffers)
+ yards models with incomplete-pass yards filled to 0. Appends to res_L1_stage2.json"""
import json, os, time, gc
import numpy as np, pandas as pd
gc.disable()
NFL="/tmp/nfl"; OUT=f"{NFL}/res_L1_stage2.json"; LOG=open(f"{NFL}/l1_stage2b.log","a",buffering=1)
def log(*a): print(*a,file=LOG,flush=True)
def save(d):
    with open(OUT,"w") as f: json.dump(d,f,indent=2,default=str); f.flush(); os.fsync(f.fileno())
R=json.load(open(OUT))

df=pd.read_csv(f"{NFL}/l1_join.csv",low_memory=False)
df["roof"]=df["roof"].astype(str).str.lower()
w=df[df["roof"].isin(["outdoors","open"]) & df["temp"].notna() & df["wind"].notna()].copy()
w["ColdWindy"]=((w["temp"]<=40)|(w["wind"]>=15)).astype(int); w["PA"]=w["is_play_action"].astype(int)
w=w.dropna(subset=["trail8","total_line","spread_line","down","ydstogo","complete_pass"]).reset_index(drop=True)
for c in ["total_line","spread_line"]:
    w[c+"_z"]=w.groupby("season")[c].transform(lambda s:(s-s.mean())/(s.std()+1e-9))
w["abspr_z"]=np.abs(w["spread_line_z"])
BASE=["trail8","total_line_z","abspr_z","down","ydstogo"]
n=len(w); nb=len(BASE); kf=nb+4
XB=np.ascontiguousarray(np.column_stack([np.ones(n)]+[w[c].to_numpy("float32") for c in BASE]),dtype=np.float32)
CW=w["ColdWindy"].to_numpy("float32"); PA=w["PA"].to_numpy("float32")
y=np.ascontiguousarray(w["complete_pass"].to_numpy("float32")); gid=w["game_id"].to_numpy()
XF=np.ascontiguousarray(np.column_stack([XB,CW,PA,CW*PA]),dtype=np.float32)
eta=None; pp=None; zz=None; wt=None
_B={}
def gb(k,m):
    key=(k,m)
    if key not in _B:
        _B[key]=(np.empty((k,m),np.float32),np.empty((k,k),np.float32),np.empty(k,np.float32),
                 np.empty(m,np.float32),np.empty(m,np.float32),np.empty(m,np.float32),np.empty(m,np.float32))
    return _B[key]
def fit_buf(X,k,yy,b=None,iters=6):
    m=X.shape[0]; bk,Ak,rk,eta,pp,zz,wt=gb(k,m)
    b=np.zeros(k,np.float32) if b is None else np.asarray(b[:k],np.float32).copy()
    Xk=np.ascontiguousarray(X[:,:k])
    for _ in range(iters):
        np.dot(Xk,b,out=eta); np.clip(eta,-30,30,out=eta)
        np.negative(eta,out=pp); np.exp(pp,out=pp); np.add(pp,1.0,out=pp); np.reciprocal(pp,out=pp)
        np.subtract(1.0,pp,out=wt); np.multiply(pp,wt,out=wt); np.maximum(wt,1e-9,out=wt)
        np.subtract(yy,pp,out=zz); np.divide(zz,wt,out=zz); np.add(zz,eta,out=zz)
        np.multiply(Xk.T,wt,out=bk)
        np.dot(bk,Xk,out=Ak); np.dot(bk,zz,out=rk)
        Ak.flat[::k+1]+=1e-8
        b=np.linalg.solve(Ak,rk)
    return b

bF=fit_buf(XF,kf,y,iters=25); c_obs=float(bF[-1]); R["c_complete_full"]=c_obs
log("c_obs",c_obs)

# cluster-robust sandwich
et=np.clip(XF@bF,-30,30); p=1/(1+np.exp(-et)); W=p*(1-p)
Xw=XF.T*W; bread=np.linalg.inv(Xw@XF+1e-10*np.eye(kf))
u=(y-p)[:,None]*XF; meat=np.zeros((kf,kf))
for g,idx in pd.Series(np.arange(n)).groupby(gid):
    s=u[idx].sum(axis=0); meat+=np.outer(s,s)
V=bread@meat@bread; se=float(np.sqrt(V[-1,-1]))
R["cluster_se"]=se
R["cluster_ci90"]={"lo":c_obs-1.645*se,"hi":c_obs+1.645*se,
                   "excludes_0":bool(c_obs-1.645*se>0 or c_obs+1.645*se<0)}
save(R); log("cluster SE",se,R["cluster_ci90"])

# 2,000-draw clustered bootstrap (allocation, not out=, because resampled n varies)
rng=np.random.default_rng(37)
uniq=np.unique(gid); idx_by_g={g:np.where(gid==g)[0] for g in uniq}
boot=[]; t0=time.time()
for i in range(2000):
    pick=rng.choice(uniq,size=len(uniq),replace=True)
    idx=np.concatenate([idx_by_g[g] for g in pick])
    Xr=np.ascontiguousarray(XF[idx]); yr=np.ascontiguousarray(y[idx])
    boot.append(float(fit_buf(Xr,kf,yr,b=bF,iters=5)[-1]))
    if (i+1)%500==0: log("boot",i+1,"%.0fs"%(time.time()-t0))
boot=np.array(boot); lo,hi=float(np.percentile(boot,5)),float(np.percentile(boot,95))
R["clustered_boot"]={"draws":2000,"games":int(len(uniq)),"mean":float(boot.mean()),
                     "p5":lo,"p95":hi,"excludes_0":bool(lo>0 or hi<0),"secs":time.time()-t0}
save(R); log("boot",R["clustered_boot"])

# yards with incomplete-pass yards = 0
yy=w["passing_yards"].fillna(0.0).to_numpy("float64")
XD=XF.astype(np.float64)
bols,_,_,_=np.linalg.lstsq(XD,yy,rcond=None)
bmed=bols.copy()
for _ in range(80):
    r=yy-XD@bmed; wg=1.0/np.maximum(np.abs(r),1e-6); Aw=XD.T*wg
    bn=np.linalg.solve(Aw@XD+1e-8*np.eye(kf),Aw@yy)
    if np.max(np.abs(bn-bmed))<1e-7: bmed=bn; break
    bmed=bn
R["yards_OLS_CW_PA"]=float(bols[-1]); R["yards_median_CW_PA"]=float(bmed[-1])
R["yards_n"]=int(len(yy))
save(R); log("yards",R["yards_OLS_CW_PA"],R["yards_median_CW_PA"])
log("FINISH_DONE")
