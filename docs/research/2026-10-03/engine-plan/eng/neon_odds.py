"""Read-only: latest pre-kick NFL odds per book (h2h, spreads, totals) from Neon odds_line_snapshots for upcoming games."""
import subprocess, json, os, psycopg, datetime as dt
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def fetch():
    cs = subprocess.run('neonctl connection-string --project-id summer-brook-99380762 --role-name hermes_ro', shell=True, capture_output=True, text=True).stdout.strip()
    with psycopg.connect(cs) as c, c.cursor() as cur:
        cur.execute("""select id from sports where key='americanfootball_nfl'""")
        sid = cur.fetchone()[0]
        cur.execute("""select g.id, g."homeTeamName", g."awayTeamName", g."commenceTime"
                       from games g where g."sportId"=%s and g."commenceTime" > now() - interval '3 hours' and g."commenceTime" < now() + interval '4 days'""", (sid,))
        games = cur.fetchall()
        ids = [g[0] for g in games]
        cur.execute("""select distinct on (o."gameId", o.book, o.market, o.side) o."gameId", o.book, o.market, o.side, o.price::float, o.line::float, o."capturedAt", o.phase::text
                       from odds_line_snapshots o where o."gameId" = any(%s) order by o."gameId", o.book, o.market, o.side, o."capturedAt" desc""", (ids,))
        snaps = cur.fetchall()
    out = dict(fetched_at=dt.datetime.now(dt.timezone.utc).isoformat(), games=[dict(id=g[0], home=g[1], away=g[2], commence=str(g[3])) for g in games],
               snaps=[dict(game=s[0], book=s[1], market=s[2], side=s[3], price=s[4], line=s[5], captured=str(s[6]), phase=s[7]) for s in snaps])
    json.dump(out, open(os.path.join(R, 'lake', 'neon_odds_latest.json'), 'w'), indent=0)
    return out
if __name__ == '__main__':
    o = fetch(); print(len(o['games']), 'games', len(o['snaps']), 'snaps')
    import collections; print(collections.Counter((s['market'], s['side'] if s['market'] != 'h2h' else 'team') for s in o['snaps']).most_common(8))
    print(sorted({s['captured'][:16] for s in o['snaps']})[-3:])
