"""Lineup freshness gate — ESPN injury snapshot wired as a FreshnessGate v2 input on the DFS and
prop-residual player paths. Read-only against existing artifacts; writes only LINEUP_GATE_RUN.json.

Run from repo root:  python3 dfs/lineup_freshness_2026-10-11/lineup_gate.py
DIAGNOSTIC only. Does not touch the EDGE#5 / JEV graders or pollers, the London snapshot, or any CFB file.

Paths gated (player sets read from existing artifacts):
  DFS   : docs/research/2026-10-09/rating-atlas/minis/main_slate_final_check_2026-10-11.json  lineup_status
  PROP-1: receiver watchlist (dfs/receiver_watchlist_rvc_2026-10-11/RVC_STAMP.json designations)
  PROP-2: CPOE x pressure QBs (dfs/cpoe_x_pressure_2026.csv, latest week per QB)
Rule: injury input must pass read_fresh (6 h default). If refused, every path falls back to
'CLOSE-ONLY (freshness refusal)' and the refusal is appended by read_fresh to the kill ledger.
Matching: lowercase-letters name_key; unmatched players = 'not on ESPN injury report' (not 'healthy').
"""
import json, os, re, sys, time
import pandas as pd

ROOT = os.getcwd()
HERE = os.path.join(ROOT, 'dfs', 'lineup_freshness_2026-10-11')
sys.path.insert(0, os.path.join(ROOT, 'dfs'))
from freshnessgate_wiring import read_fresh  # noqa: E402

INJ = os.path.join(ROOT, 'dfs', 'nfl_signals_2026-10-11', 'espn_injuries_snapshot.json')
FLAG = {'Out', 'Injured Reserve', 'Doubtful', 'Questionable'}


def nkey(s):
    return re.sub(r'[^a-z]', '', str(s).lower())


def players():
    slate = json.load(open('docs/research/2026-10-09/rating-atlas/minis/main_slate_final_check_2026-10-11.json'))
    dfs = [{'player': r['player'], 'team': r['team'], 'pos': r['pos'], 'prior_status': r['status']}
           for r in slate['lineup_status'] if r.get('pos') != 'DST']
    wl = json.load(open('dfs/receiver_watchlist_rvc_2026-10-11/RVC_STAMP.json'))['watchlist_designations']
    prop1 = [{'player': r['player'], 'team': r['team'], 'pos': r['pos'], 'prior_status': k}
             for k in ('yac_machines', 'hands_regression') for r in wl[k]]
    cp = pd.read_csv('dfs/cpoe_x_pressure_2026.csv').sort_values('week').groupby('name_key').tail(1)
    prop2 = [{'player': r.player_display_name, 'team': r.team, 'pos': 'QB', 'prior_status': f'wk{int(r.week)} {r.press_bin}'}
             for r in cp.itertuples()]
    return {'DFS_main_slate_lineup': dfs, 'PROP_receiver_watchlist': prop1, 'PROP_cpoe_pressure_qbs': prop2}


def main():
    g = read_fresh(INJ)  # 6 h
    sets = players()
    out = {'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
           'test': 'Lineup freshness: ESPN injury snapshot as FreshnessGate input on DFS + prop residual paths',
           'injury_input': {'path': 'dfs/nfl_signals_2026-10-11/espn_injuries_snapshot.json', 'audit': g['audit']},
           'paths': {}}
    if not g['audit']['fresh']:
        for k in sets:
            out['paths'][k] = {'mode': 'CLOSE-ONLY (freshness refusal)', 'n_players': len(sets[k])}
        out['stamp'] = 'REFUSE'
    else:
        inj = {r['name_key']: r for r in g['data']['rows']}
        for k, ps in sets.items():
            rows = []
            for pl in ps:
                hit = inj.get(nkey(pl['player']))
                rows.append({**pl, 'espn_status': hit['status'] if hit else 'not on ESPN injury report',
                             'espn_type': hit['type'] if hit else None,
                             'espn_updated': hit['espn_updated'] if hit else None,
                             'flag': bool(hit and hit['status'] in FLAG)})
            out['paths'][k] = {'mode': 'FRESH', 'n_players': len(rows),
                               'n_flagged': sum(r['flag'] for r in rows),
                               'flagged': [r for r in rows if r['flag']], 'rows': rows}
        out['stamp'] = 'INFRASTRUCTURE PASS'
    out['note'] = ('Gate wiring is a new read-only wrapper; existing producer scripts were not edited. '
                   'The 6 h window means this snapshot refuses after observed_at + 6 h; re-run ingest_signals.py before lock.')
    out['label'] = 'DIAGNOSTIC — status flags only, no residual, nothing promoted'
    json.dump(out, open(os.path.join(HERE, 'LINEUP_GATE_RUN.json'), 'w'), indent=1, default=str)
    for k, v in out['paths'].items():
        print(k, v['mode'], v['n_players'], 'flagged', v.get('n_flagged'),
              [(r['player'], r['espn_status'], r.get('prior_status')) for r in v.get('flagged', [])])
    print(out['stamp'])


if __name__ == '__main__':
    main()
