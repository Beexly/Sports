"""
freshnessgate_wiring.py — THE enforced read path for any board or DFS surface.

Doctrine wiring (per standing doctrine, no silent upgrades):
  - FreshnessGate v2 is the ONLY read function for any path that can touch live output.
  - 4 explicit failure modes: F1_STALE, F2_MISSING_FREEZE, F3_CLOCK_SKEW, F4_INCOMPLETE.
  - On refusal: fall back to close-only, append an append-only kill-ledger row
    (timestamp + failure mode + reason), surface an honest product label.
  - Nothing here promotes shade outliers, THE_FLOOR upgrades, or research-packet context.
  - All output remains DIAGNOSTIC until residual-vs-close clears on a frozen manifest.

Self-test: run `python freshnessgate_wiring.py` — exercises all 4 failure modes + pass + absent file.
"""
import json, time, os
from datetime import datetime, timezone, timedelta

KILL_LEDGER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kill_ledger_freshness.jsonl')
FRESHNESS_DEFAULT_H = 6.0
CLOCK_SKEW_TOLERANCE_S = 300  # stamps may not be in the future beyond 5 min


def _utcnow():
    return datetime.now(timezone.utc)


def _parse_ts(ts):
    if ts is None:
        return None
    try:
        if isinstance(ts, (int, float)):
            return datetime.fromtimestamp(ts, tz=timezone.utc)
        s = str(ts).replace('Z', '+00:00')
        if s.startswith('/Date('):  # DK /Date(ms)/ format
            ms = int(s[6:s.index(')')])
            return datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:  # date-only / naive stamps — assume UTC
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _ledger_append(row):
    """Append-only kill-ledger write. Never rewrites, never deletes, never edits."""
    row['ledger_ts'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    with open(KILL_LEDGER, 'a', encoding='utf-8') as f:
        f.write(json.dumps(row) + '\n')


# FAILURE MODES (exact definitions):
#   F1_STALE          — stamp parses but age > max_age_hours
#   F2_MISSING_FREEZE — no parsable timestamp field anywhere in the artifact
#   F3_CLOCK_SKEW     — stamp in the future beyond CLOCK_SKEW_TOLERANCE_S
#   F4_INCOMPLETE     — fresh stamp but zero data rows (empty snapshot cannot be audited)

def read_fresh(path, max_age_hours=FRESHNESS_DEFAULT_H, require_manifest=True):
    """THE read path. Returns {'data', 'audit', 'ledger_row'?}.

    On success: data = parsed artifact, audit.fresh = True, audit.label = 'FRESH'.
    On refusal: data = None, audit.fresh = False, audit.failure_mode in F1..F4,
                ledger_row appended to the kill ledger, label = close-only.
    Caller MUST render audit.label verbatim on any surface built from this read.
    """
    fm = None
    detail = ''
    ts_raw = None
    try:
        if not os.path.exists(path):
            fm = 'F2_MISSING_FREEZE'
            detail = 'file absent'
            raise FileNotFoundError(path)

        if path.endswith('.json'):
            d = json.load(open(path, encoding='utf-8'))
        else:
            import csv
            with open(path, encoding='utf-8') as f:
                d = {'rows': list(csv.DictReader(f))}

        ts_raw = None
        for key in ('observed_at', 'pull_time', 'frozen_at', 'generated_at', 'captured_at', 'date_pulled', 'captured'):
            if isinstance(d, dict) and d.get(key):
                ts_raw = d[key]
                break
        if isinstance(d, dict) and not ts_raw:
            for v in d.values():
                if isinstance(v, list) and v and isinstance(v[0], dict):
                    ts_raw = v[0].get('observed_at') or v[0].get('captured_at')
                    if ts_raw:
                        break

        ts = _parse_ts(ts_raw)
        if ts is None:
            fm = 'F2_MISSING_FREEZE'
            detail = f'no parsable stamp (raw={ts_raw!r})'
            raise ValueError(detail)

        now = _utcnow()
        if ts > now + timedelta(seconds=CLOCK_SKEW_TOLERANCE_S):
            fm = 'F3_CLOCK_SKEW'
            detail = f'stamp {ts.isoformat()} in future beyond {CLOCK_SKEW_TOLERANCE_S}s'
            raise ValueError(detail)

        age_h = (now - ts).total_seconds() / 3600
        if age_h > max_age_hours:
            fm = 'F1_STALE'
            detail = f'age {age_h:.2f}h > {max_age_hours}h'
            raise ValueError(detail)

        if require_manifest:
            rowcount = 0
            if isinstance(d, dict):
                for v in d.values():
                    if isinstance(v, list):
                        rowcount += len(v)
                    elif isinstance(v, dict):  # dict-of-lists (e.g. fits: {cat: [...]})
                        for vv in v.values():
                            if isinstance(vv, list):
                                rowcount += len(vv)
            if rowcount == 0:
                fm = 'F4_INCOMPLETE'
                detail = 'fresh stamp but zero data rows'
                raise ValueError(detail)

        return {'data': d,
                'audit': {'path': path, 'stamp': ts_raw, 'age_hours': round(age_h, 2),
                          'fresh': True, 'failure_mode': None, 'label': 'FRESH'}}

    except (FileNotFoundError, ValueError, json.JSONDecodeError, OSError) as e:
        detail = detail or str(e)
        row = {'path': path, 'failure_mode': fm, 'detail': detail,
               'action': 'fallback_close_only',
               'product_label': 'CLOSE-ONLY (freshness refusal)'}
        _ledger_append(row)
        return {'data': None,
                'audit': {'path': path, 'stamp': ts_raw, 'fresh': False,
                          'failure_mode': fm, 'detail': detail,
                          'label': 'CLOSE-ONLY (freshness refusal)'},
                'ledger_row': row}


def close_only_fallback():
    """The fallback surface contract: close-only, honest label, no model signal."""
    return {'mode': 'close_only',
            'model_signals': False,
            'shade_outliers': False,
            'floor_upgrades': False,
            'label': 'CLOSE-ONLY (freshness refusal)',
            'note': ('FreshnessGate refused the read; close-only display per doctrine. '
                     'See kill ledger for the refusal reason.')}


def self_test():
    import tempfile
    tmp = tempfile.mkdtemp(prefix='fg_test_')
    now = time.time()
    cases = {
        'fresh_ok':  {'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'source': 't', 'rows': [1, 2]},
        'stale':     {'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(now - 8 * 3600)), 'source': 't', 'rows': [1]},
        'no_stamp':  {'source': 't', 'rows': [1]},
        'skew':      {'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(now + 3600)), 'source': 't', 'rows': [1]},
        'empty':     {'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'source': 't', 'rows': []},
    }
    results = {}
    for name, payload in cases.items():
        p = os.path.join(tmp, f'{name}.json')
        json.dump(payload, open(p, 'w'))
        a = read_fresh(p, max_age_hours=6)['audit']
        results[name] = a['failure_mode'] or 'PASS'
        print(f"{name:10s} -> {a['failure_mode'] or 'PASS'} | label={a['label']}")
    a = read_fresh(os.path.join(tmp, 'absent.json'))['audit']
    results['absent'] = a['failure_mode']
    print(f"{'absent':10s} -> {a['failure_mode']} | label={a['label']}")
    ok = (results['fresh_ok'] == 'PASS'
          and results['stale'] == 'F1_STALE'
          and results['no_stamp'] == 'F2_MISSING_FREEZE'
          and results['skew'] == 'F3_CLOCK_SKEW'
          and results['empty'] == 'F4_INCOMPLETE'
          and results['absent'] == 'F2_MISSING_FREEZE')
    print('\nSELF-TEST:', 'ALL 5 CASES PASS' if ok else 'FAILURES - DO NOT WIRE')
    print('kill ledger tail:')
    for line in open(KILL_LEDGER, encoding='utf-8').readlines()[-6:]:
        print('  ', line.strip()[:170])
    return ok


if __name__ == '__main__':
    self_test()
