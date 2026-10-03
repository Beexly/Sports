"""W4 2026 mint: engine v1 (market offset + home/neutral flag + PIT QB + Elo residual; availability carried as an annotated
family at earned weight), coherent score distribution, health gate, traces. Writes eng/w4_mint_v1.json + .sha256.
Engine forecasts only. Never written to Neon picks."""
import os, sys, json, hashlib, datetime as dt, collections
import numpy as np, pandas as pd
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.path.join(R, 'eng'))
from teams import ABBR
import scoredist as SD
F = pd.read_parquet(os.path.join(R, 'eng', 'features_v1.parquet'))
C = pd.read_parquet(os.path.join(R, 'eng', 'corpus_features.parquet'))
F = F.merge(C, on='game_id', how='left')
for c in ('stress', 'int_rate', 'int_hit', 'top_share', 'deep_rate'):
    F[c] = F[c].fillna(0.0)
S = F[F.y.notna()].copy(); S['y'] = S.y.astype(float)
U = F[(F.season == 2026) & (F.week == 4) & F.y.isna()].copy()
def lg(p): p = np.clip(p, 1e-6, 1 - 1e-6); return np.log(p / (1 - p))
def sig(x): return 1 / (1 + np.exp(-x))
def fit(X, y, off, lam):
    mu, sd = X.mean(0), X.std(0) + 1e-9; Z = (X - mu) / sd; w = np.zeros(Z.shape[1]); Rm = lam * np.eye(Z.shape[1])
    for _ in range(60):
        p = sig(off + Z @ w); g = Z.T @ (p - y) + Rm @ w; H = (Z * (p * (1 - p))[:, None]).T @ Z + Rm; w -= np.linalg.solve(H, g)
    return w, mu, sd
def pred(m, X, off): w, mu, sd = m; return sig(off + ((X - mu) / sd) @ w)
def ll(p, y): p = np.clip(p, 1e-6, 1 - 1e-6); return float(np.mean(-(y * np.log(p) + (1 - y) * np.log(1 - p))))
FEATS = ['home_flag', 'qb_pit', 'elo_res', 'stress', 'int_rate', 'int_hit']
LAMS = [1, 3, 10, 30, 100, 300, 1000, 3000]
a, b = S[S.season < 2025], S[S.season == 2025]
X = lambda d: d[FEATS].values.astype(float)
lam = min(LAMS, key=lambda l: ll(pred(fit(X(a), a.y.values, a.mkt.values, l), X(b), b.mkt.values), b.y.values))
M = fit(X(S), S.y.values, S.mkt.values, lam)
coef = dict(zip(FEATS, np.round(M[0] / M[2], 5)))

# ---- live market from Neon (latest snapshot per book; de-vig ML; median lines) ----
NO = json.load(open(os.path.join(R, 'lake', 'neon_odds_latest.json')))
def am2p(a): return 100 / (a + 100) if a > 0 else -a / (-a + 100)
live = {}
gid2 = {g['id']: g for g in NO['games']}
by = collections.defaultdict(lambda: collections.defaultdict(dict))
for s in NO['snaps']:
    k = (s['market'], s['side']); cur = by[s['game']][s['book']].get(k)
    if cur is None or s['captured'] > cur['captured']: by[s['game']][s['book']][k] = s
newest = max(s['captured'] for s in NO['snaps'])
for gid, books in by.items():
    g = gid2.get(gid)
    if not g: continue
    h, aw = ABBR.get(g['home']), ABBR.get(g['away'])
    qs, sp, tl = [], [], []
    for bk, mk in books.items():
        mh, ma = mk.get(('MONEYLINE', 'home')), mk.get(('MONEYLINE', 'away'))
        if mh and ma and mh['price'] and ma['price']:
            ph, pa = am2p(mh['price']), am2p(ma['price']); qs.append(ph / (ph + pa))
        s = mk.get(('SPREAD', 'home'))
        if s and s['line'] is not None: sp.append(-float(s['line']))   # nflverse convention: + = home favoured
        t = mk.get(('TOTAL', 'over'))
        if t and t['line'] is not None: tl.append(float(t['line']))
    live[(aw, h)] = dict(q=float(np.median(qs)) if qs else None, n_books=len(qs), spread=float(np.median(sp)) if sp else None,
                         total=float(np.median(tl)) if tl else None, commence=g['commence'],
                         newest=max(x['captured'] for bk in books.values() for x in bk.values()))

