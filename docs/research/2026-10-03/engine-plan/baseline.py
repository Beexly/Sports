"""Market-close baseline + independent Elo, walk-forward, NFL 2006-2026 W1-4.
Measures: Brier, log loss, ECE(10), and a logit-pool test of whether Elo adds to the close.
Data: nflverse nfldata games.csv (CC-BY). No fitting on test seasons."""
import csv, math, json, collections
import numpy as np

rows = [r for r in csv.DictReader(open('games.csv')) if r['game_type'] in ('REG','WC','DIV','CON','SB')]
rows.sort(key=lambda r: (r['gameday'], r['game_id']))

def ml_prob(ml):
    ml = float(ml)
    return 100/(ml+100) if ml > 0 else -ml/(-ml+100)

# --- Elo (score-only, no market), standard 538-style w/ MOV, season regression 1/3
K, HFA = 20.0, 48.0
elo = collections.defaultdict(lambda: 1500.0)
last_season = None
recs = []
for r in rows:
    s = int(r['season'])
    if s != last_season:
        for t in list(elo): elo[t] = 1500 + (elo[t]-1500)*2/3
        last_season = s
    h, a = r['home_team'], r['away_team']
    neutral = r['location'] == 'Neutral'
    d = elo[h] - elo[a] + (0 if neutral else HFA)
    p_elo = 1/(1+10**(-d/400))
    q = None
    if r['home_moneyline'] and r['away_moneyline']:
        ph, pa = ml_prob(r['home_moneyline']), ml_prob(r['away_moneyline'])
        q = ph/(ph+pa)
    played = r['result'] != ''
    y = None
    if played:
        res = float(r['result'])
        if res != 0:
            y = 1 if res > 0 else 0
        mov = abs(res)
        mult = math.log(mov+1) * 2.2/((abs(d))*0.001+2.2)
        sh = 1 if res > 0 else (0.5 if res == 0 else 0)
        delta = K*mult*(sh-p_elo)
        elo[h] += delta; elo[a] -= delta
    recs.append(dict(season=s, week=int(r['week']), gt=r['game_type'], game_id=r['game_id'],
                     p_elo=p_elo, q=q, y=y, played=played,
                     home=h, away=a, gameday=r['gameday']))

def metrics(ps, ys):
    ps, ys = np.clip(np.array(ps), 1e-6, 1-1e-6), np.array(ys)
    brier = float(np.mean((ps-ys)**2))
    ll = float(-np.mean(ys*np.log(ps)+(1-ys)*np.log(1-ps)))
    bins = np.minimum((ps*10).astype(int), 9)
    ece = sum(abs(ps[bins==b].mean()-ys[bins==b].mean())*(bins==b).sum() for b in range(10) if (bins==b).any())/len(ps)
    return dict(n=len(ps), brier=round(brier,4), logloss=round(ll,4), ece=round(float(ece),4), acc=round(float(np.mean((ps>0.5)==ys)),4))

def logit(p): p=np.clip(p,1e-6,1-1e-6); return np.log(p/(1-p))

def fit_pool(X, y, iters=50):
    # logistic regression via Newton, returns coef + SE
    X = np.column_stack([np.ones(len(X)), X]); w = np.zeros(X.shape[1])
    for _ in range(iters):
        p = 1/(1+np.exp(-X@w)); W = p*(1-p)
        H = X.T@(X*W[:,None]); g = X.T@(y-p)
        w += np.linalg.solve(H, g)
    p = 1/(1+np.exp(-X@w)); H = X.T@(X*(p*(1-p))[:,None])
    se = np.sqrt(np.diag(np.linalg.inv(H)))
    return w, se

out = {}
scored = [r for r in recs if r['y'] is not None and r['q'] is not None]
by = collections.defaultdict(list)
for r in scored:
    key = '2026 W1-4(sofar)' if r['season']==2026 else str(r['season'])
    by[key].append(r)
print(f"{'slice':18} {'n':>4} | market brier/ll/ece/acc        | elo brier/ll/ece/acc")
for k in sorted(by):
    g = by[k]
    m = metrics([r['q'] for r in g], [r['y'] for r in g]); e = metrics([r['p_elo'] for r in g],[r['y'] for r in g])
    out[k] = dict(market=m, elo=e)
    print(f"{k:18} {m['n']:>4} | {m['brier']:.4f} {m['logloss']:.4f} {m['ece']:.4f} {m['acc']:.3f} | {e['brier']:.4f} {e['logloss']:.4f} {e['ece']:.4f} {e['acc']:.3f}")

# logit-pool walk-forward admission test: train on all seasons < T, test on T
print('\nLogit-pool (y ~ a + b*logit(q) + c*logit(elo)), fit on seasons 2006..T-1')
for T in (2022, 2023, 2024, 2025, 2026):
    tr = [r for r in scored if 2006 <= r['season'] < T]; te = [r for r in scored if r['season'] == T]
    Xtr = np.column_stack([logit(np.array([r['q'] for r in tr])), logit(np.array([r['p_elo'] for r in tr]))])
    ytr = np.array([r['y'] for r in tr]); w, se = fit_pool(Xtr, ytr)
    Xte = np.column_stack([np.ones(len(te)), logit(np.array([r['q'] for r in te])), logit(np.array([r['p_elo'] for r in te]))])
    pp = 1/(1+np.exp(-Xte@w))
    mp = metrics(pp, [r['y'] for r in te]); mq = metrics([r['q'] for r in te], [r['y'] for r in te])
    out[f'pool_{T}'] = dict(coef=w.round(4).tolist(), se=se.round(4).tolist(), pooled=mp, market=mq)
    print(f"T={T} n={len(te):3} c_elo={w[2]:+.3f}±{1.96*se[2]:.3f}  pooled ll {mp['logloss']:.4f} vs close {mq['logloss']:.4f}  brier {mp['brier']:.4f} vs {mq['brier']:.4f}")

# pending 2026 W4 slate (sealable now)
pend = [r for r in recs if r['season']==2026 and r['week']==4 and not r['played']]
out['pending_w4'] = [dict(game_id=r['game_id'], q_close_or_current=r['q'], p_elo=round(r['p_elo'],4)) for r in pend]
print(f"\n2026 W4 unplayed games in feed: {len(pend)}; with ML: {sum(r['q'] is not None for r in pend)}")
json.dump(out, open('baseline_results.json','w'), indent=1)
