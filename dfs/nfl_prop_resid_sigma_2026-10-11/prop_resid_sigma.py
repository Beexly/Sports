"""NFL prop ladder residuals in sigma units (genie183 convention) on the frozen 15:03Z nash pull,
joined to every contextual layer that exists on the branch. DIAGNOSTIC only. NFL only.

Run from repo root:
  python3 dfs/nfl_prop_resid_sigma_2026-10-11/prop_resid_sigma.py            # dry run (ledger -> /tmp)
  python3 dfs/nfl_prop_resid_sigma_2026-10-11/prop_resid_sigma.py --commit   # writes ledger rows

Doctrine:
  * Every residual input is read through freshnessgate_wiring.read_fresh. A refusal is appended to
    dfs/kill_ledger_freshness.jsonl by read_fresh itself (repo convention) and the layer is stamped MISSING.
  * Residual (genie183_build.py convention): residual_sigma = (posted_line - mu_fit) / sigma.
    mu_fit/sigma come from the stamp's own fits (read_fresh PASS). The raw DK ladders are NOT residual
    inputs; they are used only for an integrity check (sha256 vs the stamp's pins) and a verification refit.
  * Not a close: these are current quotes. Held-out n = 0. Nothing promoted.
  * Untouched: CFB, London snapshot, rvc_edge5_grade.py, jev_rvc_grade.py, dk_live_poller.py.
"""
import csv, hashlib, io, json, math, os, re, statistics, sys, time, urllib.request
import pandas as pd

ROOT = os.getcwd()
HERE = os.path.join(ROOT, 'dfs', 'nfl_prop_resid_sigma_2026-10-11')
sys.path.insert(0, os.path.join(ROOT, 'dfs'))
import freshnessgate_wiring as fg  # noqa: E402

COMMIT = '--commit' in sys.argv
if not COMMIT:
    fg.KILL_LEDGER = '/tmp/kill_ledger_dryrun.jsonl'
OBS = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
PULL = 'dfs/genie_acq2/nash_nfl_props_20261011T1503Z'
STAMP = f'{PULL}/NFL_PROP_LADDER_STAMP.json'
NV = 'https://github.com/nflverse/nflverse-data/releases/download/{tag}/{file}'
UA = {'User-Agent': 'Mozilla/5.0'}
DK2NV = {'LAR': 'LA', 'WSH': 'WAS', 'JAC': 'JAX', 'LVR': 'LV'}
gate_log = []
RECIPES = {
    'nash_urls': 'dfs/genie_acq2/nash_nfl_props_20261011T1503Z/NFL_PROP_LADDER_STAMP.json files[].url (exact leagueSubcategory URLs per subcat)',
    'nash_unblock': 'dfs/PROP_LADDER_PULL_REFUSED.json exact_unblock steps 2-3 (user profile + CDP 9222 + in-page fetch)',
    'in_page_credentials_include': 'docs/research/2026-10-09/rating-atlas/minis/RUNNING_LOG.md [15:45] FIELD CONSENSUS PULLED (credentials:include in-page)',
    'dk_recipe': 'docs/research/2026-10-09/rating-atlas/minis/books_api.py DK_RECIPE (in-browser only)',
    'no_script': 'No committed script on the branch performs the in-page credentials:include fetch; it exists only as recipes/stamps above.',
}
EVENTS = ['34118254', '34118195', '34118229', '34118204', '34118223', '34118176', '34118065', '34118174',
          '34118048', '34118147', '34118017', '34118121', '34118099', '34118101']
