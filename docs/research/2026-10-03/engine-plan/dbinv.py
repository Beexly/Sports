import subprocess, psycopg
cs = subprocess.run('neonctl connection-string --project-id summer-brook-99380762 --role-name hermes_ro', shell=True, capture_output=True, text=True).stdout.strip()
with psycopg.connect(cs) as c:
    cur = c.cursor()
    cur.execute("""select schemaname||'.'||relname, n_live_tup from pg_stat_user_tables where n_live_tup>0 order by n_live_tup desc""")
    rows = cur.fetchall(); print('tables with rows', len(rows), 'total rows', sum(r[1] for r in rows))
    for r in rows[:70]: print(f'{r[1]:>10}  {r[0]}')
    cur.execute("""select count(*) from pg_stat_user_tables where n_live_tup=0"""); print('empty tables', cur.fetchone()[0])
