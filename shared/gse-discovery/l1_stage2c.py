#!/usr/bin/env python3
"""L1 stage-2 v2 (FAST): preallocated buffers + gc.disable.
Full-refit permutation null + clustered bootstrap + indoor placebo + tertiles +
yards, plus the v4 A5 cross-check (efficient-score vs full refit, same draws)."""
import json, os, time, gc
import numpy as np, pandas as pd
gc.disable()

NFL="/tmp/nfl"; OUT=f"{NFL}/res_L1_stage2.json"; LOG=open(f"{NFL}/l1_stage2b.log","a",buffering=1)
def log(*a): print(*a,file=LOG,flush=True)
def save(d):
    with open(OUT,"w") as f: json.dump(d,f,indent=2,default=str); f.flush(); os.fsync(f.fileno())
R=json.load(open(OUT)) if os.path.exists(OUT) else {}
R.pop("N1_perm_partial",None)

df=pd.read_csv(f"{NFL}/l1_join.csv",low_memory=False)
df["roof"]=df["roof"].astype(str).str.lower()
w=df[df["roof"].isin(["outdoors","open"]) & df["temp"].notna() & df["wind"].notna()].copy()
w["ColdWindy"]=((w["temp"]<=40)|(w["wind"]>=15)).astype(int); w["PA"]=w["is_play_action"].astype(int)
w=w.dropna(subset=["trail8","total_line","spread_line","down","ydstogo","complete_pass"]).reset_index(drop=True)
for c in ["total_line","spread_line"]:
    w[c+"_z"]=w.groupby("season")[c].transform(lambda s:(s-s.mean())/(s.std()+1e-9))
w["abspr_z"]=np.abs(w["spread_line_z"])
BASE=["trail8","total_line_z","abspr_z","down","ydstogo"]
n=len(w); nb=len(BASE); kf=nb+4; kn=nb+3
XB=np.ascontiguousarray(np.column_stack([np.ones(n)]+[w[c].to_numpy("float32") for c in BASE]),dtype=np.float32)
CW=w["ColdWindy"].to_numpy("float32"); PA=w["PA"].to_numpy("float32")
y=np.ascontiguousarray(w["complete_pass"].to_numpy("float32"))
gid=w["game_id"].to_numpy(); sa=w["season"].to_numpy()

XP=np.empty((n,kf),np.float32); XP[:,:nb+1]=XB; XP[:,nb+1]=CW; XP[:,nb+2]=PA; XP[:,nb+3]=CW*PA
XNb=np.empty((n,kn),np.float32); XNb[:,:nb+1]=XB; XNb[:,nb+1]=CW; XNb[:,nb+2]=PA
eta=np.empty(n,np.float32); pp=np.empty(n,np.float32); zz=np.empty(n,np.float32); wt=np.empty(n,np.float32)
_BUF={}
def get_buf(k):
    if k not in _BUF:
        _BUF[k]=(np.empty((k,n),np.float32), np.empty((k,k),np.float32), np.empty(k,np.float32))
    return _BUF[k]

def fit_buf(X,k,yy,b=None,iters=6):
    bk,Ak,rk=get_buf(k)
    if b is None: b=np.zeros(k,np.float32)
    else: b=np.asarray(b[:k],dtype=np.float32).copy()
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

t0=time.time(); bF=fit_buf(XP,kf,y,iters=25); R["secs_full_fit"]=time.time()-t0
R["c_complete_full"]=float(bF[-1]); bN=fit_buf(XNb,kn,y,iters=25)
R["coef_null"]=dict(zip(["int"]+BASE+["ColdWindy","PA"],map(float,bN)))
log("c_full",R["c_complete_full"],"fit %.2fs"%R["secs_full_fit"]); save(R)

def score_est(cw,pa):
    XN=np.column_stack([XB,cw,pa]).astype(np.float32)
    bn=fit_buf(XN,kn,y,iters=20)
    et=np.clip(XN@bn,-30,30); pn=1/(1+np.exp(-et)); wn=np.maximum(pn*(1-pn),1e-9)
    zc=(cw*pa).astype(np.float32)
    Xw=XN.T*wn
    gam=np.linalg.solve(Xw@XN+1e-8*np.eye(kn,dtype=np.float32), Xw@zc)
    zres=zc-XN@gam
    return float(zres@(y-pn))/float(zres@(wn*zres))

rng=np.random.default_rng(37)
blocks=[np.where(sa==s)[0] for s in np.unique(sa)]
perms=[]; a5r=[]; a5s=[]; t0=time.time()
for i in range(1000):
    cw=CW.copy()
    for idx in blocks: cw[idx]=rng.permutation(cw[idx])
    XP[:,nb+1]=cw; XP[:,nb+3]=cw*PA
    cp=float(fit_buf(XP,kf,y,b=bF,iters=6)[-1])
    perms.append(cp)
    if i<100:
        a5r.append(cp); a5s.append(score_est(cw,PA))
    if (i+1)%200==0:
        el=time.time()-t0; log("perm",i+1,"elapsed %.0fs (%.2fs/draw)"%(el,el/(i+1)))
        R["N1_perm_partial"]={"done":i+1,"elapsed_s":el}; save(R)
perms=np.array(perms)
R.pop("N1_perm_partial",None)
R["N1_perm"]={"draws":1000,"mean":float(perms.mean()),"sd":float(perms.std()),
              "p5":float(np.percentile(perms,5)),"p95":float(np.percentile(perms,95)),
              "pct_perm_le_c_hat":float((perms<=R["c_complete_full"]).mean()),"secs":time.time()-t0}
save(R); log("N1 saved",R["N1_perm"])
a5r=np.array(a5r); a5s=np.array(a5s)
R["A5_crosscheck"]={"draws":100,"full_refit_mean":float(a5r.mean()),"full_refit_sd":float(a5r.std()),
  "score_mean":float(a5s.mean()),"score_sd":float(a5s.std()),
  "max_abs_diff":float(np.max(np.abs(a5r-a5s))),"mean_abs_diff":float(np.mean(np.abs(a5r-a5s))),
  "pearson_r":float(np.corrcoef(a5r,a5s)[0,1]),
  "sign_agree_pct":float((np.sign(a5r)==np.sign(a5s)).mean()*100)}
save(R); log("N1",R["N1_perm"]); log("A5",R["A5_crosscheck"])

# clustered bootstrap
XF=np.ascontiguousarray(XP.copy())
uniq=np.unique(gid); idx_by_g={g:np.where(gid==g)[0] for g in uniq}
XCTX=np.empty((n,kf),np.float32); yb=np.empty(n,np.float32)
boot=[]; t0=time.time()
for i in range(2000):
    pick=rng.choice(uniq,size=len(uniq),replace=True)
    idx=np.concatenate([idx_by_g[g] for g in pick])
    np.take(XF,idx,axis=0,out=XCTX); np.take(y,idx,out=yb)
    boot.append(float(fit_buf(XCTX,kf,yb,b=bF,iters=5)[-1]))
    if (i+1)%500==0: log("boot",i+1,"elapsed %.0fs"%(time.time()-t0))
boot=np.array(boot); lo,hi=float(np.percentile(boot,5)),float(np.percentile(boot,95))
R["clustered_boot"]={"draws":2000,"games":int(len(uniq)),"mean":float(boot.mean()),
                     "p5":lo,"p95":hi,"excludes_0":bool(lo>0 or hi<0),"secs":time.time()-t0}
save(R); log("boot",R["clustered_boot"])
log("STAGE2B_PART1_COMPLETE")