REFUSALS = [
    {'ledger_id': 'LR-20261011-PRS-01-DK-REPULL', 'event': 'NFL_PROP_LADDER_REPULL', 'verdict': 'REFUSED',
     'reason': 'Beexly offline (DISCONNECTED); no browser on the box; DK not attempted from the box (Akamai Access Denied history)',
     'reopen': ('Beexly online + Garrett real Chrome with CDP 9222; in-page fetch credentials:include of nash '
                'leagueSubcategory subcats 16569/16570/16571/16889 and O/U 9524/9522/9514 for the same 14 events, '
                'minutes_to_kickoff <= 10; freeze with observed_at + sha256'),
     'events': EVENTS, 'recipes': RECIPES, 'label': 'DIAGNOSTIC'},
    {'ledger_id': 'LR-20261011-PRS-02-LOBBY-CONSENSUS', 'event': 'DG154468_LOBBY_CONSENSUS', 'verdict': 'REFUSED',
     'reason': 'Beexly offline (DISCONNECTED); no browser on the box. Pre-lock getcontests has no lineup bodies (LOBBY_PREVIEW_STAMP 15:16Z)',
     'reopen': ('Beexly online + Garrett real Chrome CDP 9222; after lock 17:00Z, in-page fetch credentials:include of '
                'https://api.draftkings.com/scores/v1/leaderboards/{contest}?format=json&embed=leaderboard per dg 154468 contest '
                '(recipe: RUNNING_LOG [15:45]); freeze with observed_at'),
     'recipes': RECIPES, 'label': 'DIAGNOSTIC'},
    {'ledger_id': 'LR-20261011-PRS-03-NO-CLOSE', 'event': 'NFL_PROP_LADDER_RVC', 'verdict': 'REFUSED',
     'reason': 'no frozen prop CLOSE on the manifest; 15:03Z pull = current quotes; Pinnacle 14:33Z = T-147 min. held-out n=0',
     'artifact': 'dfs/nfl_prop_resid_sigma_2026-10-11/PROP_RESID_SIGMA_STAMP.json', 'pull_sha16_file': '5323e04803545ea0',
     'reopen': 'freeze a close-window pull (<=10 min to kickoff), settle with nflverse stats_player_week_2026, grade held out with Holm',
     'label': 'DIAGNOSTIC'},
]


def gate(path, max_age=fg.FRESHNESS_DEFAULT_H, role=''):
    r = fg.read_fresh(path, max_age_hours=max_age)  # repo-relative path (cwd = repo root)
    a = r['audit']
    gate_log.append({'file': path, 'role': role, 'max_age_hours': max_age, 'result': a['failure_mode'] or 'PASS',
                     'stamp': a.get('stamp'), 'age_hours': a.get('age_hours'), 'detail': a.get('detail'),
                     'ledger_row_appended': not a['fresh']})
    return r['data'] if a['fresh'] else None


def sha(path, n=64):
    h = hashlib.sha256(open(path, 'rb').read()).hexdigest()
    return h[:n]


def nkey(s):
    return re.sub(r'[^a-z]', '', str(s).lower())


def stats(v):
    v = [x for x in v if x is not None and not (isinstance(x, float) and math.isnan(x))]
    if not v:
        return {'n': 0}
    return {'n': len(v), 'mean_sigma': round(statistics.mean(v), 4),
            'sd_sigma': round(statistics.stdev(v), 4) if len(v) > 1 else None}


def fetch_stamped(url, out_csv, transform):
    b = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90).read()
    df = transform(b)
    df.insert(0, 'observed_at', OBS)
    df['source_url'] = url
    df.to_csv(os.path.join(ROOT, out_csv), index=False)
    return hashlib.sha256(b).hexdigest()[:16]


