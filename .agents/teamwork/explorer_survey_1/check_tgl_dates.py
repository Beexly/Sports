import psycopg2

URL = "[REDACTED:db.url.with-password]/neondb?sslmode=require&channel_binding=require"
conn = psycopg2.connect(URL)
cur = conn.cursor()

cur.execute("""
    SELECT date("gameDate"), count(*)
    FROM team_game_logs
    WHERE sport = 'americanfootball_nfl'
    GROUP BY date("gameDate")
    ORDER BY date("gameDate");
""")
print("Dates in team_game_logs for NFL:")
for r in cur.fetchall():
    print(f"  Date: {r[0]} | count: {r[1]}")

cur.close()
conn.close()
