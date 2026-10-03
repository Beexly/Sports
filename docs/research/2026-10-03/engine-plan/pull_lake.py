"""GSE data lake pull, 2026-10-03. Every row is stamped with source, observed_at and credits spent.
A) Firecrawl Alexandria (paid credits): nfl-com injuries W1-3, team news x32, team rosters x32, cbs+startwho W4 projections.
B) Free: ESPN summary for 2026 W4 games, Kalshi NFL markets, nflverse lake files, Open-Meteo forecasts for W4 venues.
"""
import json, os, time, csv, datetime as dt, concurrent.futures as cf, urllib.request, urllib.parse, urllib.error
ROOT = 'lake'; os.makedirs(ROOT, exist_ok=True)
MAN = []
def now(): return dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
def save(name, obj, source, credits=0, extra=None):
    p = os.path.join(ROOT, name); os.makedirs(os.path.dirname(p), exist_ok=True)
    json.dump(obj, open(p, 'w'), separators=(',', ':'))
    MAN.append(dict(file=name, source=source, observed_at=now(), credits=credits, **(extra or {})))
_FC = json.load(open(os.path.expandvars(r'%APPDATA%\firecrawl-cli\credentials.json')))
def alex(tool, opts, name):
    out = os.path.join(ROOT, name); os.makedirs(os.path.dirname(out), exist_ok=True)
    prov, cap = tool.split('/', 1)
    body = json.dumps({'alexandria': {'provider': prov, 'capability': cap, 'options': opts}}).encode()
    req = urllib.request.Request(_FC.get('apiUrl', 'https://api.firecrawl.dev').rstrip('/') + '/v2/scrape', data=body,
                                 headers={'Authorization': 'Bearer ' + _FC['apiKey'], 'Content-Type': 'application/json'})
    err, cost = None, 0
    try:
        with urllib.request.urlopen(req, timeout=120) as f: d = json.loads(f.read())
        json.dump(d, open(out, 'w'), separators=(',', ':'))
        a = ((d.get('data') or {}).get('alexandria') or [{}])[0]; cost = a.get('creditsCost', 0)
        if not d.get('success', True) or a.get('error'): err = str(a.get('error') or d)[:300]
    except urllib.error.HTTPError as e: err = f'HTTP {e.code} ' + e.read().decode(errors='replace')[:300]
    except Exception as e: err = str(e)[:300]
    MAN.append(dict(file=name, source=f'alexandria:{tool}', options=opts, observed_at=now(), credits=cost, err=err))
    return err is None
def get(url, timeout=30):
    req = urllib.request.Request(url, headers={'User-Agent': 'GSE-research/1.0 (contact via github Beexly)'})
    with urllib.request.urlopen(req, timeout=timeout) as f: return f.read()

TEAMS = {'ARI':'arizona-cardinals','ATL':'atlanta-falcons','BAL':'baltimore-ravens','BUF':'buffalo-bills','CAR':'carolina-panthers',
'CHI':'chicago-bears','CIN':'cincinnati-bengals','CLE':'cleveland-browns','DAL':'dallas-cowboys','DEN':'denver-broncos','DET':'detroit-lions',
'GB':'green-bay-packers','HOU':'houston-texans','IND':'indianapolis-colts','JAX':'jacksonville-jaguars','KC':'kansas-city-chiefs',
'LV':'las-vegas-raiders','LAC':'los-angeles-chargers','LAR':'los-angeles-rams','MIA':'miami-dolphins','MIN':'minnesota-vikings',
'NE':'new-england-patriots','NO':'new-orleans-saints','NYG':'new-york-giants','NYJ':'new-york-jets','PHI':'philadelphia-eagles',
'PIT':'pittsburgh-steelers','SF':'san-francisco-49ers','SEA':'seattle-seahawks','TB':'tampa-bay-buccaneers','TEN':'tennessee-titans','WAS':'washington-commanders'}
NFLCOM_ABBR = {'ARI': 'AZ'}

def part_a():
    jobs = []
    for w in (1, 2, 3):
        jobs.append(('nfl-com/sports-league-data/injury_report', {'season': 2026, 'season_type': 'REG', 'week': w}, f'alexandria/nfl_injury_2026_w{w}.json'))
    for ab, slug in TEAMS.items():
        jobs.append(('nfl-com/sports-league-data/news', {'tag': slug, 'limit': 50}, f'alexandria/news/{ab}.json'))
        jobs.append(('nfl-com/sports-league-data/team_roster', {'team': NFLCOM_ABBR.get(ab, ab)}, f'alexandria/roster/{ab}.json'))
    for pos in ('QB', 'RB', 'WR', 'TE', 'K', 'DST'):
        jobs.append(('cbssports-com/fantasy-sports-rankings/projections', {'position': pos, 'scoring': 'PPR', 'type': 'weekly'}, f'alexandria/cbs_proj_w4/{pos}.json'))
    jobs.append(('startwho-com/fantasy-sports-rankings/projections', {'position': 'ALL'}, 'alexandria/startwho_proj_w4_all.json'))
    with cf.ThreadPoolExecutor(4) as ex: list(ex.map(lambda j: alex(*j), jobs))

