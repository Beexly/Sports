import psycopg2

URL = "[REDACTED:db.url.with-password]/neondb?sslmode=require&channel_binding=require"
conn = psycopg2.connect(URL)
cur = conn.cursor()

# 1. Total rows in team_game_logs for NFL
cur.execute("SELECT count(*) FROM team_game_logs WHERE sport = 'americanfootball_nfl' OR sport = 'nfl';")
print("Total NFL rows in team_game_logs:", cur.fetchone()[0])

# 2. Check team_game_logs for KC, CAR, TB, DAL
print("\n=== Current team_game_logs for KC, CAR, TB, DAL ===")
cur.execute("""
    SELECT "teamName", count(*), min("gameDate"), max("gameDate")
    FROM team_game_logs
    WHERE "teamName" IN ('Kansas City Chiefs', 'Carolina Panthers', 'Tampa Bay Buccaneers', 'Dallas Cowboys')
    GROUP BY "teamName";
""")
for r in cur.fetchall():
    print(f"Team: {r[0]:<25} | count: {r[1]} | min: {r[2]} | max: {r[3]}")

# 3. Find settled games in `games` that are FINAL/COMPLETED (have scores) but NOT in team_game_logs
print("\n=== Settled games in `games` (with homeScore, awayScore) that have NO team_game_logs ===")
cur.execute("""
    SELECT g.id, g."homeTeamName", g."awayTeamName", g."commenceTime", g.status, g."homeScore", g."awayScore"
    FROM games g
    LEFT JOIN team_game_logs tgl ON g.id = tgl."gameId"
    WHERE g."sportId" = 'americanfootball_nfl'
      AND g."commenceTime" >= '2026-09-01'
      AND g."commenceTime" < '2026-10-17'
      AND g."mergedIntoGameId" IS NULL
      AND g."homeScore" IS NOT NULL
      AND g."awayScore" IS NOT NULL
      AND tgl.id IS NULL
    ORDER BY g."commenceTime" ASC;
""")
missing_settled = cur.fetchall()
print(f"Count of settled games missing from team_game_logs: {len(missing_settled)}")
for m in missing_settled:
    print(f"  ID: {m[0]} | {m[2]} @ {m[1]} | Date: {m[3]} | Status: {m[4]} | Score: {m[5]}-{m[6]}")

# Let's also check if any settled games in games have status SCHEDULED but scores are null
print("\n=== Games between 2026-09-01 and 2026-10-17 with NO scores ===")
cur.execute("""
    SELECT g.id, g."homeTeamName", g."awayTeamName", g."commenceTime", g.status, g."mergedIntoGameId"
    FROM games g
    WHERE g."sportId" = 'americanfootball_nfl'
      AND g."commenceTime" >= '2026-09-01'
      AND g."commenceTime" < '2026-10-17'
      AND g."mergedIntoGameId" IS NULL
      AND (g."homeScore" IS NULL OR g."awayScore" IS NULL)
    ORDER BY g."commenceTime" ASC;
""")
unscored = cur.fetchall()
print(f"Count of unscored games in Weeks 1-5: {len(unscored)}")
for u in unscored:
    print(f"  ID: {u[0]} | {u[2]} @ {u[1]} | Date: {u[3]} | Status: {u[4]} | Merged: {u[5]}")

cur.close()
conn.close()
