import psycopg2
import json
from datetime import datetime

URL = "[REDACTED:db.url.with-password]/neondb?sslmode=require&channel_binding=require"
conn = psycopg2.connect(URL)
cur = conn.cursor()

# 1. Sport ID for NFL
cur.execute("SELECT id, key, name FROM sports WHERE key LIKE '%nfl%' OR key LIKE '%football%';")
sports = cur.fetchall()
print("Sports:", sports)
nfl_sport_id = None
for s in sports:
    if "nfl" in s[1].lower():
        nfl_sport_id = s[0]
        nfl_sport_key = s[1]
print(f"NFL sport id: {nfl_sport_id}, key: {nfl_sport_key}")

# 2. Check team_game_logs for NFL
cur.execute("""
    SELECT count(*), min(game_date), max(game_date)
    FROM (
        SELECT "gameDate" as game_date FROM team_game_logs WHERE sport = %s OR sport = 'nfl'
    ) sub;
""", (nfl_sport_key,))
print("\n--- team_game_logs overall stats ---")
print("Count, min, max:", cur.fetchone())

# Check by team: count and max gameDate
cur.execute("""
    SELECT "teamName", count(*), max("gameDate") as last_game,
           count(*) FILTER (WHERE "gameDate" >= '2026-10-01') as oct_games
    FROM team_game_logs
    WHERE sport = %s OR sport = 'nfl'
    GROUP BY "teamName"
    ORDER BY "teamName";
""", (nfl_sport_key,))
teams_logs = cur.fetchall()
print(f"\nTotal distinct teams in team_game_logs: {len(teams_logs)}")
for row in teams_logs:
    print(f"  {row[0]:<30} | total: {row[1]:<3} | last_game: {str(row[2])[:10]} | oct_games: {row[3]}")

# Specifically check KC, CAR, TB, DAL
print("\n--- Specifically checking KC, CAR, TB, DAL in team_game_logs ---")
cur.execute("""
    SELECT "teamName", "gameDate", "opponentName", "isHome", "teamScore", "opponentScore", "result", "atsResult", "spread"
    FROM team_game_logs
    WHERE "teamName" IN ('Kansas City Chiefs', 'Carolina Panthers', 'Tampa Bay Buccaneers', 'Dallas Cowboys')
    ORDER BY "teamName", "gameDate" DESC;
""")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]} vs {r[2]} (home={r[3]}), score={r[4]}-{r[5]}, res={r[6]}, ats={r[7]}, spread={r[8]}")

# 3. Check settled 2026 NFL games in `games`
print("\n--- Settled 2026 NFL regular-season games in `games` ---")
cur.execute("""
    SELECT id, "homeTeamName", "awayTeamName", "commenceTime", status, "homeScore", "awayScore", "restDaysHome", "restDaysAway", "mergedIntoGameId"
    FROM games
    WHERE "sportId" = %s
      AND "commenceTime" >= '2026-09-01'
      AND "commenceTime" < '2026-10-17'
      AND "mergedIntoGameId" IS NULL
    ORDER BY "commenceTime" ASC;
""", (nfl_sport_id,))
settled_games = cur.fetchall()
print(f"Total games between 2026-09-01 and 2026-10-17: {len(settled_games)}")

# Status breakdown
statuses = {}
for g in settled_games:
    st = g[4]
    statuses[st] = statuses.get(st, 0) + 1
print("Status breakdown:", statuses)

# Games with missing scores or status != COMPLETED / FINAL
unsettled = [g for g in settled_games if g[5] is None or g[6] is None]
print(f"Games with missing scores: {len(unsettled)}")
for u in unsettled:
    print("  Missing score:", u[0], u[1], "vs", u[2], u[3], u[4])

# Check which settled games exist in games but NOT in team_game_logs
cur.execute("""
    SELECT g.id, g."homeTeamName", g."awayTeamName", g."commenceTime", g.status, g."homeScore", g."awayScore"
    FROM games g
    LEFT JOIN team_game_logs tgl ON g.id = tgl."gameId"
    WHERE g."sportId" = %s
      AND g."commenceTime" >= '2026-09-01'
      AND g."commenceTime" < '2026-10-17'
      AND g."mergedIntoGameId" IS NULL
      AND tgl.id IS NULL
    ORDER BY g."commenceTime" ASC;
""", (nfl_sport_id,))
missing_logs = cur.fetchall()
print(f"\nSettled games in `games` missing from `team_game_logs`: {len(missing_logs)}")
for m in missing_logs:
    print(f"  Game {m[0]}: {m[2]} @ {m[1]} on {m[3]}, status={m[4]}, score={m[5]}-{m[6]}")

cur.close()
conn.close()
