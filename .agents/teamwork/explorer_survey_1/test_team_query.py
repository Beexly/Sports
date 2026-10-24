import psycopg2
from datetime import datetime, timedelta

URL = "[REDACTED:db.url.with-password]/neondb?sslmode=require&channel_binding=require"
conn = psycopg2.connect(URL)
cur = conn.cursor()

teams = ["Carolina Panthers", "Tampa Bay Buccaneers", "Kansas City Chiefs", "Dallas Cowboys"]
sport_key = "americanfootball_nfl"
sport_id = "cmpg6t7v900031heri45v3d8s"

for team in teams:
    print(f"\n==================== Testing {team} ====================")
    # Check what games exist in `games` where homeTeamName = team or awayTeamName = team
    cur.execute("""
        SELECT g.id, g."homeTeamName", g."awayTeamName", g."commenceTime", g.status, g."mergedIntoGameId"
        FROM games g
        JOIN sports s ON g."sportId" = s.id
        WHERE s.key = %s
          AND g."mergedIntoGameId" IS NULL
          AND (g."homeTeamName" = %s OR g."awayTeamName" = %s)
        ORDER BY g."commenceTime" DESC
        LIMIT 10;
    """, (sport_key, team, team))
    games_found = cur.fetchall()
    print(f"Games found for {team} with exact name match:")
    for g in games_found:
        print(f"  {g[0]} | {g[2]} @ {g[1]} | {g[3]} | {g[4]} | merged={g[5]}")

    # Check teamGameLogs
    cur.execute("""
        SELECT id, "teamName", sport, "gameDate"
        FROM team_game_logs
        WHERE sport = %s AND "teamName" = %s
        ORDER BY "gameDate" DESC
        LIMIT 5;
    """, (sport_key, team))
    logs_found = cur.fetchall()
    print(f"TeamGameLogs found for {team}:")
    for l in logs_found:
        print(f"  {l[0]} | {l[1]} | {l[2]} | {l[3]}")

cur.close()
conn.close()
