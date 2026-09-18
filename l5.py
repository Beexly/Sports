#!/usr/bin/env python3
"""L5 (H3): pooled hierarchical c_3 test across state families.
Frozen spec: minis-overnight-deep-report-2026-09-14.md section 5, L5.
  logit P = a + b*logit(q) + c1*s1 + c2*s2 + c3*s1*s2
  partial pooling of c3 across families; null = permutation of s2 within s1 positives.
Implementation mapping (declared BEFORE fitting): see FAMILIES below.
"""
import json, os, time
import numpy as np, pandas as pd

NFL="/tmp/nfl"; OUT=f"{NFL}/res_L5.json"
LOG=open(f"{NFL}/l5.log","a",buffering=1)
def log(*a): print(*a,file=LOG,flush=True)
def save(d):
    with open(OUT,"w") as f: json.dump(d,f,indent=2,default=str); f.flush(); os.fsync(f.fileno())
R={}

t=pd.read_csv(f"{NFL}/compound_table2.csv",low_memory=False)
t=t[(t.game_type=="REG") & t.qClose.notna() & t.home_win.notna()].reset_index(drop=True)
R["n_games"]=int(len(t)); R["seasons"]=[int(t.season.min()),int(t.season.max())]
log("games",len(t),"seasons",R["seasons"])

t["any_short"]=((t.home_rest<=6)|(t.away_rest<=6)).astype(int)
t["any_rev"]=((t.home_qb_rev>0)|(t.away_qb_rev>0)).astype(int)
t["any_rook"]=((t.home_qb_rook>0)|(t.away_qb_rook>0)).astype(int)
t["any_backup"]=((t.home_qb_backup>0)|(t.away_qb_backup>0)).astype(int)
t["any_burden3"]=((t.h_burden>=3)|(t.a_burden>=3)).astype(int)
t["rest_adv3"]=(t.rest_diff.abs()>=3).astype(int)
t["any_hcnew"]=((t.home_hc_new>0)|(t.away_hc_new>0)).astype(int)

FAMILIES={
 "A_revenge_shortweek": ("any_rev","any_short"),
 "B_qbinexp_restdeficit": ("any_rook","rest_adv3"),
 "C_altitude_restadv": ("home_alt","rest_adv3"),
 "D_burden_shortweek": ("any_burden3","any_short"),
}
SUPP={"E_newhc_oppcontinuity": ("any_hcnew","rest_adv3")}
R["family_mapping"]={k:list(v) for k,v in FAMILIES.items()}
R["supplementary_mapping"]={k:list(v) for k,v in SUPP.items()}
save(R)

def fit_logit(X,yy,b=None,iters=40,tol=1e-9):
    """preallocated-buffer IRLS; warm-start by passing b"""
    k=X.shape[1]
    if b is None: b=np.zeros(k)
    else: b=np.asarray(b[:k],dtype=np.float64).copy()
    for _ in range(iters):
        eta=np.clip(X@b,-30,30); p=1/(1+np.exp(-eta))
        wt=np.maximum(p*(1-p),1e-9); z=eta+(yy-p)/wt
        A=X.T*wt
        bn=np.linalg.solve(A@X+1e-8*np.eye(k),A@z)
        if np.max(np.abs(bn-b))<tol: b=bn; break
        b=bn
    return b

def fam_fit(d,s1,s2,iters=60,b0=None):
    x1=d[s1].to_numpy(float); x2=d[s2].to_numpy(float); q=d["qClose"].to_numpy(float)
    lq=np.log(np.clip(q,1e-6,1-1e-6)/(1-np.clip(q,1e-6,1-1e-6)))
    X=np.column_stack([np.ones(len(d)),lq,x1,x2,x1*x2])
    b=fit_logit(X,d["home_win"].to_numpy(float),b=b0,iters=iters)
    eta=np.clip(X@b,-30,30); p=1/(1+np.exp(-eta)); wgt=np.maximum(p*(1-p),1e-9)
    A=X.T*wgt; cov=np.linalg.inv(A@X+1e-10*np.eye(5))
    return float(b[4]), float(np.sqrt(max(cov[4,4],0))), b

rng=np.random.default_rng(11)
res={}
for name,(s1,s2) in {**FAMILIES,**SUPP}.items():
    c,se,b0=fam_fit(t,s1,s2)
    n_pos1=int(t[s1].sum()); n_flag=int(((t[s1]==1)&(t[s2]==1)).sum())
    # permutation null: permute s2 within s1 positives
    perms=[]
    for _ in range(1000):
        d=t.copy()
        idx=d.index[d[s1]==1]
        v=d.loc[idx,s2].to_numpy().copy(); rng.shuffle(v); d.loc[idx,s2]=v
        cp,_,_=fam_fit(d,s1,s2,iters=12,b0=b0); perms.append(cp)
    perms=np.array(perms)
    res[name]={"s1":s1,"s2":s2,"c3":c,"se":se,"n_s1":n_pos1,"n_flagged":n_flag,
               "ci90_lo":c-1.645*se,"ci90_hi":c+1.645*se,
               "perm_p5":float(np.percentile(perms,5)),"perm_p95":float(np.percentile(perms,95)),
               "perm_pct_abs_ge":float((np.abs(perms)>=abs(c)).mean())}
    log(name,res[name]); R["families"]=res; save(R)

# ---- partial pooling (random-effects meta-analysis of family c3)
cs=np.array([v["c3"] for k,v in res.items() if k in FAMILIES])
ses=np.array([v["se"] for k,v in res.items() if k in FAMILIES])
wfix=1/ses**2
mu_fix=float((wfix*cs).sum()/wfix.sum())
Q=float((wfix*(cs-mu_fix)**2).sum()); K=len(cs)
C=float(wfix.sum()-(wfix**2).sum()/wfix.sum())
tau2=max(0.0,(Q-(K-1))/C) if C>0 else 0.0
wstar=1/(ses**2+tau2)
mu=float((wstar*cs).sum()/wstar.sum()); se_mu=float(np.sqrt(1/wstar.sum()))
R["pooled"]={"K":K,"mu_c3":mu,"se":se_mu,"ci90_lo":mu-1.645*se_mu,"ci90_hi":mu+1.645*se_mu,
             "tau2":tau2,"Q":Q,"family_c3":cs.tolist(),"family_se":ses.tolist()}
save(R); log("pooled",R["pooled"])
log("L5_COMPLETE")