"""Player-level + drive-level + defender stats from nflverse pbp.
Filters mirror COMPUTATION_NOTES.md (Worker B):
  REG only, play_type in (pass, run), qb_kneel==0, qb_spike==0,
  garbage time excluded: qtr==4 AND (wp>0.95 OR wp<0.05). OT kept.
Outputs CSVs to scratch/ for the projection step.
"""
import pandas as pd, numpy as np, os

SCR = os.path.dirname(os.path.abspath(__file__))
V = None

def load(year):
    usecols = None  # need many cols; read all is fine (~50k rows 2025)
    d = pd.read_csv(f"{SCR}/play_by_play_{year}.csv.gz", low_memory=False)
    return d

def filt(d):
    d = d[d.season_type == 'REG']
    d = d[d.play_type.isin(['pass', 'run'])]
    d = d[(d.qb_kneel == 0) & (d.qb_spike == 0)]
    wp = d['wp'].fillna(0.5)
    d = d[~((d.qtr == 4) & ((wp > 0.95) | (wp < 0.05)))]
    return d.reset_index(drop=True)

# ---------------- player game logs ----------------
TARGETS = [
    ('J.Allen', 'BUF'), ('J.Goff', 'DET'),
    ('J.Cook', 'BUF'), ('J.Gibbs', 'DET'), ('D.Montgomery', 'DET'),
    ('A.St. Brown', 'DET'), ('J.Williams', 'DET'), ('K.Shaakir', 'BUF'),
    ('D.Kincaid', 'BUF'), ('S.LaPorta', 'DET'),
]

def player_games(d, targets, year):
    rows = []
    for pname, team in targets:
        g = d[d.posteam == team]
        # passing (as passer)
        p = g[g.passer_player_name == pname]
        # rushing (as rusher, includes scrambles)
        r = g[g.rusher_player_name == pname]
        # receiving (as receiver on a pass attempt)
        rc = g[(g.receiver_player_name == pname) & (g.pass_attempt == 1)]
        comp = rc[rc.complete_pass == 1]
        # red zone
        rz = g[g.yardline_100 <= 20]
        rz_pass = rz[(rz.passer_player_name == pname) & (rz.pass_attempt == 1)]
        rz_rush = rz[rz.rusher_player_name == pname]
        rz_tgt = rz[(rz.receiver_player_name == pname) & (rz.pass_attempt == 1)]
        games = set(p.game_id) | set(r.game_id) | set(rc.game_id)
        ng = len(games)
        sacks = int(((p.sack == 1)).sum())
        attempts = int(p.pass_attempt.sum()) - sacks  # official attempts excl. sacks
        row = dict(
            player=pname, team=team, season=year, g=ng,
            pass_yds=float(p.passing_yards.fillna(0).sum()),
            pass_att=attempts,
            pass_att_incl_sack=int(p.pass_attempt.sum()),
            sacks_taken=sacks,
            pass_td=int(p.pass_touchdown.sum()),
            ints=int(p.interception.sum()),
            scrambles=int(((p.qb_scramble == 1)).sum()),
            rush_att=int(r.rush_attempt.sum()),
            rush_yds=float(r.yards_gained.fillna(0).sum()),
            rush_td=int(r.rush_touchdown.sum()),
            targets=int(rc.pass_attempt.sum()),
            rec=int(comp.complete_pass.sum()),
            rec_yds=float(comp.yards_gained.fillna(0).sum()),
            rec_td=int(comp.pass_touchdown.sum()),
            air_yds=float(rc.air_yards.fillna(0).sum()),
            rz_pass_att=int(rz_pass.pass_attempt.sum()),
            rz_pass_td=int(rz_pass.pass_touchdown.sum()),
            rz_rush_att=int(rz_rush.rush_attempt.sum()),
            rz_rush_td=int(rz_rush.rush_touchdown.sum()),
            rz_targets=int(rz_tgt.pass_attempt.sum()),
            rz_rec_td=int(rz_tgt[rz_tgt.complete_pass == 1].pass_touchdown.sum()),
        )
        rows.append(row)
    return pd.DataFrame(rows)

