"""NFL public-signal ingest + stamp: ESPN injuries (keyless), nflverse injuries / snap_counts / officials.

Run from repo root:  python3 dfs/nfl_signals_2026-10-11/ingest_signals.py
DIAGNOSTIC only. NFL only. No credentials, no browser, no gated sources.

Authorized pattern: docs/research/2026-10-09/rating-atlas/minis/books_api.py (ESPN keyless injuries,
'shell OK, keyless') and the nflverse-data GitHub release URLs already pinned in
intelligence/coaching/data/injuries_2026.manifest.json.

Outputs (every file carries observed_at + source and is read back through FreshnessGate v2 read_fresh):
  espn_injuries_snapshot.json     condensed ESPN injury report (all 32 teams)
  injuries_by_teamgame.csv        nflverse report_status counts per manifest team-game (2023-25)
  snaps_by_teamgame.csv           nflverse snap_counts aggregates per manifest team-game (2023-25)
  officials_by_game.csv           nflverse officials per manifest game (2023-25; old_game_id via pbp)
  SIGNALS_STAMP.json              coverage, join rates to dfs/nfl_rvc_manifest.json, raw sha256 pins
Raw release files are NOT committed (size); they are re-fetchable from the URLs below and pinned by sha256.
Missing joins are reported as missing; no rows are invented.
"""
import hashlib, io, json, os, re, sys, time, urllib.request
import pandas as pd
import pyarrow.parquet as pq

ROOT = os.getcwd()
HERE = os.path.join(ROOT, 'dfs', 'nfl_signals_2026-10-11')
sys.path.insert(0, os.path.join(ROOT, 'dfs'))
from freshnessgate_wiring import read_fresh  # noqa: E402

UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
ESPN_INJ = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries'
NV = 'https://github.com/nflverse/nflverse-data/releases/download/{tag}/{file}'
SEASONS = (2023, 2024, 2025)


def fetch(url, timeout=90):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def nkey(s):
    return re.sub(r'[^a-z]', '', str(s).lower())


