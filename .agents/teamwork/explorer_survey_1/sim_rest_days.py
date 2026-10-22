import psycopg2
from datetime import datetime, timedelta

URL = "[REDACTED:db.url.with-password]/neondb?sslmode=require&channel_binding=require"
conn = psycopg2.connect(URL)
cur = conn.cursor()

# Get the 14 Week 6 games
cur.execute("""
    SELECT g.id, g."homeTeamName", g."awayTeamName", g."commenceTime", g."restDaysHome", g."restDaysAway"
    FROM games g
    WHERE g."sportId" = 'cmpg6t7v900031heri45v3d8s'
      AND g."commenceTime" >= '2026-10-15'
      AND g."commenceTime" < '2026-10-21'
      AND g."mergedIntoGameId" IS NULL
    ORDER BY g."commenceTime" ASC;
""")
week6_games = cur.fetchall()

# For each team and game date, find the most recent settled game before commenceTime - 18h
for g in week6_games:
    gid, home, away, ctime, old_r_home, old_r_away = g
    cutoff = ctime - timedelta(hours=18)
    
    # Home team prior
    cur.execute("""
        SELECT max(commence_time)
        FROM (
            SELECT "commenceTime" as commence_time
            FROM games
            WHERE "sportId" = 'cmpg6t7v900031heri45v3d8s'
              AND "mergedIntoGameId" IS NULL
              AND "commenceTime" < %s
              AND ("homeTeamName" = %s OR "awayTeamName" = %s)
              AND "homeScore" IS NOT NULL
        ) sub;
    """, (cutoff, home, home))
    home_prior = cur.fetchone()[0]
    
    # Away team prior
    cur.execute("""
        SELECT max(commence_time)
        FROM (
            SELECT "commenceTime" as commence_time
            FROM games
            WHERE "sportId" = 'cmpg6t7v900031heri45v3d8s'
              AND "mergedIntoGameId" IS NULL
              AND "commenceTime" < %s
              AND ("homeTeamName" = %s OR "awayTeamName" = %s)
              AND "homeScore" IS NOT NULL
        ) sub;
    """, (cutoff, away, away))
    away_prior = cur.fetchone()[0]
    
    home_rest = (ctime - home_prior).days if home_prior else None
    away_rest = (ctime - away_prior).days if away_prior else None
    
    print(f"Matchup: {away} @ {home} ({ctime})")
    print(f"  Home ({home}): Prior={home_prior} | OldRest={old_r_home} -> NewRest={home_rest}")
    print(f"  Away ({away}): Prior={away_prior} | OldRest={old_r_away} -> NewRest={away_rest}")
    print("-" * 80)

cur.close()
conn.close()
