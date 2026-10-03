import subprocess, psycopg
cs = subprocess.run('neonctl connection-string --project-id summer-brook-99380762 --role-name hermes_ro', shell=True, capture_output=True, text=True).stdout.strip()
with psycopg.connect(cs) as c:
    cur = c.cursor()
    cur.execute('select category::text, count(*), count(distinct key), min("capturedAt")::date, max("capturedAt")::date from signals group by 1 order by 2 desc'); print('signals by category'); [print('  ', r) for r in cur.fetchall()]
    cur.execute('select key, count(*) from signals group by 1 order by 2 desc limit 25'); print('top keys', cur.fetchall())
    cur.execute("select column_name from information_schema.columns where table_name='game_signals'"); gc=[r[0] for r in cur.fetchall()]; print('game_signals cols', gc)
    k = next((x for x in gc if x.lower() in ('key','signalkey','signal_key','name','type')), None)
    if k: cur.execute(f'select "{k}"::text, count(*) from game_signals group by 1 order by 2 desc limit 30'); print('game_signals keys', cur.fetchall())
    cur.execute('select source::text, count(*) from source_snapshots group by 1 order by 2 desc limit 20') ; print('source_snapshots', cur.fetchall())
    cur.execute('select market::text, phase::text, count(*), count(distinct book) from odds_line_snapshots o join games g on g.id=o."gameId" join sports s on s.id=g."sportId" where s.key=%s group by 1,2 order by 3 desc', ('americanfootball_nfl',)); print('NFL ols market/phase/books', cur.fetchall())