# ---------------- script-conditioned dropback rates ----------------
def script_rates(d, teams):
    rows = []
    d = d.copy()
    wp = d['wp'].fillna(0.5)
    def bucket(w):
        if w > 0.65: return 'leading'
        if w < 0.35: return 'trailing'
        return 'neutral'
    d['script'] = wp.map(bucket)
    for t in teams:
        g = d[d.posteam == t]
        for s in ['leading', 'neutral', 'trailing']:
            gg = g[g.script == s]
            n = len(gg)
            db = int(((gg.pass_attempt == 1) | (gg.qb_scramble == 1)).sum())
            rows.append(dict(team=t, script=s, n_plays=n,
                             dropback_rate=db / n if n else np.nan))
        gg = g
        rows.append(dict(team=t, script='all', n_plays=len(gg),
                         dropback_rate=((gg.pass_attempt == 1) | (gg.qb_scramble == 1)).mean()))
    return pd.DataFrame(rows)

# ---------------- drive-level ----------------
def drive_stats(d, teams):
    rows = []
    for t in teams:
        g = d[d.posteam == t]
        keys = ['game_id', 'fixed_drive', 'posteam']
        drives = g.groupby(keys)
        tot = 0; tds = 0; three = 0; pts = 0.0
        for _, dg in drives:
            tot += 1
            n_off = len(dg)
            res = dg.fixed_drive_result.dropna()
            res = res.iloc[0] if len(res) else ''
            own = dg[dg.td_team == t] if 'td_team' in dg else dg
            td = int(((dg.td_team == t)).sum()) if 'td_team' in dg else 0
            tds += 1 if td > 0 else 0
            if n_off <= 3 and res in ('Punt', 'Turnover', 'Downs', 'Fumble'):
                three += 1
            # points scored by this offense on the drive
            for _, pl in dg.iterrows():
                if pl.get('td_team', '') == t and pl.get('touchdown', 0) == 1:
                    pts += 6
            # XP / 2pt / FG credited to kicking team = posteam of the drive
            xp = dg[dg.posteam == t]
            pts += int(((xp.extra_point_result == 'Made')).sum()) * 1
            pts += int(((xp.two_point_conv_result == 'Success')).sum()) * 2
            pts += int(((xp.field_goal_result == 'Made')).sum()) * 3
        games = g.game_id.nunique()
        rows.append(dict(team=t, drives=tot, drives_per_game=tot / games,
                         td_rate=tds / tot, three_and_out_rate=three / tot,
                         pts_per_drive=pts / tot, n_games=games))
    return pd.DataFrame(rows)

# ---------------- RB down splits ----------------
def rb_down_splits(d):
    rows = []
    for pname, team in [('J.Cook', 'BUF'), ('J.Gibbs', 'DET'), ('D.Montgomery', 'DET')]:
        g = d[(d.posteam == team) & (d.rusher_player_name == pname) & (d.rush_attempt == 1)]
        for label, dd in [('early', g[g.down <= 2]), ('late', g[g.down >= 3])]:
            n = len(dd)
            rows.append(dict(player=pname, team=team, down_split=label, n=n,
                             ypc=dd.yards_gained.mean() if n else np.nan,
                             epa_rush=dd.epa.mean() if n else np.nan,
                             success=(dd.epa > 0).mean() if n else np.nan))
    return pd.DataFrame(rows)

