"""THE ACADEMY HARVEST — resolve lineup compositions for the top field entries.

Endpoint proven: /scores/v2/entries/{dg}/{entryKey}?embed=roster → the full roster
(CPT/FLEX, player, percentDrafted = field ownership!, live score, stats).

Plan: resolve the TOP 60 entries' rosters (covers every distinct lineup in the payout
top), then aggregate TRUE per-player usage as drafted (not vendor projections).
"""
import json
import urllib.request
import websocket
import time
from collections import Counter

L = json.load(open('dfs/pull3_field_leaderboard.json'))
ents = L['leaderBoard']

tabs = json.loads(urllib.request.urlopen('http://127.0.0.1:9223/json', timeout=8).read())
dk = [t for t in tabs if t.get('type') == 'page' and 'gamecenter' in t.get('url', '')]
if not dk:
    dk = [t for t in tabs if t.get('type') == 'page' and 'draftkings' in t.get('url', '')]
ws = websocket.create_connection(dk[0]['webSocketDebuggerUrl'], timeout=600)
_id = [0]
def cdp(expr):
    _id[0] += 1
    ws.send(json.dumps({'id': _id[0], 'method': 'Runtime.evaluate',
                        'params': {'expression': expr, 'awaitPromise': True}}))
    while True:
        m = json.loads(ws.recv())
        if m.get('id') == _id[0]:
            return m.get('result', {}).get('result', {}).get('value', '')

# take top 60 unique lineups by best rank (the consensus top of the field)
seen, targets = set(), []
for e in ents:
    if e['lineupId'] in seen:
        continue
    seen.add(e['lineupId'])
    targets.append(e)
    if len(targets) >= 60:
        break

resolved = []
batch = [t['entryKey'] for t in targets[:20]]  # draftables-style comma batch may work; do per-entry
t0 = time.time()
for i, t in enumerate(targets):
    ek = t['entryKey']
    js = """
    (async () => {
      const r = await fetch('https://api.draftkings.com/scores/v2/entries/154475/%s?format=json&embed=roster',
        {credentials:'include',headers:{'Accept':'application/json'}});
      return JSON.stringify({s:r.status, t:await r.text()});
    })()
    """ % ek
    out = cdp(js)
    try:
        d = json.loads(out)
        if d['s'] == 200:
            body = json.loads(d['t'])
            sc = body['entries'][0]['roster']['scorecards']
            resolved.append({'entryKey': ek, 'userName': t['userName'], 'rank': t['rank'],
                             'lineupId': t['lineupId'], 'roster': sc})
        else:
            resolved.append({'entryKey': ek, 'err': d['s']})
    except Exception as ex:
        resolved.append({'entryKey': ek, 'err': str(ex)[:50]})
    time.sleep(0.3)
    if (i + 1) % 10 == 0:
        print(f'  {i+1}/{len(targets)} resolved ({time.time()-t0:.0f}s)')

ok = [r for r in resolved if 'roster' in r]
print(f'\nresolved: {len(ok)}/{len(targets)} rosters')
json.dump(resolved, open('dfs/ACADEMY_ROSTERS_154475.json', 'w'), indent=1)

# aggregate the consensus as DRAFTED
cpt, flex, both = Counter(), Counter(), Counter()
for r in ok:
    for p in r['roster']:
        nm = p['displayName']
        pos = p.get('rosterPosition')
        both[(nm, pos)] += 1
        (cpt if pos == 'CPT' else flex)[nm] += 1

print(f'\n=== TRUE CONSENSUS — CPT usage across {len(ok)} top-of-field entries ===')
for nm, c in cpt.most_common(8):
    print(f'  CPT {nm}: {c} ({c/len(ok)*100:.0f}%)')
print(f'\n=== FLEX usage ===')
for nm, c in flex.most_common(12):
    print(f'  {nm}: {c} ({c/len(ok)*100:.0f}%)')
ws.close()