# ---- injuries (nfl.com via Alexandria) with prior-4 snap shares; Glazer 2025 play rates (2015-2019 starters) ----
GLAZER = {'OUT': 0.0, 'DOUBTFUL': 0.002, 'QUESTIONABLE': 0.72, None: 0.981}
IJ = json.load(open(os.path.join(R, 'lake', 'alexandria', 'nfl_injury_2026_w4.json')))['data']['alexandria'][0]['data']
inj_obs = dt.datetime.utcfromtimestamp(IJ['observed_at_ms'] / 1000)
pl = pd.read_parquet(os.path.join(R, 'lake', 'nflverse', 'players.parquet'))
gcol = 'gsis_id'; pcol = 'pfr_id' if 'pfr_id' in pl.columns else [c for c in pl.columns if 'pfr' in c][0]
ncol = 'display_name' if 'display_name' in pl.columns else [c for c in pl.columns if 'name' in c][0]
name_of = dict(zip(pl[gcol], pl[ncol]))
sn = pd.read_parquet(os.path.join(R, 'lake', 'nflverse', 'snap_counts_2026.parquet'))
sn = sn.merge(pl[[gcol, pcol]].dropna().rename(columns={pcol: 'pfr_player_id'}), on='pfr_player_id', how='left')
sn = sn[sn.week < 4].sort_values('week')
share = sn.groupby(gcol).apply(lambda d: max(d.offense_pct.tail(4).mean(), d.defense_pct.tail(4).mean())).to_dict()
team_inj = collections.defaultdict(list)
for r in IJ['reports']:
    st = r.get('injury_status'); g = r['player'].get('gsis_id'); tm = r['team']['abbreviation']
    tm = {'AZ': 'ARI', 'LAR': 'LA', 'JAC': 'JAX', 'WSH': 'WAS'}.get(tm, tm)
    if st is None: continue
    sh = float(share.get(g, 0) or 0)
    team_inj[tm].append(dict(player=r['player']['display_name'], pos=r['player']['position'], status=st,
                             practice=r.get('practice_status'), snap_share_prior4=round(sh, 2),
                             p_play=GLAZER.get(st, 0.981), exp_snap_loss=round(sh * (1 - GLAZER.get(st, 0.981)), 3)))
for tm in team_inj: team_inj[tm].sort(key=lambda x: -x['exp_snap_loss'])

# ---- ESPN predictor (outside opinion, logged only) ----
def espn_home(gid):
    f = os.path.join(R, 'lake', 'espn', f'summary_{gid}.json')
    try:
        d = json.load(open(f)); pr = d.get('predictor') or {}
        return float(pr.get('homeTeam', {}).get('gameProjection')) / 100
    except Exception: return None
HIST = SD.H[(SD.H.season >= 2012)]
out, gate = [], dict(issues=[])
now = dt.datetime.utcnow()
for g in U.itertuples():
    L = live.get((g.away, g.home))
    if not L or L['q'] is None or L['spread'] is None or L['total'] is None:
        gate['issues'].append(f'{g.game_id}: no live market'); continue
    mkt = float(lg(L['q'])); elo_res = float(g.elo - mkt)
    x = np.array([[g.home_flag, g.qb_pit, elo_res, g.stress, g.int_rate, g.int_hit]], dtype=float)
    p = float(pred(M, x, np.array([mkt]))[0])
    m, t = SD.neighborhood(HIST, L['spread'], L['total'])
    # Anchor to the quoted spread and total. Do not shift the lattice to force P(win)=p:
    # that gap is the neighborhood's win rate vs q, not an engine edge, and it breaks cover.
    sh_anchor = SD.shift_to_fair(m, L['spread']); sh_tot = SD.shift_to_fair(t, L['total'])
    edge = p - L['q']
    sh_eng = 0.0
    if abs(edge) >= 0.01:
        base = m + sh_anchor
        sh_eng = SD.shift_to(base, p) - SD.shift_to(base, L['q'])
    sh = sh_anchor + sh_eng
    D = SD.mk(m, t, L['spread'], L['total'], shift=sh, total_shift=sh_tot)
    contrib = dict(zip(FEATS, np.round(((x[0] - M[1]) / M[2]) * M[0], 4)))
    hq, aq = name_of.get(g.h_qb, g.h_qb), name_of.get(g.a_qb, g.a_qb)
    out.append(dict(game_id=g.game_id, kickoff_utc=L['commence'], neutral_site=bool(g.neutral),
        market=dict(q_home_devig_median=round(L['q'], 4), books=L['n_books'], spread_home=L['spread'], total=L['total'], newest_snapshot=L['newest']),
        engine=dict(p_home_win=round(p, 4), edge_vs_market=round(p - L['q'], 4), logit_contrib=contrib,
                    p_home_cover=round(D['p_home_cover'], 4), p_push_spread=round(D['p_push_spread'], 4), p_over=round(D['p_over'], 4),
                    p_push_total=round(D['p_push_total'], 4), home_pts_median=D['home_pts_median'], away_pts_median=D['away_pts_median'],
                    fair_cover=round(D['p_home_cover'] + 0.5 * D['p_push_spread'], 4),
                    fair_over=round(D['p_over'] + 0.5 * D['p_push_total'], 4),
                    margin_shift_pts=round(sh, 2), margin_shift_anchor=round(sh_anchor, 2),
                    margin_shift_engine=round(sh_eng, 2), total_shift_anchor=round(sh_tot, 2)),
        starters=dict(home=dict(qb=hq, source=g.h_qb_src), away=dict(qb=aq, source=g.a_qb_src)),
        injuries=dict(home=team_inj.get(g.home, [])[:6], away=team_inj.get(g.away, [])[:6]),
        corpus=dict(stress=round(float(g.stress), 4), int_rate=round(float(g.int_rate), 4), int_hit=round(float(g.int_hit), 4),
                    top_share=round(float(g.top_share), 4), deep_rate=round(float(g.deep_rate), 4),
                    cite='c02 PRESS-3 SIT-6 TRUST-7'),
        outside_opinions=dict(espn_fpi_home=espn_home(g.game_id)),
        decision='FORECAST_ONLY (no play: availability family not promoted; |edge| CI not established)'))

