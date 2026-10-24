import psycopg2

URL = "[REDACTED:db.url.with-password]/neondb?sslmode=require&channel_binding=require"
conn = psycopg2.connect(URL)
cur = conn.cursor()

teams = ["Kansas City Chiefs", "Carolina Panthers", "Tampa Bay Buccaneers", "Dallas Cowboys"]
sport_id = "cmpg6t7v900031heri45v3d8s"

for team in teams:
    print(f"\nGames in `games` between 2026-09-01 and 2026-10-17 for {team}:")
    cur.execute("""
        SELECT g.id, g."homeTeamName", g."awayTeamName", g."commenceTime", g.status,
               g."homeScore", g."awayScore", g."openingSpread", g."mergedIntoGameId"
        FROM games g
        WHERE g."sportId" = %s
          AND g."commenceTime" >= '2026-09-01'
          AND g."commenceTime" < '2026-10-17'
          AND g."mergedIntoGameId" IS NULL
          AND (g."homeTeamName" = %s OR g."awayTeamName" = %s)
        ORDER BY g."commenceTime" ASC;
    """, (sport_id, team, team))
    for r in cur.fetchall():
        print(f"  {r[0]} | {r[2]} @ {r[1]} | {r[3]} | {r[4]} | Score: {r[5]}-{r[6]} | Spread: {r[7]}")

cur.close()
conn.close()
