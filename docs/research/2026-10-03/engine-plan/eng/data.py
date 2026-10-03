"""GSE engine v1: shared data layer (point-in-time). Everything keyed to what was knowable before kickoff."""
import io, contextlib, runpy, collections, glob, json, os
import numpy as np, pandas as pd
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def rp(*a): return os.path.join(R, *a)
_cwd = os.getcwd(); os.chdir(R)
with contextlib.redirect_stdout(io.StringIO()):
    B = runpy.run_path(rp('baseline.py'))
os.chdir(_cwd)
RECS = {r['game_id']: r for r in B['recs']}
G = pd.read_csv(rp('games.csv'), low_memory=False)
G = G[(G.season >= 2012) & (G.game_type == 'REG')].copy()
G['neutral'] = (G.location == 'Neutral').astype(float)
G['home_flag'] = 1.0 - G.neutral
G = G.sort_values(['gameday', 'gametime', 'game_id']).reset_index(drop=True)
def team_games():
    """long table: one row per team-game with the actual starting QB (known only after the game)."""
    h = G[['game_id', 'season', 'week', 'gameday', 'home_team', 'home_qb_id', 'result']].rename(columns={'home_team': 'team', 'home_qb_id': 'qb'})
    a = G[['game_id', 'season', 'week', 'gameday', 'away_team', 'away_qb_id', 'result']].rename(columns={'away_team': 'team', 'away_qb_id': 'qb'})
    h['side'] = 'home'; a['side'] = 'away'
    return pd.concat([h, a]).sort_values(['team', 'gameday']).reset_index(drop=True)
TG = team_games()

# ---- injuries, point-in-time: nflverse 2012-2025 + nfl.com (Alexandria) 2026 ----
def _inj():
    inj = pd.concat([pd.read_parquet(f) for f in sorted(glob.glob(rp('lake/nflverse/injuries_*.parquet')))])
    inj = inj[inj.game_type == 'REG'] if 'game_type' in inj else inj
    inj = inj[['season', 'week', 'team', 'gsis_id', 'position', 'report_status', 'full_name']].copy()
    rows = []
    for w in (1, 2, 3, 4):
        f = rp(f'lake/alexandria/nfl_injury_2026_w{w}.json')
        if not os.path.exists(f): f = rp('.firecrawl/nfl_injury_2026_w4.json') if w == 4 else None
        if not f or not os.path.exists(f): continue
        d = json.load(open(f))['data']['alexandria'][0]['data']
        for r in d['reports']:
            st = (r.get('injury_status') or '').title() or None
            rows.append(dict(season=2026, week=w, team=r['team']['abbreviation'], gsis_id=r['player'].get('gsis_id'),
                             position=r['player'].get('position'), report_status=st, full_name=r['player'].get('display_name')))
    x = pd.concat([inj, pd.DataFrame(rows)], ignore_index=True)
    x['team'] = x.team.replace({'AZ': 'ARI', 'LAR': 'LA', 'OAK': 'LV', 'SD': 'LAC', 'STL': 'LA', 'JAC': 'JAX', 'WSH': 'WAS'})
    x['report_status'] = x.report_status.replace({'Doubtful': 'Doubtful', 'Out': 'Out', 'Questionable': 'Questionable'})
    return x
INJ = _inj()
OUT_SET = {(r.season, r.week, r.team, r.gsis_id) for r in INJ[INJ.report_status.isin(['Out', 'Doubtful'])].itertuples()}
# ---- QB dropback history ----
cols = ['game_id', 'game_date', 'passer_player_id', 'qb_dropback', 'qb_epa', 'posteam']
_pb = pd.concat([pd.read_parquet(f, columns=cols) for f in sorted(glob.glob(rp('pbp/play_by_play_*.parquet'))) if int(f[-12:-8]) >= 2010])
_pb = _pb[(_pb.qb_dropback == 1) & _pb.passer_player_id.notna() & _pb.qb_epa.notna()]
QBG = _pb.groupby(['passer_player_id', 'posteam', 'game_id', 'game_date']).agg(db=('qb_epa', 'size'), epa=('qb_epa', 'sum')).reset_index().sort_values('game_date')
QB_HIST = collections.defaultdict(list)
for r in QBG.itertuples(): QB_HIST[r.passer_player_id].append((r.game_date, r.db, r.epa))
TEAM_QB_DB = collections.defaultdict(list)   # team -> list of (date, qb, dropbacks)
for r in QBG.itertuples(): TEAM_QB_DB[r.posteam].append((r.game_date, r.passer_player_id, r.db))
PRIOR_MEAN, PRIOR_N = -0.05, 150.0
def qb_rating(qb, date, k=16):
    if qb is None or (isinstance(qb, float) and np.isnan(qb)): return PRIOR_MEAN - 0.05   # unknown starter -> below-replacement prior
    h = [x for x in QB_HIST.get(qb, []) if x[0] < date][-k:]
    db = sum(x[1] for x in h); epa = sum(x[2] for x in h)
    return (epa + PRIOR_MEAN * PRIOR_N) / (db + PRIOR_N)