def main():
    obs = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    pins = {}

    # ---- ESPN injuries (keyless) ------------------------------------------------------
    raw = fetch(ESPN_INJ)
    pins[ESPN_INJ] = hashlib.sha256(raw).hexdigest()[:16]
    inj = json.loads(raw.decode())
    rows = []
    for team in inj.get('injuries', []):
        for i in team.get('injuries', []):
            a = i.get('athlete') or {}
            d = i.get('details') or {}
            rows.append({'team': team.get('displayName'), 'player': a.get('displayName'),
                         'name_key': nkey(a.get('displayName')),
                         'pos': (a.get('position') or {}).get('abbreviation'),
                         'status': i.get('status'), 'type': d.get('type'),
                         'return_date': d.get('returnDate'), 'espn_updated': i.get('date')})
    espn = {'observed_at': obs, 'source_url': ESPN_INJ, 'source_sha16': pins[ESPN_INJ],
            'n_teams': len(inj.get('injuries', [])), 'rows': rows, 'label': 'DIAGNOSTIC — public keyless ESPN feed'}
    json.dump(espn, open(os.path.join(HERE, 'espn_injuries_snapshot.json'), 'w'), indent=0)

    # ---- manifest ---------------------------------------------------------------------
    g = read_fresh(os.path.join(ROOT, 'dfs', 'nfl_rvc_manifest.json'), max_age_hours=1e9)
    if not g['audit']['fresh']:
        raise SystemExit('REFUSE: manifest gate')
    m = pd.DataFrame(g['data']['manifest_rows'])
    p = m['game_id'].str.split('_'); m['away_team'] = p.str[2]; m['home_team'] = p.str[3]
    tg = pd.concat([m[['game_id', 'season', 'week', 'home_team']].rename(columns={'home_team': 'team'}),
                    m[['game_id', 'season', 'week', 'away_team']].rename(columns={'away_team': 'team'})])

    # ---- nflverse injuries ------------------------------------------------------------
    inj_frames = []
    for y in SEASONS:
        u = NV.format(tag='injuries', file=f'injuries_{y}.parquet'); b = fetch(u)
        pins[u] = hashlib.sha256(b).hexdigest()[:16]
        inj_frames.append(pd.read_parquet(io.BytesIO(b)))
    ij = pd.concat(inj_frames)
    ij['status'] = ij['report_status'].fillna('None')
    cnt = ij.pivot_table(index=['season', 'week', 'team'], columns='status', values='gsis_id',
                         aggfunc='count', fill_value=0).reset_index()
    for c in ('Out', 'Doubtful', 'Questionable'):
        if c not in cnt:
            cnt[c] = 0
    cnt['listed_rows'] = cnt.drop(columns=['season', 'week', 'team']).sum(axis=1)
    ij_out = tg.merge(cnt[['season', 'week', 'team', 'Out', 'Doubtful', 'Questionable', 'listed_rows']],
                      on=['season', 'week', 'team'], how='left')
    ij_out['joined'] = ij_out['listed_rows'].notna().astype(int)
    ij_out.insert(0, 'observed_at', obs); ij_out['source'] = 'nflverse injuries release'
    ij_out.to_csv(os.path.join(HERE, 'injuries_by_teamgame.csv'), index=False)

    # ---- nflverse snap counts ---------------------------------------------------------
    sn_frames = []
    for y in SEASONS:
        u = NV.format(tag='snap_counts', file=f'snap_counts_{y}.parquet'); b = fetch(u)
        pins[u] = hashlib.sha256(b).hexdigest()[:16]
        sn_frames.append(pd.read_parquet(io.BytesIO(b)))
    sn = pd.concat(sn_frames)
    agg = sn.groupby(['game_id', 'team']).agg(
        players=('player', 'size'), off_players=('offense_snaps', lambda s: int((s > 0).sum())),
        off_snaps_max=('offense_snaps', 'max'), def_snaps_max=('defense_snaps', 'max'),
        off_players_ge50pct=('offense_pct', lambda s: int((s >= 0.5).sum()))).reset_index()
    sn_out = tg.merge(agg, on=['game_id', 'team'], how='left')
    sn_out['joined'] = sn_out['players'].notna().astype(int)
    sn_out.insert(0, 'observed_at', obs); sn_out['source'] = 'nflverse snap_counts release (PFR)'
    sn_out.to_csv(os.path.join(HERE, 'snaps_by_teamgame.csv'), index=False)

    # ---- nflverse officials (old_game_id mapped via local pbp) --------------------------
    u = NV.format(tag='officials', file='officials.parquet'); b = fetch(u)
    pins[u] = hashlib.sha256(b).hexdigest()[:16]
    of = pd.read_parquet(io.BytesIO(b))
    of['old_game_id'] = of['game_id'].astype(str)
    mp = []
    for y in SEASONS:
        t = pq.read_table(f'intelligence/coaching/data/play_by_play_{y}.parquet',
                          columns=['game_id', 'old_game_id']).to_pandas().drop_duplicates()
        mp.append(t)
    mp = pd.concat(mp); mp['old_game_id'] = mp['old_game_id'].astype(str)
    of = of.merge(mp, on='old_game_id', how='inner', suffixes=('_nfl', ''))
    ref = of[of['position'] == 'Referee'][['game_id', 'official_name']].rename(columns={'official_name': 'referee'})
    nof = of.groupby('game_id').size().rename('n_officials').reset_index()
    of_out = m[['game_id', 'season', 'week']].merge(nof, on='game_id', how='left').merge(
        ref.drop_duplicates('game_id'), on='game_id', how='left')
    of_out['joined'] = of_out['n_officials'].notna().astype(int)
    of_out.insert(0, 'observed_at', obs); of_out['source'] = 'nflverse officials release'
    of_out.to_csv(os.path.join(HERE, 'officials_by_game.csv'), index=False)

    # ---- gate read-back + coverage -----------------------------------------------------
    gate = {}
    for f in ('espn_injuries_snapshot.json', 'injuries_by_teamgame.csv', 'snaps_by_teamgame.csv', 'officials_by_game.csv'):
        a = read_fresh(os.path.join(HERE, f))['audit']
        gate[f] = {'fresh': a['fresh'], 'failure_mode': a['failure_mode'], 'stamp': a['stamp'], 'age_hours': a.get('age_hours')}
    cov = {
        'espn_injuries': {'teams': espn['n_teams'], 'rows': len(rows),
                          'status_counts': pd.Series([r['status'] for r in rows]).value_counts().to_dict()},
        'injuries_nflverse': {'raw_rows': int(len(ij)), 'team_games': int(len(ij_out)),
                              'team_games_joined': int(ij_out['joined'].sum()),
                              'join_rate_team_games': round(float(ij_out['joined'].mean()), 4),
                              'games_both_teams_joined': int((ij_out.groupby('game_id')['joined'].sum() == 2).sum()),
                              'by_season_join_rate': ij_out.groupby('season')['joined'].mean().round(4).to_dict()},
        'snap_counts': {'raw_rows': int(len(sn)), 'team_games_joined': int(sn_out['joined'].sum()),
                        'join_rate_team_games': round(float(sn_out['joined'].mean()), 4),
                        'games_both_teams_joined': int((sn_out.groupby('game_id')['joined'].sum() == 2).sum())},
        'officials': {'raw_rows_all_seasons': int(len(pd.read_parquet(io.BytesIO(b)))),
                      'games_joined': int(of_out['joined'].sum()), 'join_rate_games': round(float(of_out['joined'].mean()), 4),
                      'games_with_referee': int(of_out['referee'].notna().sum())},
        'manifest_games': int(len(m)), 'manifest_team_games': int(len(tg)),
    }
    stamp = {'observed_at': obs, 'test': 'NFL public-signal ingest + FreshnessGate stamp (not on frozen manifest)',
             'stamp': 'INFRASTRUCTURE PASS' if all(v['fresh'] for v in gate.values()) else 'REFUSE',
             'gate_readback': gate, 'coverage': cov, 'raw_sha16_pins': pins,
             'not_ingested': {'espn_rosters': 'not in the authorized keyless pattern (books_api.py covers scoreboard + injuries only)',
                              'firecrawl': 'no Firecrawl artifact or key on branch/bus; not used'},
             'label': 'DIAGNOSTIC — inputs only, no residual produced'}
    json.dump(stamp, open(os.path.join(HERE, 'SIGNALS_STAMP.json'), 'w'), indent=1, default=str)
    print(json.dumps({'stamp': stamp['stamp'], 'gate': gate, 'coverage': cov}, indent=1, default=str))


if __name__ == '__main__':
    main()