# ---------------- defenders: sacks, hits, tackles ----------------
def defender_stats(d, teams, year):
    rows = []
    for t in teams:
        g = d[d.defteam == t]
        games = g.game_id.nunique()
        sacks = {}
        for _, pl in g[g.sack == 1].iterrows():
            nm = pl.get('sack_player_name')
            if isinstance(nm, str) and nm:
                sacks[nm] = sacks.get(nm, 0) + 1
            for c in ['half_sack_1_player_name', 'half_sack_2_player_name']:
                nm2 = pl.get(c)
                if isinstance(nm2, str) and nm2:
                    sacks[nm2] = sacks.get(nm2, 0) + 0.5
        hits = {}
        for _, pl in g[g.qb_hit == 1].iterrows():
            for c in ['qb_hit_1_player_name', 'qb_hit_2_player_name']:
                nm = pl.get(c)
                if isinstance(nm, str) and nm:
                    hits[nm] = hits.get(nm, 0) + 1
        solo, ast = {}, {}
        for _, pl in g.iterrows():
            for c in ['solo_tackle_1_player_name', 'solo_tackle_2_player_name']:
                nm = pl.get(c)
                if isinstance(nm, str) and nm:
                    solo[nm] = solo.get(nm, 0) + 1
            for c in ['assist_tackle_1_player_name', 'assist_tackle_2_player_name',
                      'assist_tackle_3_player_name', 'assist_tackle_4_player_name']:
                nm = pl.get(c)
                if isinstance(nm, str) and nm:
                    ast[nm] = ast.get(nm, 0) + 1
        names = set(sacks) | set(hits) | set(solo) | set(ast)
        for nm in names:
            rows.append(dict(player=nm, team=t, season=year,
                             sacks=round(sacks.get(nm, 0), 1),
                             qb_hits_credited=int(hits.get(nm, 0)),
                             solo=int(solo.get(nm, 0)), assists=int(ast.get(nm, 0)),
                             tackles=int(solo.get(nm, 0)) + int(ast.get(nm, 0)),
                             n_games=games))
    out = pd.DataFrame(rows)
    return out.sort_values(['team', 'tackles'], ascending=[True, False])

# ---------------- QB turnover-worthiness (FTN join) ----------------
def qb_luck(d, ftn):
    j = d.merge(ftn[['nflverse_game_id', 'nflverse_play_id', 'is_interception_worthy']],
                left_on=['game_id', 'play_id'],
                right_on=['nflverse_game_id', 'nflverse_play_id'], how='left')
    rows = []
    for pname, team in [('J.Allen', 'BUF'), ('J.Goff', 'DET')]:
        p = j[(j.posteam == team) & (j.passer_player_name == pname) & (j.pass_attempt == 1)]
        rows.append(dict(player=pname, team=team,
                         dropbacks=len(p),
                         int_worthy=int(p.is_interception_worthy.fillna(0).sum()),
                         actual_ints=int(p.interception.sum())))
    return pd.DataFrame(rows)

if __name__ == '__main__':
    ftn = pd.read_csv(f"{SCR}/ftn_charting_2025.csv", low_memory=False)
    for year in [2025, 2026]:
        d = filt(load(year))
        print(year, 'filtered plays:', len(d))
        pg = player_games(d, TARGETS, year)
        pg.to_csv(f"{SCR}/player_games_{year}.csv", index=False)
    d25 = filt(load(2025))
    script_rates(d25, ['BUF', 'DET']).to_csv(f"{SCR}/team_script_rates_2025.csv", index=False)
    drive_stats(d25, ['BUF', 'DET']).to_csv(f"{SCR}/team_drives_2025.csv", index=False)
    rb_down_splits(d25).to_csv(f"{SCR}/rb_down_splits_2025.csv", index=False)
    defender_stats(d25, ['BUF', 'DET'], 2025).to_csv(f"{SCR}/defenders_2025.csv", index=False)
    qb_luck(d25, ftn).to_csv(f"{SCR}/qb_luck_2025.csv", index=False)
    d26 = filt(load(2026))
    defender_stats(d26, ['BUF', 'DET'], 2026).to_csv(f"{SCR}/defenders_2026.csv", index=False)
    print('done')
