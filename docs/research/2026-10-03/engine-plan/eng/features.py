"""Build the v1 feature table (point-in-time) for 2012-2026, including unplayed 2026 W4."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from data import *
def lg(p): p = np.clip(p, 1e-6, 1 - 1e-6); return np.log(p / (1 - p))
avk = {(r.season, r.week, r.team): r for r in AV.itertuples()}
GR = ['OL', 'SKILL', 'FRONT', 'DB', 'Q']
rows = []
for g in G.itertuples():
    r = RECS.get(g.game_id)
    if r is None or r.get('q') is None: continue
    hq, hs = pit_starter(g.home_team, g.season, g.week, g.gameday)
    aq, as_ = pit_starter(g.away_team, g.season, g.week, g.gameday)
    row = dict(game_id=g.game_id, season=int(g.season), week=int(g.week), gameday=g.gameday, home=g.home_team, away=g.away_team,
               y=r.get('y'), q=r['q'], mkt=lg(r['q']), elo=lg(r['p_elo']), home_flag=g.home_flag, neutral=g.neutral,
               qb_pit=qb_rating(hq, g.gameday) - qb_rating(aq, g.gameday),
               qb_act=(qb_rating(g.home_qb_id, g.gameday) - qb_rating(g.away_qb_id, g.gameday)) if isinstance(g.home_qb_id, str) and isinstance(g.away_qb_id, str) else np.nan,
               h_qb=hq, a_qb=aq, h_qb_src=hs, a_qb_src=as_, h_qb_act=g.home_qb_id, a_qb_act=g.away_qb_id,
               spread_line=g.spread_line, total_line=g.total_line, result=g.result, total=g.total)
    for k in GR:
        hv = getattr(avk.get((g.season, g.week, g.home_team)), k, 0.0) if avk.get((g.season, g.week, g.home_team)) is not None else 0.0
        av = getattr(avk.get((g.season, g.week, g.away_team)), k, 0.0) if avk.get((g.season, g.week, g.away_team)) is not None else 0.0
        row['av_' + k] = float(hv or 0) - float(av or 0)
    rows.append(row)
F = pd.DataFrame(rows); F['elo_res'] = F.elo - F.mkt
F.to_parquet(os.path.join(R, 'eng', 'features_v1.parquet'))
pl = F[F.y.notna()]
print('rows', len(F), 'played', len(pl), 'unplayed', int(F.y.isna().sum()))
print('PIT starter == actual starter:', round(float(((pl.h_qb == pl.h_qb_act) & (pl.a_qb == pl.a_qb_act)).mean()), 4))
print('starter source counts', pd.concat([F.h_qb_src, F.a_qb_src]).value_counts().to_dict())
