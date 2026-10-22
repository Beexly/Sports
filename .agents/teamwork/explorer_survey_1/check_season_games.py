import psycopg2

URL = "[REDACTED:db.url.with-password]/neondb?sslmode=require&channel_binding=require"
conn = psycopg2.connect(URL)
cur = conn.cursor()

# Get all 2026 NFL games in `games` between 2026-09-01 and 2026-10-17
cur.execute("""
    SELECT g.id, g."homeTeamName", g."awayTeamName", g."commenceTime", g.status, 
           g."homeScore", g."awayScore", g."openingSpread", g."mergedIntoGameId",
           (SELECT count(*) FROM team_game_logs tgl WHERE tgl."gameId" = g.id) as log_count
    FROM games g
    WHERE g."sportId" = 'cmpg6t7v900031heri45v3d8s'
      AND g."commenceTime" >= '2026-09-01'
      AND g."commenceTime" < '2026-10-17'
      AND g."mergedIntoGameId" IS NULL
    ORDER BY g."commenceTime" ASC;
""")
games_list = cur.fetchall()
print(f"Total 2026 regular-season games in `games` (Sept 1 to Oct 17, non-merged): {len(games_list)}")

with_logs = [g for g in games_list if g[9] > 0]
without_logs = [g for g in games_list if g[9] == 0]
print(f"Games WITH team_game_logs: {len(with_logs)}")
print(f"Games WITHOUT team_game_logs: {len(without_logs)}")

print("\n--- Detailed breakdown of games WITHOUT team_game_logs ---")
for g in without_logs:
    print(f"ID: {g[0]} | Date: {g[3]} | {g[2]} @ {g[1]} | Status: {g[4]} | Score: {g[5]}-{g[6]} | Spread: {g[7]}")

cur.close()
conn.close()
