"""GSE intelligence chart. Numbers come from the walk-forward file and a refit that must match it.
No LLM judge. A row is contaminated if it used the actual starter. Prospective questions are unscored.
"""
import os, json, hashlib, datetime as dt
import numpy as np, pandas as pd

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(R, 'charts')
os.makedirs(OUT, exist_ok=True)
F = pd.read_parquet(os.path.join(R, 'eng', 'features_v1.parquet'))
S = F[F.y.notna()].copy()
S['y'] = S.y.astype(float)
PUB = json.load(open(os.path.join(R, 'eng', 'test_v1_results.json')))
SD = json.load(open(os.path.join(R, 'eng', 'scoredist_results.json')))
mint = sorted(f for f in os.listdir(os.path.join(R, 'eng')) if f.startswith('w4_mint_v1_') and f.endswith('.json'))[-1]
MINT = json.load(open(os.path.join(R, 'eng', mint)))

def ll(p, y):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return -(y * np.log(p) + (1 - y) * np.log(1 - p))
def brier(p, y):
    return (p - y) ** 2
def ece(p, y, bins=10):
    edges = np.linspace(0, 1, bins + 1)
    n = len(y)
    e = 0.0
    rows = []
    for i in range(bins):
        m = (p >= edges[i]) & (p < edges[i + 1] if i < bins - 1 else p <= edges[i + 1])
        k = int(m.sum())
        if k == 0:
            rows.append(dict(lo=round(float(edges[i]), 2), hi=round(float(edges[i + 1]), 2), n=0, stated=None, realized=None))
            continue
        st, rz = float(p[m].mean()), float(y[m].mean())
        e += (k / n) * abs(st - rz)
        rows.append(dict(lo=round(float(edges[i]), 2), hi=round(float(edges[i + 1]), 2), n=k, stated=round(st, 4), realized=round(rz, 4)))
    return round(float(e), 4), rows

def fit(X, y, off, lam, icpt):
    mu, sd = X.mean(0), X.std(0) + 1e-9
    Z = (X - mu) / sd
    if icpt:
        Z = np.column_stack([np.ones(len(X)), Z])
    w = np.zeros(Z.shape[1])
    Rm = lam * np.eye(Z.shape[1])
    if icpt:
        Rm[0, 0] = 1e-6
    for _ in range(60):
        p = 1 / (1 + np.exp(-(off + Z @ w)))
        g = Z.T @ (p - y) + Rm @ w
        H = (Z * (p * (1 - p))[:, None]).T @ Z + Rm
        w -= np.linalg.solve(H, g)
    return w, mu, sd, icpt

def pred(m, X, off):
    w, mu, sd, icpt = m
    Z = (X - mu) / sd
    if icpt:
        Z = np.column_stack([np.ones(len(X)), Z])
    return 1 / (1 + np.exp(-(off + Z @ w)))

FEATS = ['home_flag', 'qb_pit', 'elo_res']
LAMS = [1, 3, 10, 30, 100, 300, 1000, 3000]
rows = []
for T in range(2019, 2027):
    tr, te = S[S.season < T], S[S.season == T]
    a, b = tr[tr.season < T - 1], tr[tr.season == T - 1]
    X = lambda d: d[FEATS].values.astype(float)
    o = lambda d: d.mkt.values
    lam = min(LAMS, key=lambda l: ll(pred(fit(X(a), a.y.values, o(a), l, False), X(b), o(b)), b.y.values).mean())
    m = fit(X(tr), tr.y.values, o(tr), lam, False)
    p = pred(m, X(te), o(te))
    rows.append(pd.DataFrame(dict(season=T, y=te.y.values, p=p, q=te.q.values)))
D = pd.concat(rows, ignore_index=True)
got = round(float(ll(D.p.values, D.y.values).mean()), 4)
published = PUB['v1a offset  home_flag+qb_PIT+elo_res']['ll']
if abs(got - published) > 0.00015:
    raise SystemExit(f'refit {got} does not match published v1a {published}; chart not written')