# ---- health gate ----
newest_dt = dt.datetime.fromisoformat(newest[:19])
if (now - inj_obs).total_seconds() > 24 * 3600: gate['issues'].append('injury report observed > 24h ago')
if (now - newest_dt).total_seconds() > 12 * 3600: gate['issues'].append(f'odds snapshot stale: newest {newest}')
if len(out) != len(U): gate['issues'].append(f'coverage {len(out)}/{len(U)}')
for o in out:
    if abs(o['engine']['edge_vs_market']) > 0.08: gate['issues'].append(f"{o['game_id']}: |edge| > 0.08, check inputs")
bad = [o['game_id'] for o in out if abs(o['engine']['edge_vs_market']) < 0.01 and (abs(o['engine']['fair_cover'] - 0.5) > 0.02 or abs(o['engine']['fair_over'] - 0.5) > 0.02)]
if bad:
    gate['derived_markets'] = 'WITHHELD: spread/total read-offs fail the coherence check (fair cover and fair over at the market line should be within 0.02 of 0.5 when |p-q|<0.01): ' + ','.join(bad)
    for o in out:
        if o['game_id'] in bad: o['engine']['derived_withheld'] = True
else:
    gate['derived_markets'] = 'published'
if out:
    gate['fair_worst'] = round(max(max(abs(o['engine']['fair_cover'] - 0.5), abs(o['engine']['fair_over'] - 0.5)) for o in out), 4)
gate['pass'] = len(gate['issues']) == 0
src = open(__file__, encoding='utf-8').read()
doc = dict(engine='GSE engine v1 (market offset + home/neutral + PIT QB + Elo residual)', lam=lam, coef_per_unit=coef,
           train_n=int(len(S)), minted_at_utc=now.isoformat(timespec='seconds'), injury_observed_at_utc=inj_obs.isoformat(timespec='seconds'),
           odds_newest=newest, model_hash=hashlib.sha256(src.encode()).hexdigest()[:16], gate=gate, games=out,
           note='Engine forecasts only. Not written to Neon picks. Grade after MNF 2026-10-05.')
js = json.dumps(doc, sort_keys=True, separators=(',', ':'), default=str)
fn = os.path.join(R, 'eng', f"w4_mint_v1_{now.strftime('%Y%m%dT%H%MZ')}.json")
open(fn, 'w').write(js); h = hashlib.sha256(js.encode()).hexdigest()
open(fn + '.sha256', 'w', newline='\n').write(f'{h}  {os.path.basename(fn)}\n')
print('gate', gate, '\nfile', fn, h[:16])
for o in out:
    e = o['engine']; mk = o['market']
    print(f"{o['game_id']:17s} q {mk['q_home_devig_median']:.3f} p {e['p_home_win']:.3f} edge {e['edge_vs_market']:+.3f} | fairC {e['fair_cover']:.3f} fairO {e['fair_over']:.3f} | {o['starters']['away']['qb']} @ {o['starters']['home']['qb']}{' [NEUTRAL]' if o['neutral_site'] else ''}")
