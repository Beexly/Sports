import psycopg2
import json

URL = "[REDACTED:db.url.with-password]/neondb?sslmode=require&channel_binding=require"
conn = psycopg2.connect(URL)
cur = conn.cursor()

# Week 6 is roughly commenceTime >= 2026-10-15 and commenceTime <= 2026-10-20
# Let's check all games between 2026-10-15 and 2026-10-21
cur.execute("""
    SELECT g.id, g."homeTeamName", g."awayTeamName", g."commenceTime", g.status,
           g."restDaysHome", g."restDaysAway", g."isBackToBackHome", g."isBackToBackAway",
           g."homeScore", g."awayScore", g."dataQualityScore", g."openingSpread", g."openingTotal",
           g."currentEdgeIndex"
    FROM games g
    WHERE g."sportId" = 'cmpg6t7v900031heri45v3d8s'
      AND g."commenceTime" >= '2026-10-15'
      AND g."commenceTime" < '2026-10-21'
      AND g."mergedIntoGameId" IS NULL
    ORDER BY g."commenceTime" ASC, g."homeTeamName" ASC;
""")
week6_games = cur.fetchall()
print(f"Week 6 games found: {len(week6_games)}")
print(f"{'Game ID':<26} | {'Matchup':<38} | {'Commence Time':<20} | {'Status':<9} | {'HomeRest':<8} | {'AwayRest':<8}")
print("-" * 120)
for g in week6_games:
    matchup = f"{g[2]} @ {g[1]}"
    print(f"{g[0]:<26} | {matchup:<38} | {str(g[3]):<20} | {g[4]:<9} | {str(g[5]):<8} | {str(g[6]):<8}")

cur.close()
conn.close()
