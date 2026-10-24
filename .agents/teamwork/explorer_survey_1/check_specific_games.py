import psycopg2

URL = "[REDACTED:db.url.with-password]/neondb?sslmode=require&channel_binding=require"
conn = psycopg2.connect(URL)
cur = conn.cursor()

ids = ['cmpg6tbr5003h1herakbz6qj1', 'cmpg6tbvu003l1heru1prtbin', 'cmpg6tc0b003p1herbj2jxqco']
for gid in ids:
    cur.execute('SELECT id, "homeTeamName", "awayTeamName", "commenceTime", status, "sportId", "mergedIntoGameId" FROM games WHERE id = %s;', (gid,))
    print(cur.fetchone())

cur.close()
conn.close()
