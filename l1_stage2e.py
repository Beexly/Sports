#!/usr/bin/env python3
"""L1 stage-2 supplement: N2 indoor placebo + Gate-5c tertiles + Gate-6 yards.
Runs after l1_stage2d. Appends into res_L1_stage2.json."""
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
def prep(d):
    d=d.copy(); d["ColdWindy"]=((d["temp"]<=40)|(d["wind"]>=15)).astype(int) if "temp" in d else 0
    d["PA"]=d["is_play_action"].astype(int)
    d=d.dropna(subset=["trail8","total_line","spread_line","down","ydstogo","complete_pass"]).reset_index(drop=True)
    for c in ["total_line","spread_line"]:
        d[c+"_z"]=d.groupby("season")[c].transform(lambda s:(s-s.mean())/(s.std()+1e-9))
    d["abspr_z"]=np.abs(d["spread_line_z"]); return d
BASE=["trail8","total_line_z","abspr_z","down","ydstogo"]
w=prep(df[df["roof"].isin(["outdoors","open"]) & df["temp"].notna() & df["wind"].notna()])
ind=prep(df[df["roof"].isin(["dome","closed"])])

def make_bufs(d):
    n=len(d); nb=len(BASE); kn=nb+3
    XB=np.ascontiguousarray(np.column_stack([np.ones(n)]+[d[c].to_numpy("float32") for c in BASE]),dtype=np.float32)
    PA=d["PA"].to_numpy("float32"); y=np.ascontiguousarray(d["complete_pass"].to_numpy("float32"))
    return n,nb,kn,XB,PA,y

_B={}
def gb(k,n):
    key=(k,n)
    if key not in _B: _B[key]=(np.empty((k,n),np.float32),np.empty((k,k),np.float32),np.empty(k,np.float32))
    return _B[key]
def fit_buf(X,yy,n,k,b=None,iters=8,eta=None,pp=None,zz=None,wt=None):
    bk,Ak,rk=gb(k,n)
    if eta is None: eta=np.empty(n,np.float32)
    if pp is None: pp=np.empty(n,np.float32)
    if zz is None: zz=np.empty(n,np.float32)
    if wt is None: wt=np.empty(n,np.float32)
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
    return b,eta,pp,zz,wt

# ---------- N2 indoor placebo (score-statistic, 200 draws) ----------
nI,nbI,knI,XBI,PAI,yI=make_bufs(ind)
rng=np.random.default_rng(23)
ibl=[np.where(ind["season"].to_numpy()==s)[0] for s in np.unique(ind["season"].to_numpy())]
plc=[]; t0=time.time()
for i in range(200):
    f=np.zeros(nI,np.float32)
    for idx in ibl:
        kk=max(1,int(0.30*len(idx))); f[rng.choice(idx,size=kk,replace=False)]=1
    XN=np.ascontiguousarray(np.column_stack([XBI,f,PAI]),dtype=np.float32)
    bn,eta,pp,zz,wt=fit_buf(XN,yI,nI,knI,iters=12)
    et=np.clip(XN@bn,-30,30); pn=1/(1+np.exp(-et)); wn=np.maximum(pn*(1-pn),1e-9)
    zc=(f*PAI).astype(np.float32); Xw=XN.T*wn
    gam=np.linalg.solve(Xw@XN+1e-8*np.eye(knI,dtype=np.float32),Xw@zc)
    zres=zc-XN@gam
    plc.append(float(zres@(yI-pn))/float(zres@(wn*zres)))
plc=np.array(plc); l2,h2=float(np.percentile(plc,5)),float(np.percentile(plc,95))
R["N2_indoor_placebo"]={"draws":200,"n_indoor":int(nI),"mean":float(plc.mean()),"sd":float(plc.std()),
  "p5":l2,"p95":h2,"covers_0":bool(l2<=0<=h2),"stat":"efficient_score","secs":time.time()-t0}
save(R); log("N2",R["N2_indoor_placebo"])

# ---------- Gate 5c tertiles (within ColdWindy plays) ----------
cold=w[w["ColdWindy"]==1].copy()
cold["sev"]=np.maximum((40-cold["temp"])/40.0, cold["wind"]/15.0)
cold["tert"]=pd.qcut(cold["sev"],3,labels=["low","mid","high"])
ter={}
for t,g in cold.groupby("tert",observed=True):
    gg=g.reset_index(drop=True); ng=len(gg)
    Xg=np.ascontiguousarray(np.column_stack([np.ones(ng)]+[gg[c].to_numpy("float32") for c in BASE]
        +[np.ones(ng,np.float32),gg["PA"].to_numpy("float32"),gg["PA"].to_numpy("float32")]),dtype=np.float32)
    b,_,_,_,_=fit_buf(Xg,gg["complete_pass"].to_numpy("float32"),ng,knI,iters=25)
    ter[str(t)]={"n":int(ng),"coef_PA_given_cold":float(b[-1])}
R["severity_tertiles"]=ter; save(R); log("tertiles",ter)

# ---------- Gate 6 yards: OLS + median ----------
nW,nbW,kfW,XBw,PAw,yw=make_bufs(w)
XFw=np.ascontiguousarray(np.column_stack([XBw,w["ColdWindy"].to_numpy("float32"),PAw,(w["ColdWindy"].to_numpy("float32")*PAw)]),dtype=np.float32)
yy=w["passing_yards"].fillna(0.0).to_numpy("float64")  # 16,063 nulls, all complete_pass==0 (verified) -> 0 yards
bols,_,_,_=np.linalg.lstsq(XFw.astype(np.float64),yy,rcond=None)
bmed=bols.copy(); XD=XFw.astype(np.float64)
for _ in range(80):
    r=yy-XD@bmed; wg=1.0/np.maximum(np.abs(r),1e-6); Aw=XD.T*wg
    bn=np.linalg.solve(Aw@XD+1e-8*np.eye(XD.shape[1]),Aw@yy)
    if np.max(np.abs(bn-bmed))<1e-7: bmed=bn; break
    bmed=bn
R["yards_OLS_CW_PA"]=float(bols[-1]); R["yards_median_CW_PA"]=float(bmed[-1])
save(R); log("yards",R["yards_OLS_CW_PA"],R["yards_median_CW_PA"])
log("SUPPLEMENT_DONE")