"""GSE prod NFL trueProb vs nflverse close. Basis split, selective-publish sweep, shuffled-week placebo.
y = selected team won the game straight-up (trueProb is a team-win prob for the published side)."""
import json, csv, collections, random, datetime as dt
import numpy as np
NAMES = {"Arizona Cardinals":"ARI","Atlanta Falcons":"ATL","Baltimore Ravens":"BAL","Buffalo Bills":"BUF","Carolina Panthers":"CAR",
"Chicago Bears":"CHI","Cincinnati Bengals":"CIN","Cleveland Browns":"CLE","Dallas Cowboys":"DAL","Denver Broncos":"DEN","Detroit Lions":"DET",
"Green Bay Packers":"GB","Houston Texans":"HOU","Indianapolis Colts":"IND","Jacksonville Jaguars":"JAX","Kansas City Chiefs":"KC",
"Las Vegas Raiders":"LV","Los Angeles Chargers":"LAC","Los Angeles Rams":"LA","Miami Dolphins":"MIA","Minnesota Vikings":"MIN",
"New England Patriots":"NE","New Orleans Saints":"NO","New York Giants":"NYG","New York Jets":"NYJ","Philadelphia Eagles":"PHI",
"Pittsburgh Steelers":"PIT","San Francisco 49ers":"SF","Seattle Seahawks":"SEA","Tampa Bay Buccaneers":"TB","Tennessee Titans":"TEN",
"Washington Commanders":"WAS"}
def mlp(ml): ml=float(ml); return 100/(ml+100) if ml>0 else -ml/(-ml+100)
G = {}
for r in csv.DictReader(open('games.csv')):
    if int(r['season']) < 2024: continue
    G[(r['home_team'], r['away_team'], r['gameday'])] = r
D = json.load(open('picks_all.json'))
NFL = 'cmpg6t7v900031heri45v3d8s'
recs, miss = [], collections.Counter()
for p in D['picks']:
    if p['sportId'] != NFL: continue
    ie = p['ie'] if isinstance(p['ie'], dict) else (json.loads(p['ie']) if p['ie'] else None)
    if not ie or ie.get('trueProb') is None: miss['no_trueProb'] += 1; continue
    h, a = NAMES.get(p['homeTeamName']), NAMES.get(p['awayTeamName'])
    sel = p['selection'] or ''
    side = 'home' if p['homeTeamName'] and p['homeTeamName'] in sel else ('away' if p['awayTeamName'] and p['awayTeamName'] in sel else None)
    if not (h and a and side): miss['unmapped_side_or_team'] += 1; continue
    ct = dt.datetime.fromisoformat(p['commenceTime'].replace('Z','+00:00'))
    g = None
    for off in (0, -1, 1):
        g = G.get((h, a, (ct + dt.timedelta(days=off) - dt.timedelta(hours=5)).date().isoformat()))
        if g: break
    if not g: miss['no_nflverse_game'] += 1; continue
    if g['result'] == '' or float(g['result']) == 0: miss['unplayed_or_tie'] += 1; continue
    home_won = float(g['result']) > 0
    qh = mlp(g['home_moneyline']) / (mlp(g['home_moneyline']) + mlp(g['away_moneyline']))
    q = qh if side == 'home' else 1 - qh
    y = int(home_won if side == 'home' else not home_won)
    retro = 'Retrospective' in (ie.get('rationale') or '')
    gen = dt.datetime.fromisoformat(p['generatedAt'].replace('Z','+00:00')) if p['generatedAt'] else None
    premint = gen is not None and gen < ct
    recs.append(dict(id=p['id'], season=int(g['season']), week=int(g['week']), pt=p['pickType'], p=float(ie['trueProb']), q=q, y=y,
                     retro=retro, premint=premint, pub=bool(p['isPublished']), conf=p['confidence'], game=g['game_id']))
print('NFL picks w/ trueProb joined:', len(recs), dict(miss))
print('basis:', collections.Counter(('retro' if r['retro'] else 'mint-text', 'gen<kick' if r['premint'] else 'gen>=kick') for r in recs))
print('season/week:', sorted(collections.Counter((r['season'], r['week']) for r in recs).items()))
def M(ps, ys):
    ps=np.clip(np.array(ps,float),1e-6,1-1e-6); ys=np.array(ys,float)
    if len(ps)==0: return dict(n=0)
    return dict(n=len(ps), brier=round(float(np.mean((ps-ys)**2)),4), ll=round(float(-np.mean(ys*np.log(ps)+(1-ys)*np.log(1-ps))),4),
                mean_p=round(float(ps.mean()),4), hit=round(float(ys.mean()),4))
