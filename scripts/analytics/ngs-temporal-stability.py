#!/usr/bin/env python3
# ngs-temporal-stability.py
# WHY: A "week t NGS -> week t+1" covariate has value only if weekly NGS values
# carry persistent (player-talent) signal, not just sampling noise. This script
# decomposes each NGS field into SIGNAL (between-player-season) vs NOISE
# (within-player week-to-week) and reports SNR + single-week ICC(1).
#
# DATA: open CC-BY-4.0 nflverse NGS combined files (ngs_passing/receiving/rushing.csv.gz),
#   2016-2025, fetched live. nflverse is a verified-open, attribution-required source
#   (no scraping, no ToS breach); NGS used as MEASUREMENT reference, never re-served.
#
# METHOD: one-way random-effects ANOVA variance components (Searle 1971), unbalanced
#   n_bar0 estimator. ICC(1) = single-week reliability = signal/(signal+noise).
#   SNR = signal_var/noise_var. rt-r = test-retest Pearson r of consecutive weeks.
#   4wkRel = Spearman-Brown prophecy at n=4. ICC95 = bootstrap over player-seasons.
#
# RULES: REG weeks only, week>0 (exclude week-0 season aggregate), weekly volume
#   floor (attempts>=10 / targets>=3 / rush_attempts>=5), player-seasons >=3 weeks.
# Run: python3 scripts/analytics/ngs-temporal-stability.py
import csv, gzip, io, urllib.request, math, random, json
from collections import defaultdict
BASE="https://github.com/nflverse/nflverse-data/releases/download/nextgen_stats"
random.seed(20260823)
VOLS={"passing":"attempts","receiving":"targets","rushing":"rush_attempts"}
CONFIG={
 "passing":("passing",[
   ("completion_percentage_above_expectation","attempts",10,"CPOE - QB moat"),
   ("expected_completion_percentage","attempts",10,"xCOMP%"),
   ("avg_time_to_throw","attempts",10,"avg time-to-throw (s)"),
   ("aggressiveness","attempts",10,"aggressiveness (% tight cov.)"),
   ("avg_completed_air_yards","attempts",10,"avg completed air yards"),
   ("avg_intended_air_yards","attempts",10,"avg intended air yards"),
   ("avg_air_yards_differential","attempts",10,"avg air-yds differential"),
   ("avg_air_yards_to_sticks","attempts",10,"avg air yds to sticks"),
 ]),
 "receiving":("receiving",[
   ("avg_separation","targets",3,"avg separation (yds) - WR moat"),
   ("avg_cushion","targets",3,"avg cushion (yds)"),
   ("percent_share_of_intended_air_yards","targets",3,"air-yards share (% of team)"),
   ("avg_yac","targets",3,"avg YAC (yds)"),
   ("avg_expected_yac","targets",3,"avg exp-YAC (yds)"),
   ("avg_yac_above_expectation","targets",3,"xYAC - GSE-xYAC"),
   ("catch_percentage","targets",3,"catch %"),
   ("avg_intended_air_yards","targets",3,"avg intended air yards"),
 ]),
 "rushing":("rushing",[
   ("rush_yards_over_expected_per_att","rush_attempts",5,"RYOE per att - GSE-RYOE"),
   ("rush_yards_over_expected","rush_attempts",5,"RYOE total (vol-scaled)"),
   ("expected_rush_yards","rush_attempts",5,"exp rush yds"),
   ("efficiency","rush_attempts",5,"efficiency"),
   ("percent_attempts_gte_eight_defenders","rush_attempts",5,"8+ box % (stacked-box)"),
   ("avg_time_to_los","rush_attempts",5,"avg time-to-LOS (s)"),
   ("avg_rush_yards","rush_attempts",5,"avg rush yds"),
 ]),
}
def fetch_gz(url):
    raw=urllib.request.urlopen(url,timeout=240).read()
    if raw[:2]==b"\x1f\x8b": raw=gzip.decompress(raw)
    return raw.decode("utf-8","replace")
def load_variant(variant):
    url=f"{BASE}/ngs_{variant}.csv.gz"
    txt=fetch_gz(url); r=csv.reader(io.StringIO(txt))
    header=next(r); idx={h:i for i,h in enumerate(header)}; rows=list(r)
    return header,idx,rows
def vc(groups):
    G=len(groups);N=S=S2=ssq=0.0
    for n,s,sq in groups: N+=n;S+=s;S2+=sq;ssq+=n*n
    if N-G<=0 or G<=1: return None
    sno=sum(s*s/n for n,s,_ in groups)
    SSb=sno-(S*S)/N; SSw=S2-sno
    MSb=SSb/(G-1); MSw=SSw/(N-G); n0=(N-ssq/N)/(G-1)
    if n0<=0: return None
    sigw=MSw; sigb=max(0.0,(MSb-MSw)/n0); tot=sigb+sigw
    icc=sigb/tot if tot>0 else 0.0; snr=sigb/sigw if sigw>1e-15 else float("inf")
    return sigb,sigw,icc,snr,N,G,N/G
