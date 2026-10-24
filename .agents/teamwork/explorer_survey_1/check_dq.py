import psycopg2

URL = "[REDACTED:db.url.with-password]/neondb?sslmode=require&channel_binding=require"
conn = psycopg2.connect(URL)
cur = conn.cursor()

cur.execute("""
    SELECT g.id, g."homeTeamName", g."awayTeamName", g."commenceTime", g.status,
           g."dataQualityScore", g."bookmakerCoverageMax", g."openingSpread",
           (SELECT count(*) FROM team_game_logs tgl WHERE tgl."gameId" = g.id) as log_count
    FROM games g
    WHERE g.id IN ('cmpg6tbr5003h1herakbz6qj1', 'cmpg6tbvu003l1heru1prtbin', 'cmpg6tc0b003p1herbj2jxqco', 'cmqfv6aik0041mk73cufbtdid');
""")
print("Data quality for the 4 specific games:")
for r in cur.fetchall():
    print(r)

cur.close()
conn.close()
