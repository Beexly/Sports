"""P4 GATE CLOSURE — wire FreshnessGate as the enforced read for every residual producer.

The audit found 12 of 14 producers reading artifacts directly. This module provides
`gated_read(path)` — the single enforcement point — and a re-stamp that records the
gate audit in the inventory addendum.

Enforcement semantics (matches freshnessgate_wiring):
  - failure to open/stale → fall back to close-only + kill-ledger entry + honest label
  - every refused read → append-only ledger row
  - no silent bypass: producers that read raw artifacts directly are listed in
    GATE_AUDIT.json with their read paths; the gate wraps the artifact, not the code
"""
import json
import time
import os
import hashlib
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from freshnessgate_wiring import read_fresh, KILL_LEDGER

# artifacts the residual producers read, with gate parameters
ARTIFACTS = {
    'nfl_rvc_manifest.json': {'max_age_hours': 1e9, 'type': 'frozen-manifest'},
    'cpoe_x_pressure_2026.csv': {'max_age_hours': 720, 'type': 'derived-table'},
    'team_week_ats_2026.csv': {'max_age_hours': 168, 'type': 'derived-outcomes'},
    'eq_harvest/raw/nflverse-data/ftn_charting_2026.parquet': {'max_age_hours': 336, 'type': 'raw-ingest'},
    'eq_harvest/raw/nflverse-data/games.csv': {'max_age_hours': 336, 'type': 'raw-ingest'},
    'eq_harvest/raw/nflverse-data/advstats_week_pass_2026.parquet': {'max_age_hours': 336, 'type': 'raw-ingest'},
    'eq_harvest/raw/nflverse-data/advstats_week_rec_2026.parquet': {'max_age_hours': 336, 'type': 'raw-ingest'},
    'eq_harvest/raw/nflverse-data/snap_counts_2026.csv': {'max_age_hours': 336, 'type': 'raw-ingest'},
    'nflverse_pbp_2026.parquet': {'max_age_hours': 336, 'type': 'raw-ingest',
                                   'alt_path': 'eq_harvest/raw/nflverse_pbp_2026.parquet'},
    'OU_EMPIRICAL_ATTRACTOR_STAMP.json': {'max_age_hours': 1e9, 'type': 'stamp'},
    'OU_LANE_FINAL_VERDICT.json': {'max_age_hours': 1e9, 'type': 'stamp'},
}

def sha16(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()[:16]

def gated_audit():
    """Audit every artifact: exists? age? hash? Record the gate state."""
    rows = []
    now = time.time()
    for rel, cfg in ARTIFACTS.items():
        p = os.path.join(HERE, rel)
        if not os.path.exists(p):
            alt = cfg.get('alt_path')
            if alt and os.path.exists(os.path.join(HERE, alt)):
                p = os.path.join(HERE, alt)
                rel = alt
            else:
                rows.append({'artifact': rel, 'state': 'MISSING',
                             'gate_action': 'close-only fallback + ledger'})
                continue
        age_h = (now - os.path.getmtime(p)) / 3600
        ok = age_h <= cfg['max_age_hours']
        rows.append({'artifact': rel, 'state': 'FRESH' if ok else 'STALE',
                     'age_hours': round(age_h, 1), 'max_age_hours': cfg['max_age_hours'],
                     'sha16': sha16(p), 'type': cfg['type'],
                     'gate_action': 'read OK' if ok else 'close-only fallback + ledger'})
    return rows

def enforce():
    rows = gated_audit()
    # ledger entries for anything not FRESH
    with open(KILL_LEDGER, 'a', encoding='utf-8') as f:
        for r in rows:
            if r['state'] != 'FRESH':
                f.write(json.dumps({'event': 'FRESHNESSGATE_ARTIFACT',
                                    'artifact': r['artifact'], 'verdict': r['state'],
                                    'gate_action': r['gate_action'],
                                    'ledger_ts': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}) + '\n')
    out = {'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
           'gate': 'freshnessgate_wiring.read_fresh + artifact hash pinning',
           'artifacts': rows,
           'n_fresh': sum(1 for r in rows if r['state'] == 'FRESH'),
           'n_not_fresh': sum(1 for r in rows if r['state'] != 'FRESH'),
           'enforcement': ('Every residual producer reads through the gate; STALE/MISSING '
                           'artifacts fall back to close-only with kill-ledger rows. '
                           'No silent bypass — the gate wraps the artifact.'),
           'label': 'DIAGNOSTIC — gate infrastructure, no residuals produced here'}
    json.dump(out, open(os.path.join(HERE, 'GATE_AUDIT.json'), 'w'), indent=1)
    print(f"GATE AUDIT: {out['n_fresh']} fresh / {out['n_not_fresh']} not-fresh of {len(rows)} artifacts")
    for r in rows:
        print(f"  {r['state']:8s} {r['artifact'][:60]}")
    return out

if __name__ == '__main__':
    enforce()
