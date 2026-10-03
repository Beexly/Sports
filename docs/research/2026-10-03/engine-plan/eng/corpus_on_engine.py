"""Corpus c02 onto the engine. Point-in-time. Prior weeks only.

stress: PRESS-3, home minus away.
int_rate / int_hit: SIT-6, interception occurrence from nflverse pbp, not FTN.
top_share: TRUST-7, pbp-native target concentration. FTN read_thrown stays out of the price (SIT-2, share-alike).
"""
import os, sys, json, glob
import numpy as np
import pandas as pd
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(R, 'eng'))

F = pd.read_parquet(os.path.join(R, 'eng', 'features_v1.parquet'))
S = pd.read_parquet(os.path.join(R, 'brain', 'protection_stress.parquet'))
stress = S.set_index(['season', 'week', 'team']).stress

def team_diff(frame, col):
    h = frame.apply(lambda r: stress.get((r.season, r.week, r.home), np.nan) if col == 'stress' else np.nan, axis=1)
    return h

# --- pbp team-week rates, then as-of the next week ---
parts = []
for f in sorted(glob.glob(os.path.join(R, 'lake', 'nflverse', 'pbp', 'play_by_play_*.parquet'))):
    cols = ['season', 'week', 'posteam', 'pass_attempt', 'interception', 'qb_hit', 'sack', 'air_yards', 'receiver_player_id', 'play_type']
    p = pd.read_parquet(f, columns=cols)
    p = p[p.pass_attempt == 1]
    p = p.dropna(subset=['posteam'])
    p['hit'] = ((p.qb_hit.fillna(0) == 1) | (p.sack.fillna(0) == 1)).astype(int)
    p['is_int'] = (p.interception.fillna(0) == 1).astype(int)
    p['deep'] = (p.air_yards.fillna(0) >= 15).astype(int)
    tw = p.groupby(['season', 'week', 'posteam'], as_index=False).agg(
        att=('pass_attempt', 'sum'), ints=('is_int', 'sum'), hit_att=('hit', 'sum'), hit_int=('is_int', lambda s: int(((s == 1) & (p.loc[s.index, 'hit'] == 1)).sum()) if len(s) else 0),
        deep=('deep', 'sum'))
    # top target share within the week
    rec = p.dropna(subset=['receiver_player_id']).groupby(['season', 'week', 'posteam', 'receiver_player_id']).size().reset_index(name='n')
    top = rec.groupby(['season', 'week', 'posteam']).n.max().reset_index(name='top_n')
    tot = rec.groupby(['season', 'week', 'posteam']).n.sum().reset_index(name='tgt')
    share = top.merge(tot, on=['season', 'week', 'posteam'])
    share['top_share'] = share.top_n / share.tgt
    tw = tw.merge(share[['season', 'week', 'posteam', 'top_share', 'tgt']], on=['season', 'week', 'posteam'], how='left')
    parts.append(tw)
TW = pd.concat(parts, ignore_index=True)
# fix hit_int properly
parts = []
for f in sorted(glob.glob(os.path.join(R, 'lake', 'nflverse', 'pbp', 'play_by_play_*.parquet'))):
    p = pd.read_parquet(f, columns=['season', 'week', 'posteam', 'pass_attempt', 'interception', 'qb_hit', 'sack'])
    p = p[(p.pass_attempt == 1) & p.posteam.notna()]
    p['hit'] = ((p.qb_hit.fillna(0) == 1) | (p.sack.fillna(0) == 1)).astype(int)
    p['is_int'] = (p.interception.fillna(0) == 1).astype(int)
    p['hit_int'] = ((p.hit == 1) & (p.is_int == 1)).astype(int)
    parts.append(p.groupby(['season', 'week', 'posteam'], as_index=False).agg(att=('pass_attempt', 'sum'), ints=('is_int', 'sum'), hit_att=('hit', 'sum'), hit_int=('hit_int', 'sum')))
HIT = pd.concat(parts, ignore_index=True)
TW = TW.drop(columns=['ints', 'hit_att', 'hit_int'], errors='ignore').merge(HIT, on=['season', 'week', 'posteam'], how='left', suffixes=('', '_h'))
if 'att_h' in TW.columns:
    TW['att'] = TW['att_h']
    TW = TW.drop(columns=[c for c in TW.columns if c.endswith('_h')])

def asof(season, week, team):
    prior = TW[(TW.posteam == team) & (((TW.season == season) & (TW.week < week)) | (TW.season < season) & (TW.season >= season - 2))]
    if prior.att.sum() < 30:
        return dict(int_rate=np.nan, int_hit=np.nan, top_share=np.nan, deep_rate=np.nan)
    return dict(
        int_rate=float(prior.ints.sum() / prior.att.sum()),
        int_hit=float(prior.hit_int.sum() / prior.hit_att.sum()) if prior.hit_att.sum() >= 20 else np.nan,
        top_share=float(np.average(prior.top_share.dropna(), weights=prior.loc[prior.top_share.notna(), 'tgt'])) if prior.top_share.notna().any() else np.nan,
        deep_rate=float(prior.deep.sum() / prior.att.sum()) if 'deep' in prior.columns else np.nan,
    )

# vectorized as-of is slow per game if done naively. Build cumulative by team.
rows = []
for (season, week, home, away, gid) in F[['season', 'week', 'home', 'away', 'game_id']].itertuples(index=False):
    hs = stress.get((int(season), int(week), home), np.nan)
    as_ = stress.get((int(season), int(week), away), np.nan)
    # pbp as-of: use precomputed map
    rows.append((gid, hs, as_))