def boot_icc(groups,B=200):
    if len(groups)<2: return (0.0,1.0)
    base=list(groups);ng=len(base);s=[]
    for _ in range(B):
        bg=[base[random.randrange(ng)] for _ in range(ng)]
        r=vc(bg)
        if r: s.append(r[2])
    if not s: return (0.0,1.0)
    s.sort();return (s[int(0.025*len(s))],s[int(0.975*len(s))-1])
def tr_pairs(gv):
    p=[]
    for vals in gv:
        vals=sorted(vals,key=lambda x:x[0])
        for i in range(len(vals)-1):
            if vals[i+1][0]==vals[i][0]+1: p.append((vals[i][1],vals[i+1][1]))
    return p
def pearson(xs,ys):
    n=min(len(xs),len(ys))
    if n<2: return 0.0
    mx=sum(xs)/n;my=sum(ys)/n;sxy=sxx=syy=0.0
    for i in range(n):
        dx=xs[i]-mx;dy=ys[i]-my;sxy+=dx*dy;sxx+=dx*dx;syy+=dy*dy
    d=math.sqrt(sxx*syy);return 0.0 if d<1e-12 else sxy/d
R=[]
LOADED={}
for v,(variant,fields) in CONFIG.items():
    header,idx,rows=load_variant(variant);LOADED[v]=(header,idx,rows)
    for f,vcol,vf,friendly in fields:
        fi=idx.get(f);vi=idx.get(vcol);wi=idx.get("week");si=idx.get("season");pi=idx.get("player_gsis_id");ti=idx.get("season_type")
        if fi is None or vi is None: continue
        gm=defaultdict(list);vm=defaultdict(list)
        for row in rows:
            if row[ti]!="REG": continue
            wk=int(row[wi]) if row[wi] else 0
            if wk<=0: continue
            vol=row[vi]
            if vol is None or vol=="" or float(vol)<vf: continue
            val=row[fi]
            if val is None or val=="": continue
            v=float(val)
            if not math.isfinite(v): continue
            k=(row[pi],row[si]);gm[k].append((wk,v));vm[k].append(float(vol))
        gv=[];comp=[]
        for k,vals in gm.items():
            if len(vals)<3: continue
            gv.append(vals);xs=[vv for _,vv in vals]
            comp.append((len(xs),sum(xs),sum(x*x for x in xs)))
        if len(comp)<2: R.append((variant,f,friendly,0,0,0,0,0,0,0,0,0,0,0,0));continue
        r=vc(comp)
        if r is None: continue
        sb,sw,icc,snr,N,G,nb=r
        pr=tr_pairs(gv);trs=pearson([a for a,_ in pr],[b for _,b in pr]) if len(pr)>=2 else 0.0
        lo,hi=boot_icc(comp)
        mv=sum(sum(x) for x in vm.values())/max(1,len(vm))
        rel=(snr*4)/(1+snr*4) if snr!=float("inf") else 1.0
        R.append((variant,f,friendly,int(N),int(G),round(nb,2),round(sb,5),round(sw,5),round(icc,4),round(snr,4),round(trs,4),round(lo,3),round(hi,3),round(mv,1),round(rel,3)))
print(f"{'var':7} {'field':34} {'N':>5} {'grp':>5} {'wk/yr':>5} {'ICC(1)':>7} {'SNR':>7} {'rt-r':>6} {'ICC95%':>11} {'4wkRel':>7}")
for r in sorted(R,key=lambda x:x[3]): # placeholder; print full
    v,f,fr,N,G,nb,sb,sw,icc,snr,tr,lo,hi,vol,rel=r
    ss=f"{snr:.2f}" if snr!=float("inf") else "  inf"
    print(f"{v:7} {fr:34} {N:5d} {G:5d} {nb:5.1f} {icc:7.3f} {ss:>7} {tr:6.2f} [{lo:.2f},{hi:.2f}] {rel:7.3f}")
out=[]
for r in R:
    v,f,fr,N,G,nb,sb,sw,icc,snr,tr,lo,hi,vol,rel=r
    out.append(dict(variant=v,field=f,label=fr,n_obs=N,n_player_seasons=G,weeks_per_season=nb,
        signal_var=sb,noise_var=sw,icc=icc,snr=(None if snr==float("inf") else snr),
        test_retest_r=tr,icc_ci_low=lo,icc_ci_high=hi,mean_volume=vol,rel_4week=rel))
json.dump(out,open("docs/ops/edge/2026-08-23-ngs-temporal-stability-results.json","w"),indent=2)
print("Saved JSON.")
