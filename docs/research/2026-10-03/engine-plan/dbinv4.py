import subprocess, psycopg
cs = subprocess.run('neonctl connection-string --project-id summer-brook-99380762 --role-name hermes_ro', shell=True, capture_output=True, text=True).stdout.strip()
with psycopg.connect(cs) as c:
    cur = c.cursor()
    cur.execute('select o.market::text, o.phase::text, count(*), count(distinct o.book), count(distinct o."gameId") from odds_line_snapshots o join games g on g.id=o."gameId" join sports s on s.id=g."sportId" where s.key=%s group by 1,2 order by 3 desc', ('americanfootball_nfl',)); print('NFL ols market/phase/books/games', cur.fetchall())
    cur.execute("select column_name from information_schema.columns where table_name='source_snapshots'"); print('source_snapshots cols', [r[0] for r in cur.fetchall()])
    cur.execute("select column_name from information_schema.columns where table_name='player_game_stats'"); print('pgs cols n', len(cur.fetchall()))