# precompute team-week as-of from cumulative sums
TW = TW.sort_values(['posteam', 'season', 'week'])
feat_rows = []
for team, g in TW.groupby('posteam'):
    g = g.sort_values(['season', 'week'])
    # expanding prior within 3-season window is easier per requested week from F
    feat_rows.append(g)
# map (season, week, team) -> rates using only prior rows in a dict built by scanning
rate = {}
by = {t: df.sort_values(['season', 'week']) for t, df in TW.groupby('posteam')}
need = F[['season', 'week']].drop_duplicates()
for season, week in need.itertuples(index=False):
    for team, df in by.items():
        prior = df[((df.season == season) & (df.week < week)) | ((df.season < season) & (df.season >= season - 2))]
        att = prior.att.sum()
        if att < 30:
            rate[(int(season), int(week), team)] = (np.nan, np.nan, np.nan, np.nan)
            continue
        hit_att = prior.hit_att.sum()
        top = prior.dropna(subset=['top_share'])
        ts = float(np.average(top.top_share, weights=top.tgt)) if len(top) and top.tgt.sum() else np.nan
        deep = float(prior.deep.sum() / att) if 'deep' in prior.columns else np.nan
        rate[(int(season), int(week), team)] = (
            float(prior.ints.sum() / att),
            float(prior.hit_int.sum() / hit_att) if hit_att >= 20 else np.nan,
            ts,
            deep,
        )

out_rows = []
for r in F.itertuples():
    hs = stress.get((int(r.season), int(r.week), r.home), np.nan)
    aw = stress.get((int(r.season), int(r.week), r.away), np.nan)
    hh = rate.get((int(r.season), int(r.week), r.home), (np.nan,) * 4)
    aa = rate.get((int(r.season), int(r.week), r.away), (np.nan,) * 4)
    out_rows.append(dict(
        game_id=r.game_id,
        stress=hs - aw if pd.notna(hs) and pd.notna(aw) else np.nan,
        int_rate=hh[0] - aa[0] if pd.notna(hh[0]) and pd.notna(aa[0]) else np.nan,
        int_hit=hh[1] - aa[1] if pd.notna(hh[1]) and pd.notna(aa[1]) else np.nan,
        top_share=hh[2] - aa[2] if pd.notna(hh[2]) and pd.notna(aa[2]) else np.nan,
        deep_rate=hh[3] - aa[3] if pd.notna(hh[3]) and pd.notna(aa[3]) else np.nan,
    ))
C = pd.DataFrame(out_rows)
C.to_parquet(os.path.join(R, 'eng', 'corpus_features.parquet'), index=False)
print('coverage', {k: round(float(C[k].notna().mean()), 3) for k in ['stress', 'int_rate', 'int_hit', 'top_share', 'deep_rate']})

# walk-forward, same fit as test_v1
M = F.merge(C, on='game_id')
S = M[M.y.notna()].copy()
S['y'] = S.y.astype(float)
for c in ['stress', 'int_rate', 'int_hit', 'top_share', 'deep_rate']:
    S[c] = S[c].fillna(0.0)

def fit(X, y, off, lam):
    mu, sd = X.mean(0), X.std(0) + 1e-9
    Z = (X - mu) / sd
    w = np.zeros(Z.shape[1])
    Rm = lam * np.eye(Z.shape[1])
    for _ in range(60):
        p = 1 / (1 + np.exp(-(off + Z @ w)))
        g = Z.T @ (p - y) + Rm @ w
        H = (Z * (p * (1 - p))[:, None]).T @ Z + Rm
        w -= np.linalg.solve(H, g)
    return w, mu, sd

def pred(m, X, off):
    w, mu, sd = m
    return 1 / (1 + np.exp(-(off + ((X - mu) / sd) @ w)))

def ll(p, y):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return -(y * np.log(p) + (1 - y) * np.log(1 - p))

LAMS = [1, 3, 10, 30, 100, 300, 1000, 3000]
TESTS = list(range(2019, 2027))
base = ['home_flag', 'qb_pit', 'elo_res']
families = {
    'v1a': base,
    'v1a+stress': base + ['stress'],
    'v1a+int': base + ['int_rate', 'int_hit'],
    'v1a+conc': base + ['top_share', 'deep_rate'],
    'v1a+corpus': base + ['stress', 'int_rate', 'int_hit', 'top_share', 'deep_rate'],
}
res = {}
for name, feats in families.items():
    parts = []
    for T in TESTS:
        tr, te = S[S.season < T], S[S.season == T]
        if len(te) < 20 or len(tr) < 200:
            continue
        a, b = tr[tr.season < T - 1], tr[tr.season == T - 1]
        if len(b) < 20:
            b = tr.tail(200)
            a = tr.iloc[:-200]
        X = lambda d, f=feats: d[f].values.astype(float)
        lam = min(LAMS, key=lambda l: ll(pred(fit(X(a), a.y.values, a.mkt.values, l), X(b), b.mkt.values), b.y.values).mean())
        m = fit(X(tr), tr.y.values, tr.mkt.values, lam)
        p = pred(m, X(te), te.mkt.values)
        parts.append(pd.DataFrame(dict(l=ll(p, te.y.values), lc=ll(te.q.values, te.y.values))))
    D = pd.concat(parts)
    res[name] = dict(n=int(len(D)), ll=round(float(D.l.mean()), 4), close=round(float(D.lc.mean()), 4), delta=round(float(D.l.mean() - D.lc.mean()), 4))
    print(name, res[name])
json.dump(res, open(os.path.join(R, 'eng', 'corpus_on_engine.json'), 'w'), indent=1)
print('wrote corpus_features and corpus_on_engine.json')
