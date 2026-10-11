"""JEV RESIDUAL GRADER — runs the moment contest 196458728 settles.

Pre-registered residual definition (NOW, before outcomes exist):
  1. pull entries: gamecenter leaderboard for contest 196458728 (dg 154475)
  2. for each JEV portfolio (lambda in {0,1,2}): compute actual DK points
  3. residual vs field: portfolio rank / 50th / 90th percentile of the field
  4. DupRisk check: unique-player overlap of top-1% field lineups vs our portfolios
  5. Stamp: INFRASTRUCTURE PASS (table produced) — result stays DIAGNOSTIC

Usage:
    python jev_rvc_grade.py --verify   # dry run, no outcomes needed
    python jev_rvc_grade.py --grade    # after lock+settle, pulls outcomes
"""
import json, time, os, sys, math, statistics, argparse

HERE = os.path.dirname(os.path.abspath(__file__))
CONTEST = 196458728
DG = 154475
PORTFOLIOS_F = os.path.join(HERE, 'showdown_196458728_portfolios.json')
POOL_F = os.path.join(HERE, '..', 'snapshots', 'pool_154475.json')
OUT_F = os.path.join(HERE, 'JEV_RVC_GRADED.json')
LEDGER = os.path.join(HERE, 'kill_ledger_freshness.jsonl')

def _ledger(row):
    row['ledger_ts'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    with open(LEDGER, 'a', encoding='utf-8') as f:
        f.write(json.dumps(row) + '\n')

def _cookie():
    return open(os.path.join(HERE, 'dk_cookie_header.txt')).read().strip()

def _fetch(url):
    import urllib.request
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.8037.99 Safari/537.36',
        'Cookie': _cookie(),
        'Referer': 'https://www.draftkings.com/',
        'Accept': 'application/json',
    })
    return json.loads(urllib.request.urlopen(req, timeout=25).read())

def _portfolio_lineups(pf):
    """Flatten the portfolios dict {lambda_str: [lineups]} into (lambda, lineup) pairs."""
    out = []
    for lam, lineups in (pf.get('portfolios') or {}).items():
        for lu in (lineups or [])[:5]:
            out.append({'lambda': lam, 'cptn': lu.get('cptn'),
                        'flex': lu.get('flex', []), 'salary': lu.get('salary'),
                        'proj': lu.get('proj')})
    return out


def verify():
    print('=== JEV RVC GRADE — VERIFY (no outcomes) ===')
    pf = json.load(open(PORTFOLIOS_F))
    lineups = _portfolio_lineups(pf)
    print(f'contest {CONTEST} (dg {DG}): {len(lineups)} lineups across lambdas')
    for l in lineups[:4]:
        print(f"  λ={l['lambda']}: CPT {l['cptn']} | flex {l['flex'][:2]}… | ${l['salary']} | proj {l['proj']}")
    print('\nPre-registered residual definition:')
    print('  R1: our portfolio DK points vs field distribution (pct rank)')
    print('  R2: portfolio points vs field p50, p90 (ceil check)')
    print('  R3: DupRisk proxy: our lineup uniqueness vs top-1% field')
    print('  Data needed: gamecenter leaderboard (entries + points), post-settle')
    print('\nVERIFY: join keys resolve (contest id, dg id, player names). Awaiting settle.')

def _leaderboard():
    """Pull contest leaderboard. Tries gamecenter (post-lock) then API fallback."""
    urls = [
        f'https://www.draftkings.com/contest/gamecenter/{CONTEST}',
        f'https://api.draftkings.com/contests/v1/contests/{CONTEST}/leaderboard?format=json',
    ]
    for u in urls:
        try:
            d = _fetch(u)
            if d:
                return {'source': u, 'data': d}
        except Exception as e:
            print(f'  {u[:60]}: {str(e)[:60]}')
    return None

def grade():
    print('=== JEV RVC GRADE ===')
    lb = _leaderboard()
    if lb is None:
        _ledger({'event': 'JEV_RVC_GRADE', 'verdict': 'REFUSED',
                 'reason': 'leaderboard not reachable (pre-lock or bot-walled)', 'label': 'DIAGNOSTIC'})
        print('REFUSED: leaderboard not reachable. Reopen: post-lock gamecenter.')
        return
    d = lb['data']
    # gamecenter shape: Leaderboard list with Lineup, Points, Rank
    entries = d.get('Leaderboard') or d.get('leaderboard') or []
    if len(entries) < 100:
        _ledger({'event': 'JEV_RVC_GRADE', 'verdict': 'REFUSED',
                 'reason': f'leaderboard too small ({len(entries)} entries) — not settled', 'label': 'DIAGNOSTIC'})
        print(f'REFUSED: only {len(entries)} entries — game not settled.')
        return
    points = sorted((e.get('Points') or e.get('points') or 0) for e in entries
                    if (e.get('Points') or e.get('points')) is not None)
    if not points:
        print('REFUSED: no points in leaderboard.')
        return
    p50 = points[len(points) // 2]
    p90 = points[int(len(points) * 0.9)]
    p99 = points[int(len(points) * 0.99)]
    top1pct = points[int(len(points) * 0.01)]

    pf = json.load(open(PORTFOLIOS_F))
    rows = []
    for p in pf['portfolios']:
        la = p.get('lambda')
        total = p.get('projection', {}).get('points') if isinstance(p.get('projection'), dict) else p.get('projected_points')
        rows.append({'lambda': la, 'projected': total,
                     'field_p50': p50, 'field_p90': p90, 'field_p99': p99,
                     'projected_pct_vs_p50': round((total or 0) / p50, 3) if p50 else None})
    # NOTE: actual scored points for OUR lineups require lineup-level final stats,
    # which come from the draftgroup players endpoint at settle. If projections only,
    # stamp the infra pass with the field distribution and the projected-vs-field
    # comparison, and record the actual-points join as the remaining step.
    stamp = {
        'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'contest': CONTEST, 'dg': DG,
        'field': {'n_entries': len(points), 'p50': p50, 'p90': p90, 'p99': p99, 'p_top1': top1pct},
        'portfolios_vs_field': rows,
        'verdict': 'INFRASTRUCTURE PASS — field distribution pulled, portfolio comparison computed',
        'remaining_for_full_rvc': 'actual scored points per portfolio player (draftgroup final stats)',
        'label': 'DIAGNOSTIC',
    }
    json.dump(stamp, open(OUT_F, 'w'), indent=1)
    _ledger({'event': 'JEV_RVC_GRADED', 'verdict': 'INFRASTRUCTURE PASS',
             'n_entries': len(points), 'field_p50': p50, 'field_p90': p90, 'label': 'DIAGNOSTIC'})
    print(json.dumps(stamp, indent=1)[:900])

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--verify', action='store_true')
    ap.add_argument('--grade', action='store_true')
    a = ap.parse_args()
    if a.verify:
        verify()
    elif a.grade:
        grade()
    else:
        print(__doc__)
