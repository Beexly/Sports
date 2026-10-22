import psycopg2

URL = "[REDACTED:db.url.with-password]/neondb?sslmode=require&channel_binding=require"
conn = psycopg2.connect(URL)
cur = conn.cursor()

cur.execute('SELECT DISTINCT sport, count(*) FROM team_game_logs GROUP BY sport;')
print("team_game_logs by sport:")
for r in cur.fetchall():
    print(r)

# Check all team_game_logs for NFL
cur.execute('''
    SELECT id, "teamName", sport, "gameId", "opponentName", "isHome", "gameDate", "teamScore", "opponentScore", result, spread, "atsResult"
    FROM team_game_logs
    WHERE sport = 'americanfootball_nfl'
    ORDER BY "gameDate" DESC
    LIMIT 30;
''')
print("\nMost recent NFL team_game_logs:")
for r in cur.fetchall():
    print(r)

cur.close()
conn.close()
