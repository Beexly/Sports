"""Refresh live W4 inputs: nfl.com injury report (Alexandria, 5 credits) and the Neon odds snapshot. Stamps observed_at."""
import os, json, urllib.request, urllib.error, datetime as dt, subprocess, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FC = json.load(open(os.path.expandvars(r'%APPDATA%\firecrawl-cli\credentials.json')))
def alex(prov, cap, opts):
    body = json.dumps({'alexandria': {'provider': prov, 'capability': cap, 'options': opts}}).encode()
    rq = urllib.request.Request('https://api.firecrawl.dev/v2/scrape', data=body,
                                headers={'Authorization': 'Bearer ' + FC['apiKey'], 'Content-Type': 'application/json'})
    with urllib.request.urlopen(rq, timeout=120) as f: return json.loads(f.read())
d = alex('nfl-com', 'sports-league-data/injury_report', {'season': 2026, 'season_type': 'REG', 'week': 4})
a = d['data']['alexandria'][0]
out = os.path.join(R, 'lake', 'alexandria', 'nfl_injury_2026_w4.json')
json.dump(d, open(out, 'w'), separators=(',', ':'))
print('injuries', a['data'].get('count'), 'report_date', a['data'].get('report_date'), 'credits', a.get('creditsCost'),
      'observed_at', dt.datetime.utcfromtimestamp(a['data']['observed_at_ms'] / 1000).isoformat())
r = subprocess.run([sys.executable, os.path.join(R, 'eng', 'neon_odds.py')], capture_output=True, text=True, cwd=R)
print(r.stdout[-400:], r.stderr[-300:])