def pack(name, p, y, season, contamination, note):
    by = {}
    for T, g in pd.DataFrame(dict(season=season, y=y, p=p)).groupby('season'):
        by[str(int(T))] = round(float(ll(g.p.values, g.y.values).mean()), 4)
    e, bins = ece(p, y)
    return dict(name=name, n=int(len(y)), contamination=contamination, note=note,
                log_loss=round(float(ll(p, y).mean()), 4), brier=round(float(brier(p, y).mean()), 4),
                ece=e, by_season=by, reliability=bins,
                verification='internally_measured')

close = pack('de-vigged close', D.q.values, D.y.values, D.season.values, 'market price, not a model',
             'Reference line. Not a target and not a merge gate.')
v1 = pack('engine v1 (offset + home/neutral + PIT QB + Elo residual)', D.p.values, D.y.values, D.season.values,
          'clean: pre-game starters, walk-forward, no post-kickoff inputs',
          'Does not beat the close. CI on the log-loss gap includes values on both sides of zero.')
coin = pack('coin flip', np.full(len(D), 0.5), D.y.values, D.season.values, 'constant', 'Not a fitted system.')

prospective = []
for g in MINT['games']:
    prospective.append(dict(game_id=g['game_id'], kickoff_utc=g['kickoff_utc'],
                            p_home=g['engine']['p_home_win'], q_home=g['market']['q_home_devig_median'],
                            fair_cover=g['engine'].get('fair_cover'), fair_over=g['engine'].get('fair_over'),
                            scored=False, ground_truth='nflverse result after the game. No LLM judge.'))

doc = dict(
    title='GSE intelligence chart',
    generated_at_utc=dt.datetime.utcnow().isoformat(timespec='seconds'),
    rules=[
        'A question is a game whose outcome was not known when the probability was written.',
        'The score is log loss and Brier against the nflverse result. No LLM judge.',
        'A row is contaminated if it uses the actual starter, a post-kickoff feature, or an in-sample fit.',
        'The leaky 0.6072 figure used the actual starter. It is not on this chart.',
        'New questions drop every week. The current drop is 2026 week 4, 15 games, unscored.',
        'Every number is internally measured unless a row says independently verified. None do.',
        'The close is a reference line. This chart does not claim the engine beat it.',
    ],
    moneyline=[close, v1, coin],
    published_ci_v1_minus_close=PUB['v1a offset  home_flag+qb_PIT+elo_res']['ci_vs_close'],
    score_distribution=dict(
        n=SD['n'],
        note='Neighbourhood joint, unshifted. Calibrated. Does not beat the moneyline close.',
        ats_predicted=SD['ats_pred_mean'], ats_realized=SD['ats_home_cover_rate'], ats_log_loss=SD['ats_ll'],
        over_predicted=SD['over_pred_mean'], over_realized=SD['over_rate'], over_log_loss=SD['over_ll'],
        ml_from_spread=SD['ll_ml_from_spread'], ml_close=SD['ll_devig_ml'],
        verification='internally_measured'),
    prospective_drop=dict(id='2026-W4', n=len(prospective), scored=0, mint=mint,
                          sha256=hashlib.sha256(open(os.path.join(R, 'eng', mint), 'rb').read()).hexdigest(),
                          games=prospective),
    external_boards=[
        dict(name='Prophet Arena', status='NOT SUBMITTED', next='Read the rules and terms before any submission.'),
        dict(name='Metaculus FutureEval', status='NOT SUBMITTED', next='Read the rules and terms before any submission.'),
        dict(name='ForecastBench', status='NOT SUBMITTED', next='Read the rules and terms before any submission.'),
        dict(name='llm-stats.com', status='NOT LISTED', next='A public chart of our own comes first. Their index is for LLM benchmarks, not this sports replay.'),
    ],
)
raw = json.dumps(doc, indent=1)
open(os.path.join(OUT, 'gse_intelligence_chart.json'), 'w').write(raw)
print('matched v1a', got, 'close', close['log_loss'], 'ece', v1['ece'], close['ece'])
print('wrote', os.path.join(OUT, 'gse_intelligence_chart.json'))