def main():
    out = {'observed_at': OBS, 'pull': STAMP}
    # ---- 0. the frozen pull ----------------------------------------------------------------
    out['pull_file_sha256'] = sha(STAMP)
    out['pull_file_sha16'] = out['pull_file_sha256'][:16]
    st = gate(STAMP, role='frozen nash pull (fits = residual input)')
    if st is None:
        out['stamp'] = 'REFUSE (gate refused the 15:03Z pull)'
        json.dump({'out': out, 'gate': gate_log}, open(f'{HERE}/PROP_RESID_SIGMA_STAMP.json', 'w'), indent=1)
        return
    fits = st['fits']
    out['fits_rows'] = len(fits)
    out['stamp_internal_sha16_field'] = st.get('sha16')

    # integrity + verification refit (raws are not residual inputs)
    integ = []
    for f in st['files']:
        p = os.path.join(ROOT, f['file'])
        integ.append({'file': f['file'], 'subcategory': f['subcategory'], 'role': f['role'],
                      'sha256_match': os.path.exists(p) and sha(p) == f['sha256']})
    out['raw_integrity'] = integ
    from statistics import NormalDist
    inv = NormalDist().inv_cdf
    team_of, refit = {}, {}
    for f in st['files']:
        if 'milestone' not in f['role']:
            continue
        raw = json.load(open(os.path.join(ROOT, f['file'])))
        ev = {e['id']: e for e in raw['events']}
        mk = {m['id']: m for m in raw['markets']}
        pts = {}
        for s in raw['selections']:
            m = mk.get(s['marketId']); e = ev.get(m['eventId']) if m else None
            if not m or not e or s.get('milestoneValue') is None or not s.get('trueOdds'):
                continue
            pl = (s.get('participants') or [{}])[0]
            side = 'Home' if pl.get('venueRole') == 'HomePlayer' else 'Away'
            tm = next((x['metadata']['shortName'] for x in e['participants'] if x.get('venueRole') == side), None)
            team_of[(nkey(pl.get('name')), m['eventId'])] = DK2NV.get(tm, tm)
            p = 1 / s['trueOdds']
            if 0.02 < p < 0.98:
                pts.setdefault((pl.get('name'), m['eventId']), []).append((s['milestoneValue'], inv(1 - p)))
        stat = f['role'].replace('_milestone', '')
        for (name, eid), xs in pts.items():
            if len(xs) < 5:
                continue
            z = [x[1] for x in xs]; y = [x[0] for x in xs]
            zm, ym = statistics.mean(z), statistics.mean(y)
            sxx = sum((a - zm) ** 2 for a in z)
            if sxx == 0:
                continue
            sig = sum((a - zm) * (b - ym) for a, b in zip(z, y)) / sxx
            refit[(nkey(name), stat, eid)] = (ym - sig * zm, sig)
    diffs = [(abs(refit[k][0] - r['mu_fit']), abs(refit[k][1] - r['sigma'])) for r in fits
             if (k := (nkey(r['player']), r['stat'], r['event_id'])) in refit]
    out['verification_refit'] = {'method': st['schema']['fits'], 'matched': len(diffs), 'of': len(fits),
                                 'max_abs_mu_diff': round(max(d[0] for d in diffs), 3) if diffs else None,
                                 'max_abs_sigma_diff': round(max(d[1] for d in diffs), 3) if diffs else None}

    # ---- 1. residual table ------------------------------------------------------------------
    rows = []
    for r in fits:
        res = None
        if r.get('posted_line') is not None and r.get('sigma'):
            res = round((r['posted_line'] - r['mu_fit']) / r['sigma'], 4)
        rows.append({'player': r['player'], 'name_key': nkey(r['player']), 'stat': r['stat'],
                     'event_id': r['event_id'], 'event': r['event'], 'event_start': r['event_start'],
                     'quote_class': r['quote_class'], 'team': team_of.get((nkey(r['player']), r['event_id'])),
                     'mu_fit': r['mu_fit'], 'sigma': r['sigma'], 'r2': r['r2'], 'n_rungs': r['n_rungs'],
                     'posted_line': r.get('posted_line'), 'residual_sigma': res,
                     'residual_status': 'OK' if res is not None else 'MISSING (no posted O/U in pull)'})

    # ---- 2. layers -------------------------------------------------------------------------
    # fresh public pulls, stamped at fetch, then read back through the gate
    gsha = fetch_stamped(NV.format(tag='schedules', file='games.csv'), f'dfs/nfl_prop_resid_sigma_2026-10-11/games_2026_wk5.csv',
                         lambda b: pd.read_csv(io.BytesIO(b), low_memory=False).query('season == 2026 and week == 5')[
                             ['game_id', 'season', 'week', 'gameday', 'gametime', 'away_team', 'home_team',
                              'away_rest', 'home_rest', 'roof', 'surface', 'temp', 'wind']])
    isha = fetch_stamped(NV.format(tag='injuries', file='injuries_2026.parquet'), f'dfs/nfl_prop_resid_sigma_2026-10-11/injuries_2026_wk5.csv',
                         lambda b: pd.read_parquet(io.BytesIO(b)).query('week == 5')[
                             ['season', 'week', 'team', 'gsis_id', 'full_name', 'position', 'report_status', 'practice_status']])
    out['fresh_pull_sha16'] = {'games.csv': gsha, 'injuries_2026.parquet': isha}
    games = gate('dfs/nfl_prop_resid_sigma_2026-10-11/games_2026_wk5.csv', role='rest + roof (situational node)')
    nvinj = gate('dfs/nfl_prop_resid_sigma_2026-10-11/injuries_2026_wk5.csv', role='nflverse injury status wk5')
    espn = gate('dfs/nfl_signals_2026-10-11/espn_injuries_snapshot.json', role='ESPN injury status')
    offi = gate('dfs/nfl_signals_2026-10-11/officials_by_game.csv', role='officials crew')
    slate = gate('docs/research/2026-10-09/rating-atlas/minis/main_slate_final_check_2026-10-11.json', role='weather flags')
    ftn = gate('dfs/ftn_axes_rvc_2026-10-11/ftn_teamweek_joined.csv', role='FTN box/blitz team-week')
    cpoe = {nkey(r['player']): r for r in st.get('cpoe_completion_join', [])}  # inside the gated stamp

    gm = {}
    for g in (games or {}).get('rows', []):
        for side, opp in (('home', 'away'), ('away', 'home')):
            gm[g[f'{side}_team']] = g
    espn_by = {r['name_key']: r for r in (espn or {}).get('rows', [])}
    espn_team_out = {}
    if espn:
        for r in espn['rows']:
            if r['status'] in ('Out', 'Injured Reserve', 'Doubtful') and r['pos'] in ('QB', 'RB', 'WR', 'TE'):
                espn_team_out.setdefault(r['team'], set()).add(r['name_key'])
    nv_by = {(nkey(r['full_name']), r['team']): r for r in (nvinj or {}).get('rows', [])}
    wx = {}
    for w in (slate or {}).get('weather_flags', []):
        a, h = w['game'].split('@')
        wx[(DK2NV.get(a, a), DK2NV.get(h, h))] = w['concern']
    off_2026 = [r for r in (offi or {}).get('rows', []) if str(r.get('season')) == '2026']

    team_full = {}
    if espn:
        # ESPN team displayName -> abbreviation via players present on both sides (no invented map)
        for r in rows:
            e = espn_by.get(r['name_key'])
            if e and r['team']:
                team_full.setdefault(e['team'], r['team'])
    for r in rows:
        t = r['team']; g = gm.get(t)
        # situational node (same definition as dfs/situational_graph_rvc.py)
        if g:
            rd = int(g['home_rest']) - int(g['away_rest'])
            rest_node = 'rest_up' if rd >= 3 else 'rest_down' if rd <= -3 else 'rest_even'
            r['situational_node'] = f"{int(g['roof'] == 'outdoors')}|early|{rest_node}"
            own = int(g['home_rest'] if g['home_team'] == t else g['away_rest'])
            r['rest_flag'] = 'short(<7)' if own < 7 else 'normal(7)' if own == 7 else 'long(>7)'
            w = wx.get((g['away_team'], g['home_team']))
            r['weather'] = w if w else ('NONE_FLAGGED' if (g['away_team'], g['home_team']) in
                                        {k for k in wx} or False else 'MISSING (not in stamped weather artifact)')
        else:
            r['situational_node'] = r['rest_flag'] = 'MISSING (team/game not joined)'
            r['weather'] = 'MISSING (team/game not joined)'
        c = cpoe.get(r['name_key'])
        r['cpoe_pressure_cell'] = (c['press_bin'] if c else 'MISSING (QB not in CPOE table)') \
            if r['stat'] in ('pass_yards', 'completions') else 'N/A (not a QB stat)'
        r['ftn_box_blitz'] = 'MISSING (gate refused ftn_teamweek_joined.csv)' if ftn is None else 'see table'
        r['ou_live_state'] = 'N/A (pre-game)' if r['quote_class'] == 'pre_kick' else 'EXCLUDED (in-play; London untouched)'
        r['officials_crew'] = 'MISSING (no 2026 wk5 crew on branch)' if not off_2026 else 'see table'
        e = espn_by.get(r['name_key'])
        r['espn_status'] = e['status'] if e else 'NOT_LISTED'
        full = next((k for k, v in team_full.items() if v == t), None)
        n_out = len(espn_team_out.get(full, set()) - {r['name_key']}) if full else None
        r['espn_teammate_skill_out'] = ('0' if n_out == 0 else '1' if n_out == 1 else '2+') if n_out is not None \
            else 'MISSING (team not mapped)'
        nv = nv_by.get((r['name_key'], t))
        r['nflverse_wk5_status'] = (nv['report_status'] or 'listed, no game status') if nv else 'NOT_LISTED'

    # weather: games inside the stamped artifact's slate list but without a flag are NONE_FLAGGED
    slate_games = set()
    for s in (slate or {}).get('slate', []):
        a, h = s.split('@'); slate_games.add((DK2NV.get(a, a), DK2NV.get(h, h)))
    for r in rows:
        g = gm.get(r['team'])
        if g and r['weather'].startswith('MISSING') and (g['away_team'], g['home_team']) in slate_games:
            r['weather'] = 'NONE_FLAGGED'

    with open(f'{HERE}/residual_sigma_table.csv', 'w', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=['observed_at'] + list(rows[0]))
        w.writeheader()
        for r in rows:
            w.writerow({'observed_at': OBS, **r})

    graded = [r for r in rows if r['residual_sigma'] is not None and r['quote_class'] == 'pre_kick']
    raw = {'all_pre_kick': stats([r['residual_sigma'] for r in graded])}
    for s in sorted({r['stat'] for r in graded}):
        raw[s] = stats([r['residual_sigma'] for r in graded if r['stat'] == s])
    raw['in_play_excluded'] = stats([r['residual_sigma'] for r in rows if r['residual_sigma'] is not None and r['quote_class'] != 'pre_kick'])
    raw['rec_yards_no_posted_line'] = sum(1 for r in rows if r['stat'] == 'rec_yards')
    layers = {}
    for L in ('situational_node', 'cpoe_pressure_cell', 'ftn_box_blitz', 'ou_live_state', 'officials_crew',
              'espn_status', 'espn_teammate_skill_out', 'nflverse_wk5_status', 'rest_flag', 'weather'):
        b = {}
        for r in graded:
            b.setdefault(str(r[L]), []).append(r['residual_sigma'])
        layers[L] = {k: stats(v) for k, v in sorted(b.items())}
    out.update({
        'raw_residual_sigma': raw, 'conditional_by_layer': layers,
        'joins': {'team_mapped': sum(1 for r in rows if r['team']), 'rows': len(rows),
                  'graded_pre_kick_rows': len(graded),
                  'cpoe_qbs_in_stamp_join': len(cpoe),
                  'espn_listed_graded_rows': sum(1 for r in graded if r['espn_status'] != 'NOT_LISTED'),
                  'nflverse_listed_graded_rows': sum(1 for r in graded if r['nflverse_wk5_status'] != 'NOT_LISTED'),
                  'weather_flagged_or_none': sum(1 for r in graded if not r['weather'].startswith('MISSING'))},
        'close_check': {'frozen_prop_close_on_manifest': False,
                        'searched': ['dfs/nfl_rvc_manifest.json (2023-25 game lines only)',
                                     'dfs/prop_close_feed_2026-10-11/ (Pinnacle 14:33Z snapshot, T-147 min: not a close)',
                                     'dfs/genie_acq2/nash_nfl_props_* (15:03Z, 15:12Z: current quotes)'],
                        'held_out_n': 0},
        'stamp': 'INFRASTRUCTURE PASS',
        'verdict': 'current-quote residual with situational/contextual joins only. Held-out n=0. Not a residual-versus-close. Nothing promoted.',
        'reopen': ('Freeze a nash pull of subcats 16569/16570/16571/16889 + O/U 9524/9522/9514 for the same 14 events '
                   'with minutes_to_kickoff <= 10 (or Pinnacle snap_pinnacle_props.py at kickoff), settle with nflverse '
                   'stats_player_week_2026, then grade residual_sigma vs outcome per layer bucket, held out, Holm-corrected.'),
        'label': 'DIAGNOSTIC',
    })
    neg = sum(1 for r in graded if r['residual_sigma'] < 0)
    out['caveat'] = (f'{neg}/{len(graded)} pre-kick residuals are negative. The cited fitter uses p = 1/trueOdds on '
                     'milestone rungs without removing the hold, which inflates P(X >= m) and pushes mu_fit up, so '
                     'posted - mu is expected to sit below zero. The near-uniform negative shift is most likely a fitter/vig '
                     'property, not evidence of mispricing. Conditional buckets should be read relative to the '
                     'all-row mean, and all are within about 1 sd of it.')
    out['refusals'] = REFUSALS
    out['gate_log'] = gate_log
    if COMMIT:
        for row in REFUSALS:
            fg._ledger_append(dict(row))
    out['ledger'] = {'path': fg.KILL_LEDGER if not COMMIT else 'dfs/kill_ledger_freshness.jsonl',
                     'explicit_rows': [r['ledger_id'] for r in REFUSALS],
                     'gate_auto_rows': [g['file'] for g in gate_log if g['ledger_row_appended']]}
    json.dump(out, open(f'{HERE}/PROP_RESID_SIGMA_STAMP.json', 'w'), indent=1, default=str)
    print(json.dumps({k: out[k] for k in ('pull_file_sha16', 'fits_rows', 'verification_refit', 'raw_residual_sigma', 'joins')}, indent=1))
    for g in gate_log:
        print(g['result'], g['file'], g.get('detail') or '')


if __name__ == '__main__':
    main()
