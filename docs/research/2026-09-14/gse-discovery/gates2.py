#!/usr/bin/env python3
"""Fast, resumable gate battery. Usage: gates2.py A1 B1 ... (or ALL)
Appends one JSON line per compound to /tmp/nfl/gate_results.jsonl."""
import pandas as pd, numpy as np, json, sys, os
rng = np.random.default_rng(20260914)
B = int(__import__('os').environ.get('NB','300'))
OUT = '/tmp/nfl/gate_results.jsonl'

t = pd.read_csv('/tmp/nfl/compound_table2.csv', low_memory=False)
t = t[t.qClose.notna()].copy()

def dec(ml):
    ml = float(ml); return 1 + (ml/100.0 if ml > 0 else 100.0/abs(ml))
def logit(p):
    p = np.clip(p, 1e-6, 1-1e-6); return np.log(p/(1-p))

H = pd.DataFrame(dict(season=t.season, week=t.week, game=t.game_id, team=t.home_team, is_home=1,
    y=t.home_win, q=t.qClose,
    odds=[dec(m) if pd.notna(m) else np.nan for m in t.home_moneyline],
    own_rest=t.home_rest, opp_rest=t.away_rest, rest_diff=t.home_rest-t.away_rest,
    rev_qb=t.home_qb_rev, rook_qb=t.home_qb_rook, backup_qb=t.home_qb_backup,
    hc_new=t.home_hc_new, opp_hc_new=t.away_hc_new, alt=t.home_alt, road2=0,
    cold_windy=t.cold_windy, burden=t.h_burden, noprac=t.h_np, temp=t.temp))
A = pd.DataFrame(dict(season=t.season, week=t.week, game=t.game_id, team=t.away_team, is_home=0,
    y=1-t.home_win, q=1-t.qClose,
    odds=[dec(m) if pd.notna(m) else np.nan for m in t.away_moneyline],
    own_rest=t.away_rest, opp_rest=t.home_rest, rest_diff=t.away_rest-t.home_rest,
    rev_qb=t.away_qb_rev, rook_qb=t.away_qb_rook, backup_qb=t.away_qb_backup,
    hc_new=t.away_hc_new, opp_hc_new=t.home_hc_new, alt=0, road2=t.away_road2,
    cold_windy=t.cold_windy, burden=t.a_burden, noprac=t.a_np, temp=t.temp))
d = pd.concat([H, A], ignore_index=True)
d['lg'] = logit(d.q.values)
y = d.y.values.astype(float); lg = d.lg.values; seasons = d.season.values

COMPOUNDS = {
 'A1': ('revenge-QB x opp short week',       ((d.rev_qb==1)&(d.opp_rest<=6)),               +1),
 'B1': ('rookie-QB x rest deficit',          ((d.rook_qb==1)&(d.rest_diff<=-3)),            -1),
 'B2': ('backup-QB x own short week',        ((d.backup_qb==1)&(d.own_rest<=6)),            -1),
 'C1': ('altitude x rest advantage',         ((d.alt==1)&(d.rest_diff>=3)),                 +1),
 'C2': ('road-streak>=2 x cold/windy',       ((d.road2==1)&(d.cold_windy==1)),              -1),
 'D1': ('injury burden>=3 x own short week', ((d.burden>=3)&(d.own_rest<=6)),               -1),
 'E1': ('new HC x opp HC continuity',        ((d.hc_new==1)&(d.opp_hc_new==0)),             -1),
 'F1': ('revenge-QB x (altitude|rest adv)',  ((d.rev_qb==1)&((d.alt==1)|(d.rest_diff>=3))), +1),
 'F2': ('rookie-QB x injury burden>=3',      ((d.rook_qb==1)&(d.burden>=3)),                -1),
 'F3': ('new HC x rest advantage>=3',        ((d.hc_new==1)&(d.rest_diff>=3)),              +1),
 # POST-HOC refinements (added 2026-09-14 04:00 after seeing that "rest<=6" is dominated by
 # Saturday/6-day weeks; true short week = rest<=5).  Disclosed as post-hoc, not pre-registered.
 'D1r': ('[post-hoc] injury burden>=3 x rest<=5', ((d.burden>=3)&(d.own_rest<=5)),          -1),
 'B2r': ('[post-hoc] backup-QB x rest<=5',   ((d.backup_qb==1)&(d.own_rest<=5)),            -1),
 'D3r': ('[post-hoc] nonparticipants>=4 x rest<=6', ((d.noprac>=4)&(d.own_rest<=6)),         -1),
}