# ---- point-in-time expected starter ----
def pit_starter(team, season, week, date):
    """QB expected to start, using only pre-game information: last game's starter, unless this week's
    injury report lists him Out/Doubtful, then the team's QB with the most dropbacks over its last 4 games."""
    prev = TG[(TG.team == team) & (TG.gameday < date)].tail(1)
    if prev.empty: return None, 'no-prior-game'
    s = prev.qb.iloc[0]
    if (season, week, team, s) not in OUT_SET: return s, 'prev-starter'
    recent = [x for x in TEAM_QB_DB.get(team, []) if x[0] < date][-60:]
    dates = sorted({x[0] for x in recent})[-4:]
    tot = collections.Counter()
    for d, q, db in recent:
        if d in dates and q != s and (season, week, team, q) not in OUT_SET: tot[q] += db
    if tot: return tot.most_common(1)[0][0], 'backup-most-dropbacks'
    return None, 'backup-unknown'
# ---- snap-weighted availability by position group (prior-4 snap share, Out/Doubtful; Questionable kept separately) ----
GROUPS = {'OL': {'T', 'G', 'C', 'OL', 'OT', 'OG'}, 'SKILL': {'WR', 'TE', 'RB', 'FB'},
          'FRONT': {'DE', 'DT', 'NT', 'DL', 'LB', 'ILB', 'OLB', 'MLB', 'EDGE'}, 'DB': {'CB', 'S', 'FS', 'SS', 'DB', 'SAF'}}
def _avail():
    snap = pd.concat([pd.read_parquet(f) for f in sorted(glob.glob(rp('lake/nflverse/snap_counts_*.parquet')))])
    snap = snap[snap.game_type == 'REG'].sort_values(['pfr_player_id', 'season', 'week'])
    for c in ('offense_pct', 'defense_pct'):
        snap[c + '_p4'] = snap.groupby('pfr_player_id')[c].transform(lambda s: s.rolling(4, min_periods=1).mean())
    pl = pd.read_parquet(rp('lake/nflverse/players.parquet'))
    idc = 'pfr_id' if 'pfr_id' in pl.columns else [c for c in pl.columns if 'pfr' in c][0]
    gs = 'gsis_id' if 'gsis_id' in pl.columns else [c for c in pl.columns if 'gsis' in c][0]
    snap = snap.merge(pl[[gs, idc]].dropna().rename(columns={gs: 'gsis_id', idc: 'pfr_player_id'}), on='pfr_player_id', how='left')
    snap['t'] = (snap.season * 100 + snap.week).astype('int64')
    sn = snap.dropna(subset=['gsis_id'])[['gsis_id', 't', 'offense_pct_p4', 'defense_pct_p4']].sort_values('t')
    inj = INJ.dropna(subset=['gsis_id']).copy()
    inj = inj[inj.report_status.isin(['Out', 'Doubtful', 'Questionable']) & (inj.position != 'QB')]
    inj['t'] = (inj.season * 100 + inj.week).astype('int64'); inj['t_lookup'] = (inj.t - 1).astype('int64')
    x = pd.merge_asof(inj.sort_values('t_lookup'), sn.rename(columns={'t': 't_lookup'}), on='t_lookup', by='gsis_id', direction='backward')
    x = x[(x.t - x.t_lookup) < 200]
    x['share'] = x[['offense_pct_p4', 'defense_pct_p4']].fillna(0).max(axis=1)
    x['grp'] = x.position.map(lambda p: next((g for g, s in GROUPS.items() if p in s), 'OTHER'))
    x['w'] = np.where(x.report_status == 'Questionable', 0.0, 1.0)
    x['wq'] = np.where(x.report_status == 'Questionable', 1.0, 0.0)
    out = x.assign(v=x.share * x.w, vq=x.share * x.wq)
    A = out.pivot_table(index=['season', 'week', 'team'], columns='grp', values='v', aggfunc='sum', fill_value=0)
    Q = out.groupby(['season', 'week', 'team']).vq.sum().rename('Q')
    A = A.join(Q, how='outer').fillna(0).reset_index()
    return A, x
AV, AV_ROWS = _avail()
