#!/usr/bin/env python3
"""L1 stage 2: permutation null N1, indoor placebo N2, game-clustered bootstrap,
severity tertiles (Gate 5c), yards model class (Gate 6). Incremental writes."""
import json, os
import numpy as np, pandas as pd

NFL="/tmp/nfl"; OUT=f"{NFL}/res_L1.json"
LOG=open(f"{NFL}/l1_stage2.log","a",buffering=1)
def log(*a): print(*a,file=LOG,flush=True)
def save(d):
    with open(OUT,"w") as f: json.dump(d,f,indent=2,default=str); f.flush(); os.fsync(f.fileno())
R=json.load(open(OUT))

def fit_logit(X,y,b=None,iters=30,tol=1e-8):
    n,k=X.shape
    if b is None: b=np.zeros(k)
    for _ in range(iters):
        eta=np.clip(X@b,-30,30); p=1/(1+np.exp(-eta))
        wt=np.maximum(p*(1-p),1e-9); z=eta+(y-p)/wt
        XtW=X.T*wt
        try: bn=np.linalg.solve(XtW@X+1e-8*np.eye(k),XtW@z)
        except np.linalg.LinAlgError: break
        if np.max(np.abs(bn-b))<tol: b=bn; break
        b=bn
    return b

df=pd.read_csv(f"{NFL}/l1_join.csv",low_memory=False)
df["roof"]=df["roof"].astype(str).str.lower()
w=df[df["roof"].isin(["outdoors","open"]) & df["temp"].notna() & df["wind"].notna()].copy()
w["ColdWindy"]=((w["temp"]<=40)|(w["wind"]>=15)).astype(int)
w["PA"]=w["is_play_action"].astype(int)
w=w.dropna(subset=["trail8","total_line","spread_line","down","ydstogo","complete_pass"]).reset_index(drop=True)
for c in ["total_line","spread_line"]:
    w[c+"_z"]=w.groupby("season")[c].transform(lambda s:(s-s.mean())/(s.std()+1e-9))
w["abspr_z"]=np.abs(w["spread_line_z"])

BASE=["trail8","total_line_z","abspr_z","down","ydstogo"]
ONE=np.ones(len(w))
XB=np.column_stack([ONE]+[w[c].to_numpy(float) for c in BASE])   # int + 5 base
CW=w["ColdWindy"].to_numpy(float); PA=w["PA"].to_numpy(float)
XF=np.column_stack([XB,CW,PA,CW*PA])                              # c is column -1
y=w["complete_pass"].to_numpy(float)
sa=w["season"].to_numpy(); gid=w["game_id"].to_numpy()

b_full=fit_logit(XF,y); c_full=float(b_full[-1])
R["c_complete_full"]=c_full
save(R); log("c_full",c_full,"n",len(w))

# ---- N1 permutation of ColdWindy within season
rng=np.random.default_rng(37); perms=[]
blocks=[np.where(sa==s)[0] for s in np.unique(sa)]
for i in range(1000):
    cwp=CW.copy()
    for idx in blocks: cwp[idx]=rng.permutation(cwp[idx])
    Xp=np.column_stack([XB,cwp,PA,cwp*PA])
    perms.append(float(fit_logit(Xp,y,b=b_full,iters=8)[-1]))
    if (i+1)%500==0: log("perm",i+1)
perms=np.array(perms)
R["N1_perm"]={"draws":1000,"mean":float(perms.mean()),"sd":float(perms.std()),
              "p5":float(np.percentile(perms,5)),"p95":float(np.percentile(perms,95)),
              "pct_perm_le_c_hat":float((perms<=c_full).mean())}
save(R); log("N1",R["N1_perm"])

# ---- game-clustered bootstrap
uniq=np.unique(gid); idx_by_g={g:np.where(gid==g)[0] for g in uniq}
NBOOT=2000; boot=[]
for i in range(NBOOT):
    pick=rng.choice(uniq,size=len(uniq),replace=True)
    idx=np.concatenate([idx_by_g[g] for g in pick])
    boot.append(float(fit_logit(XF[idx],y[idx],b=b_full,iters=8)[-1]))
    if (i+1)%500==0: log("boot",i+1)
