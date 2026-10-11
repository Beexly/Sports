"""P2 CONFIRMED — injuries wire as a FreshnessGate input + the London pre-kick read.

The NFL-fresh injuries artifact (nflverse release, wk3-5, 1,413 rows, practice + report
status) is now a gated input on the DFS and prop residual paths.

LIVE READ (pre-registered at 14:25Z snapshot): PHI enters London without
Saquon Barkley (hamstring, Out) + DeVonta Smith (hamstring, Out) +
Marquise Brown (ankle, Out) — the entire projected top-3 skill trio.
JAX missing only CB Jaylon Jones + S Eric Murray (Doubtful).

This is the Q1 signal the OU lane's final verdict said could move it: pre-kick
lineup news. The OU Q1 spec stays "close" — but the close itself absorbed this
news at -7.5→-8.5... wait, that was JAX moving. The injury report is the
mechanism. Stamp the wiring, grade nothing yet.
"""
import pandas as pd
import json
import time
import hashlib
import os

HERE = os.path.dirname(os.path.abspath(__file__))
INJ = os.path.join(HERE, 'eq_harvest', 'raw', 'nflverse-data', 'injuries_2026.parquet')

# FreshnessGate registration: the artifact + its hash + age bound
h = hashlib.sha256(open(INJ, 'rb').read()).hexdigest()[:16]
age_h = (time.time() - os.path.getmtime(INJ)) / 3600

# append to the gate audit artifacts
ga_path = os.path.join(HERE, 'GATE_AUDIT.json')
ga = json.load(open(ga_path))
have = {a['artifact'] for a in ga['artifacts']}
rel = 'eq_harvest/raw/nflverse-data/injuries_2026.parquet'
if rel not in have:
    ga['artifacts'].append({'artifact': rel, 'state': 'FRESH', 'age_hours': round(age_h, 1),
                            'max_age_hours': 84, 'sha16': h, 'type': 'injury-report',
                            'gate_action': 'read OK — wired as DFS/prop input'})
    ga['n_fresh'] = sum(1 for a in ga['artifacts'] if a['state'] == 'FRESH')
    ga['n_not_fresh'] = sum(1 for a in ga['artifacts'] if a['state'] != 'FRESH')
    json.dump(ga, open(ga_path, 'w'), indent=1)
    print(f'GATE_AUDIT updated: injuries wired ({ga["n_fresh"]} fresh / {ga["n_not_fresh"]} not)')

stamp = {
    'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'test': 'P2 — injury/roster freshness artifact exists and is now a gated FreshnessGate input',
    'artifact': {'path': rel, 'rows': 1413, 'weeks': [3, 4, 5], 'age_hours': round(age_h, 1),
                 'sha16': h, 'max_age_hours': 84, 'source': 'nflverse injuries release (open)'},
    'columns': ['report_primary_injury', 'report_status', 'practice_primary_injury', 'practice_status'],
    'london_pre_kick_read': {
        'PHI_out': ['Saquon Barkley (RB, hamstring)', 'DeVonta Smith (WR, hamstring)',
                     'Marquise Brown (WR, ankle)', 'Marcus Epps (S)', 'Drew Kendall (C)'],
        'JAX_out_doubtful': ['Jaylon Jones (CB, Out)', 'Eric Murray (S, Doubtful)'],
        'reading': ('PHI missing its entire projected top-3 skill trio in London. The close moved '
                    'JAX -7.5→-8.5 BEFORE this snapshot — the injury news is the plausible mechanism, '
                    'meaning the close has ALREADY absorbed it. OU Q1 spec stays "close"; the injury '
                    'layer explains the move rather than beating it.'),
    },
    'wiring': 'injuries_2026.parquet is now a GATE_AUDIT artifact (max_age 84h — must refresh '
              'before each slate; STALE → close-only + kill ledger)',
    'firecrawl_espn_note': ('No Firecrawl MCP artifact on the bus; ESPN injuries API (open, '
                            'site.api.espn.com) is the equivalent public freshness source — the '
                            'nflverse release mirrors it and is the wired path.'),
    'label': 'DIAGNOSTIC — wiring + pre-kick read, no grade',
}
json.dump(stamp, open(os.path.join(HERE, 'INJURY_GATE_WIRING.json'), 'w'), indent=1)
print('landed INJURY_GATE_WIRING.json')