def fit(X, yy, iters=12, tol=1e-6):
    X = np.asarray(X, float); yy = np.asarray(yy, float)
    b = np.zeros(X.shape[1])
    for _ in range(iters):
        p = 1/(1+np.exp(-(X@b)))
        W = np.clip(p*(1-p), 1e-9, None)
        g = X.T@(yy-p)
        Hm = (X*W[:,None]).T@X + 1e-8*np.eye(X.shape[1])
        step = np.linalg.solve(Hm, g)
        b += step
        if np.max(np.abs(step)) < tol: break
    return b

def ll(b, X, yy):
    p = 1/(1+np.exp(-(np.asarray(X,float)@b)))
    p = np.clip(p, 1e-9, 1-1e-9)
    return -np.mean(yy*np.log(p)+(1-yy)*np.log(1-p))

def run(cid):
    name, mask, sign = COMPOUNDS[cid]
    m = mask.values.astype(float)
    n = int(m.sum())
    if n < 5: return dict(id=cid, name=name, n=n, note='TOO_FEW')
    # CV
    dll = 0.0; nte = 0
    for k in range(2018, 2026):
        tr = seasons < k; te = seasons == k
        if tr.sum() < 300 or te.sum() < 50: continue
        X0 = np.c_[np.ones(tr.sum()), lg[tr]]
        b0 = fit(X0, y[tr])
        b1 = fit(np.c_[X0, m[tr]], y[tr])
        dll += (ll(b0, np.c_[np.ones(te.sum()), lg[te]], y[te])
                - ll(b1, np.c_[np.ones(te.sum()), lg[te], m[te]], y[te]))*te.sum()
        nte += int(te.sum())
    dll /= max(nte,1)
    # bootstrap coef
    idx = np.arange(len(y)); cs = np.empty(B)
    for i in range(B):
        s = rng.choice(idx, size=len(idx), replace=True)
        cs[i] = fit(np.c_[np.ones(len(s)), lg[s], m[s]], y[s])[2]
    lo, med, hi = np.percentile(cs, [5,50,95])
    yf = float(y[m==1].mean()); qf = float(d.q.values[m==1].mean())
    odds = d.odds.values[m==1]; ok = ~np.isnan(odds)
    roi = float(np.mean(np.where(y[m==1][ok]==1, odds[ok]-1, -1.0))) if ok.sum() else float('nan')
    # permutation on dll: shuffle flag within season
    perm = []
    for i in range(int(__import__('os').environ.get('NP','60'))):
        mp = m.copy()
        for s in np.unique(seasons):
            sel = seasons==s; mp[sel] = rng.permutation(mp[sel])
        dd = 0.0; nn = 0
        for k in range(2018, 2026):
            tr = seasons<k; te = seasons==k
            if tr.sum()<300 or te.sum()<50: continue
            b0 = fit(np.c_[np.ones(tr.sum()), lg[tr]], y[tr])
            b1 = fit(np.c_[np.ones(tr.sum()), lg[tr], mp[tr]], y[tr])
            dd += (ll(b0, np.c_[np.ones(te.sum()), lg[te]], y[te])
                   - ll(b1, np.c_[np.ones(te.sum()), lg[te], mp[te]], y[te]))*te.sum(); nn += te.sum()
        perm.append(dd/max(nn,1))
    pval = float(np.mean(np.array(perm) >= dll)) if sign>0 else float(np.mean(np.array(perm) >= dll))
    res = dict(id=cid, name=name, sign=sign, n=n, n_test=nte,
               coef=float(med), ci90=[float(lo), float(hi)], dlogloss=float(dll),
               winrate=yf, lineprob=qf, resid=float(yf-qf), roi=roi,
               perm_mean=float(np.mean(perm)), perm_null_p_ge=float(np.mean(np.array(perm)>=dll)))
    print(json.dumps(res), flush=True)
    with open(OUT,'a') as f:
        f.write(json.dumps(res)+'\n'); f.flush(); os.fsync(f.fileno())
    with open('/tmp/nfl/res_%s.json' % cid,'w') as f:
        f.write(json.dumps(res, indent=1)); f.flush(); os.fsync(f.fileno())
    return res

if __name__ == '__main__':
    args = sys.argv[1:] or ['ALL']
    ids = list(COMPOUNDS) if args==['ALL'] else args
    for cid in ids:
        r = run(cid)
        print('DONE', cid, flush=True)