# one row per (game, side) to avoid ML/spread/total duplicates double-counting the same team-win event
seen, U = set(), []
for r in sorted(recs, key=lambda r: (not r['premint'],)):
    k = (r['game'], r['p'] > 0 and r['q'])
    if (r['game'], round(r['q'],4)) in seen: continue
    seen.add((r['game'], round(r['q'],4))); U.append(r)
print('dedup game-side rows:', len(U))
out = {}
for name, S in [('all', U), ('pre-kick mint only', [r for r in U if r['premint'] and not r['retro']]), ('retrospective', [r for r in U if r['retro']])]:
    out[name] = dict(gse=M([r['p'] for r in S],[r['y'] for r in S]), close=M([r['q'] for r in S],[r['y'] for r in S]))
    print(f"{name:20} GSE {out[name]['gse']}  CLOSE {out[name]['close']}")
# selective publish sweep
print('\nselective publish sweep (|p-0.5|>=delta), posted vs close on same rows; rejected Brier')
for name, S in [('all', U), ('pre-kick mint only', [r for r in U if r['premint'] and not r['retro']])]:
    for d in (0, .08, .10, .12, .15, .18):
        P = [r for r in S if abs(r['p']-.5) >= d]; R = [r for r in S if abs(r['p']-.5) < d]
        mp, mc, mr = M([r['p'] for r in P],[r['y'] for r in P]), M([r['q'] for r in P],[r['y'] for r in P]), M([r['p'] for r in R],[r['y'] for r in R])
        print(f"  {name:18} d={d:.2f} posted n={mp.get('n')} ll {mp.get('ll')} vs close {mc.get('ll')} | brier {mp.get('brier')} vs {mc.get('brier')} | rejected n={mr.get('n')} brier {mr.get('brier')}")
# shuffled-week placebo: permute p within week; does the d=0.10 posted set still look as good vs close?
random.seed(7); S = U; d = .10
real = M([r['p'] for r in S if abs(r['p']-.5)>=d],[r['y'] for r in S if abs(r['p']-.5)>=d])['ll']
byw = collections.defaultdict(list)
for r in S: byw[(r['season'], r['week'])].append(r)
pl = []
for _ in range(500):
    ps=[]; ys=[]
    for w, rs in byw.items():
        perm = [r['p'] for r in rs]; random.shuffle(perm)
        for r, pp in zip(rs, perm):
            if abs(pp-.5) >= d: ps.append(pp); ys.append(r['y'])
    pl.append(M(ps, ys)['ll'])
pl = np.array(pl); print(f"\nplacebo d=0.10: real posted ll {real}; placebo mean {pl.mean():.4f}, frac placebo<=real {np.mean(pl<=real):.3f}")
# logit pool: does GSE p add to close q?
def lg(x): x=np.clip(np.array(x),1e-6,1-1e-6); return np.log(x/(1-x))
X = np.column_stack([np.ones(len(U)), lg([r['q'] for r in U]), lg([r['p'] for r in U])]); y = np.array([r['y'] for r in U]); w = np.zeros(3)
for _ in range(50):
    pr = 1/(1+np.exp(-X@w)); H = X.T@(X*(pr*(1-pr))[:,None]); w += np.linalg.solve(H, X.T@(y-pr))
se = np.sqrt(np.diag(np.linalg.inv(H)))
print(f"logit pool in-sample: b_close={w[1]:+.3f}±{1.96*se[1]:.3f}  c_gse={w[2]:+.3f}±{1.96*se[2]:.3f}  (n={len(U)})")
out['pool'] = dict(coef=w.tolist(), se=se.tolist(), n=len(U)); out['placebo'] = dict(real=real, mean=float(pl.mean()), frac=float(np.mean(pl<=real)))
json.dump(dict(out=out, rows=U), open('gse_nfl_eval.json','w'), indent=1)
