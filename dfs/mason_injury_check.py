"""Jordan Mason fresh injury check + full SF/SEA injury report from ESPN summary API."""
import json
import urllib.request

sb = json.loads(urllib.request.urlopen(
    'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=20261011',
    timeout=25).read())
eid = None
for ev in sb['events']:
    if '49ers' in ev['name']:
        eid = ev['id']
        print(f"SF@SEA event id: {eid} | {ev['competitions'][0]['status']['type']['description']}")
if not eid:
    raise SystemExit('SF game not found')

s = json.loads(urllib.request.urlopen(
    f'https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={eid}',
    timeout=25).read())
injs = s.get('injuries', [])
print(f'injury team-blocks: {len(injs)}')
for block in injs:
    tm = block.get('team', {}).get('abbreviation', '?')
    print(f"\n{tm}:")
    for i in block.get('injuries', [])[:10]:
        ath = i.get('athlete', {}).get('displayName', '?')
        st = i.get('status', '?')
        det = i.get('details', {}) or {}
        typ = det.get('type', {}).get('description', '') if isinstance(det.get('type'), dict) else det.get('type', '')
        print(f"  {ath}: {st}{' — ' + typ if typ else ''}")