boot=np.array(boot)
lo,hi=float(np.percentile(boot,5)),float(np.percentile(boot,95))
R["clustered_boot"]={"draws":NBOOT,"games":int(len(uniq)),"mean":float(boot.mean()),
                     "p5":lo,"p95":hi,"excludes_0":bool(lo>0 or hi<0)}
save(R); log("boot",R["clustered_boot"])

# ---- N2 indoor placebo
ind=df[df["roof"].isin(["dome","closed"])].copy(); ind["PA"]=ind["is_play_action"].astype(int)
ind=ind.dropna(subset=["trail8","total_line","spread_line","down","ydstogo","complete_pass"]).reset_index(drop=True)
for c in ["total_line","spread_line"]:
    ind[c+"_z"]=ind.groupby("season")[c].transform(lambda s:(s-s.mean())/(s.std()+1e-9))
ind["abspr_z"]=np.abs(ind["spread_line_z"])
XBI=np.column_stack([np.ones(len(ind))]+[ind[c].to_numpy(float) for c in BASE])
PAI=ind["PA"].to_numpy(float); yI=ind["complete_pass"].to_numpy(float)
ibl=[np.where(ind["season"].to_numpy()==s)[0] for s in np.unique(ind["season"].to_numpy())]
plc=[]
for i in range(200):
    f=np.zeros(len(ind))
    for idx in ibl:
        k=int(0.30*len(idx)); f[rng.choice(idx,size=k,replace=False)]=1
    Xp=np.column_stack([XBI,f,PAI,f*PAI])
    plc.append(float(fit_logit(Xp,yI,iters=12)[-1]))
plc=np.array(plc); l2,h2=float(np.percentile(plc,5)),float(np.percentile(plc,95))
R["N2_indoor_placebo"]={"draws":200,"n_indoor":int(len(ind)),"mean":float(plc.mean()),
                        "p5":l2,"p95":h2,"covers_0":bool(l2<=0<=h2)}
save(R); log("N2",R["N2_indoor_placebo"])

# ---- Gate 5c severity tertiles within ColdWindy
cold=w[w["ColdWindy"]==1].copy()
cold["sev"]=np.maximum((40-cold["temp"])/40.0, cold["wind"]/15.0)
cold["tert"]=pd.qcut(cold["sev"],3,labels=["low","mid","high"])
ter={}
for t,g in cold.groupby("tert",observed=True):
    Xg=np.column_stack([np.ones(len(g))]+[g[c].to_numpy(float) for c in BASE]+[g["PA"].to_numpy(float)])
    b=fit_logit(Xg,g["complete_pass"].to_numpy(float))
    ter[str(t)]={"n":int(len(g)),"coef_PA":float(b[-1])}
R["severity_tertiles_PA_coef"]=ter; save(R); log("tertiles",ter)

# ---- Gate 6 yards: OLS + median(LAD)
yy=w["passing_yards"].to_numpy(float)
bols,_,_,_=np.linalg.lstsq(XF,yy,rcond=None)
bmed=bols.copy()
for _ in range(80):
    r=yy-XF@bmed
    wgt=1.0/np.maximum(np.abs(r),1e-6)
    Aw=XF.T*wgt
    try: bn=np.linalg.solve(Aw@XF+1e-8*np.eye(XF.shape[1]), Aw@yy)
    except np.linalg.LinAlgError: break
    if np.max(np.abs(bn-bmed))<1e-7: bmed=bn; break
    bmed=bn
R["yards_OLS_CW_PA"]=float(bols[-1]); R["yards_median_CW_PA"]=float(bmed[-1])
save(R); log("yards",R["yards_OLS_CW_PA"],R["yards_median_CW_PA"])
log("STAGE2_COMPLETE")