def part_b():
    G = [r for r in csv.DictReader(open('games.csv')) if r['season'] == '2026' and r['week'] in ('4', '5')]
    for r in G:
        try: save(f"espn/summary_{r['game_id']}.json", json.loads(get(f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={r['espn']}")), 'espn:site.api summary')
        except Exception as e: MAN.append(dict(file=r['game_id'], source='espn', err=str(e)[:200]))
    for series in ('KXNFLGAME', 'KXNFLSPREAD', 'KXNFLTOTAL'):
        allm, cur = [], ''
        for _ in range(20):
            u = f"https://api.elections.kalshi.com/trade-api/v2/markets?series_ticker={series}&status=open&limit=1000" + (f"&cursor={cur}" if cur else '')
            try: d = json.loads(get(u))
            except Exception as e: MAN.append(dict(file=series, source='kalshi', err=str(e)[:200])); break
            allm += d.get('markets', []); cur = d.get('cursor') or ''
            if not cur: break
        save(f'kalshi/{series}_open.json', allm, f'kalshi:trade-api/v2 {series}', extra={'n': len(allm)})

NFLV = 'https://github.com/nflverse/nflverse-data/releases/download'
def part_c():
    files = []
    for y in range(2018, 2026): files += [(f'{NFLV}/injuries/injuries_{y}.parquet', f'nflverse/injuries_{y}.parquet')]
    for y in range(2018, 2027): files += [(f'{NFLV}/snap_counts/snap_counts_{y}.parquet', f'nflverse/snap_counts_{y}.parquet')]
    for y in range(2018, 2026): files += [(f'{NFLV}/pbp_participation/pbp_participation_{y}.parquet', f'nflverse/participation_{y}.parquet')]
    for y in range(2022, 2027): files += [(f'{NFLV}/ftn_charting/ftn_charting_{y}.parquet', f'nflverse/ftn_{y}.parquet')]
    for k in ('passing', 'receiving', 'rushing'): files += [(f'{NFLV}/nextgen_stats/ngs_{k}.parquet', f'nflverse/ngs_{k}.parquet')]
    for y in (2025, 2026): files += [(f'{NFLV}/depth_charts/depth_charts_{y}.parquet', f'nflverse/depth_charts_{y}.parquet'),
                                     (f'{NFLV}/weekly_rosters/roster_weekly_{y}.parquet', f'nflverse/roster_weekly_{y}.parquet')]
    files += [(f'{NFLV}/players/players.parquet', 'nflverse/players.parquet'), (f'{NFLV}/officials/officials.parquet', 'nflverse/officials.parquet')]
    def dl(t):
        u, n = t; p = os.path.join(ROOT, n); os.makedirs(os.path.dirname(p), exist_ok=True)
        try:
            b = get(u, 120); open(p, 'wb').write(b); MAN.append(dict(file=n, source='nflverse (CC-BY 4.0; FTN data CC-BY-SA 4.0)', observed_at=now(), bytes=len(b)))
        except Exception as e: MAN.append(dict(file=n, source='nflverse', err=str(e)[:200]))
    with cf.ThreadPoolExecutor(6) as ex: list(ex.map(dl, files))

def part_d():
    import glob
    for f in glob.glob(os.path.join(ROOT, 'espn', 'summary_2026_04_*.json')):
        d = json.load(open(f)); v = (d.get('gameInfo') or {}).get('venue') or {}; a = v.get('address') or {}
        city = a.get('city'); gid = os.path.basename(f)[8:-5]
        if not city: continue
        try:
            g = json.loads(get('https://geocoding-api.open-meteo.com/v1/search?count=1&name=' + urllib.parse.quote(city)))['results'][0]
            fc = json.loads(get(f"https://api.open-meteo.com/v1/forecast?latitude={g['latitude']}&longitude={g['longitude']}&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m&wind_speed_unit=mph&temperature_unit=fahrenheit&forecast_days=3&timezone=UTC"))
            save(f'weather/{gid}.json', dict(venue=v.get('fullName'), indoor=v.get('indoor'), city=city, geo=g, forecast=fc), 'open-meteo forecast')
        except Exception as e: MAN.append(dict(file=gid, source='open-meteo', err=str(e)[:200]))

if __name__ == '__main__':
    t0 = time.time()
    with cf.ThreadPoolExecutor(3) as ex:
        fa, fb, fc_ = ex.submit(part_a), ex.submit(part_b), ex.submit(part_c)
        fb.result(); part_d(); fa.result(); fc_.result()
    json.dump(MAN, open(os.path.join(ROOT, 'MANIFEST.json'), 'w'), indent=1)
    ok = [m for m in MAN if not m.get('err')]; bad = [m for m in MAN if m.get('err')]
    print('items ok', len(ok), 'failed', len(bad), 'credits', sum(m.get('credits', 0) or 0 for m in MAN), 'secs', round(time.time() - t0))
    for m in bad[:15]: print('FAIL', m.get('file'), m.get('source'), (m.get('err') or '')[:160])
